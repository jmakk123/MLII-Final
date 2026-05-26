"""Forward 12-month drawdown target builder (brief §8.2).

For each anchor row this module computes the worst peak-to-trough decline over
the forward window from adjusted CRSP prices, applies delisting overrides, and
emits the three derived targets (binary at -30%, binary at -50%, within-year
rank percentile).

Forward window
--------------
The brief's §8.2 code uses a 365-CALENDAR-DAY ceiling from `anchor_date` with a
minimum of 60 trading days inside the window. (Brief prose says "252 trading
days"; the code says 365 calendar days. Calendar-capping is the unambiguous
artifact and bounds the window cleanly at ~12 months, so we follow the code.
Documented here as a known choice.)

This module replaces the buggy `firm[firm.date > anchor].head(252)` recipe
used in the original Nicholas baseline notebook, which had no calendar ceiling
and reached far past 12 months for firms with sparse trading.

Delisting handling (brief §8.2)
-------------------------------
- dlrsn 02, 03, 04 (bankruptcy / liquidation / cease ops): full loss → -1.0
  if the delist falls inside the window.
- dlrsn 01, 07 (merger / foreign acquisition): terminal value at delist; the
  price series ends and `dd` reflects the path up to that point. No forced loss.
- Other dlrsn or no in-window delisting: ordinary price-based drawdown.

Output columns (brief §8.2)
---------------------------
gvkey, fyear, permno, anchor_date, fwd_12m_max_dd, large_dd_30, large_dd_50,
dd_year_pct (1.0 = worst within the anchor calendar year).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

HORIZON_DAYS = 365   # brief §8.2 code: calendar-day forward window
MIN_FWD_DAYS = 60    # brief §8.2 code: require >=60 trading days in the window

FULL_LOSS_DLRSN = {"02", "03", "04"}
TERMINAL_DLRSN = {"01", "07"}


def build_permno_price_series(dsf: pd.DataFrame) -> dict[int, pd.Series]:
    """Pre-build a per-permno series of adjusted prices for fast lookup.

    Adjusted price = abs(prc) * cfacpr. CRSP encodes bid-ask midpoints as
    negative prc; abs() handles that. Drops missing/zero/negative adjusted
    prices up front so they cannot leak into drawdown windows downstream.
    """
    d = dsf.copy()
    d["adj_prc"] = d["prc"].abs() * d["cfacpr"]
    d = d[np.isfinite(pd.to_numeric(d["adj_prc"], errors="coerce")) & (d["adj_prc"] > 0)]
    return {
        int(p): g.set_index("date")["adj_prc"].astype(float).dropna().sort_index()
        for p, g in d.groupby("permno")
    }


def _price_drawdown(series: pd.Series, anchor_date: pd.Timestamp,
                    delist_date: pd.Timestamp | None,
                    dlrsn: str | None) -> float:
    """Worst peak-to-trough decline over the HORIZON_DAYS window from anchor_date.

    Returns NaN if fewer than MIN_FWD_DAYS trading days are available. Applies
    delisting overrides described in the module docstring.
    """
    if series is None or len(series) == 0:
        return np.nan

    end_date = anchor_date + pd.Timedelta(days=HORIZON_DAYS)
    window = series.loc[anchor_date:end_date]
    window = pd.to_numeric(window, errors="coerce").astype(float)
    window = window[np.isfinite(window) & (window > 0)]
    if len(window) < MIN_FWD_DAYS:
        return np.nan

    run_max = window.cummax()
    dd_series = (window / run_max - 1.0)
    if dd_series.isna().all() or len(dd_series) == 0:
        return np.nan
    dd = float(dd_series.min())
    if not np.isfinite(dd):
        return np.nan

    if dlrsn in FULL_LOSS_DLRSN and delist_date is not None and pd.notna(delist_date):
        if anchor_date <= delist_date <= end_date:
            return -1.0
    # Terminal codes (merger / foreign acquisition): no forced loss.

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
    A copy of `anchors` with added columns fwd_12m_max_dd, large_dd_30,
    large_dd_50, dd_year_pct. Rows with NaN target (insufficient forward
    data) are dropped.
    """
    a = anchors.copy()
    a["anchor_date"] = pd.to_datetime(a["anchor_date"])

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
    a["fwd_12m_max_dd"] = a["fwd_12m_max_dd"].clip(lower=-1.0, upper=0.0)

    a["large_dd_30"] = (a["fwd_12m_max_dd"] <= -0.30).astype(int)
    a["large_dd_50"] = (a["fwd_12m_max_dd"] <= -0.50).astype(int)

    # Within-year rank percentile: 1.0 = worst (most negative) within fyear.
    a["dd_year_pct"] = (
        a.groupby("fyear")["fwd_12m_max_dd"]
        .rank(pct=True, ascending=True)
    )
    a["dd_year_pct"] = 1.0 - a["dd_year_pct"]

    return a


def summarize_targets(targets: pd.DataFrame) -> None:
    """Print a sanity summary. Headline check: large_dd_30 rate should land in
    the brief's expected 10-20% tail-mass range. Higher rates are a real
    property of the CRSP small-cap-heavy universe, not necessarily a bug."""
    n = len(targets)
    rate30 = targets["large_dd_30"].mean()
    rate50 = targets["large_dd_50"].mean()
    print(f"Targets built: {n:,} anchors")
    print(f"  mean fwd_12m_max_dd : {targets['fwd_12m_max_dd'].mean():.3f}")
    print(f"  median              : {targets['fwd_12m_max_dd'].median():.3f}")
    print(f"  large_dd_30 rate    : {rate30:.1%}   (brief expects ~10-20%)")
    print(f"  large_dd_50 rate    : {rate50:.1%}")
    if rate30 > 0.30:
        print("  Note: >30% base rate; lean on rank metrics as primary discrimination.")
    print("\n  large_dd_30 rate by fyear:")
    print(targets.groupby("fyear")["large_dd_30"].mean().round(3).to_string())
