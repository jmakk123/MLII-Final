# DrawdownSignal

## ADSP 31018 – Machine Learning II
### Final Project – University of Chicago

**Instructor:** Batuhan Gundogdu, Gregory Green
**Term:** Spring 2026

---

## Team Members

- Nick Dhaliwal
- Jared Maksoud
- Nicholas Mikhail
- Yung Chyi Yang

---

# Overview

DrawdownSignal is a deep learning project focused on forecasting the maximum peak-to-trough stock price drawdown that US public firms will experience over the next 12 months. The project uses a dual-stream neural network that reads five years of accounting fundamentals plus seven price-derived market features and outputs a single forward drawdown score in `[-1, 0]`.

The repository includes:
- WRDS Compustat and CRSP data extraction
- Full preprocessing, feature engineering, and time-blocked split logic
- Classical baselines (volatility-only, Ridge, Gradient Boosted Trees)
- Dual-stream LSTM fusion architecture
- Ablation studies (price-only, financials-only, MLP fusion, cross-attention fusion)
- 3-seed ensemble inference
- Live evaluation site with browsable predictions, top-risk watchlist, year-by-year backtest, and a head-to-head firm comparison

The project was developed using PyTorch, scikit-learn, pandas, and React for the deliverable site.

---

# Repository Structure

```text
MLII-Final/
│
├── notebooks/
│   ├── 00_build_master_dataset.ipynb
│   ├── 01_extract_wrds_raw.ipynb
│   ├── 02_baselines.ipynb
│   ├── 03_fusion_model.ipynb
│   └── drawdown_score.ipynb
│
├── src/
│   ├── data/
│   ├── price/
│   ├── tabular/
│   ├── temporal/
│   ├── fusion/
│   └── eval/
│
├── scripts/
│   ├── run_pipeline.py
│   └── meta_ensemble.py
│
├── data/
│   ├── raw/
│   └── processed/
│
├── models/
│   └── fusion_model_best.pt
│
├── reports/
│   ├── figures/
│   ├── outputs/
│   ├── progress_report_2026-05-19.md
│   └── writeup_appendix.md
│
├── site/
├── docs/
├── presentation/
└── README.md
```

---

# Dataset

This project uses two licensed databases obtained through Wharton Research Data Services (WRDS).

Dataset:
- Compustat Annual fundamentals (132K firm-year rows, 1999 to 2025)
- Compustat Company reference table (45K rows, static GICS and delisting codes)
- CRSP Daily Prices (29M rows, 1999 to 2024)
- CCM Link Table (38K rows, gvkey to permno mapping)

WRDS access:
- https://wrds-www.wharton.upenn.edu/

The processed anchor panel covers fiscal years 2003 to 2024 and totals 76,990 firm-year rows after applying the five-year history requirement.

---

# Important Repository Notes

Large raw and processed datasets and the trained model weights are **not included** in this GitHub repository due to GitHub file size limitations and the licensed nature of CRSP and Compustat.

The following folders are excluded from version control:

```text
data/raw/
data/processed/
```

These directories contain:
- Raw WRDS parquet files (Compustat Annual, Compustat Company, CRSP Daily Prices, CCM Link Table)
- Processed anchor panel, feature tensors, and target arrays

---

# Reproducing the Dataset

To regenerate the processed dataset:

1. Acquire WRDS credentials and confirm access to Compustat and CRSP
2. Place WRDS connection details into your environment
3. Run:

```text
notebooks/01_extract_wrds_raw.ipynb
```

The extraction notebook will:
- Authenticate against WRDS
- Pull Compustat Annual, Compustat Company, CRSP Daily Prices, and the CCM Link Table
- Save each table as a parquet file under `data/raw/`

Then run:

```text
notebooks/00_build_master_dataset.ipynb
```

The master dataset notebook will:
- Link Compustat firms to CRSP price series via the CCM table
- Build the anchor panel (one row per firm-year)
- Compute the 18 financial ratios across five lag years
- Compute the 7 price-derived features over the trailing 252 trading days
- Compute the forward 12-month max drawdown target
- Apply train-only winsorization and z-scoring
- Save processed outputs into `data/processed/`

---

# Model Development Pipeline Overview

## 1. Raw Data Extraction

Notebook:
```text
notebooks/01_extract_wrds_raw.ipynb
```

This notebook pulls the four raw tables from WRDS that the rest of the pipeline depends on.

### Key extraction steps

- **Authenticate against WRDS**
  - Uses the `wrds` Python package with the user's credentials
  - No data is included in the repository; every team member must run this step

- **Pull Compustat Annual**
  - 132K firm-year rows from 1999 to 2025
  - 39 columns including the 18 line items used to compute our ratios

- **Pull Compustat Company**
  - 45K rows of static reference data
  - GICS sectors and `dlrsn` delisting codes used for bankruptcy handling

- **Pull CRSP Daily Prices**
  - 29M daily price rows from 1999 to 2024
  - Adjusted prices via the `cfacpr` split factor for continuity across corporate actions

- **Pull the CCM Link Table**
  - 38K rows mapping Compustat `gvkey` to CRSP `permno`
  - Includes date validity windows to handle reorganizations

Outputs are saved into:
```text
data/raw/
```

---

## 2. Master Dataset Construction

Notebook:
```text
notebooks/00_build_master_dataset.ipynb
```

This notebook builds the anchor panel and all model inputs from the four raw WRDS tables.

### Key construction steps

- **Anchor the panel**
  - Each anchor is a (firm, fyear) pair
  - Anchor date is fiscal-year-end + 90 days, modeling the realistic 10-K filing lag
  - Requires five prior fiscal years of accounting history; anchors without a full five-year window are dropped

- **Compute the 18 financial ratios**
  - Altman X1 through X5 (working capital, retained earnings, EBIT, market value, sales scaled by total assets or liabilities)
  - Ohlson and Zmijewski components (leverage, current ratio, ROA, log size)
  - Margin family (gross, operating, net, EBITDA, OpEx ratio, D&A intensity)
  - Long-term debt ratio, inventory turnover, receivables turnover

- **Compute the 7 price-derived features**
  - Trailing 252-day annualized volatility
  - Trailing 12-month total return
  - Skewness and kurtosis of trailing daily returns
  - Maximum prior 12-month drawdown
  - Beta to the equal-weighted market portfolio
  - Log average daily dollar volume

- **Compute the target**
  - Forward 12-month maximum peak-to-trough drawdown from CRSP daily prices
  - Delisting codes 02 / 03 / 04 (bankruptcy, liquidation, cease operations) force the target to -1.0
  - Anchors without at least 60 trading days of forward data are dropped

- **Apply the time-blocked split**
  - Train: fiscal years 2003 to 2017 (54,316 anchors)
  - Validation: fiscal years 2018 to 2019 (7,196 anchors; covers COVID by design)
  - Test: fiscal years 2020 to 2023 (15,311 anchors)

- **Train-only scaling**
  - Winsorize ratios at the 1st and 99th percentile of the training distribution
  - Z-score using training means and standard deviations only
  - Statistics are frozen before being applied to validation and test

Outputs are saved into:
```text
data/processed/
```

---

## 3. Baseline Modeling

Notebook:
```text
notebooks/02_baselines.ipynb
```

This notebook trains three classical baselines on the 97-dimensional concatenated input (90 financial + 7 price features) so that the deep model has something to beat.

The notebook focuses on:
- Establishing a strong volatility-only floor
- Running L2-regularized linear regression (Ridge)
- Running gradient-boosted trees (Sklearn `GradientBoostingRegressor`)
- Reporting all baseline metrics on the same test fold the deep model uses

Baseline results:

| Model              | MAE     | RMSE    | R²      | PR-AUC at -30% | Brier   | Spearman | Top-Decile |
|--------------------|--------:|--------:|--------:|---------------:|--------:|---------:|-----------:|
| Vol-Only           | 0.1386  | 0.1820  | 0.246   | 0.829          | 0.494   | 0.637    | 0.430      |
| Ridge              | 0.1244  | 0.1615  | 0.406   | 0.853          | 0.365   | 0.657    | 0.473      |
| Gradient Boosted   | 0.1226  | 0.1621  | 0.402   | 0.850          | 0.207   | 0.663    | 0.490      |

Key findings:
- Volatility alone is a surprisingly strong predictor of forward drawdown, but loses on calibration (Brier 0.494)
- Ridge meaningfully improves over volatility on every primary metric
- Gradient boosted trees win the Brier score and capture useful non-linear feature interactions
- All baselines run on the same 97-dimensional input as the deep model for a fair comparison

Outputs are saved into:
```text
reports/outputs/
reports/figures/
```

---

## 4. Fusion Model and Ablations

Notebook:
```text
notebooks/03_fusion_model.ipynb
```

This notebook trains the deep neural architectures and runs the architectural ablations that the paper depends on.

The notebook focuses on:
- The full Financial LSTM dual-stream fusion model
- Architectural ablations (financials-only, price-only, MLP fusion, cross-attention fusion)
- Multi-seed ensembling for inference stability
- Auxiliary BCE classification head for sharper rank metrics

Architectures:
- Financial LSTM Fusion (winner)
- MLP Fusion (LSTM replaced with a flat MLP on the financial sequence)
- Financials-only (no price branch)
- Price-only (no financial branch)
- Cross-Attention Fusion (price queries the LSTM hidden states via single-head attention)

Training setup:
- Five-year financial sequence shape: (B, 5, 18)
- Price feature shape: (B, 7)
- Loss: Huber(δ=0.05) for regression + 0.3 · BCE for the auxiliary >30% classification head
- Optimizer: AdamW with weight decay 1e-4, cosine annealing, learning rate 1e-3
- Batch 256, patience 8 epochs on validation MAE, maximum 50 epochs
- Three random seeds per architecture; predictions averaged at inference

Architectural comparison:

| Architecture                | MAE     | PR-AUC at -30% | Spearman | Top-Decile | Notes                                            |
|-----------------------------|--------:|---------------:|---------:|-----------:|--------------------------------------------------|
| Financial LSTM Fusion       | **0.1214** | **0.852** | **0.666** | **0.487**  | Full dual-stream model; ensemble winner          |
| MLP Fusion                  | 0.1219  | 0.851          | 0.664    | 0.483      | Ties LSTM fusion within seed noise               |
| Financials-only             | 0.1267  | 0.818          | 0.643    | 0.461      | Weakest neural model; price stream matters       |
| Price-only                  | 0.1255  | 0.835          | 0.651    | 0.469      | Surprisingly close to vol-only on PR-AUC         |
| Cross-Attention Fusion      | 0.1218  | 0.850          | 0.665    | 0.485      | Ties LSTM fusion; attention unnecessary at T=5   |

Key findings:
- Both streams contribute meaningfully; the dual design beats either stream alone
- LSTM and MLP fusion are statistically tied; sequence modeling matters but only at the margin with five timesteps
- Cross-attention adds parameters without statistical improvement; honest negative ablation
- The auxiliary BCE head sharpens binary discrimination (PR-AUC +1.5 pp) without hurting regression MAE
- Three-seed ensembling reduces selection noise; the headline ensemble row tightens every metric over single seeds

Outputs are saved into:
```text
reports/outputs/
reports/figures/
models/
```

---

## 5. Final Production Run

Notebook:
```text
notebooks/drawdown_score.ipynb
```

This notebook is the polished end-to-end pipeline that produces the headline numbers and the test-fold predictions used by the live site.

The notebook focuses on:
- Loading processed inputs from `data/processed/`
- Loading the trained 3-seed fusion model weights
- Producing the headline test-fold predictions
- Generating every figure that appears on the live site (PR curve, calibration plot, error distribution, sector heatmap)
- Exporting the prediction arrays that the React frontend reads

Headline results (3-seed ensemble, test fold, 15,311 firm-years):

| Metric                       | Value  | Direction        |
|------------------------------|-------:|------------------|
| MAE                          | 0.121  | lower is better  |
| RMSE                         | 0.161  | lower is better  |
| R²                           | 0.410  | higher is better |
| PR-AUC at -30%               | 0.852  | higher is better |
| Brier score                  | 0.226  | lower is better  |
| Within-year Spearman         | 0.666  | higher is better |
| Top-decile precision         | 0.487  | higher is better |
| Overall accuracy (2x2)       | 72.4%  | higher is better |
| Recall on actual crashes     | 75.2%  | higher is better |
| False alarm rate             | 30.9%  | lower is better  |

Outputs generated:
- `reports/outputs/results_headline_ensemble.csv`
- `reports/outputs/preds_lstm_fusion_ensemble.npy`
- `reports/figures/calibration_scatter_test.png`
- `reports/figures/reliability_dd30_test.png`
- `reports/figures/named_firm_trajectories.png`
- `reports/figures/gics_sector_breakdown_covid.png`

Outputs are saved into:
```text
reports/outputs/
reports/figures/
site/src/data/
```

---

# Evaluation

Models are evaluated using:
- Mean Absolute Error (MAE)
- Root Mean Squared Error (RMSE)
- Coefficient of Determination (R²)
- Precision-Recall Area Under Curve at the -30% threshold (PR-AUC)
- Brier score (probability calibration)
- Within-year Spearman rank correlation
- Top-decile precision (fraction of the riskiest 10% that actually crashed)

The PR-AUC, Brier, and within-year Spearman are the brief's primary metrics. R² and RMSE are reported alongside for completeness.

---

# Product Demo

Live site:
- https://jmakk123.github.io/MLII-Final/

The live site lets a visitor:
- Browse every test-fold prediction (15,311 rows, filterable by year, sector, and outcome)
- Open any firm and see five years of accounting ratios, the forward 12-month price path, and the model's predicted vs realized drawdown
- View a top-risk watchlist per year
- Replay the model year by year with a sector hit-rate heatmap
- Compare two firms side by side
- Play DrawdownMarket, an interactive class-presentation activity

---

# Architecture

```text
financial ratios (B, 5, 18)  →  LSTM(2 layers, h=64)  → Linear(32) ┐
                                                                    ├→ concat (48-d) → MLP[32, 32] → scalar
price features    (B, 7)     →  MLP[32, 32, 16]                    ┘
```

Loss: `Huber(δ=0.05) + 0.3 · BCE(@-30%)`
Optimizer: `AdamW(1e-3, wd=1e-4)`, cosine annealing, batch 256, patience 8
Inference: 3-seed ensemble

---

# Known Limitations

**Survivorship bias.** Firms that fully delist within the forward 12-month window (bankruptcies, liquidations) cannot have a 12-month drawdown computed and are excluded from the test set. The headline numbers reflect "drawdown among survivors" and are slightly kinder than the true distribution.

**COVID-era validation.** Fiscal year 2018 anchors land in March 2019, so the validation forward window covers COVID. The architecture and hyperparameters are selected against that single shock, which means model selection rewards COVID-robust designs but may slightly underweight other regime risks.

**Annual update cadence.** The financial ratios update only when a new 10-K is filed (annually). Between filings, the score reflects last-year accounting plus rolling price features. The model should be retrained annually as new ground-truth drawdowns accumulate.

**No sentence-level macro context.** The model is fundamentally bottom-up and firm-specific. Sector-wide events not yet priced into the trailing accounting data (early-pandemic March 2020 is the canonical example) can move drawdowns in ways the model cannot anticipate.

---

# Technologies Used

## Deep Learning
- PyTorch
- scikit-learn

## Data Processing
- NumPy
- pandas
- pyarrow

## Visualization
- Matplotlib
- recharts (live site)

## Data Sources
- WRDS Compustat
- WRDS CRSP

## Live Site
- React
- Vite
- Tailwind 4
- framer-motion
- lucide-react

## Deployment
- GitHub Pages (live site)

---
