# Predicting the Fall — Forward Drawdown Signal
**MS-ADS 2026 · Machine Learning II · University of Chicago**

A dual-stream neural network that forecasts the maximum peak-to-trough stock price drawdown for US public companies over the next 12 months, using five years of Compustat accounting history.

---

## Live Site

GitHub Pages: **https://jmakk123.github.io/MLII-Final/**

---

## Run the Site Locally

```bash
# 1. Clone the repo
git clone https://github.com/jmakk123/MLII-Final.git
cd MLII-Final

# 2. Serve the docs folder
python3 -m http.server 8080 --directory docs

# 3. Open in your browser
open http://localhost:8080
```

That's it — no dependencies, no build step. Pure HTML/CSS/JS.

To stop the server: `kill $(lsof -ti:8080)`

---

## Project Structure

```
final_proj/
├── docs/                        # GitHub Pages site (open index.html)
│   └── index.html
├── 00_build_master_dataset.ipynb  # Builds anchors + features + targets
├── 01_extract_wrds_raw.ipynb      # Pulls raw data from WRDS (needs credentials)
├── 02_baselines.ipynb             # Vol-only, Ridge, XGBoost baselines
├── 03_fusion_model.ipynb          # LSTM fusion model + ablations
├── features.py                    # Shared feature engineering module
├── metrics.py                     # Shared evaluation module (within-year metrics)
├── targets.py                     # Forward drawdown target construction
├── fusion_model_best.pt           # Saved best model weights
├── baseline_results.csv           # Baseline test-set results
└── data/
    └── raw/                       # Parquet files (not in git — see below)
        ├── compustat_funda.parquet
        ├── compustat_company.parquet
        ├── crsp_linktable.parquet
        └── crsp_dsf.parquet
```

---

## Getting the Data

Raw data files are excluded from git (the DSF file alone is ~450 MB). Get them from the team shared Google Drive folder, then place them in `data/raw/`.

Once the parquets are in place, run notebooks in order: `00` → `01` (optional, re-pulls from WRDS) → `02` → `03`.

WRDS access is required to re-pull raw data via `01_extract_wrds_raw.ipynb`.

---

## Results Summary

| Model | MAE | RMSE | R² | PR-AUC | Brier |
|---|---|---|---|---|---|
| Vol-Only (floor) | 0.1532 | 0.2091 | 0.1664 | 0.8689 | 0.5732 |
| Ridge | 0.1692 | 0.2183 | 0.0914 | 0.8368 | 0.3306 |
| XGBoost | 0.1660 | 0.2031 | 0.2137 | 0.8531 | 0.3177 |
| **Financial LSTM** | **0.1444** | **0.1926** | **0.2926** | 0.8662 | **0.2665** |

Best model: financial-only LSTM branch (no price features). Brier score improved 54% over the vol-only baseline. PR-AUC is a statistical tie (−0.27pp).
