# Data

Raw data is not stored in this repository (it would be over 500 MB and Compustat / CRSP are licensed). This directory is the expected mount point.

## Layout

```
data/
├── raw/                     # source parquets pulled from WRDS
│   ├── compustat_funda.parquet      # ~30 MB  · 132K rows · annual fundamentals
│   ├── compustat_company.parquet    # ~3 MB   · 45K rows  · GICS sectors, dlrsn codes
│   ├── compustat_bklabels.parquet   # ~50 KB  · 387 bankruptcies (Chapter 7/11)
│   ├── crsp_linktable.parquet       # ~2 MB   · gvkey ↔ permno mapping
│   ├── crsp_dsf.parquet             # ~600 MB · 29M daily price rows 1999-2024
│   └── crsp_msf.parquet             # ~50 MB  · monthly prices (unused)
└── processed/               # derived artifacts created by notebooks/00
    ├── anchors.parquet              # one row per (gvkey, fyear) anchor
    ├── features.parquet             # 18 ratios × 5 lags + 7 price features
    └── targets.parquet              # forward 12-month max drawdown
```

## Retrieval

Compustat and CRSP are subscription-only and require WRDS access. Pull with the credentials configured in `notebooks/01_extract_wrds_raw.ipynb`. The notebook uses the WRDS Python package (`pip install wrds`) and standard SQL queries; no scraping.

If you have access to a teammate's already-downloaded parquets, drop them into `data/raw/` and skip notebook 01.

## Sizes for reference

- Total raw: ~700 MB
- Total processed: ~30 MB

`data/raw/`, `data/processed/`, and `data/cache/` are all gitignored.
