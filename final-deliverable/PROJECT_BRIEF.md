# Project Brief: Forward Drawdown Prediction

This is a self-contained brief for the team. Paste it into your LLM of choice
(Claude, ChatGPT, etc.) when you start a session about the project. The brief
contains the problem statement, the hypothesis, the data, the methodology,
the locked architecture decisions, the evaluation plan, and the open tasks.
Anything an LLM needs to give you useful help on this project is in here.

## 1. Course context

This is the final project for Machine Learning II at the University of
Chicago Master of Science in Applied Data Science program, Spring 2026.
The class covers feedforward and recurrent neural networks, autoencoders,
embeddings, regularization, CNNs and transfer learning, LSTMs and gated
architectures, transformers, multimodal training, reinforcement learning,
and generative models (VAE, GAN, diffusion). The project should use the
techniques covered in class. It should not depend on external LLM APIs
or tools the class did not cover.

The group has four people. The final deliverables are due at the end of
the quarter and include a runnable notebook, trained model weights, a
final writeup, and a slide deck.

## 2. Project in one paragraph

We predict how much a US public company will lose at its worst over the
next 12 months. Given a firm's annual financial filings for the past five
years and its recent stock price patterns, our model outputs the maximum
peak-to-trough percentage drawdown the firm will experience over the
following year. The output is a single forward-drawdown score per
firm-year, computable from public data, validated on a time-blocked test
set that covers the rate-hike wave and post-COVID distress events.

We chose drawdown instead of bankruptcy or stock return for three reasons.
First, drawdown is what risk teams actually compute when they size
positions or set hedges, so the model's output has a clear practical use.
Second, drawdown is continuous and has meaningful tail mass (around 10
to 20 percent of firm-years see drawdowns deeper than 30 percent), which
gives the model real signal to learn rather than a rare-event problem.
Third, drawdown prediction with deep learning is less saturated in the
academic literature than bankruptcy or return prediction, which leaves
room for an honest contribution.

## 3. Hypothesis

A dual-stream fusion model that combines an LSTM (or MLP-flatten ablation)
over the (5, 18) financial-ratio matrix with an MLP over a 7-dimensional
price-feature vector outperforms three baselines (volatility-only, Ridge
regression, XGBoost) on forward-drawdown prediction over a time-blocked
test set covering fyear 2020 through 2023.

Three falsifiable sub-claims, ordered by confidence:

1. The fusion model beats the volatility-only baseline by at least 3
   percentage points of PR-AUC at the 30 percent drawdown threshold and
   at least 1 percentage point of MAE on the test fold.
2. The fusion model shows Spearman rank correlation above 0.20 between
   predicted and realized drawdown within the COVID validation anchor.
3. Industry-conditional results (GICS sector breakdown) on the COVID
   anchor show airlines, hospitality, cruise lines, and retail flagged
   as elevated drawdown risk before COVID actually arrives.

The project is a success if at least two of these three sub-claims land.

## 4. Final deliverables

1. End-to-end runnable notebook that loads data, builds features and
   targets, trains the model, evaluates it, and produces the slide-deck
   figures.
2. Trained model weights usable to score any US public firm given its
   Compustat panel and recent price history.
3. Final writeup PDF covering problem, data, methodology, results,
   interpretability, and limitations. Roughly 6 to 8 pages.
4. Slide deck with three signature visuals: GICS sector breakdown on the
   COVID anchor, calibration scatter, and named-firm trajectories.
5. Source code modularized so any teammate can reuse pieces.

## 5. Data sources

All data comes from WRDS (Wharton Research Data Services) accessed through
the University of Chicago institutional subscription. Six parquet files
were pulled by a teammate and sit on each teammate's machine in a local
folder. Update the data path in your code to point at your local copy.

### 5.1 compustat_funda.parquet

Annual Compustat fundamentals. The primary feature source.

- Shape: 132,447 rows by 39 columns
- Coverage: fyear 1999 to 2025, 11,953 unique firms, NYSE and NASDAQ only
- Filter applied at pull time: `at > 0` (firm must have positive total assets)

Key columns:

- `gvkey` (str): Compustat firm identifier. Primary key.
- `cik` (str): SEC CIK identifier.
- `tic` (str): Trading ticker.
- `conm` (str): Company name.
- `sich` (float): Historical SIC code.
- `exchg` (int): Exchange code. 11 = NYSE, 14 = NASDAQ.
- `fyear` (int): Fiscal year.
- `datadate` (datetime): Fiscal year end date.
- `fyr` (int): Fiscal year month-end (1 to 12).
- `begfyr`, `endfyr` (datetime): Beginning and end of fiscal year.

The 18 raw financial line items used to compute ratios:

- `act`: Total current assets
- `at`: Total assets
- `cogs`: Cost of goods sold
- `dltt`: Long-term debt total
- `dp`: Depreciation and amortization
- `ebit`: Earnings before interest and taxes
- `oibdp`: Operating income before depreciation (EBITDA proxy)
- `gp`: Gross profit
- `invt`: Inventories total
- `lct`: Total current liabilities
- `ni`: Net income (loss)
- `re`: Retained earnings
- `rect`: Receivables total
- `revt`: Total revenue
- `lt`: Total liabilities
- `sale`: Total sales
- `xopr`: Operating expenses total
- `mktval`: Market value (computed as `csho` * `prcc_f` at pull time)

Additional balance-sheet items (available for richer features later):

- `che`: Cash and short-term investments
- `icapt`: Invested capital total
- `ceq`: Common equity
- `dlc`: Debt in current liabilities
- `oancf`: Net cash from operating activities
- `capx`: Capital expenditures
- `txp`: Taxes payable
- `wcap`: Working capital

Note: this file replaces `gp` and `xopr` NaNs with derived values (`sale - cogs`
and `sale - ebit` respectively) at pull time. `mktval` is set to NaN when
either `csho` or `prcc_f` is missing.

### 5.2 compustat_company.parquet

Company-level reference table. Used for delisting reasons (to handle censoring)
and GICS sector codes (for industry-level analysis).

- Shape: 45,242 rows by 20 columns

Key columns:

- `gvkey` (str): Compustat firm identifier.
- `conm`, `cik`, `sic`, `naics` (str): Identifiers and industry codes.
- `gsector` (str): GICS sector code.
- `ggroup` (str): GICS industry group.
- `gind` (str): GICS industry.
- `gsubind` (str): GICS sub-industry.
- `loc` (str): Country of incorporation.
- `costat` (str): Company status (A = active, I = inactive).
- `dlrsn` (str): Delisting reason code (see below).
- `dldte` (datetime): Delisting date if applicable.
- `failed_fyear` (int): Year before delisting (`extract(year from dldte) - 1`).
- `ipodate` (datetime): IPO date.
- `curr_sp500_flag` (str): Currently in the S&P 500.

GICS sector codes:

- 10 Energy
- 15 Materials
- 20 Industrials
- 25 Consumer Discretionary
- 30 Consumer Staples
- 35 Health Care
- 40 Financials
- 45 Information Technology
- 50 Communication Services
- 55 Utilities
- 60 Real Estate

Delisting reason codes:

- 01 Merger or acquired
- 02 Bankruptcy (Chapter 7 or 11)
- 03 Liquidation
- 04 Cease operations
- 05 Insufficient assets or equity
- 07 Acquired by foreign parent
- 09 Now operates as a limited partnership
- 10 Other
- 20 Privatized

Distribution in our data: 9,992 mergers, 9,174 other, 2,573 liquidations,
1,713 acquired by foreign parent, 950 cease operations, 387 bankruptcies,
357 LP conversions, 82 privatizations, 21 insufficient assets.

### 5.3 compustat_bklabels.parquet

Pre-filtered table of Chapter 7 and 11 bankruptcies only.

- Shape: 387 rows by 5 columns
- Coverage: delisting dates 2000 to February 2026
- Columns: `gvkey`, `conm`, `dlrsn` (always '02'), `dldte`, `failed_fyear`

This is a subset of `compustat_company` for convenience. Use this for
the secondary bankruptcy-validation analysis.

### 5.4 crsp_linktable.parquet

CRSP-Compustat linking table. Resolves `gvkey` (Compustat) to `permno`
(CRSP) with date validity. Built by collapsing consecutive date ranges in
`ccmxpf_lnkhist` (the raw underlying CRSP link history table) so each row
is a contiguous validity window.

- Shape: 38,738 rows by 8 columns

Columns:

- `gvkey` (str): Compustat firm identifier.
- `linkprim` (str): Primary link flag (P, C, J, N).
- `liid` (str): Link issue identifier.
- `linktype` (str): Link type. We keep LC, LU, LD, LN, LS, LX (the full WRDS
  reference set).
- `permno` (float): CRSP permanent number.
- `permco` (float): CRSP permanent company number.
- `linkdt` (datetime): Link start date.
- `linkenddt` (datetime): Link end date. Set to 2099-12-31 when the link is
  still active.

To resolve a permno for a given (gvkey, datadate):

```python
valid = (linktable.gvkey == gvkey) & \
        (linktable.linkdt <= datadate) & \
        (datadate <= linktable.linkenddt)
permno = linktable[valid].permno.iloc[0]  # or NaN if no match
```

### 5.5 crsp_dsf.parquet

CRSP daily stock file. The source of all price-based features and the
forward drawdown target.

- Shape: 29,203,297 rows by 9 columns
- Coverage: 1999-01-04 to 2024-12-31, 11,202 unique permnos

Columns:

- `permno` (int): CRSP permanent number.
- `date` (datetime): Trading date.
- `ret` (float): Daily return including dividends.
- `retx` (float): Daily return excluding dividends.
- `prc` (float): Closing price. Negative values indicate a bid-ask midpoint
  was used (no actual trade). Take absolute value.
- `vol` (int): Trading volume in shares.
- `shrout` (int): Shares outstanding in thousands.
- `cfacpr` (float): Cumulative price adjustment factor.
- `cfacshr` (float): Cumulative share adjustment factor.

Adjusted price (for drawdown computation): `abs(prc) * cfacpr`.
Dollar volume: `abs(prc) * vol`.

### 5.6 crsp_msf.parquet

CRSP monthly stock file. Same schema as `crsp_dsf` at monthly frequency.

- Shape: 1,049,265 rows by 9 columns
- Coverage: 1999-01-29 to 2018-12-31

Redundant now that `crsp_dsf` covers the full window. Kept for cross-checks
only. The primary price source is `crsp_dsf`.

## 6. Loading the data

```python
from pathlib import Path
import pandas as pd

# Update this path to your local copy
DATA_DIR = Path("/your/path/to/MLII Project Data")

funda     = pd.read_parquet(DATA_DIR / "compustat_funda.parquet")
company   = pd.read_parquet(DATA_DIR / "compustat_company.parquet")
bklabels  = pd.read_parquet(DATA_DIR / "compustat_bklabels.parquet")
linktable = pd.read_parquet(DATA_DIR / "crsp_linktable.parquet")
dsf       = pd.read_parquet(DATA_DIR / "crsp_dsf.parquet")
# msf is redundant, only load if doing cross-checks
# msf = pd.read_parquet(DATA_DIR / "crsp_msf.parquet")

# Ensure datetime types
funda["datadate"] = pd.to_datetime(funda["datadate"])
linktable["linkdt"] = pd.to_datetime(linktable["linkdt"])
linktable["linkenddt"] = pd.to_datetime(linktable["linkenddt"])
dsf["date"] = pd.to_datetime(dsf["date"])
```

## 7. The 18 financial ratios

The ratio set blends Altman 1968 (Z-score), Ohlson 1980 (O-score),
Zmijewski 1984, plus standard margin and turnover ratios from Lombardo
et al. 2022 and Pellegrino et al. 2024.

All ratios are prefixed `r_`. Division by zero returns NaN (handled
downstream by industry-aware imputation). Note that `mkvalt = mktval`
and `ebitda = oibdp` (operating income before depreciation, the standard
EBITDA proxy in Compustat).

```python
import numpy as np
import pandas as pd

RATIO_COLS = [
    "r_wc_ta",         # Altman X1: working capital / total assets
    "r_re_ta",         # Altman X2: retained earnings / total assets
    "r_ebit_ta",       # Altman X3
    "r_mv_tl",         # Altman X4: market value / total liabilities
    "r_sale_ta",       # Altman X5: asset turnover
    "r_tl_ta",         # leverage (Ohlson / Zmijewski)
    "r_cl_ca",         # current liabilities / current assets (Ohlson)
    "r_ni_ta",         # ROA (Ohlson / Zmijewski)
    "r_log_at",        # log size (Ohlson, sans GDP deflator)
    "r_gross_margin",
    "r_oper_margin",
    "r_net_margin",
    "r_ebitda_margin",
    "r_opex_ratio",    # xopr / sale
    "r_da_intensity",  # dp / at
    "r_ltdebt_ta",
    "r_inv_turn",      # cogs / inventory
    "r_recv_turn",     # sale / receivables
]

def _safe_div(num, den):
    return num / den.replace(0, np.nan)

def compute_ratios(funda: pd.DataFrame) -> pd.DataFrame:
    f = funda.copy()
    # Source-name aliases for the funda file
    f["mkvalt"] = f["mktval"]
    f["ebitda"] = f["oibdp"]

    f["r_wc_ta"]         = _safe_div(f["act"] - f["lct"], f["at"])
    f["r_re_ta"]         = _safe_div(f["re"], f["at"])
    f["r_ebit_ta"]       = _safe_div(f["ebit"], f["at"])
    f["r_mv_tl"]         = _safe_div(f["mkvalt"], f["lt"])
    f["r_sale_ta"]       = _safe_div(f["sale"], f["at"])
    f["r_tl_ta"]         = _safe_div(f["lt"], f["at"])
    f["r_cl_ca"]         = _safe_div(f["lct"], f["act"])
    f["r_ni_ta"]         = _safe_div(f["ni"], f["at"])
    f["r_log_at"]        = np.log(f["at"].clip(lower=1e-6))
    f["r_gross_margin"]  = _safe_div(f["gp"], f["sale"])
    f["r_oper_margin"]   = _safe_div(f["ebit"], f["sale"])
    f["r_net_margin"]    = _safe_div(f["ni"], f["sale"])
    f["r_ebitda_margin"] = _safe_div(f["ebitda"], f["sale"])
    f["r_opex_ratio"]    = _safe_div(f["xopr"], f["sale"])
    f["r_da_intensity"]  = _safe_div(f["dp"], f["at"])
    f["r_ltdebt_ta"]     = _safe_div(f["dltt"], f["at"])
    f["r_inv_turn"]      = _safe_div(f["cogs"], f["invt"])
    f["r_recv_turn"]     = _safe_div(f["sale"], f["rect"])
    return f
```

Expected NaN patterns to handle downstream:

- `r_inv_turn` and `r_recv_turn` are NaN for financial firms (banks,
  insurance) that have no inventory or trade receivables. Impute with
  industry-year median.
- `r_wc_ta`, `r_cl_ca` are NaN when `act` or `lct` is missing (some firms).
- `r_mv_tl` is NaN when `mktval` is missing (about 9 percent of rows,
  mostly very small firms).
- `r_ebitda_margin` requires `oibdp` which is missing on about 4 percent
  of rows.

## 8. Methodology

### 8.1 Build the anchor panel

For each firm-year in funda, build an anchor row.

1. Resolve `permno` via the link table with date validity:
   `linkdt <= datadate <= linkenddt`. If multiple matches, prefer
   `linkprim = 'P'` (primary). Drop firm-years with no valid match.
2. Set `anchor_date = datadate + 90 days`. This is the realistic
   information-availability point at which a typical 10-K is filed and
   public.
3. Require at least 5 prior fiscal years of funda data for the feature
   window. Anchors fyear less than 2003 are excluded (need 1999 funda to
   look back 4 years from fyear 2003).
4. Practical anchor range: fyear 2003 to fyear 2024. Note that fyear 2024
   anchors at March 2025 with a forward window into March 2026, which
   exceeds dsf coverage; treat these carefully or exclude.

Expected anchor panel size after these filters: roughly 80,000 to 100,000
rows before adding feature-history requirements.

### 8.2 Build the forward 12-month drawdown target

For each anchor row, compute the worst peak-to-trough percentage decline
over the next 252 trading days from CRSP dsf.

```python
# Pre-build a per-permno series of adjusted prices for fast lookup
dsf["adj_prc"] = dsf["prc"].abs() * dsf["cfacpr"]
permno_to_series = {
    int(p): g.set_index("date")["adj_prc"].dropna().sort_index()
    for p, g in dsf.groupby("permno")
}

def fwd_12m_max_dd(permno: int, anchor_date, horizon_days: int = 365) -> float:
    """Worst peak-to-trough decline over the next ~12 months. NaN if insufficient data."""
    series = permno_to_series.get(int(permno))
    if series is None or len(series) == 0:
        return np.nan
    end_date = anchor_date + pd.Timedelta(days=horizon_days)
    window = series.loc[anchor_date:end_date]
    if len(window) < 60:
        return np.nan
    run_max = window.cummax()
    dd = (window / run_max - 1.0).min()
    return float(dd)
```

For firms that delist during the forward window, look up the dlrsn in
`compustat_company`:

- dlrsn `02`, `03`, `04` (bankruptcy, liquidation, cease operations):
  treat as full loss for the remainder of the window (terminal return
  set to -1.0).
- dlrsn `01`, `07` (merger, foreign acquisition): treat the delisting
  return as terminal value (assume zero return after the delist date).

Target frame columns:

- `gvkey`, `fyear`, `permno`, `anchor_date`
- `fwd_12m_max_dd`: continuous, in [-1, 0]
- `large_dd_30`: 1 if `fwd_12m_max_dd <= -0.30` else 0
- `large_dd_50`: 1 if `fwd_12m_max_dd <= -0.50` else 0
- `dd_year_pct`: percentile rank of `fwd_12m_max_dd` within the same
  anchor calendar year (1.0 = worst, 0.0 = best)

### 8.3 Build the financial feature matrix

For each anchor (gvkey, fyear), gather the 18 ratios for fyears
`fyear - 4` through `fyear`. Result: a (5, 18) matrix per anchor.

Steps:

1. Compute the 18 ratios on the full funda panel using the function in
   section 7.
2. For each anchor, find the 5 fyears of ratios. Drop anchors that don't
   have all 5.
3. Winsorize each ratio at the 1st and 99th percentile, computed from the
   training fold only.
4. Z-score each ratio cross-sectionally within fyear, using training fold
   statistics.
5. Industry-aware imputation for the bank-NaN ratios (`r_inv_turn`,
   `r_recv_turn`): use the GICS-sector-and-year median if available, else
   the year-wide median.
6. Drop anchors that still have NaN after imputation.

Output: numpy array of shape `(N, 5, 18)` aligned to the anchor panel.

### 8.4 Build the price feature vector

For each anchor, compute 7 features from the 252 trading days ending
strictly before `anchor_date`:

1. Annualized realized volatility: `std(daily_returns) * sqrt(252)`.
2. Total return over the prior 252 trading days.
3. Skewness of daily returns.
4. Kurtosis of daily returns.
5. Max prior 12-month drawdown (peak-to-trough on adjusted prices).
6. Beta vs an equal-weighted market portfolio (aggregate of all permnos
   in dsf), computed by regressing firm daily returns on market daily
   returns.
7. Log of average daily dollar volume (`abs(prc) * vol`).

Output: numpy array of shape `(N, 7)` aligned to the anchor panel. Z-score
per fyear using training fold statistics.

Critical leakage rule: the feature window's last date must be strictly
less than `anchor_date`. The target window's first date is `anchor_date`.
Encode this as an assertion. A single overlapping day silently corrupts
the experiment.

### 8.5 Time-blocked train/val/test split

- Train: fyear 2003 to 2017 (15 years)
- Val: fyear 2018 to 2019 (COVID drawdowns land in the val forward window,
  March 2019 to March 2020)
- Test: fyear 2020 to 2023 (rate-hike wave plus post-COVID distress events)

fyear 2024 anchors are excluded from the main evaluation because their
forward window extends past dsf coverage. They are available for a
"live score" appendix.

No firm-year appears in more than one split. No shuffling. The split is
strictly time-blocked.

### 8.6 Baselines

Three baselines in increasing complexity. Each must be run on the test
fold and reported in the final results table.

**Baseline 0, volatility only.** Linear fit: predicted drawdown =
alpha * trailing 12-month realized volatility + beta. Fit alpha and
beta on the train fold. Two parameters total. This is the floor.

**Baseline 1, Ridge regression.** Flatten the financial feature matrix
to 90 dims (5 * 18) and concat with the 7 price features for 97 inputs.
Use sklearn's `Ridge` and cross-validate the alpha hyperparameter on
the training fold only.

**Baseline 2, XGBoost regressor.** Same 97-dim flattened input. Use
`xgboost.XGBRegressor` (regression, not classification). Small
hyperparameter search: `n_estimators in [200, 500]`,
`max_depth in [3, 5, 7]`, `learning_rate in [0.05, 0.1]`. Cap at 20
trials with early stopping on val MAE.

### 8.7 Headline architecture, dual-stream fusion

Two encoders feed a fusion head.

**Financial branch.** Take the (5, 18) ratio matrix. Test two encoders
and use whichever wins on validation MAE:

- Candidate A: LSTM. 2 layers, hidden dim 64, take the final hidden
  state, project to 32 dims via a linear layer.
- Candidate B: MLP-flatten. Flatten (5, 18) to 90 dims, run a 2-layer
  MLP with hidden dims [128, 64], output 32 dims.

**Price branch.** Take the (7,) price feature vector. Run a 2-layer MLP
with hidden dim 32, output 16 dims.

**Fusion head.** Concatenate the financial branch output (32 dims) and
the price branch output (16 dims) into a 48-dim vector. Run a 2-layer
MLP with hidden dim 32, output a single scalar regression prediction.

**Regularization.** Dropout 0.2 on hidden layers. Layer normalization on
the fusion input. Weight decay 1e-4.

**Training.** Huber loss (smooth-L1, delta = 0.05), which is more robust
than MSE to the heavy left tail of drawdowns. AdamW optimizer, initial
learning rate 1e-3, cosine annealing. Batch size 256. Maximum 50 epochs.
Early stopping on val MAE with patience 5.

All implementation in plain PyTorch. No Lightning, no Hydra, no LLM APIs.

### 8.8 Ablation experiments

Run these for the final results table:

1. Financials-only (drop the price branch entirely).
2. Price-only (drop the financial branch entirely).
3. Full fusion.
4. LSTM financial encoder vs MLP-flatten financial encoder.

The financials-only vs price-only ablation shows which signal is doing
the work. The LSTM vs MLP-flatten ablation shows whether sequential
modeling helps at 5 timesteps.

### 8.9 Evaluation

Compute on the test fold (fyear 2020 to 2023).

**Regression metrics.**

- Mean absolute error (MAE).
- Root mean squared error (RMSE).
- R squared.

Report overall and by anchor year.

**Binary metrics at the 30 percent drawdown threshold.**

- PR-AUC (precision-recall area under curve).
- ROC-AUC.
- Recall at 5 percent false positive rate.
- Brier score.

**Cross-sectional rank metrics.**

- Spearman rank correlation between predicted and realized drawdown,
  computed within each anchor year separately, then averaged.
- Top-decile precision: of the 10 percent of firms with the worst
  predicted drawdown, what fraction were actually in the worst-realized
  decile within the same fyear.

The rank metrics matter because raw drawdown is heavily macro-driven (a
fyear 2018 anchor has high realized drawdown because the next year is
2020). Rank-within-year isolates firm-specific signal from market regime.

### 8.10 Interpretability artifacts

For the slide deck and the writeup.

1. **GICS sector breakdown on the COVID anchor.** For fyear 2018 anchors
   only (target window covers March 2019 to March 2020), compute the
   mean predicted drawdown by GICS sector and the realized mean
   drawdown by sector. Plot as a paired horizontal bar chart. Airlines,
   hospitality, cruise lines, and retail should be flagged as
   high-risk.

2. **Named-firm case studies.** Pick about 3 distressed firms and 3
   healthy peers. Candidates: airlines (American, United, Delta) and
   cruise lines (Carnival, Royal Caribbean) for COVID; Bed Bath &
   Beyond, Spirit Airlines, Big Lots, Express, PacWest or similar
   regional banks for the 2022 to 2023 distress; defensives like
   Procter & Gamble, Johnson & Johnson, Microsoft for healthy peers.
   For each firm, plot the model's predicted drawdown trajectory
   across the test years with the realized drawdown overlaid.

3. **Calibration plots.** Predicted-vs-actual scatter for the regression
   target, colored by anchor year, with the diagonal. Reliability
   diagram for the 30 percent binary target.

4. **Bankruptcy cross-check.** Compute a secondary PR-AUC of "drawdown
   score predicts next-year bankruptcy" using the 387 firms in
   `compustat_bklabels`. Not the headline, but a useful validation that
   the score is picking up real distress.

## 9. Architecture decisions, locked

These are settled. Do not relitigate without raising it in a group sync.

### 9.1 Why dual-stream LSTM plus MLP, not a single bigger model

The two input streams are structurally different. The (5, 18) financial
panel is a short sequence with high feature dimensionality per timestep;
the 7-dim price vector is point-in-time. Forcing them into a single
encoder would either artificially extend the price vector across time
or flatten the financial sequence, losing structure. Two encoders, one
for each, is the cleaner design.

### 9.2 Why LSTM is an ablation, not a commitment

Five timesteps is short. With our sample size, a 2-layer MLP that
flattens (5, 18) to a 90-dim vector may match or beat the LSTM. Forcing
LSTM for Week 6 syllabus coverage would damage the project if it loses
to MLP. The honest move is to test both as the financial encoder, use
the winner as headline, and report the comparison as an ablation.

### 9.3 Why single-modal, not multimodal

Both branches are numerical tabular data. Calling this multimodal would
misuse the term. Multimodal in the strict ML sense means inputs from
different representational modes (text, image, audio). Two numerical
streams processed with different encoders is dual-stream, not multimodal.
We do not need the multimodal label for the syllabus coverage and the
project is stronger if we are honest about what it is.

### 9.4 Why no contrastive learning, VAE, GAN, CNN, transformer, RL

Each was considered and rejected for the headline:

- Contrastive learning: marginal lift, adds an auxiliary objective that
  complicates training. Optional stretch goal only if time permits.
- VAE: generative modeling is the wrong framing for a regression task
  with a known measurable target.
- GAN: synthetic-data generation does not help here.
- CNN: time-series-as-image is a contortion that adds Week 5 syllabus
  coverage but no real new capability.
- Transformer: five-timestep sequences do not need attention. Adding it
  for Week 7 coverage would be over-engineering.
- RL: there is no sequential decision problem here.

### 9.5 Why drawdown, not bankruptcy or stock return

- Bankruptcy: sparse positive class (about 0.3 percent firm-year level),
  well-studied, hard to produce a novel finding.
- Stock return: market-efficient, very low signal-to-noise, hardest
  target in finance ML.
- Drawdown: continuous, real, measurable, has tail mass (10 to 20
  percent of firm-years are above 30 percent), captures downside risk
  specifically, underexplored in deep learning, direct business value
  for risk teams.

## 10. Three critical risks

### 10.1 Macro confounding of the target

Risk: raw drawdown is driven heavily by the year-level macro regime. A
model trained on raw drawdown can mostly learn "the next year is calm
or turbulent" rather than firm-level distress. The fyear 2018 anchor
has a mean realized drawdown of around -46 percent because the next year
is 2020.

Fix: add the rank-within-year target (`dd_year_pct`). Report rank-based
metrics (Spearman, top-decile precision) as the primary firm-level
discrimination metric, alongside raw MAE for absolute calibration. The
model must do well on both. If it does well only on raw and poorly on
rank, the "signal" is just market timing.

### 10.2 Volatility-only baseline strength

Risk: trailing realized volatility alone predicts forward drawdown
moderately well. If the fusion model beats Ridge by 5 percentage points
of PR-AUC but only beats vol-only by 1 percentage point, the
deep-learning contribution is marginal and the slide deck story is weak.

Fix: make vol-only an explicit baseline. Report lift over vol-only as
the headline number, not lift over Ridge. Lift over vol-only is the only
number that matters for "does fundamentals plus market structure add to
pure market risk."

### 10.3 Information-availability leakage

Risk: the price-branch feature window must end strictly before
`anchor_date`. A single overlapping day means the model is using future
information. This is the easiest way to silently corrupt the experiment.

Fix: encode the windowing rule in one place. Add an assertion that the
feature window's last date is strictly less than `anchor_date`. Add a
unit test that violates the rule and confirms the assertion fires.
Document this prominently.

## 11. Class assignment alignment

Every model component maps to a class week. We deliberately do not use
techniques from weeks we don't need.

| Component | Week |
|---|---|
| Time-blocked split, bias-variance ablation (LSTM vs MLP-flatten) | 1 |
| Huber loss, AdamW, weight decay, dropout | 2 |
| MLP fusion head, learned embedding via LSTM hidden state | 3 |
| Dropout 0.2, layer normalization, He initialization | 4 |
| LSTM over (5, 18) financial sequence | 6 |
| Multimodal training pattern (dual-stream fusion) | 7 |
| Optional contrastive aux loss (stretch only, Assignment 3) | 7 |

Not used: Week 5 (CNNs, U-Nets, YOLO), Week 8 (RL), Week 9 (VAE, GAN,
diffusion). The defense is "the right tools for the data."

## 12. What we considered and rejected

Documented so we do not relitigate:

- Bankruptcy as primary target. Too sparse, too saturated.
- Synthetic credit rating prediction. Done many times already.
- AI talk-versus-walk via 10-K text and patents. Already covered by Li
  2025 and Babina et al. 2024 with proprietary HR data we cannot
  replicate.
- AI specificity via fine-tuned BERT on 10-K filings. Pivoted away when
  we constrained to numerical-only data.
- LSTM autoencoder with reconstruction-error anomaly score. Rejected
  because there is no external ground truth metric.
- VAE on financial features. Same reason.
- Contrastive firm-trajectory embedding as headline. Kept as a stretch
  goal, not the centerpiece.
- Survival analysis on bankruptcy with deep hazards. Considered, rejected
  because it requires the saturated bankruptcy target.
- Multimodal claim via CNN-over-time-series-as-image. Single-modal is
  honest.
- Industry-conditional architecture as headline. Kept as an evaluation
  slide, not an architectural commitment.

## 13. Prior work and positioning

Useful references for the writeup and slide deck.

### Drawdown prediction is the chosen lane

Drawdown prediction with deep learning on financial fundamentals is a
thinner literature than return prediction or bankruptcy prediction. Our
angle is the combination of recent data including COVID and post-2022
distress, dual-stream architecture, and a calibrated open-source score
with named-firm case studies.

### Bankruptcy ML (saturated, why we did not pick this)

- Altman 1968 (Z-score), Ohlson 1980 (O-score), Zmijewski 1984.
  Classical.
- Lombardo et al. 2022 ("Machine Learning for Bankruptcy Prediction in
  the American Stock Market"). The SOWIDE dataset and benchmarks.
- Pellegrino et al. 2024 ("A Multi-Head LSTM Architecture for Bankruptcy
  Prediction with Time Series Accounting Data"). Multi-head LSTM on
  SOWIDE.

### AI-mention work in 10-Ks (saturated as of 2025, why we did not pick this)

- Eisfeldt, Schubert, Zhang 2023 (NBER). Generative AI and firm values.
- Babina, Fedyk, He, Hodson 2023 to 2024. Cognism workforce data plus
  Burning Glass job postings to measure AI investment.
- Boyuan Li 2025 (University of Florida). AI Washing. Earnings calls
  plus Cognism HR data.
- arXiv 2508.19313 (ECML 2025). AI risk mentions in 10-K Risk Factors
  across 30,000 filings.

## 14. Tasks remaining

Listed in execution order with dependencies.

### Phase 1: Foundation

1. Set up the GitHub repo and give all teammates read/write access.
2. Each teammate gets the data folder locally and updates their data
   path constant.

### Phase 2: Data pipeline

3. Build the target builder (section 8.2). Save the processed anchor
   panel with target columns as a parquet for everyone to reuse.
4. Encode the leakage assertion and write a unit test that violates it.
5. Handle delisting events correctly using `compustat_company` (section
   8.2 rules for dlrsn codes).

### Phase 3: Feature engineering

6. Compute the 18 ratios on the full funda panel (function in section 7).
7. Build the financial feature matrix builder (section 8.3) producing
   (N, 5, 18) arrays aligned with the anchor panel.
8. Build the price feature vector builder (section 8.4) producing (N, 7)
   arrays.
9. Build the time-blocked split assignment (section 8.5).

### Phase 4: Baselines and evaluation framework

10. Build a metrics module with importable functions for every metric in
    section 8.9. Used by everyone.
11. Volatility-only baseline (section 8.6).
12. Ridge baseline (section 8.6).
13. XGBoost regressor baseline (section 8.6).

### Phase 5: Deep model

14. LSTM encoder for the financial branch (section 8.7 candidate A).
15. MLP-flatten encoder for the financial branch (section 8.7 candidate B).
16. Price MLP encoder (section 8.7).
17. Fusion model class tying the two encoders to the fusion head
    (section 8.7).
18. PyTorch training loop with AdamW, cosine LR, Huber loss, dropout,
    early stopping (section 8.7).
19. Train both encoder variants and pick the winner on val MAE.

### Phase 6: Evaluation and interpretability

20. Run all baselines plus headline plus ablations on test. Build the
    full results table.
21. GICS sector breakdown for the COVID validation anchor (section 8.10).
22. Named-firm case study trajectories (section 8.10).
23. Calibration plots (section 8.10).
24. Bankruptcy cross-check (section 8.10).

### Phase 7: Delivery

25. Assemble the end-to-end runnable notebook.
26. Write the final writeup.
27. Build the slide deck.
28. Dry-run the presentation.

## 15. Success bar

The fusion model is a success if it beats the volatility-only baseline
by at least 3 percentage points of PR-AUC at the 30 percent threshold
and at least 1 percentage point of MAE, while also showing Spearman rank
correlation above 0.20 within the COVID anchor year. Beating two of
these three is recoverable. Beating none means the deep-learning
contribution is genuinely marginal, in which case the writeup pivots to
"fundamentals do not materially add over market signals," which is
itself a real finding and still a strong class submission.

## 16. Glossary

- **Anchor date.** The point in time at which the model makes a
  prediction. Set to `datadate + 90 days` to model the realistic 10-K
  filing lag. All features must use information from before this date.
- **Anchor panel.** The set of firm-years (gvkey, fyear) we train and
  evaluate on. Each anchor has a feature window (the prior 5 fiscal
  years) and a target window (the next 12 months from anchor date).
- **Drawdown.** Worst peak-to-trough percentage decline over a window.
  Always non-positive. -0.40 means the worst point of the window was
  40 percent below the peak.
- **gvkey.** Compustat unique firm identifier.
- **permno.** CRSP unique stock identifier. One firm (gvkey) can have
  multiple permnos over time, resolved via the link table.
- **datadate.** Fiscal-year-end date in Compustat.
- **dldte.** Delisting date.
- **dlrsn.** Delisting reason code.
- **Forward window.** The 12 months following the anchor date over which
  drawdown is measured.
- **Feature window.** The 5 fiscal years and the prior 252 trading days
  used to build features, both ending strictly before the anchor date.
- **Time-blocked split.** Train, validation, and test are contiguous
  year ranges. No firm-year appears in more than one split.
- **GICS sector.** Global Industry Classification Standard, used here as
  the industry axis for interpretability. 11 sectors, codes 10 through
  60.
- **Leakage.** Using information from after the anchor date as if it
  were known at the anchor date. Silently invalidates the experiment.
