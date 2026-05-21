"""
metrics.py — shared evaluation module for the Forward Drawdown project.

ONE source of truth for every metric in brief §8.9. Baselines (02), the deep
model (03), and all ablations import from here so the numbers are comparable.

The eval fixes (vs the inline `evaluate` in 02)
-----------------------------------------------
1. RANK METRICS ARE COMPUTED WITHIN EACH YEAR, THEN AVERAGED.
   02 pooled Spearman across all test years. Pooled rank correlation mostly
   captures the macro regime (2020 was a bloodbath, other years calm), not
   firm-level discrimination. The brief (§8.9, §10.1) is explicit: compute
   within each anchor year separately, then average. This is THE fix — it is
   why 02's Spearman read ~0.65; measured correctly it will be much lower,
   and that lower number is the honest one the deep model must beat.

2. TOP-DECILE PRECISION IS DEFINED CORRECTLY.
   Brief definition: of the 10% of firms with the WORST PREDICTED drawdown,
   what fraction were actually in the WORST-REALIZED decile WITHIN THE SAME
   YEAR. 02 instead measured the fraction that breached the -30% binary,
   pooled across years — a different (and inflated) quantity.

Sign convention
---------------
Drawdown is non-positive (e.g. -0.40 = 40% peak-to-trough loss). "Worst" means
MOST NEGATIVE. A risk score is -y_pred (more positive = more risk), used for
the binary/ranking metrics where a higher score should mean higher risk.

Every function takes plain numpy arrays so it works for any model.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    average_precision_score,
    roc_auc_score,
    brier_score_loss,
)

DD_THRESHOLD = -0.30   # brief: "large drawdown" binary threshold


# ----------------------------------------------------------------------------
# Regression metrics (brief §8.9). Report overall and by year.
# ----------------------------------------------------------------------------
def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    return {
        "mae": mean_absolute_error(y_true, y_pred),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": r2_score(y_true, y_pred),
    }


# ----------------------------------------------------------------------------
# Binary metrics at the -30% threshold (brief §8.9).
# ----------------------------------------------------------------------------
def recall_at_fpr(y_bin: np.ndarray, score: np.ndarray, fpr_target: float = 0.05) -> float:
    """Recall (TPR) at a fixed false-positive rate. Higher score = higher risk.

    Sweeps the threshold to the highest FPR not exceeding fpr_target and reports
    the recall there.
    """
    y_bin = np.asarray(y_bin).astype(int)
    score = np.asarray(score, dtype=float)
    neg = score[y_bin == 0]
    pos = score[y_bin == 1]
    if len(neg) == 0 or len(pos) == 0:
        return np.nan
    # Threshold that allows exactly fpr_target of negatives through.
    thr = np.quantile(neg, 1.0 - fpr_target)
    return float((pos >= thr).mean())


def binary_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    """Binary discrimination at the -30% threshold.

    The label is realized drawdown <= -30%. The score is -y_pred (more positive
    = more predicted risk), so a model predicting deeper drawdowns scores higher.
    """
    y_bin = (np.asarray(y_true) <= DD_THRESHOLD).astype(int)
    score = -np.asarray(y_pred, dtype=float)

    out = {"base_rate": float(y_bin.mean())}
    # AUCs are undefined if only one class is present.
    if y_bin.min() == y_bin.max():
        out.update({"pr_auc": np.nan, "roc_auc": np.nan,
                    "recall_at_5fpr": np.nan, "brier": np.nan})
        return out

    out["pr_auc"] = average_precision_score(y_bin, score)
    out["roc_auc"] = roc_auc_score(y_bin, score)
    out["recall_at_5fpr"] = recall_at_fpr(y_bin, score, 0.05)

    # Brier needs a probability in [0,1]. Min-max the risk score into [0,1].
    s_min, s_max = score.min(), score.max()
    prob = (score - s_min) / (s_max - s_min + 1e-12)
    out["brier"] = brier_score_loss(y_bin, prob)
    return out


# ----------------------------------------------------------------------------
# Rank metrics — WITHIN YEAR, THEN AVERAGED (brief §8.9, §10.1). The fix.
# ----------------------------------------------------------------------------
def within_year_spearman(y_true: np.ndarray, y_pred: np.ndarray,
                         years: np.ndarray, min_year_n: int = 20) -> dict:
    """Spearman rank correlation computed within each year, then averaged.

    Returns the mean across years (the headline) plus the per-year values.
    Years with fewer than min_year_n firms are skipped (rank corr is noisy
    on tiny groups). Equal-weighted average across the qualifying years.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    years = np.asarray(years)

    per_year = {}
    for yr in np.unique(years):
        m = years == yr
        if m.sum() < min_year_n:
            continue
        rho = stats.spearmanr(y_true[m], y_pred[m]).statistic
        if not np.isnan(rho):
            per_year[int(yr)] = float(rho)

    mean_rho = float(np.mean(list(per_year.values()))) if per_year else np.nan
    return {"spearman_within_year": mean_rho, "spearman_by_year": per_year}


def within_year_top_decile_precision(y_true: np.ndarray, y_pred: np.ndarray,
                                     years: np.ndarray, min_year_n: int = 20) -> dict:
    """Top-decile precision, defined per the brief (§8.9):

    Within each year, take the 10% of firms with the WORST PREDICTED drawdown.
    Of those, what fraction were actually in the WORST-REALIZED decile that year?
    Average across years.

    Both "worst predicted" and "worst realized" are the most-negative decile,
    ranked WITHIN the same year — so this isolates firm-level discrimination
    from the macro regime.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    years = np.asarray(years)

    per_year = {}
    for yr in np.unique(years):
        m = years == yr
        n = int(m.sum())
        if n < min_year_n:
            continue
        yt, yp = y_true[m], y_pred[m]
        # Worst = most negative. The 10th percentile (lower tail) is the cutoff.
        pred_cut = np.quantile(yp, 0.10)   # predicted worst decile: yp <= pred_cut
        real_cut = np.quantile(yt, 0.10)   # realized  worst decile: yt <= real_cut
        pred_worst = yp <= pred_cut
        real_worst = yt <= real_cut
        if pred_worst.sum() == 0:
            continue
        per_year[int(yr)] = float(real_worst[pred_worst].mean())

    mean_prec = float(np.mean(list(per_year.values()))) if per_year else np.nan
    return {"top_decile_prec_within_year": mean_prec,
            "top_decile_prec_by_year": per_year}


# ----------------------------------------------------------------------------
# By-year regression breakdown (brief §8.9: "report overall and by anchor year").
# ----------------------------------------------------------------------------
def regression_by_year(y_true: np.ndarray, y_pred: np.ndarray,
                       years: np.ndarray) -> pd.DataFrame:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    years = np.asarray(years)
    rows = []
    for yr in np.unique(years):
        m = years == yr
        rows.append({"fyear": int(yr), "n": int(m.sum()),
                     **regression_metrics(y_true[m], y_pred[m])})
    return pd.DataFrame(rows).set_index("fyear")


# ----------------------------------------------------------------------------
# Top-level: one call that returns the full §8.9 metric set for a model.
# ----------------------------------------------------------------------------
def evaluate(name: str, y_true: np.ndarray, y_pred: np.ndarray,
             years: np.ndarray, verbose: bool = True) -> dict:
    """Compute the full brief §8.9 metric set for one model on one fold.

    Parameters
    ----------
    name   : model label for the results table.
    y_true : realized forward drawdown (non-positive), shape (N,).
    y_pred : predicted forward drawdown, shape (N,).
    years  : anchor fyear per row, shape (N,). REQUIRED — drives the within-year
             rank metrics. Without it the macro confound is not removed.

    Returns a flat dict suitable for a results-table row. Per-year detail
    (spearman_by_year, top_decile_prec_by_year) is included for inspection.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    years = np.asarray(years)

    reg = regression_metrics(y_true, y_pred)
    binm = binary_metrics(y_true, y_pred)
    sp = within_year_spearman(y_true, y_pred, years)
    td = within_year_top_decile_precision(y_true, y_pred, years)

    row = {
        "model": name,
        "mae": reg["mae"], "rmse": reg["rmse"], "r2": reg["r2"],
        "pr_auc": binm["pr_auc"], "roc_auc": binm["roc_auc"],
        "recall_at_5fpr": binm["recall_at_5fpr"], "brier": binm["brier"],
        "spearman_within_year": sp["spearman_within_year"],
        "top_decile_prec_within_year": td["top_decile_prec_within_year"],
        "base_rate": binm["base_rate"],
        # per-year detail (not for the headline table, useful for diagnostics)
        "spearman_by_year": sp["spearman_by_year"],
        "top_decile_prec_by_year": td["top_decile_prec_by_year"],
    }

    if verbose:
        print(f"\n{'='*56}\n  {name}\n{'='*56}")
        print(f"  MAE                       : {row['mae']:.4f}")
        print(f"  RMSE                      : {row['rmse']:.4f}")
        print(f"  R^2                       : {row['r2']:.4f}")
        print(f"  PR-AUC  (@ -30%)          : {row['pr_auc']:.4f}")
        print(f"  ROC-AUC (@ -30%)          : {row['roc_auc']:.4f}")
        print(f"  Recall @ 5% FPR           : {row['recall_at_5fpr']:.4f}")
        print(f"  Brier                     : {row['brier']:.4f}")
        print(f"  Spearman  (within-year)   : {row['spearman_within_year']:.4f}")
        print(f"  Top-decile prec (w/ year) : {row['top_decile_prec_within_year']:.4f}")
        print(f"  (base rate @ -30%         : {row['base_rate']:.3f})")

    return row


def results_table(rows: list[dict]) -> pd.DataFrame:
    """Assemble evaluate() outputs into the headline results table.

    Drops the per-year detail columns so the table is clean for the writeup.
    """
    headline_cols = ["model", "mae", "rmse", "r2", "pr_auc", "roc_auc",
                     "recall_at_5fpr", "brier", "spearman_within_year",
                     "top_decile_prec_within_year"]
    df = pd.DataFrame([{k: r[k] for k in headline_cols} for r in rows])
    return df.set_index("model")
