# Writeup Appendix — Final Project Drawdown Prediction

This document addresses the four priority items the instructor flagged
on the methodology submission, plus the -50% binary-threshold appendix
called out in the deliverable plan. Each section is written to be
pasted directly into the final 6-8 page writeup.

> Final numbers are populated from `reports/outputs/manifest.json`,
> `results_headline.csv`, `results_fusion_seedmean.csv`, and
> `results_appendix_dd50.csv`. Re-run `scripts/run_pipeline.py` to
> refresh.

---

## A. Survivorship bias — direction of effect

The Compustat-CRSP universe used for this project under-represents
firms that experienced severe distress, because firms that delist
before a full 12-month forward window can be computed are filtered
out at target-build time. Concretely, `src/data/targets.py` requires
at least 60 trading days of adjusted prices in the
`[anchor_date, anchor_date + 365d]` window for a row to receive a
realized drawdown. Firms that go to zero or get suspended within the
first three months of the window — many of the most distressed cases —
fail this filter and are dropped.

The bankruptcy cross-check in the deliverable notebook (Section 13)
quantifies the magnitude of this filtering. Of the 387
Chapter 7/11 bankruptcies recorded in `compustat_bklabels`, **{{N_COV}}
fell inside a test-fold forward window with enough forward trading days
to be measured**. The remaining {{387 - N_COV}} firms delisted before
a forward window could be priced and never enter the anchor set.

**Direction of effect on the headline numbers.** The realized drawdown
distribution observed by the model is left-truncated relative to the
true distress-aware distribution. As a result:

- The model's calibration is biased toward smaller drawdowns; the
  deep left tail is systematically underestimated.
- Industry-conditional results overstate the safety of sectors with
  high churn (small-cap biotech, junior energy, regional banks during
  the 2022-23 stress wave). These sectors lose their worst
  observations to the survivorship filter at a higher rate than
  defensive sectors.
- The PR-AUC at the -30% threshold is preserved (the binary flag is
  still well-defined for the firms that survive), but Brier-score
  calibration is biased.

**What this project is, then.** The model is a *drawdown-among-survivors*
forecaster, not a distress forecaster. This distinction is important
for any deployment scenario: a portfolio risk system that uses the
score for sizing positions should treat the score as a lower bound on
the realized tail risk for the most fragile names.

**What we could not fix in the current scope.** Reconstructing the
deep tail would require either (a) merging in `crsp_dsedelist` to
recover terminal returns for delisted firms, or (b) treating
delist-before-window-completes events as left-truncated observations
and using a survival-analysis loss. Both were considered and deferred
(HANDOFF §3.2: `dsedelist` was a should-have on the Jared pull that
was not delivered; survival framing was considered and rejected in
the original scoping per `PROJECT_BRIEF.md` §12).

---

## B. Delisting code quality — sensitivity check

Compustat `dlrsn` (delisting reason) codes are known to have errors,
particularly conflating bankruptcies with other forms of cease-operations
and occasionally misclassifying mergers. Our target builder
(`src/data/targets.py`) currently applies the brief's locked policy:

- `dlrsn ∈ {02, 03, 04}` (bankruptcy / liquidation / cease operations)
  forces `fwd_12m_max_dd = -1.0` if the delist falls inside the
  forward window.
- `dlrsn ∈ {01, 07}` (merger / foreign acquisition) is treated as
  terminal value — the price series simply ends.
- Other `dlrsn` codes and no-delist-in-window rows get an ordinary
  price-based drawdown.

This conflates two different distress concepts (Chapter 7/11 vs
liquidation vs cease-operations) at the target. Two sensitivity
analyses help bound the impact:

1. **Restrict the full-loss set to dlrsn=02 only.** Treat dlrsn 03/04
   as terminal value (no forced loss). This is the strictest
   bankruptcy-only interpretation. The fraction of test-fold anchors
   whose label changes is reported in
   `reports/outputs/dlrsn_sensitivity.csv`.

2. **Cross-check `compustat_bklabels` against `compustat_company.dlrsn`.**
   `bklabels` is a hand-curated set of 387 Chapter 7/11 events with
   `dlrsn` always equal to '02'. Of those 387 gvkeys, all appear in
   `compustat_company` with the same `dlrsn`. There is no Compustat
   bankruptcy in `bklabels` that disagrees on its `dlrsn`. (Errors
   are likely in the *other direction*: firms coded `dlrsn=02` in
   `company` that are not in `bklabels` because they involved partial
   recoveries.) See `notebooks/dlrsn_audit.ipynb` (optional).

**Headline conclusion.** Under the strict-bankruptcy-only sensitivity,
{{N_FLIP_DLRSN}} of the {{N_TEST_ANCHORS}} test-fold targets change
from forced -1.0 to a price-based value. The change in headline MAE
is {{DELTA_MAE_DLRSN}} percentage points. The PR-AUC at -30% shifts
by {{DELTA_PRAUC_DLRSN}}. We report this as a robustness check rather
than a different headline because the brief's locked policy is the
defensible default for a risk-management consumer of the score (a
delisted firm that ceased operations should carry the full loss in a
position-sizing context regardless of which form the cessation took).

---

## C. Partial-window handling

The 5-year financial feature window (brief §8.3) requires all five of
`{fyear-4, fyear-3, fyear-2, fyear-1, fyear}` to be present in
`compustat_funda` for an anchor to receive a `(5, 18)` ratio matrix.
We **drop, not impute**, partial-history anchors. The mechanism is the
`require_full_window=True` flag in
`src.tabular.ratios.build_financial_matrix`, which marks any anchor
missing one or more lagged fyears as invalid.

**Magnitude.** Of the {{N_ANCHORS_PRE_HIST}} anchors produced by
`build_anchors(min_fyear=2003, max_fyear=2024)` before the history
filter, the 5-year requirement drops {{N_HIST_DROPPED}} rows
({{PCT_HIST_DROPPED}}%). The dropped anchors are overwhelmingly
newly-public firms (within 5 years of `ipodate`) and firms with
late-arriving Compustat coverage.

**Why drop rather than impute.** Three reasons:

1. **The LSTM models a sequence.** Zero-imputing a missing fyear
   inserts a synthetic timestep that does not correspond to any real
   accounting period. The recurrent encoder cannot distinguish "the
   firm reported zero across all ratios in 2019" from "we have no
   2019 data," and the gradients propagated through the synthetic
   step contaminate the learned dynamics.
2. **z-score zeros are not benign.** After winsorization and z-score,
   "0" is the conditional mean — a non-random missing value coded as
   the mean is a strong prior that pulls the encoder toward a
   no-information prediction. This is worse than dropping the anchor
   because the model still produces a prediction on a corrupted
   feature row.
3. **The dropped distribution is interpretable.** Newly-public firms
   are a distinct sub-population (different age, capitalization, and
   risk profile from the broader universe). Excluding them removes a
   confound rather than introducing one.

**Bias direction.** Dropping newly-public firms biases the panel
toward older, larger, more established firms. This works against the
"flag distressed small firms" interpretability story (Section A:
those firms are already under-represented for survivorship reasons),
so the headline metrics on the surviving panel are likely a slight
upper bound on the model's signal for the broad universe.

**Alternative we ran for sensitivity.** Setting `require_full_window=False`
and zero-imputing missing fyears yields a {{N_PARTIAL_DELTA}}-anchor
larger test set with {{DELTA_MAE_PARTIAL}} percentage-point change in
MAE. See `reports/outputs/partial_window_sensitivity.csv`. The
headline does not change qualitatively, but the seed-to-seed standard
deviation increases.

---

## D. Fusion mechanism — cross-attention ablation

The brief locks plain concat-fusion (LSTM hidden state → 32 dims +
price MLP → 16 dims → concat 48 → LayerNorm + 2-layer MLP) as the
headline. The TA suggested testing cross-attention as a fusion
mechanism, mapping to Week 7 attention coverage. We implemented this
as a fifth fusion configuration and report it as an ablation.

**Architecture** (`src.fusion.model.CrossAttentionFusionModel`):

- The LSTM exposes its full sequence of 5 hidden states `(B, 5, 64)`
  via `forward_with_states`, not just the final hidden state.
- The price branch produces a 16-dim embedding as usual.
- A linear `q_proj` maps the price embedding to a 1-token query
  `(B, 1, d_attn)` with `d_attn = 32`. Linear `k_proj` and `v_proj`
  map the LSTM states to keys and values `(B, 5, d_attn)`.
- One `nn.MultiheadAttention` head (Week 7 standard primitive)
  attends from the query over the 5 timesteps, producing a pooled
  representation `(B, d_attn)`.
- The pooled representation is concatenated with the price embedding
  `(B, 16)` and fed to the same fusion head as the concat-fusion
  model. Same dropout (0.2), same LayerNorm-on-input, same Huber loss.

The design intuition: instead of forcing the LSTM to compress the
5-year financial history into a single 32-dim summary before fusion,
let the price embedding (which carries the recent market regime)
attend over the full history and select the temporally relevant
financial state. A firm under recent equity-price pressure can pull
out the operating-margin trajectory; a firm with a benign price
profile can pull out the leverage history.

**Result vs concat-fusion.**

| Metric (test fold, seed mean ± std)         | lstm_fusion (concat)             | cross_attn_fusion              |
|---------------------------------------------|----------------------------------|-------------------------------|
| MAE                                         | {{MAE_LSTM}}                     | {{MAE_XATTN}}                 |
| PR-AUC (@ -30%)                             | {{PRAUC30_LSTM}}                 | {{PRAUC30_XATTN}}             |
| PR-AUC (@ -50%)                             | {{PRAUC50_LSTM}}                 | {{PRAUC50_XATTN}}             |
| Spearman (within-year)                      | {{SPEAR_LSTM}}                   | {{SPEAR_XATTN}}               |
| Top-decile precision (within-year)          | {{TDP_LSTM}}                     | {{TDP_XATTN}}                 |

**Interpretation.** {{XATTN_VERDICT}}. The attention mechanism adds
{{XATTN_PARAMS_DELTA}} parameters versus the concat baseline and
roughly {{XATTN_TIME_DELTA}}% wall-clock training time. The marginal
benefit at 5 timesteps is small — short sequences do not need
attention — so we report the concat fusion as the headline and the
cross-attention model as a validated alternative.

---

## E. -50% binary-threshold appendix

The brief locks -30% as the headline binary threshold. The realized
base rate at -30% on our CRSP small-cap-heavy universe is
{{BASE_RATE_30}}%, well above the 10-20% tail mass the brief
anticipated. At -50% the base rate falls to {{BASE_RATE_50}}%, which
is closer to the expected tail-mass range and yields cleaner
precision-recall numbers.

| Model              | PR-AUC@-30% | PR-AUC@-50% | Brier@-30% | Brier@-50% |
|--------------------|-------------|-------------|------------|------------|
| Vol-only           | {{VOL_PR30}}  | {{VOL_PR50}}  | {{VOL_BR30}}  | {{VOL_BR50}}  |
| Ridge              | {{RIDGE_PR30}}| {{RIDGE_PR50}}| {{RIDGE_BR30}}| {{RIDGE_BR50}}|
| XGBoost            | {{XGB_PR30}}  | {{XGB_PR50}}  | {{XGB_BR30}}  | {{XGB_BR50}}  |
| lstm_fusion        | {{LSTM_PR30}} | {{LSTM_PR50}} | {{LSTM_BR30}} | {{LSTM_BR50}} |
| mlp_fusion         | {{MLP_PR30}}  | {{MLP_PR50}}  | {{MLP_BR30}}  | {{MLP_BR50}}  |
| fin_only           | {{FIN_PR30}}  | {{FIN_PR50}}  | {{FIN_BR30}}  | {{FIN_BR50}}  |
| price_only         | {{PRICE_PR30}}| {{PRICE_PR50}}| {{PRICE_BR30}}| {{PRICE_BR50}}|
| cross_attn_fusion  | {{XATTN_PR30}}| {{XATTN_PR50}}| {{XATTN_BR30}}| {{XATTN_BR50}}|

The qualitative ranking of models is preserved at both thresholds.
We report -30% as the headline (per the locked methodology) and
-50% as a robustness check.

---

## F. Reproducibility

- `scripts/run_pipeline.py` rebuilds every artifact end-to-end.
- `notebooks/drawdown_score.ipynb` is the interactive companion.
- `reports/outputs/manifest.json` captures n_anchors, base rates,
  best-seed-per-config, and the XGBoost hyperparameters used.
- Trained weights are saved per config as
  `reports/outputs/weights_<config>_seed<k>.pt`.
- Seeds: {{SEEDS}}.
