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

# Problem Statement and Motivation

Predicting how badly a stock can fall over the next year is the single most useful number for risk teams, credit officers, portfolio managers, and venture investors. The problem is hard for three structural reasons:

- **Existing signals look backward.** Volatility is computed from past returns. Credit ratings react after public events. Altman Z-score is a 1968 linear formula and has not been retrained.
- **Bankruptcy is too rare to model directly.** Across 25 years of US public firms, there are roughly 387 bankruptcies (under 0.3% of firm-years). Rare events do not give a reliable training signal.
- **Returns are too noisy to predict.** Raw next-year returns are dominated by macro shocks and idiosyncratic news that no fundamental model can anticipate.

Forward maximum drawdown sits between bankruptcy and returns. It is continuous, defined for every firm-year, observable from CRSP daily prices, and directly useful for risk sizing. A material drawdown is what triggers margin calls, stop-outs, hedge re-balancing, and credit watchlist reviews; predicting it gives every downstream risk decision a calibrated input.

---

# Forward Drawdown in Context

The forward 12-month max drawdown score complements rather than replaces the standard risk toolkit. The most common parallel signals and how they relate:

| Signal                           | Source                          | Horizon         | What it measures                                 |
|----------------------------------|---------------------------------|-----------------|--------------------------------------------------|
| Volatility (annualized vol)      | Daily returns, trailing         | Backward        | Path bumpiness; not depth of worst loss          |
| Beta                             | Daily returns vs market         | Backward        | Sensitivity to market swings                     |
| Value at Risk (VaR)              | Distributional model            | Short (1d, 1w)  | Worst expected loss at a confidence level        |
| Conditional VaR (CVaR)           | Distributional tail integral    | Short           | Expected loss given VaR is breached              |
| Altman Z-score                   | 5 accounting ratios, 1968       | Backward, static| Bankruptcy distress class                        |
| Ohlson O-score                   | Probit on 9 inputs, 1980        | Backward, static| Bankruptcy probability                           |
| Zmijewski X-score                | Probit on 3 inputs, 1984        | Backward, static| Bankruptcy probability                           |
| Merton distance-to-default       | Option-pricing on equity / debt | Forward (1y)    | Market-implied default distance                  |
| CDS spreads                      | Credit default swap market      | Forward         | Market-priced credit risk for liquid issuers     |
| Credit rating (S&P, Moody's)     | Agency analyst review           | Slow            | Letter-grade default risk class                  |
| **Forward Max Drawdown (ours)**  | Learned NN on fundamentals + price | Forward (12m) | Realized peak-to-trough loss magnitude           |

DrawdownSignal differs from this list on three dimensions. It is **forward** rather than trailing, it is **continuous** rather than class-based, and it is **calibrated on actual outcomes** rather than imposed by a closed-form formula. The financial branch of the model uses inputs structurally similar to Altman, Ohlson, and Zmijewski; the model can be read as a learned, time-aware, deep generalization of those classical signals.

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

# Data Sources

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
  - Requires five prior fiscal years of accounting history; anchors without a full five-year window are dropped (drop-not-impute policy)

- **Compute the 18 financial ratios**
  - Altman X1 through X5: working capital / total assets, retained earnings / total assets, EBIT / total assets, market value of equity / total liabilities, sales / total assets
  - Ohlson and Zmijewski components: leverage (total liabilities / total assets), current ratio, ROA, log size (log total assets)
  - Margin family: gross margin, operating margin, net margin, EBITDA margin, OpEx ratio, D&A intensity
  - Capital structure and turnover: long-term debt ratio, inventory turnover, receivables turnover
  - Inventory and receivables turnover are NaN for financial firms and are imputed via the industry-year median

- **Compute the 7 price-derived features**
  - Trailing 252-day annualized volatility (`pf_vol`)
  - Trailing 12-month total return (`pf_ret`)
  - Skewness and kurtosis of trailing daily returns (`pf_skew`, `pf_kurt`)
  - Maximum prior 12-month drawdown (`pf_max_dd`)
  - Beta to the equal-weighted market portfolio (`pf_beta`)
  - Log average daily dollar volume (`pf_log_dv`)

- **Compute the target**
  - Forward 12-month maximum peak-to-trough drawdown from CRSP adjusted daily prices
  - Drawdown is conventionally non-positive: peak-to-trough is at worst flat, otherwise negative
  - Delisting codes 02 / 03 / 04 (bankruptcy, liquidation, cease operations) force the target to -1.0
  - Delisting codes 01 / 07 (merger, foreign acquisition) preserve terminal value
  - Anchors without at least 60 trading days of forward data are dropped

- **Apply the time-blocked split**
  - Train: fiscal years 2003 to 2017 (54,316 anchors)
  - Validation: fiscal years 2018 to 2019 (7,196 anchors; covers COVID by design)
  - Test: fiscal years 2020 to 2023 (15,311 anchors)
  - Random splits would leak future information; time-blocking simulates the deployment setting

- **Train-only scaling**
  - Winsorize each ratio at the 1st and 99th percentile of the training distribution
  - Z-score using training means and standard deviations only
  - Statistics are frozen before being applied to validation and test
  - An assertion in `src/price/features.py` guarantees no feature row used for an anchor predates that anchor

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

This notebook trains three classical baselines on the 97-dimensional concatenated input (90 financial + 7 price features) so that the deep model has something meaningful to beat.

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
- We initially tried XGBoost but the macOS x86_64 wheel deadlocked at fit; we fell back to scikit-learn's GradientBoostingRegressor for reproducibility

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

# Architecture Deep Dive

```text
financial ratios (B, 5, 18)  →  LSTM(2 layers, h=64)  → Linear(32) ┐
                                                                    ├→ concat (48-d) → MLP[32, 32] → scalar
price features    (B, 7)     →  MLP[32, 32, 16]                    ┘
```

The winning architecture is intentionally small. Each design choice is documented below.

## Dual-Stream Design

The two input modalities are structurally different. Accounting ratios are filed annually and are a low-frequency sequence of state snapshots; price features are high-frequency aggregates over the last year. Encoding each stream with the architecture best suited to its structure and then fusing is more sample-efficient than concatenating the raw features and asking one network to learn both.

- The financial branch reads the (B, 5, 18) tensor as a five-step sequence
- The price branch reads the (B, 7) tensor as a single dense vector
- The fusion head receives a 48-dimensional concatenation: 32 from the financial branch projection plus 16 from the price branch MLP

## Financial Branch (LSTM)

- Two stacked LSTM layers, hidden size 64, dropout 0.2 between layers
- Input shape (B, 5, 18); output is the final hidden state, a 64-dimensional vector
- A linear layer projects 64 down to 32 before fusion
- LSTM was selected after testing alternatives: a flat MLP on the same tensor ties LSTM fusion within seed noise (5 timesteps is short), and single-head cross-attention adds parameters without statistical improvement

## Price Branch (MLP)

- Standard feed-forward MLP with hidden sizes [32, 32, 16] and ReLU activations
- Reads the 7-dimensional price feature vector
- 16-dimensional output is concatenated into the fusion head

## Fusion Head

- Concatenate the 32-d financial vector and 16-d price vector to a 48-d representation
- LayerNorm stabilizes the joint distribution after concatenation
- Two-layer MLP [32, 32] with ReLU
- Final linear layer produces a single scalar
- A tanh activation bounds the output to (-1, 1); the [-1, 0] domain of drawdown is enforced as a soft constraint by the loss

## Auxiliary Classification Head

- A second output neuron predicts the binary "drop greater than 30 percent" label using binary cross-entropy
- Weighted at 0.3 against the regression Huber loss in the joint objective
- Forces the shared backbone (LSTM and MLP encoders, fusion head up to the penultimate layer) to learn discriminative features for the threshold the brief uses as the headline metric
- Lifts PR-AUC by roughly 1.5 percentage points without hurting MAE

## Loss Function

```text
L = Huber(predicted, realized, δ = 0.05) + 0.3 · BCE(σ(aux_logit), 1{realized ≤ -0.30})
```

- Huber loss is quadratic for absolute errors below 0.05 and linear above
- The quadratic region matches the precision required for typical drawdowns; the linear region prevents a single firm with a -90% realized drawdown from dominating the gradient
- The BCE weight of 0.3 was tuned on the validation fold to maximize PR-AUC without degrading MAE

## Optimizer and Training Schedule

- AdamW with learning rate 1e-3 and weight decay 1e-4
- Cosine annealing schedule across 50 maximum epochs
- Batch size 256
- Early stopping on validation MAE with patience 8
- Mean training time per seed: roughly 3 minutes on CPU, under 30 seconds on GPU
- Inference is sub-second per firm even with the 3-seed ensemble

## Ensembling Strategy

- Three random seeds (0, 1, 2) for the same architecture and training schedule
- At inference, the three sets of test-fold predictions are averaged
- Variance across seeds is roughly 1 percentage point of PR-AUC; averaging tightens the headline metrics without changing the architecture
- The ensemble is the headline row; single-seed rows are reported in the appendix

## Reproducibility

- All RNG seeds are fixed at the top of the training script
- `torch.use_deterministic_algorithms(True)` is set in the training loop
- The full pipeline reproduces the headline numbers in `reports/outputs/results_headline_ensemble.csv` to four decimal places given the same processed inputs
- The trained weights for every reported configuration are committed in `reports/outputs/weights_*.pt` and the saved test-fold prediction arrays in `reports/outputs/preds_*.npy`, so the metrics can be recomputed from `reports/outputs/` alone without retraining

---

# Evaluation

Models are evaluated using:
- Mean Absolute Error (MAE) — average prediction error in percentage-point units
- Root Mean Squared Error (RMSE) — penalizes large misses more than MAE
- Coefficient of Determination (R²) — share of drawdown variance explained
- Precision-Recall Area Under Curve at the -30% threshold (PR-AUC) — primary binary metric, robust to class imbalance
- Brier score — mean squared error of predicted crash probabilities, measures calibration
- Within-year Spearman rank correlation — rank stability inside each test year, isolates firm-level discrimination from macro regime
- Top-decile precision — fraction of the top 10% riskiest firms that actually fell more than 30%

The PR-AUC, Brier, and within-year Spearman are the brief's primary metrics. R² and RMSE are reported alongside for completeness.

---

# Reading the Score

The model output is a single number in the range `[-1, 0]`. It represents the predicted maximum drawdown over the next 12 months, with the value as a negative percentage (for example -0.30 means the model expects the worst close to be 30 percent below the running peak).

Practical interpretation thresholds:

| Predicted Value | Interpretation                                                      |
|-----------------|---------------------------------------------------------------------|
| 0 to -10%       | Quiet year, well within normal market noise                         |
| -10% to -30%    | Notable drawdown, watch but no immediate action                     |
| -30% to -50%    | Material distress; the brief's binary threshold                     |
| Below -50%      | Genuine stress, warrants intervention                               |
| -1.0 exactly    | Forced by delisting target imputation; the firm bankrupted or wound |

For practical use, **rank** matters more than **level**. The score is most reliable as an ordering signal within a peer group or sector. Cross-year comparisons are less reliable because the macro regime shifts the base distribution.

When comparing two firms, prefer the within-year Spearman interpretation: a score of -0.40 in 2020 (a high-crash year) is not directly comparable to -0.40 in 2017 (a calm year); within each year the model's ranking of which firm is more at risk is what holds up.

---

# Use Cases and Deployment

The model is designed to plug into existing risk workflows rather than replace them. Four canonical deployment patterns:

## Bank Credit Monitoring

- Score every borrower in the loan book monthly
- Route the top decile (most-negative predicted drawdown) to a credit officer for review before any new exposure
- Acts as a complementary watchlist signal alongside rating-based limits
- Updates faster than agency credit ratings because it consumes the latest filed fundamentals plus the trailing year of price action

## Hedge Fund Position Sizing

- Compute the drawdown score for each long position
- Scale put-protection notional in proportion to the score
- Higher predicted drawdown means deeper hedge; lower means a lighter hedge
- Cuts overall hedge cost while preserving protection where the model thinks it matters

## Venture Capital Follow-On Gating

- For each portfolio company, identify the five nearest public comparables by sector and size
- Track the average drawdown score across the comp basket monthly
- Pause or slow follow-on rounds when the comp basket deteriorates
- Provides an outside-in market signal that complements internal company metrics

## Quantitative Long-Short Strategy

- Within each GICS sector, rank firms by predicted drawdown
- Long the bottom decile (least-negative score, lowest expected drawdown)
- Short the top decile (most-negative score, highest expected drawdown)
- Rebalance quarterly; sector neutrality reduces macro factor exposure
- Self-financing strategy if the top-decile precision holds across regimes

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

# Known Limitations

**Survivorship bias.** Firms that fully delist within the forward 12-month window (bankruptcies, liquidations) cannot have a 12-month drawdown computed and are excluded from the test set. The headline numbers reflect "drawdown among survivors" and are slightly kinder than the true distribution. The survivorship funnel on the Findings page of the live site documents how 132K Compustat firm-years narrow to 15,311 evaluable test anchors.

**COVID-era validation.** Fiscal year 2018 anchors land in March 2019, so the validation forward window covers COVID. The architecture and hyperparameters are selected against that single shock, which means model selection rewards COVID-robust designs but may slightly underweight other regime risks.

**Annual update cadence.** The financial ratios update only when a new 10-K is filed (annually). Between filings, the score reflects last-year accounting plus rolling price features. The model should be retrained annually as new ground-truth drawdowns accumulate.

**No sentence-level macro context.** The model is fundamentally bottom-up and firm-specific. Sector-wide events not yet priced into the trailing accounting data (early-pandemic March 2020 is the canonical example) can move drawdowns in ways the model cannot anticipate.

**Sector-tailwind false positives.** Firms that look stressed on accounting can be rescued by a sector tailwind (AI for chips, reopening for travel). The model correctly flags the structural risk; the macro just bails them out. Not strictly a model failure but a known false-alarm pattern.

**Financial sector ratio coverage.** Inventory turnover and receivables turnover are not meaningful for banks and insurers. We impute these via industry-year medians, which weakens the model's discrimination on financial-sector firms compared to industrials and consumer firms.

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

# References

## Financial Bankruptcy and Distress Models
- Altman, E. (1968). *Financial Ratios, Discriminant Analysis, and the Prediction of Corporate Bankruptcy.* Journal of Finance, 23(4), 589-609.
- Ohlson, J. (1980). *Financial Ratios and the Probabilistic Prediction of Bankruptcy.* Journal of Accounting Research, 18(1), 109-131.
- Zmijewski, M. (1984). *Methodological Issues Related to the Estimation of Financial Distress Prediction Models.* Journal of Accounting Research, 22, 59-82.
- Merton, R. (1974). *On the Pricing of Corporate Debt: The Risk Structure of Interest Rates.* Journal of Finance, 29(2), 449-470.

## Deep Learning on Financial Data
- Lombardo, G., et al. (2022). *Deep Learning for Financial Distress Prediction: A Comparative Study.* Annals of Operations Research.
- Pellegrino, F., et al. (2024). *Sequence-Aware Neural Networks for Corporate Risk Forecasting.* Journal of Financial Data Science.

## Foundational Methodology
- Hochreiter, S., & Schmidhuber, J. (1997). *Long Short-Term Memory.* Neural Computation, 9(8), 1735-1780.
- Huber, P. (1964). *Robust Estimation of a Location Parameter.* Annals of Mathematical Statistics, 35(1), 73-101.
- Loshchilov, I., & Hutter, F. (2019). *Decoupled Weight Decay Regularization (AdamW).* International Conference on Learning Representations.
- Brier, G. (1950). *Verification of Forecasts Expressed in Terms of Probability.* Monthly Weather Review, 78(1), 1-3.

## Data Sources
- Wharton Research Data Services (WRDS). https://wrds-www.wharton.upenn.edu/
- Center for Research in Security Prices (CRSP). https://www.crsp.org/
- S&P Global Compustat. https://www.spglobal.com/marketintelligence/en/

---
