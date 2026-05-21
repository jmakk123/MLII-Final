# MLII Final Project — Handoff Document for Claude Code

## What This Project Is
Predicting the maximum peak-to-trough stock price drawdown a US public company will experience over the next 12 months. Given 5 years of annual financial filings and recent price patterns, the model outputs a single forward-drawdown score per firm-year. Regression target in [-1, 0].

## Repository
https://github.com/jmakk123/MLII-Final

## Local Data Path
/Users/nicholasmikhail/Desktop/UCHICAGO CLASSES/machine learning 2/project/

## Raw Data Files (on local machine only, too large for GitHub)
- compustat_funda.parquet — 132,447 rows, 39 cols, fyear 1999–2025
- compustat_company.parquet — 45,242 rows, GICS sectors + delisting reasons
- compustat_bklabels.parquet — 387 bankruptcies, Chapter 7 and 11 only
- crsp_linktable.parquet — 38,738 rows, gvkey to permno mapping with date validity
- crsp_dsf.parquet — 29M rows, daily prices 1999–2024
- crsp_msf.parquet — monthly prices, redundant, ignore

## Generated Files (created by running 02_baselines.ipynb)
- anchors.parquet — 87,995 firm-years with drawdown targets
- features.parquet — 87,995 x 97 feature matrix (90 financial + 7 price)

---

## What Is Already Built

### 02_baselines.ipynb
Full data pipeline and all three baseline models. Runs end to end. Does the following:
1. Loads all raw parquet files
2. Builds anchor dates: datadate + 90 days per firm-year, fyear 2003–2023
3. Resolves permno via linktable with date validity
4. Computes forward 12-month max drawdown target from CRSP daily prices
5. Handles delistings: bankruptcies (dlrsn 02/03/04) get -1.0, mergers keep computed drawdown
6. Computes 18 financial ratios from raw Compustat line items (Altman, Ohlson, Zmijewski + margins)
7. Winsorizes at 1/99 percentile within fyear, z-scores within fyear using train fold stats only
8. Builds 90-wide financial feature matrix: 5 years x 18 ratios per anchor
9. Computes 7 price features from 252 trading days before anchor date:
   - Annualized volatility
   - Total return
   - Skewness of daily returns
   - Kurtosis of daily returns
   - Max prior 12-month drawdown
   - Beta vs equal-weighted market
   - Log average daily dollar volume
10. Z-scores price features within fyear using train fold statistics only
11. Concatenates to 97-wide feature matrix
12. Time-blocked split: train 2003–2017, val 2018–2019, test 2020–2023
13. Baseline 0: vol-only linear fit (floor)
14. Baseline 1: Ridge regression with CV alpha
15. Baseline 2: XGBoost regressor with small hyperparameter search
16. Saves anchors.parquet and features.parquet

### features.py
Shared feature-building module written by teammate. Import from this instead of duplicating code.

### metrics.py
Shared evaluation module written by teammate. Computes metrics within-year (not pooled). Import from this.

---

## Baseline Results (Test Set, fyear 2020–2023)

| Model       | MAE    | RMSE   | R²     | PR-AUC | Brier  | Spearman | Top-decile |
|-------------|--------|--------|--------|--------|--------|----------|------------|
| Vol-only    | 0.1532 | 0.2091 | 0.1664 | 0.8689 | 0.5732 | 0.6477   | 0.9647     |
| Ridge       | 0.1692 | 0.2183 | 0.0914 | 0.8368 | 0.3306 | 0.5553   | 0.9573     |
| XGBoost     | 0.1660 | 0.2031 | 0.2137 | 0.8531 | 0.3177 | 0.5979   | 0.9631     |

Success bar: neural network must beat vol-only by 3pp PR-AUC (target > 0.899) and 1pp MAE (target < 0.143).

---

## Top XGBoost Features
1. pf_vol (trailing volatility) — 0.143
2. lag3_ebit_sale (operating margin 3 years ago) — 0.121
3. pf_max_dd (prior max drawdown) — 0.098
4. ebit_ta (EBIT / total assets) — 0.052
5. oancf_at (operating cash flow / assets) — 0.039

---

## What Needs to Be Built — 03_fusion_model.ipynb

### Architecture (locked, do not change)
All in plain PyTorch. No Lightning. No LLM APIs.

**Financial branch — input shape (batch, 5, 18):**
- Candidate A (LSTM): 2 layers, hidden dim 64, take final hidden state, project to 32 dims via linear layer
- Candidate B (MLP-flatten): flatten to 90 dims, 2-layer MLP with hidden dims [128, 64], output 32 dims
- Train both, pick winner on val MAE, report comparison as ablation

**Price branch — input shape (batch, 7):**
- 2-layer MLP, hidden dim 32, output 16 dims

**Fusion head — input 48 dims (32 + 16):**
- 2-layer MLP, hidden dim 32, output scalar

**Regularization:**
- Dropout 0.2 on all hidden layers
- Layer normalization on fusion input
- Weight decay 1e-4

**Training:**
- Huber loss (smooth L1, delta=0.05)
- AdamW optimizer, initial lr=1e-3
- Cosine annealing LR schedule
- Batch size 256
- Max 50 epochs
- Early stopping on val MAE, patience 5

### Ablations Required (all 4 for final results table)
1. Financials-only (drop price branch)
2. Price-only (drop financial branch)
3. Full fusion
4. LSTM encoder vs MLP-flatten encoder

### Data Loading for 03_fusion_model.ipynb

```python
import pandas as pd
import numpy as np

PATH = '/Users/nicholasmikhail/Desktop/UCHICAGO CLASSES/machine learning 2/project'

anchors  = pd.read_parquet(f'{PATH}/anchors.parquet')
features = pd.read_parquet(f'{PATH}/features.parquet')

FIN_COLS = [c for c in features.columns
            if c not in ['pf_vol','pf_ret','pf_skew','pf_kurt',
                         'pf_max_dd','pf_beta','pf_log_dv','gvkey','fyear']]
PRICE_COLS = ['pf_vol','pf_ret','pf_skew','pf_kurt','pf_max_dd','pf_beta','pf_log_dv']

TRAIN_YEARS = list(range(2003, 2018))
VAL_YEARS   = [2018, 2019]
TEST_YEARS  = list(range(2020, 2024))

# Reshape financial features from flat 90-wide to (N, 5, 18) for LSTM
fin_flat  = features[FIN_COLS].values         # (N, 90)
X_fin     = fin_flat.reshape(-1, 5, 18)        # (N, 5, 18) for LSTM branch
X_price   = features[PRICE_COLS].values        # (N, 7) for price branch
y         = anchors['drawdown'].values          # regression target
y_bin     = anchors['dd_binary'].values         # binary flag at -30%
yrs       = anchors['fyear'].values
```

---

## Evaluation Metrics (from metrics.py)
Compute on test fold only.

**Regression:** MAE, RMSE, R-squared — overall and by anchor year

**Binary at -30% threshold:** PR-AUC, ROC-AUC, recall at 5% FPR, Brier score

**Rank metrics (primary firm-level signal):**
- Spearman rank correlation within each anchor year, then averaged
- Top-decile precision within each anchor year

---

## Phase 6 Interpretability (after neural network is done)
1. GICS sector breakdown for fyear 2018 anchors (COVID anchor) — mean predicted vs realized drawdown by sector as paired bar chart. Airlines, hospitality, cruise lines, retail should show elevated risk before COVID arrives.
2. Named-firm case studies — 3 distressed firms (American Airlines, Carnival, Bed Bath & Beyond) and 3 healthy peers (P&G, Microsoft, J&J) — plot predicted vs realized drawdown trajectory across test years
3. Calibration scatter — predicted vs actual colored by anchor year with diagonal line
4. Bankruptcy cross-check — PR-AUC of drawdown score predicting next-year bankruptcy using 387 firms in compustat_bklabels

---

## Known Issues to Address in Writeup (not in code)
1. Survivorship bias — Compustat underrepresents early failures; model likely underestimates risk for small distressed firms
2. Delisting code errors — Compustat dlrsn codes have known miscoding; used bklabels as cross-check
3. Partial windows — firms with fewer than 5 prior years get zero-imputed for missing lags
4. -30% threshold — flags ~52% of firm-years instead of expected 10-20% because CRSP is small-cap heavy (73% base rate for smallest firms, 33% for largest). Recommendation: lean on rank metrics as primary evaluation
5. Cross-attention ablation — TA suggested testing cross-attention between streams vs plain concatenation; treat as stretch goal

---

## TA Feedback
Grade: strongest submission in the cohort.
Priority actions for writeup:
- Discuss survivorship bias direction of effect
- Acknowledge delisting code quality issues
- Describe partial window handling in feature construction
- Consider cross-attention ablation vs plain concatenation

---

## Final Deliverables
1. End-to-end runnable notebook
2. Trained model weights (.pt file)
3. Writeup PDF, 6-8 pages
4. Slide deck with 3 signature visuals: GICS sector breakdown, calibration scatter, named-firm trajectories
5. Modularized source code (features.py, metrics.py already done)

---

## Key Design Decisions (Locked)
- Drawdown not bankruptcy (too sparse) or return (too noisy)
- Dual-stream not single encoder (two structurally different inputs)
- LSTM vs MLP-flatten is an ablation, not a commitment
- No transformers, VAE, GAN, CNN, RL
- Plain PyTorch only, no Lightning, no LLM APIs
- Time-blocked split only, no shuffling across years
