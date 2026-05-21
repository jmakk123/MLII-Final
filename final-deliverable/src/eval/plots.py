"""Slide-deck plotting helpers (brief §8.10).

Produces the three signature visuals plus a few supporting plots:

- gics_sector_breakdown(...)    : paired bar chart of predicted vs realized
                                  mean drawdown by GICS sector on the COVID
                                  anchor (fyear 2018).
- calibration_scatter(...)      : predicted-vs-actual scatter, color by anchor
                                  year, diagonal.
- named_firm_trajectories(...)  : per-firm trajectory of predicted vs realized
                                  drawdown across the test years.
- reliability_diagram(...)      : 10-bin reliability for the -30% binary.
- feature_importance(...)       : horizontal bar chart for XGBoost gain.
"""

from __future__ import annotations

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

GICS_SECTOR_NAMES = {
    "10": "Energy",
    "15": "Materials",
    "20": "Industrials",
    "25": "Consumer Discretionary",
    "30": "Consumer Staples",
    "35": "Health Care",
    "40": "Financials",
    "45": "Information Technology",
    "50": "Communication Services",
    "55": "Utilities",
    "60": "Real Estate",
}


def gics_sector_breakdown(
    df: pd.DataFrame,
    pred_col: str = "y_pred",
    true_col: str = "y_true",
    sector_col: str = "gsector",
    title: str = "GICS sector breakdown — fyear 2018 anchor (COVID forward window)",
    figsize: tuple[float, float] = (10, 6),
):
    """Paired horizontal bars: mean predicted vs mean realized drawdown by sector.

    df must contain pred_col, true_col, sector_col. Sectors are sorted from
    most-negative (worst realized) at top to least-negative at bottom so the
    distressed sectors (airlines/hospitality/retail/cruise) sit at the top.
    """
    grp = df.groupby(sector_col).agg(
        mean_pred=(pred_col, "mean"),
        mean_true=(true_col, "mean"),
        n=(true_col, "size"),
    ).reset_index()
    grp = grp[grp["n"] >= 5]   # avoid singleton sectors
    grp["sector_name"] = grp[sector_col].astype(str).map(GICS_SECTOR_NAMES).fillna(grp[sector_col].astype(str))
    grp = grp.sort_values("mean_true")  # most negative at top

    y = np.arange(len(grp))
    w = 0.4
    fig, ax = plt.subplots(figsize=figsize)
    ax.barh(y - w / 2, grp["mean_true"], height=w, label="Realized mean drawdown", color="C3")
    ax.barh(y + w / 2, grp["mean_pred"], height=w, label="Predicted mean drawdown", color="C0")
    ax.set_yticks(y)
    ax.set_yticklabels(grp["sector_name"])
    ax.set_xlabel("Mean forward 12-month drawdown")
    ax.set_title(title)
    ax.axvline(0, color="black", linewidth=0.8)
    ax.legend(loc="lower right")
    plt.tight_layout()
    return fig, ax


def calibration_scatter(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    fyears: np.ndarray,
    figsize: tuple[float, float] = (7, 7),
    title: str = "Calibration: predicted vs realized forward drawdown",
):
    """Predicted-vs-actual scatter colored by anchor fyear, diagonal overlaid."""
    fig, ax = plt.subplots(figsize=figsize)
    fyears = np.asarray(fyears)
    for yr in np.unique(fyears):
        m = fyears == yr
        ax.scatter(y_pred[m], y_true[m], s=6, alpha=0.4, label=str(int(yr)))
    lo = float(min(np.nanmin(y_true), np.nanmin(y_pred)))
    hi = float(max(np.nanmax(y_true), np.nanmax(y_pred)))
    ax.plot([lo, hi], [lo, hi], "k--", linewidth=1.2, label="y = x")
    ax.set_xlabel("Predicted drawdown")
    ax.set_ylabel("Realized drawdown")
    ax.set_title(title)
    ax.legend(loc="lower right", fontsize=8, title="anchor fyear")
    plt.tight_layout()
    return fig, ax


def named_firm_trajectories(
    df: pd.DataFrame,
    name_col: str = "conm",
    year_col: str = "fyear",
    pred_col: str = "y_pred",
    true_col: str = "y_true",
    firms: list[str] | None = None,
    figsize: tuple[float, float] = (12, 8),
):
    """One subplot per firm, predicted vs realized drawdown across the test years.

    df must be one row per (firm, fyear) over the test fold.
    """
    if firms is None:
        firms = df[name_col].dropna().unique().tolist()
    n = len(firms)
    cols = 3
    rows = (n + cols - 1) // cols
    fig, axes = plt.subplots(rows, cols, figsize=figsize, sharex=True)
    axes = np.atleast_2d(axes)
    for i, firm in enumerate(firms):
        r, c = divmod(i, cols)
        ax = axes[r, c]
        sub = df[df[name_col] == firm].sort_values(year_col)
        ax.plot(sub[year_col], sub[true_col], "o-", color="C3", label="Realized")
        ax.plot(sub[year_col], sub[pred_col], "s--", color="C0", label="Predicted")
        ax.axhline(-0.30, color="gray", linewidth=0.6, linestyle=":")
        ax.set_title(firm, fontsize=10)
        ax.set_ylim(-1.05, 0.05)
        if i == 0:
            ax.legend(loc="lower left", fontsize=8)
    # blank out unused axes
    for j in range(n, rows * cols):
        r, c = divmod(j, cols)
        axes[r, c].axis("off")
    fig.suptitle("Named-firm trajectories — predicted vs realized drawdown", y=1.02)
    plt.tight_layout()
    return fig, axes


def reliability_diagram(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    threshold: float = -0.30,
    n_bins: int = 10,
    figsize: tuple[float, float] = (6, 6),
):
    """10-bin reliability diagram for the binary-at-threshold flag.

    Score is rescaled from -y_pred into [0, 1] (same convention as
    `metrics.binary_metrics`).
    """
    y_bin = (np.asarray(y_true) <= threshold).astype(int)
    score = -np.asarray(y_pred, dtype=float)
    s_min, s_max = score.min(), score.max()
    prob = (score - s_min) / (s_max - s_min + 1e-12)

    bins = np.linspace(0, 1, n_bins + 1)
    bin_idx = np.clip(np.digitize(prob, bins) - 1, 0, n_bins - 1)
    bin_mid = 0.5 * (bins[:-1] + bins[1:])
    emp = np.zeros(n_bins)
    for b in range(n_bins):
        m = bin_idx == b
        emp[b] = float(y_bin[m].mean()) if m.any() else np.nan

    fig, ax = plt.subplots(figsize=figsize)
    ax.plot([0, 1], [0, 1], "k--", linewidth=1.0)
    ax.plot(bin_mid, emp, "o-", color="C0")
    ax.set_xlabel("Predicted probability (rescaled risk score)")
    ax.set_ylabel("Empirical positive rate")
    ax.set_title(f"Reliability — drawdown <= {threshold:.0%}")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    plt.tight_layout()
    return fig, ax


def feature_importance(
    importances: np.ndarray,
    names: list[str],
    top_n: int = 20,
    figsize: tuple[float, float] = (8, 7),
    title: str = "XGBoost feature importance (gain)",
):
    """Horizontal bar of the top-N features by gain."""
    order = np.argsort(importances)[::-1][:top_n]
    fig, ax = plt.subplots(figsize=figsize)
    ax.barh(range(len(order))[::-1], np.asarray(importances)[order], color="C2")
    ax.set_yticks(range(len(order))[::-1])
    ax.set_yticklabels([names[i] for i in order])
    ax.set_xlabel("Gain")
    ax.set_title(title)
    plt.tight_layout()
    return fig, ax
