"""Evaluation metrics — brief §8.9.

Single source of truth for every metric reported in the writeup. Baselines,
the deep model, and all ablations import from here so the numbers are
directly comparable.

Two key disciplines vs the original inline `evaluate` in 02_baselines.ipynb:

1. RANK METRICS ARE WITHIN-YEAR THEN AVERAGED. Pooled rank correlation across
   test years mostly captures the macro regime (2020 was a bloodbath, other
   years calm), not firm-level discrimination. The brief (§8.9, §10.1) is
   explicit: compute within each anchor year, then average. This is why the
   original 02 saw pooled Spearman ~0.65 — measured correctly it is much
   lower, and that lower number is the honest one the deep model must beat.

2. TOP-DECILE PRECISION IS DEFINED PER THE BRIEF. "Of the 10% of firms with
   the WORST PREDICTED drawdown, what fraction were actually in the
   WORST-REALIZED decile WITHIN THE SAME YEAR." The original 02 instead
   measured the fraction that breached -30% pooled across years — a
   different (and inflated) quantity.

Sign convention
---------------
Drawdown is non-positive (e.g. -0.40 = 40% peak-to-trough loss). "Worst"
means MOST NEGATIVE. The "risk score" used for binary/ranking is `-y_pred`
so that more positive = more predicted risk.
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

DD_THRESHOLD_30 = -0.30   # brief headline binary threshold
DD_THRESHOLD_50 = -0.50   # appendix tail threshold (base rate ~26%)


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    return {
        "mae": mean_absolute_error(y_true, y_pred),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": r2_score(y_true, y_pred),
    }


def recall_at_fpr(y_bin: np.ndarray, score: np.ndarray, fpr_target: float = 0.05) -> float:
    """Recall (TPR) at a fixed false-positive rate. Higher score = higher risk."""
    y_bin = np.asarray(y_bin).astype(int)
    score = np.asarray(score, dtype=float)
    neg = score[y_bin == 0]
    pos = score[y_bin == 1]
    if len(neg) == 0 or len(pos) == 0:
        return np.nan
    thr = np.quantile(neg, 1.0 - fpr_target)
    return float((pos >= thr).mean())


def binary_metrics(y_true: np.ndarray, y_pred: np.ndarray,
                   threshold: float = DD_THRESHOLD_30) -> dict:
    """Binary discrimination at a drawdown threshold.

    Label = realized drawdown <= threshold. Score = -y_pred so deeper
    predicted drawdowns => higher score.
    """
    y_bin = (np.asarray(y_true) <= threshold).astype(int)
    score = -np.asarray(y_pred, dtype=float)

    out = {"base_rate": float(y_bin.mean()), "threshold": threshold}
    if y_bin.min() == y_bin.max():
        out.update({"pr_auc": np.nan, "roc_auc": np.nan,
                    "recall_at_5fpr": np.nan, "brier": np.nan})
        return out

    out["pr_auc"] = average_precision_score(y_bin, score)
    out["roc_auc"] = roc_auc_score(y_bin, score)
    out["recall_at_5fpr"] = recall_at_fpr(y_bin, score, 0.05)

    s_min, s_max = score.min(), score.max()
    prob = (score - s_min) / (s_max - s_min + 1e-12)
    out["brier"] = brier_score_loss(y_bin, prob)
    return out


def within_year_spearman(y_true: np.ndarray, y_pred: np.ndarray,
                         years: np.ndarray, min_year_n: int = 20) -> dict:
    """Spearman rank correlation within each year, then averaged."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    years = np.asarray(years)
    per_year = {}
    for yr in np.unique(years):
        m = years == yr
        if m.sum() < min_year_n:
            continue
        res = stats.spearmanr(y_true[m], y_pred[m])
        # Tuple access works on both legacy (correlation, pvalue) and new
        # (statistic, pvalue) scipy return shapes.
        rho = float(res[0])
        if not np.isnan(rho):
            per_year[int(yr)] = rho
    mean_rho = float(np.mean(list(per_year.values()))) if per_year else np.nan
    return {"spearman_within_year": mean_rho, "spearman_by_year": per_year}


def within_year_top_decile_precision(y_true: np.ndarray, y_pred: np.ndarray,
                                     years: np.ndarray, min_year_n: int = 20) -> dict:
    """Top-decile precision per the brief (§8.9).

    Within each year, take the 10% of firms with the WORST PREDICTED drawdown.
    Of those, what fraction were actually in the WORST-REALIZED decile that
    year? Average across years.
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
        pred_cut = np.quantile(yp, 0.10)   # worst predicted = lower 10th pct
        real_cut = np.quantile(yt, 0.10)   # worst realized  = lower 10th pct
        pred_worst = yp <= pred_cut
        real_worst = yt <= real_cut
        if pred_worst.sum() == 0:
            continue
        per_year[int(yr)] = float(real_worst[pred_worst].mean())
    mean_prec = float(np.mean(list(per_year.values()))) if per_year else np.nan
    return {"top_decile_prec_within_year": mean_prec,
            "top_decile_prec_by_year": per_year}


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


def evaluate(name: str, y_true: np.ndarray, y_pred: np.ndarray,
             years: np.ndarray, verbose: bool = True) -> dict:
    """Compute the full brief §8.9 metric set for one model on one fold.

    Returns a flat dict suitable for one row of the headline results table.
    Per-year detail is included for diagnostics under spearman_by_year and
    top_decile_prec_by_year.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    years = np.asarray(years)

    reg = regression_metrics(y_true, y_pred)
    bin30 = binary_metrics(y_true, y_pred, threshold=DD_THRESHOLD_30)
    bin50 = binary_metrics(y_true, y_pred, threshold=DD_THRESHOLD_50)
    sp = within_year_spearman(y_true, y_pred, years)
    td = within_year_top_decile_precision(y_true, y_pred, years)

    row = {
        "model": name,
        "mae": reg["mae"], "rmse": reg["rmse"], "r2": reg["r2"],
        "pr_auc_30": bin30["pr_auc"], "roc_auc_30": bin30["roc_auc"],
        "recall_at_5fpr_30": bin30["recall_at_5fpr"], "brier_30": bin30["brier"],
        "base_rate_30": bin30["base_rate"],
        "pr_auc_50": bin50["pr_auc"], "roc_auc_50": bin50["roc_auc"],
        "recall_at_5fpr_50": bin50["recall_at_5fpr"], "brier_50": bin50["brier"],
        "base_rate_50": bin50["base_rate"],
        "spearman_within_year": sp["spearman_within_year"],
        "top_decile_prec_within_year": td["top_decile_prec_within_year"],
        "spearman_by_year": sp["spearman_by_year"],
        "top_decile_prec_by_year": td["top_decile_prec_by_year"],
    }

    if verbose:
        print(f"\n{'='*56}\n  {name}\n{'='*56}")
        print(f"  MAE                       : {row['mae']:.4f}")
        print(f"  RMSE                      : {row['rmse']:.4f}")
        print(f"  R^2                       : {row['r2']:.4f}")
        print(f"  PR-AUC  (@ -30%)          : {row['pr_auc_30']:.4f}    (base {row['base_rate_30']:.3f})")
        print(f"  PR-AUC  (@ -50%)          : {row['pr_auc_50']:.4f}    (base {row['base_rate_50']:.3f})")
        print(f"  ROC-AUC (@ -30%)          : {row['roc_auc_30']:.4f}")
        print(f"  Recall @ 5% FPR (-30%)    : {row['recall_at_5fpr_30']:.4f}")
        print(f"  Brier   (@ -30%)          : {row['brier_30']:.4f}")
        print(f"  Spearman  (within-year)   : {row['spearman_within_year']:.4f}")
        print(f"  Top-decile prec (w/ year) : {row['top_decile_prec_within_year']:.4f}")

    return row


HEADLINE_COLS = [
    "model", "mae", "rmse", "r2",
    "pr_auc_30", "roc_auc_30", "recall_at_5fpr_30", "brier_30",
    "spearman_within_year", "top_decile_prec_within_year",
]
APPENDIX_COLS = [
    "model", "pr_auc_50", "roc_auc_50", "recall_at_5fpr_50",
    "brier_50", "base_rate_50",
]


def results_table(rows: list[dict], cols: list[str] | None = None) -> pd.DataFrame:
    """Assemble evaluate() outputs into the headline results table."""
    if cols is None:
        cols = HEADLINE_COLS
    df = pd.DataFrame([{k: r.get(k) for k in cols} for r in rows])
    return df.set_index("model")
