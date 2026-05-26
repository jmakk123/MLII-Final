"""Time-blocked train / val / test split (brief §8.5).

Train: fyear 2003 .. 2017   (15 years)
Val:   fyear 2018 .. 2019   (target window covers COVID drawdowns)
Test:  fyear 2020 .. 2023   (rate-hike wave + post-COVID distress)

fyear 2024 anchors are excluded from the main evaluation because the forward
window extends past dsf coverage. They are available for a live-score appendix.

A random firm-year split would leak (same firm in train and test) and would
not match how a forward-drawdown model is deployed. Block-time is the only
defensible choice.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

TRAIN_YEARS = list(range(2003, 2018))   # 2003..2017
VAL_YEARS   = [2018, 2019]
TEST_YEARS  = list(range(2020, 2024))   # 2020..2023


def assign_split(fyear: int) -> str:
    if fyear in TRAIN_YEARS:
        return "train"
    if fyear in VAL_YEARS:
        return "val"
    if fyear in TEST_YEARS:
        return "test"
    return "drop"


def add_split_column(df: pd.DataFrame, fyear_col: str = "fyear") -> pd.DataFrame:
    """Append a 'split' column and drop rows outside the brief's year ranges."""
    out = df.copy()
    out["split"] = out[fyear_col].map(assign_split)
    return out[out["split"] != "drop"].reset_index(drop=True)


def split_masks(fyears: np.ndarray) -> dict[str, np.ndarray]:
    """Return boolean masks over an aligned fyear array.

    Useful when the rest of the pipeline operates on numpy arrays (X, y) and
    needs to index train/val/test slices without a separate DataFrame.
    """
    fyears = np.asarray(fyears).astype(int)
    return {
        "train": np.isin(fyears, TRAIN_YEARS),
        "val":   np.isin(fyears, VAL_YEARS),
        "test":  np.isin(fyears, TEST_YEARS),
    }
