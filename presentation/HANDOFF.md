# Handoff — Forward Drawdown Prediction Project

Last revised 2026-05-19 (post Jared extension). Replaces the prior bankruptcy-era handoff. This document
is the single reference for the project: scope, hypothesis, data, methodology,
architecture decisions, risks, prior work, and outstanding questions. If
something here conflicts with later code or notebooks, this document is the
intended source of truth and the code is wrong.

---

## 1. Project at a glance

We train a deep model on a US public firm's prior 5 years of annual financial
filings plus the firm's recent stock-price patterns, and predict the maximum
peak-to-trough percentage drawdown the firm will experience over the next 12
months.

The deliverable is a per-firm-year Forward Drawdown Score, available in two
forms (continuous regression and a 30 percent threshold binary flag), plus an
ordinal tier label, computed entirely from open data sources and released as a
runnable notebook with optional pre-trained weights.

The project sits at the intersection of corporate risk modeling and deep
learning, fits an end-of-quarter ML II final project, and is positioned to
produce a real, defensible empirical finding rather than a replication of a
2024 or 2025 paper.

---

## 2. Hypothesis and target

### 2.1 Primary hypothesis

A deep dual-stream model that combines (a) an LSTM over a firm's prior 5 fiscal
years of 18 financial ratios with (b) an MLP over a 7-dimensional vector of
recent price-history features outperforms three baselines on forward-drawdown
prediction on a time-blocked test set that includes the COVID drawdown wave:

- Baseline 0. Trailing 12-month realized volatility, scaled by a single
  learned coefficient on the train set. No other learning.
- Baseline 1. Ridge regression on the flattened 97-dimensional feature vector
  (5 × 18 financial + 7 price).
- Baseline 2. Gradient-boosted regressor (XGBoost or sklearn) on the same
  flattened feature vector.

The fusion model must beat at least Baseline 0 (volatility-only) by a
measurable margin on MAE and PR-AUC at the 30 percent drawdown threshold. That
is the bar.

### 2.2 Secondary hypothesis

The same model evaluated against a cross-sectional rank target (drawdown
percentile within each anchor year, not raw drawdown) produces firm-level
discrimination that is largely independent of the year-level macro regime. The
rank target isolates firm-specific signal from market-wide drawdown
fluctuations.

### 2.3 Interpretability claims

- On the fyear 2018 anchor (target window March 2019 to March 2020), the model
  predicts elevated drawdowns for airlines, cruise lines, hospitality, and
  retail before COVID actually arrives, beating Baseline 0 on industry-conditional
  precision at the top decile.
- Named-firm case studies show the model's predicted drawdown trajectory
  rising over multiple years before a real drawdown event for a small set of
  well-known recent failures, alongside healthy peers for contrast.

### 2.4 Target construction

For each firm-year (gvkey, fyear) anchored at `datadate + 90 days` (the
information-availability point at which a typical 10-K is filed):

- Primary target. `fwd_12m_max_dd` = worst peak-to-trough percentage decline
  over the 12 monthly observations following the anchor. Signed, in [-1, 0].
  Computed from CRSP monthly prices (msf for pre-2016 anchors, dsf resampled
  to month-end for 2016+ anchors).
- Binary aux. `large_dd_30` = 1 if `fwd_12m_max_dd <= -0.30`, else 0.
- Tail aux. `large_dd_50` = 1 if `fwd_12m_max_dd <= -0.50`, else 0.
- Rank aux. `dd_year_pct` = percentile rank of `fwd_12m_max_dd` within the
  anchor year (1.0 = worst drawdown in the year, 0.0 = best).

The rank target addresses the macro-confounding risk described in section 7.

---

## 3. Data inventory

### 3.1 Current state, on disk (post Jared extension)

Location:
`/Users/nd/Documents/UChicago MSADS 2025-26/Machine Learning II/Final Project/MLII Project Data/`

| File | Shape | Coverage |
|---|---|---|
| `compustat_funda.parquet` | 132,447 × 39 | fyear 1999 to 2025, 11,953 firms, NYSE and NASDAQ only, at > 0 filter applied. 18 line items plus capex, ocf, equity, debt, working capital, and identifiers. |
| `compustat_bklabels.parquet` | 387 × 5 | Chapter 7/11 events (dlrsn = '02') with delisting dates 2000 to Feb 2026. Pre-filtered. |
| `compustat_company.parquet` | 45,242 × 20 | Full company table with all delisting reason codes (01 M&A, 02 bankruptcy, 03 liquidation, 04 cease ops, 07 foreign acq, 09 LP, 10 other, etc), plus GICS sector / group / industry / subindustry, NAICS, IPO date, current S&P 500 flag. |
| `crsp_linktable.parquet` | 38,738 × 8 | Collapsed gvkey to permno link history with date validity windows. Full history. |
| `crsp_dsf.parquet` | 29,203,297 × 9 | Daily prices, 1999-01-04 to 2024-12-31. Covers the full feature and target window. |
| `crsp_msf.parquet` | 1,049,265 × 9 | Monthly prices, 1999-01-29 to 2018-12-31. Redundant now that dsf covers the full range. Kept only for cross-check sanity. |

### 3.2 Extensions delivered by Jared (resolved 2026-05-19)

All three critical asks landed, plus two bonuses:

1. Delivered. Compustat funda extended to fyear 2025 (asked for 2024). Now
   132,447 firm-years across 11,953 firms (up from 96,955 / 10,181). Adds 7
   anchor years 2019 to 2025.
2. Delivered. New `compustat_company.parquet` with the full dlrsn distribution.
   We can now distinguish bankruptcies (dlrsn = '02', 387 firms) from M&A
   (dlrsn = '01', 9,992 firms), liquidations (dlrsn = '03', 2,573), cease
   operations (dlrsn = '04', 950), foreign acquisitions (dlrsn = '07', 1,713),
   and others. Censoring becomes principled.
3. Delivered, exceeded ask. `crsp_dsf` extended back to 1999-01-04 (asked for
   `crsp_msf` extension forward). Daily resolution across the full window
   instead of a monthly/daily hybrid.
4. Bonus. `compustat_company.parquet` includes GICS sector hierarchy
   (gsector, ggroup, gind, gsubind). We had marked GICS nice-to-have; now we
   have it cleanly. Replace SIC division as the industry-breakdown axis.
5. Bonus. `compustat_company.parquet` includes `ipodate`, useful as a control
   when interpreting newly-listed firms with short feature history.

The two should-have items (`crsp.dsedelist`, `crsp.dsi`) were not pulled.
We can compute market-index returns by aggregating dsf with the linktable,
so dsi is not blocking. dsedelist would be useful for within-window
delisting handling, but is not blocking for the current scope.

### 3.3 Data we will not pull

- Compustat funda back before 1999 (no need).
- CRSP daily prices back before 2016 (monthly is sufficient for training).
- I/B/E/S consensus estimates, S&P credit ratings, GICS sectors, Glassdoor,
  10-K text, 8-K events, USPTO patents, GitHub, FRED macro. All considered,
  all out of scope.

### 3.4 Anchor-year coverage, current data state

Usable anchors fyear 2003 to fyear 2024, 22 years. Lower bound is set by the
5-year feature window (need fyear 2003 features to look back to 1999); upper
bound is set by the price target needing a full 12-month forward window
inside dsf (dsf ends 2024-12-31, so fyear 2024 anchors at `datadate + 90d`
in early 2025 with forward window into early 2026 may be partially clipped).

Practical anchor range: fyear 2003 to fyear 2023 with full forward window;
fyear 2024 with partial forward window (treat carefully or exclude).

---

## 4. Methodology

Execution order. Every later step depends on earlier ones.

### Step 1. Scaffolding migration

Rewrite `~/Desktop/School & ML Projects/ml2-final-project/` for the drawdown
project.

- Replace `HANDOFF.md` (this file is the replacement).
- Replace `README.md` (drawdown framing).
- Replace `src/data/labels.py` with `src/data/drawdown.py` (target builder).
- Keep `src/data/splits.py`, retune year cutoffs.
- Keep `src/tabular/ratios.py`, extend to use the new funda columns where useful.
- Add `src/temporal/encoder.py` (LSTM and MLP-flatten ablation pair).
- Add `src/price/features.py` (vol, momentum, beta, prior drawdown, skew,
  kurtosis, log dollar volume).
- Add `src/fusion/{model.py,train.py}` (joint head, training loop).
- Update `environment.yml` to current package versions.
- Move/delete `scripts/` files that were Glassdoor and EDGAR specific.

### Step 2. Build the target

`src/data/drawdown.py` produces a frame keyed by (gvkey, fyear) with:
`permno, anchor_date, fwd_12m_max_dd, large_dd_30, large_dd_50, dd_year_pct`.

The function takes funda, linktable, and dsf. For each (gvkey, fyear):

1. Resolve permno via the linktable with `linkdt <= datadate <= linkenddt`.
2. Set `anchor_date = datadate + 90 days`.
3. Select daily prices from `[anchor_date, anchor_date + 252 trading days]`
   from dsf. Use the adjusted price (price × cfacpr) so corporate-action
   adjustments are clean.
4. Compute peak-to-trough drawdown over the window at daily resolution.
5. Drop rows where the forward window has fewer than 60 valid trading days.
6. Cross-check delisting via `compustat_company.parquet`. If the firm
   delists during the window with dlrsn `01` (M&A) or `07` (foreign acq),
   treat the buyout as a non-distress event (assume zero return from the
   delisting date forward). If dlrsn is `02`, `03`, `04`, `09`, treat as
   total loss for the remainder of the window.

Critical leakage rule. The price feature window for the same anchor must end
strictly before `anchor_date`, with at least 1 trading day gap. Encode this
as an assertion in the module.

### Step 3. Build the financial feature matrix

For each anchor (gvkey, fyear):

1. Compute the 18 ratios from `src/tabular/ratios.py` for fyears fyear-4
   through fyear.
2. Per-fyear cross-sectional z-score, winsorized at the 1st and 99th
   percentile of the train fold.
3. Industry-aware median imputation for `r_inv_turn` and `r_recv_turn` on
   firms in banking, insurance, and pure-services SIC codes where these
   ratios are structurally NaN.
4. Drop anchors that still have any NaN after imputation.
5. Output a numpy array of shape (N, 5, 18) plus aligned (N,) target vectors.

### Step 4. Build the price feature vector

For each anchor, from the 252 daily returns ending strictly before
`anchor_date`:

- Annualized realized volatility (std of daily returns × sqrt(252)).
- Total return over the prior 252 trading days.
- Skewness and kurtosis of daily returns.
- Max drawdown over the prior 252 trading days.
- Beta vs the equal-weighted market portfolio computed from the dsf
  universe (regression of firm daily returns on aggregated market return).
  Equal-weight is simpler than value-weight and adequate here.
- Log of average daily dollar volume (|prc| × vol).

Output a (N, 7) array, then per-fyear standardize using train-fold statistics.

### Step 5. Time-blocked split (post extension)

- Train. fyear 2003 to fyear 2017 (15 years).
- Val. fyear 2018 to fyear 2019 (the COVID anchor lives here, two years).
- Test. fyear 2020 to fyear 2023 (rate-hike wave plus AI-era distress, four years).

fyear 2024 anchors are excluded from the main evaluation because the forward
window extends into 2026 partially beyond dsf coverage. They are available
for a "live score" appendix.

No firm-year appears in more than one split. No shuffling.

### Step 6. Baselines

Run all three baselines on the train fold, validate on val, report on test.

- Baseline 0 (vol-only). Predict drawdown = alpha × trailing_vol + beta,
  with alpha and beta fit on the train fold. One free parameter pair, no
  cross-validation needed.
- Baseline 1 (Ridge). 5-fold time-blocked CV on train for alpha.
- Baseline 2 (XGBoost). Random search over a small hyperparameter grid (n_estimators in [100, 300, 500], max_depth in [3, 5, 7], learning_rate in [0.01, 0.05, 0.1])
  with early stopping on val. Cap the search at 20 trials.

### Step 7. Headline architecture, with an internal ablation

The headline model is a dual-stream fusion network. The financial stream
encoder is chosen by val MAE between two candidates, both reported:

- Candidate A. LSTM over (5, 18). Two layers, hidden dim 64, take last
  hidden state, project to 32-dim.
- Candidate B. MLP-flatten. Flatten (5, 18) to 90-dim, run a 2-layer MLP
  with hidden dims [128, 64], output 32-dim.

The price stream is a fixed 2-layer MLP, hidden dim 32, output 16-dim.

The fusion head is concat (48-dim) into a 2-layer MLP, hidden dim 32, output
a single scalar.

Training. AdamW, learning rate 1e-3, cosine annealing, dropout 0.2 on all
hidden layers, layer normalization on the fusion input, batch size 256, max
50 epochs, early stop on val MAE with patience 5.

Loss. Huber (smooth-L1, delta = 0.05) on the regression target. Huber is more
robust than MSE to the heavy left tail of drawdown distributions.

### Step 8. Evaluation

Report on the test fold.

- Regression. MAE, RMSE, R squared, all overall and by anchor year.
- Binary at 30 percent. PR-AUC, ROC-AUC, recall at 5 percent false-positive rate,
  Brier score.
- Rank-based. Spearman correlation between predicted and realized rank
  within anchor year. Top-decile precision (of predicted-worst-decile firms,
  how many were actually in the realized-worst decile).
- Calibration. Reliability diagram for the binary target. Predicted-vs-actual
  scatter for the regression target, colored by anchor year.
- Industry breakdown. Mean predicted drawdown by GICS sector (gsector field
  from `compustat_company.parquet`) on the fyear 2018 anchor, against
  realized mean drawdown by sector in 2020. Visualize as a paired bar chart.
  GICS replaces SIC division because GICS is cleaner for modern firms.
- Named-firm case studies. 4 to 6 firms (3 distressed, 3 healthy peers)
  with the model's predicted drawdown plotted as a trajectory across the
  test years, with realized drawdowns overlaid.
- Cross-check vs bankruptcy labels. Does the model's score correlate with
  the 263-firm bankruptcy set? Spearman, AUC of "drawdown score predicts
  next-year bankruptcy" as a secondary unsolicited validation. Not headline.

### Step 9. Stretch goal (only if headline lands and time permits)

Contrastive auxiliary loss. Firm in year t is the anchor, firm in year t-1
is positive, random firm in year t is negative. Triplet margin loss with
margin 0.2. Train as an auxiliary objective with weight 0.1 alongside the
regression loss. Test whether it improves rank metrics. Maps to Assignment 3.

This is explicitly not part of the main project. Do not start it until the
main experiment is done.

### Step 10. Deliverable

A single end-to-end notebook `notebooks/drawdown_score.ipynb` with sections
mirroring steps 2 through 8, importing from the `src/` modules. Plus
`reports/` with the slide-deck figures and a 2-page methodology summary.

---

## 5. Architecture decisions, locked

### 5.1 Why dual-stream LSTM + MLP, not a single bigger model

The two input streams are structurally different. The (5, 18) financial panel
is a short sequence with high feature dimensionality per timestep; the 7-dim
price vector is point-in-time. Forcing them into a single encoder would either
artificially extend the price vector across time or flatten the financial
sequence, losing structure. Two encoders, one for each, is the cleaner design.

### 5.2 Why LSTM is an ablation, not a commitment

Five timesteps is short. With our sample size, a 2-layer MLP that flattens
(5, 18) to a 90-dim vector may match or beat the LSTM. Forcing LSTM for Week 6
syllabus coverage would damage the project if it loses to MLP. The honest move
is to test both as the financial encoder, use the winner as headline, and
report the comparison as an ablation. The act of testing both *is* the Week 1
bias-variance pedagogical content and Week 6 sequential modeling content.

### 5.3 Why single-modal, not multimodal

Both branches are numerical tabular data. Calling this multimodal would
misuse the term. Multimodal in the strict ML sense means inputs from
different representational modes (text, image, audio). Two numerical streams
processed with different encoders is dual-stream, not multimodal. We do not
need the multimodal label for the syllabus coverage and the project is
stronger if we are honest about what it is.

### 5.4 Why no contrastive learning, VAE, GAN, CNN, transformer, RL

Each was considered and rejected for the headline:

- Contrastive learning. Marginal lift, adds an auxiliary objective that
  complicates training. Stretch goal only.
- VAE. Generative modeling is the wrong framing for a regression task with
  a known measurable target.
- GAN. Synthetic-data generation does not help here.
- CNN. Time-series-as-image is a contortion that adds Week 5 syllabus
  coverage but no real new capability. Considered for the multimodal claim,
  rejected when we decided single-modal is fine.
- Transformer. Five-timestep sequences do not need attention. Adding it for
  Week 7 coverage would be over-engineering.
- RL. There is no sequential decision problem here.

The defense against "you used too few techniques" is straightforward: the
problem is regression on a small structured panel, the right tool is
LSTM-or-MLP plus a fusion head, and the project is judged on whether it
produces a real result, not on technique count.

### 5.5 Why drawdown, not bankruptcy or stock return

- Bankruptcy. Sparse positive class (6 to 7 percent), well-studied, hard to
  produce a novel finding. Also the prior data state (Jared's first pull)
  had a labeling bug that effectively collapsed the positive class to a
  single firm-year, which forced a reframing.
- Stock return. Market-efficient, very low signal-to-noise, hardest target
  in finance ML.
- Drawdown. Continuous, real, measurable, has tail mass (10 to 20 percent
  of firm-years are above 30 percent), captures downside risk specifically,
  underexplored in deep learning, has direct business value for risk teams.

---

## 6. Validation plan, summary

Three baselines, two architecture candidates, one fusion model, two evaluation
lenses (regression and binary), three threshold-free metrics (Spearman,
top-decile precision, calibration). The full results table fits on one slide.

Pre-experiment numbers (32-firm sanity check on the existing master_financial
parquet, pre-Jared-extension):

- Ridge on flattened features. MAE = 8.20 percentage points, R squared = +0.20
  on the 2016 to 2018 holdout. Logistic regression PR-AUC = 0.65 vs base rate
  0.23.
- Predicted-risk ranking sanity check: top predicted-risk firms in test were
  WBD, RCL, AAL, UAL, NVDA (cyclicals, leverage, high vol). Bottom were
  GOOGL, PG, KO, JNJ, CVX (defensives). Ranking matches financial intuition.

These numbers are on a 32-firm subset with 157 firm-years. The full pipeline
should improve substantially on these. The pre-experiment establishes that
the pipeline runs end-to-end and the signal is real.

---

## 7. Three critical risks and their fixes

### 7.1 Macro confounding of the target

Risk. Raw drawdown is driven heavily by the year-level macro regime. A model
trained on raw drawdown can mostly learn "the next year is calm or
turbulent" rather than firm-level distress. The fyear 2018 anchor has a
mean drawdown of -46 percent because the next year is 2020.

Fix. Add the rank-within-year target (`dd_year_pct`). Report rank-based
metrics (Spearman, top-decile precision) as the primary firm-level
discrimination metric, alongside raw MAE for absolute calibration. The model
must do well on both. If it does well only on raw and poorly on rank, the
"signal" is just market timing.

### 7.2 Volatility-only baseline strength

Risk. Trailing 12-month realized volatility alone predicts forward drawdown
moderately well. If the fusion model beats Ridge by 5 percentage points of
PR-AUC but only beats vol-only by 1 percentage point, the deep-learning
contribution is marginal and the slide deck story is weak.

Fix. Make vol-only an explicit baseline. Report lift over vol-only as the
headline number, not lift over Ridge. Lift over vol-only is the only number
that matters for "does fundamentals plus market structure add to pure market
risk."

### 7.3 Information-availability leakage

Risk. The price-branch feature window must end strictly before
`anchor_date`. A single overlapping day means the model is using future
information. This is the easiest way to silently corrupt the experiment.

Fix. Encode the windowing rule in one place
(`src/data/drawdown.py::compute_price_features`) with an assertion that
the feature window's last date is strictly less than `anchor_date`. Add a
unit test that violates the rule and confirms the assertion fires.
Document this prominently in the module header.

---

## 8. Defensibility audit, five criteria

### Syllabus alignment

Defensibly anchors in Weeks 1 (bias-variance, time-blocked CV), 2 (loss,
SGD, regularization), 3 (DNN, embeddings via LSTM hidden state, MLP fusion),
4 (dropout, normalization, weight init), 6 (LSTM over financial series).
Does not hit Weeks 5, 7, 8, 9 and does not need to. The defense is "the
right tools for the data."

### Defensibility

Yes after the three fixes in section 7. Without them, the project is
vulnerable to macro confounding, vol-baseline marginalization, or silent
leakage. With them, every reviewer concern has an explicit answer.

### Sense-making

The end-to-end story holds at every layer. Inputs are explicable to a
non-technical audience. Target is intuitive (max loss). Validation is
clear (held-out years). Deliverable is a number.

### Simplicity and elegance

Three baselines, one headline model, one ablation between LSTM and
MLP-flatten. Nothing exotic. Single deliverable notebook. The minimalism
is the point.

### Outcome confidence

High that the project produces a defensible result (the pipeline runs,
metrics will be non-trivial, the comparison ladder is informative).
Moderate that the project produces a wow result. The wow comes from the
COVID anchor and the named-firm case studies, not from the headline
metric in isolation.

---

## 9. Syllabus mapping

Every model component maps to a class week.

| Component | Week |
|---|---|
| Time-blocked split, bias-variance ablation | 1 |
| MSE / Huber loss, AdamW, regularization | 2 |
| MLP fusion head, embeddings via LSTM hidden state | 3 |
| Dropout, layer norm, weight init, residual connections (if used) | 4 |
| LSTM over (5, 18) financial sequence | 6 |
| Optional contrastive aux loss (stretch only, Assignment 3 territory) | 7 |

---

## 10. Prior work and positioning

The drawdown framing was chosen partly to avoid saturated targets where any
new contribution would be derivative.

### Bankruptcy prediction (saturated)

- Altman 1968 (Z-score), Ohlson 1980 (O-score), Zmijewski 1984. Classical.
- Lombardo et al 2022. SOWIDE dataset and benchmarks. The
  `american_bankruptcy_dataset.csv` file in Jared's repo is this dataset.
- Pellegrino et al 2024. Multi-head LSTM on SOWIDE.

### AI-mention work in 10-Ks (saturated as of 2025)

- Eisfeldt, Schubert, Zhang 2023 (NBER). Generative AI and firm values.
- Babina, Fedyk, He, Hodson 2023 / 2024. Cognism workforce data plus
  Burning Glass job postings to measure AI investment.
- Boyuan Li 2025 (University of Florida). AI Washing. Earnings calls plus
  Cognism HR data. Identifies 165 AI-washing firms. Stock returns reverse
  by 360 days.
- arXiv 2508.19313 (ECML 2025). AI risk mentions in 10-K Risk Factors
  across 30,000 filings. Mentions grew from 4 to 43 percent, 2020 to 2024.
- CAQ 2025 industry report. 90 percent of S&P 500 firms mention AI in 2024
  10-Ks.

These references explain why the project does not try to build "AI talk
versus walk" as a centerpiece. They also explain why a credit-rating
prediction project is saturated.

### Drawdown prediction (less saturated)

Drawdown prediction with deep learning on financial fundamentals is a thinner
literature than return prediction or bankruptcy prediction. Our angle is the
combination of (a) recent data including COVID and post-2022 distress, (b)
dual-stream architecture, (c) a calibrated open-source score with named-firm
case studies.

---

## 11. What we considered and rejected

For future reference, to avoid relitigating.

- Bankruptcy as primary target. Too sparse, too saturated.
- Synthetic credit rating prediction. Done many times.
- AI talk-versus-walk via 10-K text and patents. Already covered by Li 2025
  and Babina 2024 with proprietary HR data we cannot replicate.
- AI talk-versus-walk via fine-tuned BERT on 10-K specificity. Pivoted away
  when we constrained to numerical-only data per syllabus discipline.
- LSTM autoencoder with reconstruction-error anomaly score. Rejected because
  there is no external ground truth metric, the score would be self-referential.
- VAE on financial features. Rejected for the same reason.
- Contrastive firm-trajectory embedding as headline. Rejected as
  centerpiece, kept as a stretch goal.
- Survival analysis on bankruptcy with deep hazards. Considered, rejected
  because it requires the saturated bankruptcy target.
- Multimodal claim with CNN-over-time-series-as-image. Considered, rejected
  because single-modal is honest and the user explicitly accepted single-modal.
- Industry-conditional architecture as headline. Kept as an evaluation slide,
  not an architectural commitment.
- Adding GICS, S&P ratings, I/B/E/S, FRED macro features. All out of scope.
- Adding 10-K text, 8-K events, USPTO patents, GitHub activity, Glassdoor.
  All out of scope.

---

## 12. Deliverable shape

### Repo layout (post-cleanup)

```
ml2-final-project/
  HANDOFF.md                this file
  README.md                 user-facing project summary
  environment.yml           Python 3.11, torch 2+, pyarrow, sklearn, xgboost
  Makefile                  build_dataset / train / eval targets
  data/
    raw/                    symlinks or copies of Jared's parquet files
    processed/              built per-firm-year panel with features + targets
  src/
    data/
      drawdown.py           target builder (section 4 step 2)
      splits.py             time-blocked splits (retuned)
    tabular/
      ratios.py             18-ratio spec (existing, slightly extended)
    price/
      features.py           price-branch features (section 4 step 4)
    temporal/
      encoder.py            LSTM and MLP-flatten encoders, both
    fusion/
      model.py              dual-stream model
      train.py              training loop, baselines, evaluation
  notebooks/
    drawdown_score.ipynb    end-to-end notebook (deliverable)
  reports/
    figures/                slide-deck visuals
    methodology.md          2-page methodology summary
  scripts/
    pull_wrds.py            (placeholder; Jared's notebook is canonical)
```

### Notebook outline

1. Load and inspect the 4 to 5 raw parquet files.
2. Build the (gvkey, fyear) anchor panel with permno joins.
3. Compute targets, primary and auxiliaries.
4. Compute features, financial and price.
5. Time-blocked split.
6. Baselines 0, 1, 2 with metric tables.
7. Headline fusion model with LSTM vs MLP-flatten ablation.
8. Test-set evaluation with all metrics.
9. Industry breakdown for COVID anchor.
10. Named-firm case studies.
11. (Optional) Contrastive auxiliary loss ablation.

### Slide deck

Three visuals carry the story:

1. Industry-conditional precision on the fyear 2018 anchor (paired bar
   chart, predicted vs realized mean drawdown by SIC division).
2. Calibration scatter (predicted vs actual drawdown, colored by anchor
   year, with the diagonal).
3. Trajectory plot for 4 to 6 named firms showing the model's predicted
   drawdown rising before observed drawdown events.

---

## 13. Open questions still pending, as of 2026-05-19

1. Jared's extended data pull (5-item list in section 3.2). User has the ask.
2. Scaffolding cleanup: user approved in principle, awaiting green light
   to start.
3. Initial git commit: user has not weighed in. Suggest making one after
   scaffolding cleanup, before any modeling code.

When the green light arrives, start with section 4 steps 1 and 2 (cleanup
and target builder), since every later step depends on them.

---

## 14. Key file paths

For quick reference.

- Raw data (current, post extension):
  `/Users/nd/Documents/UChicago MSADS 2025-26/Machine Learning II/Final Project/MLII Project Data/`
- Project repo:
  `/Users/nd/Desktop/School & ML Projects/ml2-final-project/`
- Jared's GitHub repo (read-only reference, do not push):
  `/Users/nd/Desktop/School & ML Projects/MLII-Final/`
- Pre-experiment script (kept for reference, not part of the project):
  `/Users/nd/.cache/ml2_preexp.py`
- Cached price data from pre-experiment:
  `/Users/nd/.cache/ml2_prices.parquet`

---

## 15. The bar

The project succeeds if the test-fold fusion model beats Baseline 0 (vol-only)
by at least 3 percentage points of PR-AUC at the 30 percent threshold and by
at least 1 percentage point of MAE, while also showing Spearman rank
correlation above 0.20 within the COVID anchor year. Failing one of these is
recoverable in the writeup. Failing all three means the deep-learning
contribution is genuinely marginal and the project pivots to a careful
documentation of when fundamentals do not help.

This bar is intentionally modest. It is what makes the outcome confident.
