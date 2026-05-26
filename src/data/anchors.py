"""Anchor panel builder (brief §8.1).

Produces the (gvkey, fyear, permno, anchor_date) frame that every later step
(targets, financial features, price features) joins onto.

Steps per the brief
-------------------
1. For each firm-year in funda with a valid datadate, set
   `anchor_date = datadate + 90 days`. This is the realistic 10-K filing
   availability point.
2. Resolve permno via crsp_linktable with date validity
   `linkdt <= datadate <= linkenddt`. Prefer linkprim='P' rows on ties.
3. Require at least 5 prior fiscal years of funda data (fyear-4 .. fyear).
   This bounds the panel to fyear >= 1999 + 4 = 2003.
4. Optionally drop fyear 2024 anchors whose forward window extends past
   dsf coverage (handled by caller / by build_targets dropping NaN rows).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

ANCHOR_LAG_DAYS = 90    # brief §8.1: datadate + 90d models 10-K filing lag
HISTORY_YEARS = 5       # brief §8.3: need 5 prior fyears of ratios


def resolve_permno(funda: pd.DataFrame, linktable: pd.DataFrame) -> pd.DataFrame:
    """Resolve permno per (gvkey, datadate) via crsp_linktable.

    Brief §8.1: link is valid when linkdt <= datadate <= linkenddt. On ties
    prefer linkprim == 'P' (primary). Drops rows with no valid match.
    """
    f = funda[["gvkey", "fyear", "datadate"]].copy()
    f["datadate"] = pd.to_datetime(f["datadate"])

    lt = linktable[["gvkey", "permno", "linkdt", "linkenddt", "linkprim"]].copy()
    lt["linkdt"] = pd.to_datetime(lt["linkdt"])
    lt["linkenddt"] = pd.to_datetime(lt["linkenddt"])

    merged = f.merge(lt, on="gvkey", how="left")
    valid = (merged["linkdt"] <= merged["datadate"]) & \
            (merged["datadate"] <= merged["linkenddt"])
    merged = merged.loc[valid].copy()

    # Prefer linkprim='P'. Sort so primary rows come first within each
    # (gvkey, fyear), then drop duplicates keeping the first.
    merged["_primary"] = (merged["linkprim"] == "P").astype(int)
    merged = merged.sort_values(["gvkey", "fyear", "_primary"], ascending=[True, True, False])
    merged = merged.drop_duplicates(subset=["gvkey", "fyear"], keep="first")

    return merged[["gvkey", "fyear", "datadate", "permno"]].reset_index(drop=True)


def has_history(funda: pd.DataFrame, n_years: int = HISTORY_YEARS) -> pd.DataFrame:
    """Flag (gvkey, fyear) pairs that have all n_years of prior funda.

    Required for the (5, 18) ratio sequence (brief §8.3). Returns a frame
    with columns gvkey, fyear, has_history (bool).
    """
    fy = funda[["gvkey", "fyear"]].drop_duplicates()
    fyears_by_g = fy.groupby("gvkey")["fyear"].apply(set).to_dict()

    rows = []
    for (g, y) in fy.itertuples(index=False, name=None):
        needed = {y - k for k in range(n_years)}   # {y-4, y-3, y-2, y-1, y}
        rows.append((g, int(y), needed.issubset(fyears_by_g.get(g, set()))))
    return pd.DataFrame(rows, columns=["gvkey", "fyear", "has_history"])


def build_anchors(
    funda: pd.DataFrame,
    linktable: pd.DataFrame,
    min_fyear: int = 2003,
    max_fyear: int | None = 2024,
    require_history: bool = True,
) -> pd.DataFrame:
    """Build the anchor panel (brief §8.1).

    Parameters
    ----------
    funda      : compustat_funda with at least gvkey, fyear, datadate.
    linktable  : crsp_linktable with gvkey, permno, linkdt, linkenddt, linkprim.
    min_fyear  : lower bound on fyear (default 2003: needs 1999 to look back 4y).
    max_fyear  : upper bound on fyear (default 2024). fyear 2024 anchors may
                 have partial forward windows; build_targets() drops them
                 cleanly if so.
    require_history : if True, restrict to anchors with all 5 prior fyears.

    Returns
    -------
    DataFrame with columns gvkey, fyear, permno, anchor_date, datadate.
    """
    a = resolve_permno(funda, linktable)
    a["anchor_date"] = a["datadate"] + pd.Timedelta(days=ANCHOR_LAG_DAYS)

    a = a[a["fyear"] >= min_fyear]
    if max_fyear is not None:
        a = a[a["fyear"] <= max_fyear]

    if require_history:
        hist = has_history(funda, HISTORY_YEARS)
        a = a.merge(hist, on=["gvkey", "fyear"], how="left")
        a = a[a["has_history"].fillna(False)].drop(columns=["has_history"])

    a = a.dropna(subset=["permno"]).reset_index(drop=True)
    a["permno"] = a["permno"].astype(int)
    return a[["gvkey", "fyear", "permno", "anchor_date", "datadate"]]


def summarize_anchors(anchors: pd.DataFrame) -> None:
    print(f"Anchors built: {len(anchors):,}")
    print(f"  fyear range : {anchors['fyear'].min()} .. {anchors['fyear'].max()}")
    print(f"  unique gvkeys: {anchors['gvkey'].nunique():,}")
    print(f"  unique permnos: {anchors['permno'].nunique():,}")
    print("\n  anchors by fyear:")
    print(anchors.groupby("fyear").size().to_string())
