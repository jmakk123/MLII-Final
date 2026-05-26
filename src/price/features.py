"""Price-branch features — 7 per anchor (brief §8.4).

For each anchor row this module reads the 252 trading days ending STRICTLY
before `anchor_date` from CRSP dsf, and emits:

1. Annualized realized volatility    (std(ret) * sqrt(252))
2. Total return over the window      ((1+ret).prod() - 1)
3. Skewness of daily returns
4. Kurtosis of daily returns
5. Max prior 12-month drawdown       (peak-to-trough on ADJUSTED prices)
6. Beta vs equal-weighted market     (cov(ret, mkt) / var(mkt))
7. Log average daily dollar volume   (log(mean(|prc|*vol)))

The leakage assertion
---------------------
The brief (§10.3) flags this as the easiest way to silently corrupt the
experiment. The feature window's last date MUST be strictly less than
`anchor_date`. This module enforces that with an explicit assertion inside
the per-anchor compute, and `tests_leakage()` covers it.

Bug fixes vs the original v2 price-feature block
------------------------------------------------
- v2's max-prior-drawdown used `abs(prc) / cfacpr` for the adjusted price.
  The correct adjustment per the brief (§5.5) is `abs(prc) * cfacpr`. Fixed.
- Pre-build per-permno series once instead of dataframe-filtering 80k times.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import skew, kurtosis

WINDOW_DAYS = 252        # brief §8.4: prior 252 trading days
MIN_FEATURE_DAYS = 60    # require >=60 valid returns for stability
PRICE_COLS = [
    "pf_vol", "pf_ret", "pf_skew", "pf_kurt",
    "pf_max_dd", "pf_beta", "pf_log_dv",
]
N_PRICE = len(PRICE_COLS)   # 7


def build_market_return(dsf: pd.DataFrame) -> pd.Series:
    """Equal-weighted market return per trading day (brief §8.4 #6).

    Aggregate of all permnos in dsf. Equal-weight is simpler than value-weight
    and adequate here per HANDOFF §4 step 4.
    """
    return dsf.groupby("date")["ret"].mean().sort_index()


def build_permno_panel(dsf: pd.DataFrame) -> dict[int, pd.DataFrame]:
    """Pre-build a per-permno date-indexed frame with ret, adj_prc, dollar_vol.

    One pass over dsf, then per-anchor compute is a slice + numeric ops.
    """
    d = dsf.copy()
    d["adj_prc"] = d["prc"].abs() * d["cfacpr"]   # brief §5.5: correct adjustment
    d["dollar_vol"] = d["prc"].abs() * d["vol"]
    d = d[["permno", "date", "ret", "adj_prc", "dollar_vol"]]
    panel: dict[int, pd.DataFrame] = {}
    for p, g in d.groupby("permno"):
        gg = g.set_index("date").sort_index()
        panel[int(p)] = gg
    return panel


def _price_features_for_anchor(
    panel: pd.DataFrame,
    market: pd.Series,
    anchor_date: pd.Timestamp,
) -> np.ndarray:
    """Compute the 7 features for one anchor. Returns NaN-filled if insufficient data.

    Enforces the leakage rule: every row used is strictly before anchor_date.
    """
    # Strictly-before-anchor slice, last 252 trading days
    trail = panel.loc[panel.index < anchor_date].tail(WINDOW_DAYS)
    if len(trail) < MIN_FEATURE_DAYS:
        return np.full(N_PRICE, np.nan)

    # Hard leakage assertion: cheap to compute and catches the failure mode
    # described in the brief (§10.3). If the slice picks up anything ≥ anchor,
    # something upstream is wrong (e.g., a non-strict comparison).
    assert trail.index.max() < anchor_date, (
        f"price feature window leaks into anchor: max date {trail.index.max()} "
        f">= anchor {anchor_date}"
    )

    rets = trail["ret"].dropna()
    if len(rets) < MIN_FEATURE_DAYS:
        return np.full(N_PRICE, np.nan)

    vol_ann = float(rets.std() * np.sqrt(252))
    total_ret = float((1.0 + rets).prod() - 1.0)
    ret_skew = float(skew(rets))
    ret_kurt = float(kurtosis(rets))

    adj = trail["adj_prc"].dropna()
    adj = adj[adj > 0]
    if len(adj) < 20:
        max_dd = np.nan
    else:
        roll_max = adj.cummax()
        max_dd = float(((adj / roll_max) - 1.0).min())

    mkt = market.reindex(trail.index).dropna()
    firm_rets = trail["ret"].reindex(mkt.index).dropna()
    mkt = mkt.reindex(firm_rets.index)
    if len(firm_rets) < 30 or mkt.var() == 0:
        beta = np.nan
    else:
        cov = np.cov(firm_rets.values, mkt.values)
        beta = float(cov[0, 1] / (cov[1, 1] + 1e-10))

    dv = trail["dollar_vol"].replace(0, np.nan).dropna()
    log_dv = float(np.log(dv.mean() + 1e-6)) if len(dv) > 0 else np.nan

    return np.array([vol_ann, total_ret, ret_skew, ret_kurt, max_dd, beta, log_dv])


def build_price_features(
    anchors: pd.DataFrame,
    dsf: pd.DataFrame,
) -> np.ndarray:
    """Build the (N, 7) price-feature matrix aligned to the anchor panel.

    Parameters
    ----------
    anchors : DataFrame with ['permno', 'anchor_date']. Row order preserved.
    dsf     : CRSP daily file with ['permno', 'date', 'ret', 'prc', 'cfacpr', 'vol'].

    Returns
    -------
    np.ndarray of shape (N, 7) in PRICE_COLS order. NaN where insufficient data.
    Per-anchor scaling happens elsewhere (after the train/val/test split is set).
    """
    market = build_market_return(dsf)
    panel = build_permno_panel(dsf)

    permnos = anchors["permno"].astype(int).to_numpy()
    adates = pd.to_datetime(anchors["anchor_date"]).to_numpy()

    N = len(anchors)
    out = np.full((N, N_PRICE), np.nan, dtype=float)
    for i in range(N):
        p = int(permnos[i])
        if p not in panel:
            continue
        out[i, :] = _price_features_for_anchor(
            panel[p], market, pd.Timestamp(adates[i])
        )
    return out


class PriceFeatureScaler:
    """Per-fyear z-score using train-fold statistics only.

    Mirrors the financial-side scaler discipline (brief §8.4): fit on training
    rows, freeze the statistics, apply to every fold. For val/test fyears
    (which the scaler never saw a fyear-specific stat for) we fall back to
    the pooled training mean/std for that feature.
    """

    def __init__(self):
        self.year_stats_: dict[tuple[int, str], tuple[float, float]] = {}
        self.pooled_stats_: dict[str, tuple[float, float]] = {}
        self.fitted_ = False

    def fit(self, X: np.ndarray, fyears: np.ndarray, train_mask: np.ndarray) -> "PriceFeatureScaler":
        Xt = X[train_mask]
        yt = np.asarray(fyears)[train_mask]
        for j, col in enumerate(PRICE_COLS):
            xs_all = Xt[:, j]
            xs_all = xs_all[np.isfinite(xs_all)]
            mu_all = float(np.mean(xs_all)) if xs_all.size else 0.0
            sd_all = float(np.std(xs_all)) if xs_all.size else 1.0
            self.pooled_stats_[col] = (mu_all, sd_all)
            for yr in np.unique(yt):
                m = yt == yr
                xs = Xt[m, j]
                xs = xs[np.isfinite(xs)]
                if xs.size < 5:
                    continue
                self.year_stats_[(int(yr), col)] = (float(np.mean(xs)), float(np.std(xs)))
        self.fitted_ = True
        return self

    def transform(self, X: np.ndarray, fyears: np.ndarray) -> np.ndarray:
        if not self.fitted_:
            raise RuntimeError("Call fit() before transform().")
        fyears = np.asarray(fyears)
        out = X.astype(float).copy()
        for j, col in enumerate(PRICE_COLS):
            mu_pool, sd_pool = self.pooled_stats_[col]
            for yr in np.unique(fyears):
                m = fyears == yr
                mu, sd = self.year_stats_.get((int(yr), col), (mu_pool, sd_pool))
                out[m, j] = (out[m, j] - mu) / (sd + 1e-8)
        # remaining NaN -> 0 (z-score mean)
        out = np.where(np.isfinite(out), out, 0.0)
        return out

    def fit_transform(self, X: np.ndarray, fyears: np.ndarray, train_mask: np.ndarray) -> np.ndarray:
        return self.fit(X, fyears, train_mask).transform(X, fyears)
