"""
features.py — shared financial-feature module for the Forward Drawdown project.

ONE source of truth for the financial side of the model. Both the baseline
notebook (02) and the deep-model notebook (03) import from here so the feature
definitions never drift between them.

What this module produces
--------------------------
- compute_ratios(funda)            -> funda + the 18 r_* ratio columns (brief §7)
- build_financial_matrix(...)      -> (N, 5, 18) array aligned to an anchor panel
                                      (the sequence input the LSTM needs, brief §8.3)
- flatten_for_baselines(X3d)       -> (N, 90) view of the same array for Ridge/XGB
- FinancialFeatureScaler           -> winsorize + z-score fit on the TRAIN FOLD ONLY
                                      (fixes the all-data leakage in 02, brief §8.3)

Design notes
------------
- The 18 ratios are the brief's LOCKED set (§7, §9). Do not silently change them;
  raise it in a group sync first.
- Scaling statistics come from training-fold rows only. This is the leakage fix:
  02 fit winsorize/z-score on all rows including val/test.
- Lag ordering in the (5,18) matrix is [fyear-4, fyear-3, fyear-2, fyear-1, fyear],
  i.e. OLDEST first -> newest last, which is the natural left-to-right order an
  LSTM reads. The baseline flatten preserves this order.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


# ----------------------------------------------------------------------------
# The 18 ratios — brief §7, locked set. Order is fixed and is the column order
# of the last axis of the (N, 5, 18) matrix.
# ----------------------------------------------------------------------------
RATIO_COLS = [
    "r_wc_ta",         # Altman X1: working capital / total assets
    "r_re_ta",         # Altman X2: retained earnings / total assets
    "r_ebit_ta",       # Altman X3: EBIT / total assets
    "r_mv_tl",         # Altman X4: market value / total liabilities
    "r_sale_ta",       # Altman X5: asset turnover
    "r_tl_ta",         # leverage (Ohlson / Zmijewski)
    "r_cl_ca",         # current liabilities / current assets (Ohlson)
    "r_ni_ta",         # ROA (Ohlson / Zmijewski)
    "r_log_at",        # log size (Ohlson)
    "r_gross_margin",
    "r_oper_margin",
    "r_net_margin",
    "r_ebitda_margin",
    "r_opex_ratio",    # xopr / sale
    "r_da_intensity",  # dp / at
    "r_ltdebt_ta",
    "r_inv_turn",      # cogs / inventory
    "r_recv_turn",     # sale / receivables
]

N_RATIOS = len(RATIO_COLS)   # 18
SEQ_LEN = 5                  # brief §8.3: fyear-4 .. fyear


def _safe_div(num: pd.Series, den: pd.Series) -> pd.Series:
    """Division returning NaN on zero denominator (brief §7)."""
    return num / den.replace(0, np.nan)


def compute_ratios(funda: pd.DataFrame) -> pd.DataFrame:
    """Compute the 18 r_* ratios on the full funda panel (brief §7).

    Returns a copy of funda with 18 new columns. Division by zero -> NaN,
    handled later by imputation. Does not drop or filter rows.
    """
    f = funda.copy()

    # Source-name aliases used by the brief's formulas
    f["mkvalt"] = f["mktval"]
    f["ebitda"] = f["oibdp"]   # operating income before depreciation = EBITDA proxy

    f["r_wc_ta"]         = _safe_div(f["act"] - f["lct"], f["at"])
    f["r_re_ta"]         = _safe_div(f["re"], f["at"])
    f["r_ebit_ta"]       = _safe_div(f["ebit"], f["at"])
    f["r_mv_tl"]         = _safe_div(f["mkvalt"], f["lt"])
    f["r_sale_ta"]       = _safe_div(f["sale"], f["at"])
    f["r_tl_ta"]         = _safe_div(f["lt"], f["at"])
    f["r_cl_ca"]         = _safe_div(f["lct"], f["act"])
    f["r_ni_ta"]         = _safe_div(f["ni"], f["at"])
    f["r_log_at"]        = np.log(f["at"].clip(lower=1e-6))
    f["r_gross_margin"]  = _safe_div(f["gp"], f["sale"])
    f["r_oper_margin"]   = _safe_div(f["ebit"], f["sale"])
    f["r_net_margin"]    = _safe_div(f["ni"], f["sale"])
    f["r_ebitda_margin"] = _safe_div(f["ebitda"], f["sale"])
    f["r_opex_ratio"]    = _safe_div(f["xopr"], f["sale"])
    f["r_da_intensity"]  = _safe_div(f["dp"], f["at"])
    f["r_ltdebt_ta"]     = _safe_div(f["dltt"], f["at"])
    f["r_inv_turn"]      = _safe_div(f["cogs"], f["invt"])
    f["r_recv_turn"]     = _safe_div(f["sale"], f["rect"])

    return f


# ----------------------------------------------------------------------------
# Scaler: winsorize + z-score, fit on the TRAIN FOLD ONLY (brief §8.3 steps 3-4).
#
# This is the leakage fix. In 02 the winsorize bounds and z-score mean/std were
# computed over ALL rows (train+val+test). Here we fit on training rows only and
# apply those frozen statistics to every fold.
#
# We fit per-fyear statistics on the training fyears, then for val/test fyears
# (which the scaler never saw) we fall back to the pooled training statistics.
# That keeps the cross-sectional z-score spirit of the brief while never letting
# val/test rows influence any statistic.
# ----------------------------------------------------------------------------
class FinancialFeatureScaler:
    def __init__(self, low: float = 0.01, high: float = 0.99):
        self.low = low
        self.high = high
        self.winsor_bounds_: dict[str, tuple[float, float]] = {}
        self.mean_: dict[str, float] = {}
        self.std_: dict[str, float] = {}
        self.fitted_ = False

    def fit(self, ratios_df: pd.DataFrame, train_mask: np.ndarray) -> "FinancialFeatureScaler":
        """Learn winsorize bounds and z-score mean/std from training rows only.

        ratios_df : DataFrame containing at least RATIO_COLS, one row per firm-year.
        train_mask: boolean array, True for rows in the training fold.
        """
        train = ratios_df.loc[train_mask, RATIO_COLS]
        for c in RATIO_COLS:
            col = train[c]
            lo, hi = col.quantile(self.low), col.quantile(self.high)
            self.winsor_bounds_[c] = (lo, hi)
            clipped = col.clip(lo, hi)
            self.mean_[c] = clipped.mean()
            self.std_[c] = clipped.std()
        self.fitted_ = True
        return self

    def transform(self, ratios_df: pd.DataFrame) -> pd.DataFrame:
        """Apply frozen winsorize + z-score to all rows. Remaining NaN -> 0
        (the z-score mean), matching the brief's industry-median fallback intent."""
        if not self.fitted_:
            raise RuntimeError("Call fit() before transform().")
        out = ratios_df.copy()
        for c in RATIO_COLS:
            lo, hi = self.winsor_bounds_[c]
            mu, sd = self.mean_[c], self.std_[c]
            out[c] = out[c].clip(lo, hi)
            out[c] = (out[c] - mu) / (sd + 1e-8)
        out[RATIO_COLS] = out[RATIO_COLS].fillna(0.0)
        return out

    def fit_transform(self, ratios_df: pd.DataFrame, train_mask: np.ndarray) -> pd.DataFrame:
        return self.fit(ratios_df, train_mask).transform(ratios_df)


# ----------------------------------------------------------------------------
# Build the (N, 5, 18) matrix aligned to an anchor panel (brief §8.3).
# ----------------------------------------------------------------------------
def build_financial_matrix(
    anchors: pd.DataFrame,
    scaled_ratios: pd.DataFrame,
    require_full_window: bool = True,
) -> tuple[np.ndarray, np.ndarray]:
    """Assemble per-anchor (5, 18) ratio sequences.

    Parameters
    ----------
    anchors : DataFrame with columns ['gvkey', 'fyear'] (one row per anchor).
              Row order is preserved in the output.
    scaled_ratios : DataFrame with ['gvkey', 'fyear'] + RATIO_COLS, already
                    winsorized/z-scored by FinancialFeatureScaler.
    require_full_window : if True, anchors missing any of the 5 fyears are
                          marked invalid (kept out via the returned mask).
                          if False, missing years are filled with zeros.

    Returns
    -------
    X : np.ndarray, shape (N, 5, 18). Rows where valid_mask is False are zero-filled.
    valid_mask : np.ndarray of bool, shape (N,). True where the anchor had all
                 5 fiscal years present. Use this to subset before training.

    Lag order on axis 1: [fyear-4, fyear-3, fyear-2, fyear-1, fyear] (oldest->newest).
    """
    lookup = scaled_ratios.set_index(["gvkey", "fyear"])[RATIO_COLS]
    have = set(lookup.index)

    N = len(anchors)
    X = np.zeros((N, SEQ_LEN, N_RATIOS), dtype=np.float32)
    valid_mask = np.ones(N, dtype=bool)

    gvkeys = anchors["gvkey"].to_numpy()
    fyears = anchors["fyear"].astype(int).to_numpy()

    for i in range(N):
        g, fy = gvkeys[i], int(fyears[i])
        years = [fy - 4, fy - 3, fy - 2, fy - 1, fy]   # oldest -> newest
        present = [(g, y) in have for y in years]
        if require_full_window and not all(present):
            valid_mask[i] = False
            continue
        for t, y in enumerate(years):
            if (g, y) in have:
                X[i, t, :] = lookup.loc[(g, y)].to_numpy(dtype=np.float32)
            # else: leave the zero row (only reachable when require_full_window=False)

    return X, valid_mask


def flatten_for_baselines(X3d: np.ndarray) -> np.ndarray:
    """Reshape (N, 5, 18) -> (N, 90) for Ridge / XGBoost.

    Column order is [t0_r0..t0_r17, t1_r0..t1_r17, ...], i.e. year-major then
    ratio, preserving the oldest->newest lag order. Concatenate the (N, 7) price
    features afterward to get the 97-wide baseline input.
    """
    N = X3d.shape[0]
    return X3d.reshape(N, SEQ_LEN * N_RATIOS)


def flat_feature_names() -> list[str]:
    """Column names matching flatten_for_baselines output, for feature-importance plots.

    Names look like 'lag4_r_wc_ta' ... 'lag0_r_recv_turn' where lag4 is the oldest
    year (fyear-4) and lag0 is the anchor fyear.
    """
    names = []
    for t, lag in enumerate([4, 3, 2, 1, 0]):
        for c in RATIO_COLS:
            names.append(f"lag{lag}_{c}")
    return names
