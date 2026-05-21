# Progress Report: Predicting Corporate Drawdown Risk with Deep Learning

**Author**: Nick Dhaliwal
**Course**: Machine Learning II, MSADS, University of Chicago
**Date**: May 19, 2026

## 1. Problem Statement

We want to predict how much a US public company will lose at its worst over the next 12 months. Given a firm's annual financial filings for the past five years and its recent stock price patterns, our model outputs the maximum peak-to-trough percentage drawdown the firm will experience over the following year.

We chose drawdown instead of bankruptcy or stock return for three reasons. First, drawdown is what risk teams actually compute when they size positions or set hedges, so the model's output has a clear practical use. Second, drawdown is continuous and has meaningful tail mass (around 10 to 20 percent of firm-years see drawdowns deeper than 30 percent), which gives the model real signal to learn rather than a rare-event problem. Third, drawdown prediction with deep learning is less saturated in the academic literature than bankruptcy or return prediction, which leaves room for an honest contribution.

The deliverable is a single forward-drawdown score per firm-year, computable from public data, released as a runnable notebook with the trained model weights.

## 2. Dataset Description

All data comes from WRDS through the UChicago institutional subscription. A teammate pulled five raw files which now sit in our project data folder.

| File | Rows | Coverage |
|---|---|---|
| compustat_funda | 132,447 | fyear 1999 to 2025, 11,953 firms, NYSE and NASDAQ, at > 0 |
| compustat_company | 45,242 | all delisting reasons plus GICS sector hierarchy |
| compustat_bklabels | 387 | Chapter 7 and 11 events, 2000 to Feb 2026 |
| crsp_linktable | 38,738 | gvkey to permno link history with date validity |
| crsp_dsf | 29.2M | daily prices, 1999-01-04 to 2024-12-31 |

The funda file provides the 18 financial line items that prior bankruptcy and distress papers use, including current assets, total assets, EBIT, retained earnings, and others, plus capex, operating cash flow, equity, debt, and working capital. The company file provides GICS sector codes for industry-level analysis, plus the full distribution of delisting reasons so we can distinguish bankruptcies from mergers and going-private events. The CRSP daily file provides the prices that let us compute realized drawdowns at fine resolution.

Our universe is US-listed common stock filed at NYSE or NASDAQ between 1999 and 2024. After requiring five years of prior fiscal history for the feature window and a valid permno link to CRSP, we expect a usable sample of roughly 50,000 to 80,000 firm-years across 22 anchor years from fyear 2003 to fyear 2024.

## 3. Data Preprocessing

For each firm-year we want to score, we build the following pipeline.

**Anchor date.** Each firm-year is anchored at `datadate + 90 days`. This is the realistic time when a firm's 10-K filing becomes public, so a model trained at this anchor only uses information that an analyst would have actually had at the time.

**Feature window.** Financial ratios for the past five fiscal years (fyear-4 through fyear). We compute 18 ratios from the raw line items, including the standard Altman, Ohlson, and Zmijewski features and standard margin and turnover ratios. Each ratio is z-scored cross-sectionally within its fyear, with winsorization at the 1st and 99th percentiles to handle extreme tails. Ratios that are structurally undefined for some firms (inventory and receivables turnover for banks, for example) are imputed with industry-year medians.

**Price features.** From the 252 trading days ending strictly before the anchor date, we compute seven features per firm: annualized volatility, total return, skewness, kurtosis, max prior drawdown, market beta against an equal-weighted aggregate, and log average dollar volume. We standardize each feature within its fyear using statistics from the training fold only.

**Target.** From the 252 trading days starting at the anchor date, we compute the maximum peak-to-trough percentage drawdown using adjusted prices from CRSP. For firms that delist during the forward window, we use the compustat_company table to handle the event correctly: bankruptcies and liquidations are treated as full loss, while mergers and going-private events are treated as terminal value at the buyout return. We compute three target forms in parallel: the raw drawdown as a regression target, a binary flag for drawdowns worse than 30 percent, and a cross-sectional rank within fyear.

**Leakage check.** The feature window must end strictly before the anchor date, and the target window must start at the anchor date. We encode this as an assertion in the data builder and add a unit test that confirms it. Getting this rule wrong silently corrupts the experiment, so we treat it as the most important piece of preprocessing discipline.

## 4. Methodology

We will train and compare four models in increasing complexity.

**Baseline 0, volatility only.** Predict drawdown as a linear function of trailing 12-month volatility, fit on the train fold. This baseline matters because volatility alone explains a meaningful share of drawdown variation, and the deep model has to beat it convincingly for the fundamentals features to count.

**Baseline 1, ridge regression.** Ridge regression on the 97-dimensional flattened feature vector (18 ratios times 5 years plus 7 price features). Linear, fast, interpretable. Hyperparameter chosen by cross-validation on the train fold.

**Baseline 2, XGBoost.** Gradient-boosted trees on the same flattened feature vector, with a small random search over a tight hyperparameter grid.

**Headline model, dual-stream fusion network.** Two encoders feed a fusion head. The financial branch takes the (5, 18) ratio matrix and produces a 32-dimensional embedding. We will test two architectures for this branch and use whichever wins on validation MAE: an LSTM that respects the temporal structure, or an MLP that flattens the matrix and trains as a feedforward network. The price branch takes the 7-dimensional vector and produces a 16-dimensional embedding through a small MLP. We concatenate both embeddings into a 48-dimensional vector and pass it through a two-layer MLP head to produce the final scalar prediction. Training uses Huber loss because it is more robust than mean squared error to the heavy left tail of drawdown distributions, AdamW with cosine learning-rate annealing, dropout for regularization, and early stopping on validation MAE.

**Justification for the architecture.** The dual-stream design reflects the structure of the data. The financial branch is a short multivariate time series, which the syllabus covers with recurrent architectures (Week 6). The price branch is a fixed-length cross-sectional vector, which calls for a feedforward network (Week 3). Combining them through concatenation and a learned head is a standard multimodal training pattern (Week 7). Regularization choices (dropout, layer normalization, weight decay) come from Week 4. We deliberately do not use transformers, generative models, or reinforcement learning because the problem does not call for them, and the project is stronger with the simpler architecture that matches the data.

We will also report a small ablation comparing financials-only, price-only, and the full fusion, so the reader can see which signals are doing the work.

## 5. Evaluation Plan

**Split.** Time-blocked. Train on fyear 2003 to 2017, validate on fyear 2018 to 2019 (which puts the COVID drawdowns in the validation forward window), test on fyear 2020 to 2023 (which covers the rate-hike wave and post-COVID distress events). No firm-year appears in more than one split, and there is no shuffling across years.

**Metrics.**
- Regression: mean absolute error, root mean squared error, and R squared, computed both overall and by anchor year.
- Binary at the 30 percent drawdown threshold: PR-AUC, ROC-AUC, recall at 5 percent false-positive rate, and Brier score.
- Cross-sectional discrimination: Spearman rank correlation between predicted and realized drawdown within each anchor year, and top-decile precision (of the 10 percent of firms with the worst predicted drawdown, what fraction actually had the worst realized drawdown).

**Interpretability checks.**
- Industry breakdown by GICS sector for the COVID anchor (fyear 2018, target window into March 2020). If the model is doing something real, it should predict elevated drawdown risk for airlines, hospitality, cruise lines, and retail before COVID actually arrives.
- Named-firm case studies for a small set of firms (about three distressed and three healthy peers) showing the model's predicted drawdown trajectory across the test years.

**Definition of success.** The fusion model is a success if it beats the volatility-only baseline by at least 3 percentage points of PR-AUC at the 30 percent threshold and at least 1 percentage point of MAE, and shows Spearman rank correlation above 0.20 within the COVID anchor year. Beating two of these three is recoverable in the writeup. Beating none would mean we have shown that fundamentals do not add much over pure market signals, which is still a worth-reporting finding for a class project even if it is a less dramatic story.
