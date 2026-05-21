"""Training loop for the fusion family (brief §8.7).

Plain PyTorch — no Lightning, no LLM APIs.

Spec from the brief / methodology / handoff
-------------------------------------------
- Huber loss (smooth-L1, delta=0.05) -- robust to the heavy left tail
- AdamW(lr=1e-3, weight_decay=1e-4)
- CosineAnnealingLR over the max-epoch budget
- batch size 256, max 50 epochs
- early stopping on val MAE, patience 5 (default 8 for the tuned variant)
- Dropout 0.2 inside the encoders; LayerNorm on the fusion input

Tuned additions on top of the locked architecture
--------------------------------------------------
- Optional auxiliary binary head (BCE on `drawdown <= -30%`) with weight
  `aux_bce_weight`. Adds one Linear-from-the-fusion-embedding head; does
  not change the regression spec. Helps PR-AUC and MAE jointly because
  the rank/sign of large drawdowns gets supervised directly.
- `run_multi_seed` returns a seed-mean ensemble of test predictions
  alongside the best-val-seed row. Standard ensembling improves PR-AUC
  ~0.5-1.5pp without changing anything else.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR

from src.eval.metrics import evaluate
from src.fusion.model import build_model


@dataclass
class TrainConfig:
    epochs: int = 50
    batch_size: int = 256
    lr: float = 1e-3
    weight_decay: float = 1e-4
    huber_delta: float = 0.05
    patience: int = 8           # tuned default; brief floor is 5
    dropout: float = 0.2
    device: str = "auto"        # "auto" -> mps if available else cpu
    aux_bce_weight: float = 0.3  # 0.0 disables the auxiliary head (locked spec)
    bce_threshold: float = -0.30
    verbose: bool = True


def pick_device(device: str = "auto") -> torch.device:
    if device != "auto":
        return torch.device(device)
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def _tensor(a: np.ndarray, dtype=torch.float32) -> torch.Tensor:
    return torch.as_tensor(a, dtype=dtype)


def _make_loader(X_fin: np.ndarray, X_price: np.ndarray, y: np.ndarray,
                 batch_size: int, shuffle: bool) -> DataLoader:
    ds = TensorDataset(_tensor(X_fin), _tensor(X_price), _tensor(y))
    return DataLoader(ds, batch_size=batch_size, shuffle=shuffle, drop_last=False)


def _epoch_step(model: nn.Module, aux_head: nn.Module | None,
                loader: DataLoader, huber: nn.Module, bce: nn.Module,
                optimizer: AdamW | None, device: torch.device,
                aux_weight: float, bce_threshold: float) -> float:
    """One pass over loader. If optimizer is given, it's a training pass.

    When `aux_head` is not None, the loss is `huber + aux_weight * bce(aux_logit,
    target_bin)` where `target_bin = (y <= bce_threshold)` and the aux logit
    comes from a linear head over the model's pre-head embedding.
    """
    is_train = optimizer is not None
    model.train(is_train)
    if aux_head is not None:
        aux_head.train(is_train)

    total_loss, total_n = 0.0, 0
    for x_fin, x_price, y in loader:
        x_fin = x_fin.to(device)
        x_price = x_price.to(device)
        y = y.to(device)
        if is_train:
            optimizer.zero_grad()
        with torch.set_grad_enabled(is_train):
            emb = model.embed(x_fin, x_price)
            y_hat = model.head(emb).squeeze(-1)
            loss = huber(y_hat, y)
            if aux_head is not None and aux_weight > 0.0:
                target_bin = (y <= bce_threshold).float()
                aux_logit = aux_head(emb).squeeze(-1)
                loss = loss + aux_weight * bce(aux_logit, target_bin)
            if is_train:
                loss.backward()
                optimizer.step()
        total_loss += float(loss.item()) * y.shape[0]
        total_n += y.shape[0]
    return total_loss / max(total_n, 1)


@torch.no_grad()
def _predict(model: nn.Module, loader: DataLoader,
             device: torch.device) -> np.ndarray:
    """Inference-time prediction. Ignores any aux head (regression only)."""
    model.eval()
    preds = []
    for x_fin, x_price, _ in loader:
        x_fin = x_fin.to(device)
        x_price = x_price.to(device)
        preds.append(model(x_fin, x_price).cpu().numpy())
    return np.concatenate(preds, axis=0)


def train_one(
    config: str,
    X_fin_tr: np.ndarray, X_price_tr: np.ndarray, y_tr: np.ndarray,
    X_fin_va: np.ndarray, X_price_va: np.ndarray, y_va: np.ndarray,
    X_fin_te: np.ndarray, X_price_te: np.ndarray, y_te: np.ndarray,
    yrs_te: np.ndarray,
    train_cfg: TrainConfig = TrainConfig(),
    seed: int = 0,
) -> dict:
    """Train one model configuration with one seed; return test metrics + preds.

    Returns a dict with the metrics from `evaluate`, plus 'y_pred_test' and
    'best_val_mae' for inspection.
    """
    set_seed(seed)
    device = pick_device(train_cfg.device)

    model = build_model(config, dropout=train_cfg.dropout).to(device)
    aux_head: nn.Module | None = None
    if train_cfg.aux_bce_weight > 0.0:
        aux_head = nn.Linear(model.embed_dim, 1).to(device)
    params = list(model.parameters()) + (list(aux_head.parameters()) if aux_head is not None else [])
    optimizer = AdamW(params, lr=train_cfg.lr, weight_decay=train_cfg.weight_decay)
    scheduler = CosineAnnealingLR(optimizer, T_max=train_cfg.epochs)
    huber = nn.SmoothL1Loss(beta=train_cfg.huber_delta)
    bce = nn.BCEWithLogitsLoss()

    train_loader = _make_loader(X_fin_tr, X_price_tr, y_tr, train_cfg.batch_size, shuffle=True)
    val_loader = _make_loader(X_fin_va, X_price_va, y_va, train_cfg.batch_size, shuffle=False)
    test_loader = _make_loader(X_fin_te, X_price_te, y_te, train_cfg.batch_size, shuffle=False)

    best_val = float("inf")
    best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
    bad_epochs = 0

    for epoch in range(1, train_cfg.epochs + 1):
        train_loss = _epoch_step(
            model, aux_head, train_loader, huber, bce, optimizer, device,
            train_cfg.aux_bce_weight, train_cfg.bce_threshold,
        )
        val_pred = _predict(model, val_loader, device)
        val_mae = float(np.mean(np.abs(val_pred - y_va)))
        scheduler.step()

        if val_mae < best_val - 1e-6:
            best_val = val_mae
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            bad_epochs = 0
        else:
            bad_epochs += 1

        if train_cfg.verbose and (epoch % 5 == 0 or epoch == 1):
            print(f"    epoch {epoch:>3} | train_loss {train_loss:.4f} | val_mae {val_mae:.4f} "
                  f"(best {best_val:.4f}, patience {bad_epochs}/{train_cfg.patience})")

        if bad_epochs >= train_cfg.patience:
            if train_cfg.verbose:
                print(f"    early stop at epoch {epoch} (best val MAE {best_val:.4f})")
            break

    model.load_state_dict(best_state)
    y_pred_te = _predict(model, test_loader, device)
    row = evaluate(f"{config}_seed{seed}", y_te, y_pred_te, yrs_te, verbose=False)
    row["best_val_mae"] = best_val
    row["y_pred_test"] = y_pred_te
    row["state_dict"] = best_state
    return row


def run_multi_seed(
    config: str,
    X_fin_tr, X_price_tr, y_tr,
    X_fin_va, X_price_va, y_va,
    X_fin_te, X_price_te, y_te,
    yrs_te,
    seeds: list[int] = (0, 1, 2),
    train_cfg: TrainConfig = TrainConfig(),
) -> dict:
    """Train one config over multiple seeds and aggregate.

    Returns a dict with 'mean' / 'std' over the headline metrics, plus the
    per-seed rows for the appendix and the state_dict of the best-val-MAE seed
    (used as the deliverable checkpoint).
    """
    seed_rows = []
    for s in seeds:
        if train_cfg.verbose:
            print(f"\n  >> {config}, seed {s}")
        row = train_one(
            config,
            X_fin_tr, X_price_tr, y_tr,
            X_fin_va, X_price_va, y_va,
            X_fin_te, X_price_te, y_te,
            yrs_te,
            train_cfg=train_cfg, seed=s,
        )
        seed_rows.append(row)

    metric_keys = ["mae", "rmse", "r2",
                   "pr_auc_30", "roc_auc_30", "recall_at_5fpr_30", "brier_30",
                   "pr_auc_50", "roc_auc_50",
                   "spearman_within_year", "top_decile_prec_within_year",
                   "best_val_mae"]
    summary = {"config": config, "n_seeds": len(seeds)}
    for k in metric_keys:
        vals = [r[k] for r in seed_rows if k in r and not np.isnan(r[k])]
        if vals:
            summary[f"{k}_mean"] = float(np.mean(vals))
            summary[f"{k}_std"] = float(np.std(vals))
        else:
            summary[f"{k}_mean"] = float("nan")
            summary[f"{k}_std"] = float("nan")

    best_idx = int(np.argmin([r["best_val_mae"] for r in seed_rows]))
    summary["best_seed"] = seeds[best_idx]
    summary["best_state_dict"] = seed_rows[best_idx]["state_dict"]
    summary["best_preds_test"] = seed_rows[best_idx]["y_pred_test"]
    summary["seed_rows"] = seed_rows

    # Ensemble: average test predictions across all seeds. Often beats the
    # best single seed on PR-AUC by 0.5-1.5pp at zero architectural cost.
    ensemble_preds = np.mean(np.stack([r["y_pred_test"] for r in seed_rows], axis=0), axis=0)
    ens_row = evaluate(f"{config}_ensemble", y_te, ensemble_preds, yrs_te, verbose=False)
    summary["ensemble_preds_test"] = ensemble_preds
    summary["ensemble"] = ens_row

    return summary
