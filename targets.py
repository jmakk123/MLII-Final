"""
targets.py — shared forward-drawdown target builder for the project.

ONE source of truth for the prediction target (brief §8.2). Both 02 (baselines)
and 03 (deep model) import this so they train and evaluate against an identical
target.

Why this module exists
----------------------
The original target builder in 02 used `firm[firm['date'] > anchor_date].head(252)`
— the first 252 trading ROWS after the anchor, with NO calendar ceiling. For
firms with sparse or interrupted trading this reaches far past 12 months, which
inflated drawdowns badly: the test fold showed ~52% of firm-years breaching -30%
and a mean drawdown of -0.36, vs the brief's expected 10-20% tail mass (§2, §9.5).

This module follows the brief's §8.2 CODE exactly: a 365-CALENDAR-DAY window from
the anchor date (`series.loc[anchor_date:anchor_date+365d]`), requiring >=60 trading
days. (The brief's prose says "252 trading days"; the code says 365 calendar days.
Calendar-capping is the unambiguous artifact and is what actually bounds the window
to ~12 months, so we follow the code. Documented here so it's a known choice.)

Delisting handling (§8.2), which the original only did for bankruptcies:
  - dlrsn 02, 03, 04 (bankruptcy / liquidation / cease ops): full loss, dd = -1.0
  - dlrsn 01, 07 (merger / foreign acquisition): terminal value at delist,
    i.e. no forced loss — the price series simply ends; drawdown is whatever
    occurred up to the delist date (assume zero return afterward).
  - other dlrsn or no delisting in-window: ordinary price-based drawdown.

Output columns (§8.2): gvkey, fyear, permno, anchor_date, fwd_12m_max_dd,
large_dd_30, large_dd_50, dd_year_pct.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

HORIZON_DAYS = 365   # brief §8.2 code: calendar-day forward window
MIN_FWD_DAYS = 60    # brief §8.2 code: require >=60 trading days in the window

# Delisting reason codes that mean "wiped out" -> full loss in-window
FULL_LOSS_DLRSN = {"02", "03", "04"}
# Codes that mean "left the market intact" -> terminal value, no forced loss
TERMINAL_DLRSN = {"01", "07"}


def build_permno_price_series(dsf: pd.DataFrame) -> dict[int, pd.Series]:
    """Pre-build a per-permno series of adjusted prices for fast lookup (§8.2).

    Adjusted price = abs(prc) * cfacpr. Assumes dsf['date'] is datetime and
    dsf['prc'] may be negative (bid-ask midpoint) — abs() handles that.
    """
    d = dsf.copy()
    d["adj_prc"] = d["prc"].abs() * d["cfacpr"]
    # Drop rows with missing/zero/negative adjusted price up front so no NA can
    # leak into the drawdown windows downstream.
    d = d[np.isfinite(pd.to_numeric(d["adj_prc"], errors="coerce")) & (d["adj_prc"] > 0)]
    return {
        int(p): g.set_index("date")["adj_prc"].astype(float).dropna().sort_index()
        for p, g in d.groupby("permno")
    }


def _price_drawdown(series: pd.Series, anchor_date: pd.Timestamp,
                    delist_date: pd.Timestamp | None,
                    dlrsn: str | None) -> float:
    """Worst peak-to-trough decline over the 365-day window from anchor_date.

    Applies delisting rules: full-loss codes force -1.0 if the delist falls in
    the window; terminal codes just let the series end (no forced loss).
    Returns NaN if fewer than MIN_FWD_DAYS trading days are available.
    """
    if series is None or len(series) == 0:
        return np.nan

    end_date = anchor_date + pd.Timedelta(days=HORIZON_DAYS)
    window = series.loc[anchor_date:end_date]
    # Coerce to plain float and drop any NA/inf the source data may carry;
    # CRSP can have missing/zero prices that survive into the window.
    window = pd.to_numeric(window, errors="coerce").astype(float)
    window = window[np.isfinite(window) & (window > 0)]
    if len(window) < MIN_FWD_DAYS:
        return np.nan

    # Ordinary peak-to-trough on the windowed adjusted-price path
    run_max = window.cummax()
    dd_series = (window / run_max - 1.0)
    if dd_series.isna().all() or len(dd_series) == 0:
        return np.nan
    dd = float(dd_series.min())
    if not np.isfinite(dd):
        return np.nan

    # Delisting override: if the firm is wiped out (bankruptcy/liquidation/cease)
    # and the delist date lands inside the forward window, the position goes to
    # a full loss for the remainder of the window.
    if dlrsn in FULL_LOSS_DLRSN and delist_date is not None and pd.notna(delist_date):
        if anchor_date <= delist_date <= end_date:
            return -1.0
    # Terminal codes (merger / foreign acquisition): no forced loss. The price
    # series simply stops; `dd` already reflects the path up to that point.

    return dd


def build_targets(
    anchors: pd.DataFrame,
    dsf: pd.DataFrame,
    company: pd.DataFrame,
) -> pd.DataFrame:
    """Build the forward 12-month drawdown target frame (brief §8.2).

    Parameters
    ----------
    anchors : DataFrame with at least ['gvkey','fyear','permno','anchor_date'].
              anchor_date must be datetime.
    dsf     : CRSP daily stock file with ['permno','date','prc','cfacpr'].
    company : compustat_company with ['gvkey','dlrsn','dldte'] for delisting rules.

    Returns
    -------
    A copy of `anchors` with added columns:
      fwd_12m_max_dd, large_dd_30, large_dd_50, dd_year_pct
    Rows where the target is NaN (insufficient forward data) are dropped.
    """
    a = anchors.copy()
    a["anchor_date"] = pd.to_datetime(a["anchor_date"])

    # Delisting reference: one row per gvkey
    comp = company[["gvkey", "dlrsn", "dldte"]].drop_duplicates("gvkey").copy()
    comp["dldte"] = pd.to_datetime(comp["dldte"])
    a = a.merge(comp, on="gvkey", how="left")

    series_map = build_permno_price_series(dsf)

    fwd = np.empty(len(a), dtype=float)
    permnos = a["permno"].to_numpy()
    adates = a["anchor_date"].to_numpy()
    dldtes = a["dldte"].to_numpy()
    dlrsns = a["dlrsn"].to_numpy()

    for i in range(len(a)):
        series = series_map.get(int(permnos[i]))
        ddate = dldtes[i]
        ddate = pd.Timestamp(ddate) if pd.notna(ddate) else None
        dr = dlrsns[i] if isinstance(dlrsns[i], str) else None
        fwd[i] = _price_drawdown(series, pd.Timestamp(adates[i]), ddate, dr)

    a["fwd_12m_max_dd"] = fwd
    a = a.dropna(subset=["fwd_12m_max_dd"]).reset_index(drop=True)

    # Clip into the valid [-1, 0] range (numerical safety)
    a["fwd_12m_max_dd"] = a["fwd_12m_max_dd"].clip(lower=-1.0, upper=0.0)

    # Binary flags (§8.2)
    a["large_dd_30"] = (a["fwd_12m_max_dd"] <= -0.30).astype(int)
    a["large_dd_50"] = (a["fwd_12m_max_dd"] <= -0.50).astype(int)

    # Percentile rank within anchor calendar year: 1.0 = worst (most negative)
    # We rank ascending on the NEGATIVE so that the most negative dd -> highest pct.
    a["dd_year_pct"] = (
        a.groupby("fyear")["fwd_12m_max_dd"]
        .rank(pct=True, ascending=True)   # most negative -> smallest rank...
    )
    a["dd_year_pct"] = 1.0 - a["dd_year_pct"]  # ...flip so worst -> 1.0

    return a


def summarize_targets(targets: pd.DataFrame) -> None:
    """Print a sanity summary. The headline check: large_dd_30 rate should land
    in the brief's expected 10-20% tail-mass range (§2, §9.5), NOT ~50%."""
    n = len(targets)
    rate30 = targets["large_dd_30"].mean()
    rate50 = targets["large_dd_50"].mean()
    print(f"Targets built: {n:,} anchors")
    print(f"  mean fwd_12m_max_dd : {targets['fwd_12m_max_dd'].mean():.3f}")
    print(f"  median              : {targets['fwd_12m_max_dd'].median():.3f}")
    print(f"  large_dd_30 rate    : {rate30:.1%}   (brief expects ~10-20%)")
    print(f"  large_dd_50 rate    : {rate50:.1%}")
    if rate30 > 0.30:
        print("  WARNING: >30% base rate — forward window may still be too long.")
    print("\n  large_dd_30 rate by fyear:")
    print(targets.groupby("fyear")["large_dd_30"].mean().round(3).to_string())
