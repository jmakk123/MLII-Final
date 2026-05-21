"""Financial feature module — 18 ratios, scaler, (5,18) matrix builder.

Single source of truth for the financial side of the model. Both the
baselines and the deep-model sections of the notebook import from here.

What this module produces
-------------------------
- RATIO_COLS                       : the brief's locked 18-ratio set (§7).
- compute_ratios(funda)            : funda + 18 r_* columns (brief §7).
- FinancialFeatureScaler           : winsorize + z-score, fit on TRAIN FOLD ONLY
                                     (fixes the all-data leakage in the original
                                     baseline notebook; brief §8.3).
- build_financial_matrix(...)      : (N, 5, 18) array aligned to an anchor panel
                                     (LSTM-shaped input; brief §8.3).
- flatten_for_baselines(X3d)       : (N, 90) view for Ridge / XGBoost.
- flat_feature_names()             : column names for feature-importance plots.

Design notes
------------
- The 18 ratios are locked (brief §7, §9). Do not silently change them.
- Lag ordering on axis 1 is [fyear-4, fyear-3, fyear-2, fyear-1, fyear]
  (oldest → newest), the natural left-to-right order an LSTM reads.
- Scaling statistics come from training-fold rows only. We fit pooled
  statistics on training rows and apply them to every fold; this keeps the
  brief's "z-score within fyear" spirit while never letting val/test rows
  influence any statistic.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

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


class FinancialFeatureScaler:
    """Winsorize at [low, high] then z-score, fit on train rows only.

    Replaces the all-data scaler used in the original baseline notebook,
    which fit winsorize bounds and z-score statistics on every fold and
    silently leaked val/test into training.
    """

    def __init__(self, low: float = 0.01, high: float = 0.99):
        self.low = low
        self.high = high
        self.winsor_bounds_: dict[str, tuple[float, float]] = {}
        self.mean_: dict[str, float] = {}
        self.std_: dict[str, float] = {}
        self.fitted_ = False

    def fit(self, ratios_df: pd.DataFrame, train_mask: np.ndarray) -> "FinancialFeatureScaler":
        """Learn bounds and z-score stats from training rows only.

        ratios_df : DataFrame with at least RATIO_COLS.
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
        """Apply frozen winsorize + z-score to all rows. Remaining NaN -> 0."""
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


def build_financial_matrix(
    anchors: pd.DataFrame,
    scaled_ratios: pd.DataFrame,
    require_full_window: bool = True,
) -> tuple[np.ndarray, np.ndarray]:
    """Assemble per-anchor (5, 18) ratio sequences (brief §8.3).

    Parameters
    ----------
    anchors : DataFrame with at least ['gvkey', 'fyear'] (one row per anchor).
              Row order is preserved in the output.
    scaled_ratios : DataFrame with ['gvkey', 'fyear'] + RATIO_COLS, already
                    winsorized/z-scored by FinancialFeatureScaler.
    require_full_window : if True, anchors missing any of the 5 fyears are
                          marked invalid (kept out via valid_mask).
                          If False, missing years are zero-filled.

    Returns
    -------
    X : (N, 5, 18) float32 array. Lag order axis 1 is [t-4, t-3, t-2, t-1, t].
    valid_mask : (N,) bool. True where the anchor had all 5 fiscal years.
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
        years = [fy - 4, fy - 3, fy - 2, fy - 1, fy]
        present = [(g, y) in have for y in years]
        if require_full_window and not all(present):
            valid_mask[i] = False
            continue
        for t, y in enumerate(years):
            if (g, y) in have:
                X[i, t, :] = lookup.loc[(g, y)].to_numpy(dtype=np.float32)

    return X, valid_mask


def flatten_for_baselines(X3d: np.ndarray) -> np.ndarray:
    """Reshape (N, 5, 18) -> (N, 90) for Ridge / XGBoost.

    Column order: [t0_r0..t0_r17, t1_r0..t1_r17, ...] (year-major then ratio,
    oldest-first). Concatenate (N, 7) price features afterward for the 97-wide
    baseline input (brief §8.6).
    """
    N = X3d.shape[0]
    return X3d.reshape(N, SEQ_LEN * N_RATIOS)


def flat_feature_names() -> list[str]:
    """Column names matching flatten_for_baselines output.

    'lag4_r_wc_ta' through 'lag0_r_recv_turn' where lag4 = fyear-4, lag0 = anchor.
    """
    names = []
    for lag in [4, 3, 2, 1, 0]:
        for c in RATIO_COLS:
            names.append(f"lag{lag}_{c}")
    return names
