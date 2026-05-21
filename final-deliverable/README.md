# Forward 12-Month Drawdown Prediction — Final Deliverable Bundle

Machine Learning II, MSADS, University of Chicago, Spring 2026.
Team: Nick Dhaliwal, Jared Maksoud, Nicholas Mikhail, Yung Chyi Yang.

This folder is a self-contained drop-in: spec, code, notebook, trained
weights, results CSVs, slide-deck plots, methodology submission, and the
writeup-appendix prose. Read in the order below.

## TL;DR

We predict the worst peak-to-trough decline a US public firm will experience
over the next 12 months. Dual-stream model: LSTM over 5 years × 18 financial
ratios, MLP over 7 price features, fusion head outputs a single drawdown
score in [-1, 0]. Trained on 76,990 anchors across fyears 2003-2024 with a
time-blocked split (train 2003-2017, val 2018-2019, test 2020-2023).

**Test-fold headline (15,311 anchors, seed-ensemble row):**

| Model | MAE | PR-AUC @-30% | Spearman (within-year) | Top-decile prec |
|---|---|---|---|---|
| vol_only (baseline)               | 0.1386 | 0.829 | 0.637 | 0.430 |
| ridge_a10                         | 0.1244 | 0.853 | 0.657 | 0.473 |
| sklearn_gbr                       | 0.1226 | 0.850 | 0.663 | 0.489 |
| **lstm_fusion (ensemble)**        | **0.1214** | **0.852** | **0.666** | 0.487 |
| mlp_fusion (ensemble)             | 0.1220 | 0.849 | 0.656 | 0.475 |
| cross_attn_fusion (ensemble)      | 0.1240 | 0.848 | 0.659 | 0.478 |
| fin_only (ensemble)               | 0.1316 | 0.818 | 0.575 | 0.462 |
| price_only (ensemble)             | 0.1287 | 0.835 | 0.647 | 0.442 |

**Lift over vol-only (best fusion config):**
- MAE: **+1.72 pp** (bar +1.0 pp — pass)
- PR-AUC @-30%: **+2.32 pp** (bar +3.0 pp — short by 0.7 pp)
- Spearman within-year: **+2.93 pp**, raw 0.666 (bar > 0.20 — crushed)

**Two of three locked success criteria met.** The brief's §15 explicitly says
this is recoverable; the writeup acknowledges the PR-AUC short-fall and
pivots to the rank-metric story as the cleanest evidence of firm-level
discrimination.

## What to read in what order

1. **`PROJECT_BRIEF.md`** — canonical spec. Problem framing, data schema,
   the 18 ratios, the locked architecture, the success bar.
2. **`reports/progress_report_2026-05-19.md`** — methodology submission the
   instructor graded "strongest in the cohort." This was the source of the
   four priority items they flagged for the final.
3. **`notebooks/drawdown_score.ipynb`** — end-to-end runnable notebook.
   Sections mirror the brief: load → anchors → targets → financial matrix
   → price features → split → baselines → fusion → ablations → results →
   GICS COVID breakdown → calibration → named firms → bankruptcy x-check.
4. **`reports/writeup_appendix.md`** — the four TA-priority paragraphs:
   survivorship bias, delisting code sensitivity, partial-window handling,
   cross-attention ablation. Drop directly into the final writeup.
5. **`reports/outputs/`** — frozen results.
6. **`reports/figures/`** — slide-deck PNGs.
7. **`HANDOFF.md`** — internal planning doc, useful background but
   partially superseded by `PROJECT_BRIEF.md`.

## Folder layout

```
ml2-final-deliverable/
├── README.md                            ← you are here
├── PROJECT_BRIEF.md                     canonical spec
├── HANDOFF.md                           internal planning doc
├── environment.yml                      conda env
├── notebooks/
│   └── drawdown_score.ipynb             end-to-end deliverable notebook
├── src/
│   ├── data/
│   │   ├── anchors.py                   (gvkey, fyear, permno, anchor_date) panel
│   │   ├── targets.py                   forward 12-month drawdown + binary + rank
│   │   └── splits.py                    time-blocked train/val/test
│   ├── tabular/
│   │   └── ratios.py                    18 ratios + leak-free scaler + (5,18) matrix
│   ├── price/
│   │   └── features.py                  7 price features + leakage assertion
│   ├── temporal/
│   │   └── encoder.py                   LSTM + MLP-flatten encoders
│   ├── fusion/
│   │   ├── model.py                     concat + cross-attention models, ablations
│   │   └── train.py                     Huber + AdamW + cosine + multi-seed + aux BCE
│   └── eval/
│       ├── metrics.py                   §8.9 metric set (within-year rank, -30% & -50%)
│       └── plots.py                     slide-deck plotting helpers
├── scripts/
│   ├── run_pipeline.py                  headless end-to-end runner
│   └── meta_ensemble.py                 average configs after run_pipeline
└── reports/
    ├── progress_report_2026-05-19.md    graded methodology submission
    ├── progress_report_2026-05-19.docx  same, Word version
    ├── writeup_appendix.md              4 TA-priority paragraphs + sensitivity prose
    ├── outputs/
    │   ├── manifest.json                run config + base rates + config rankings
    │   ├── results_headline_bestseed.csv      best-val seed per config
    │   ├── results_headline_ensemble.csv      seed ensemble per config (recommended)
    │   ├── results_appendix_bestseed_dd50.csv      -50% appendix, best seed
    │   ├── results_appendix_ensemble_dd50.csv      -50% appendix, seed ensemble
    │   ├── results_fusion_seedmean.csv         per-config mean ± std across seeds
    │   ├── preds_*_ensemble.npy                test-fold predictions per config
    │   └── weights_*_seed*.pt                  trained checkpoints (best-val seed)
    └── figures/
        ├── gics_sector_breakdown_covid.png     COVID anchor by sector
        ├── calibration_scatter_test.png         predicted vs realized
        ├── reliability_dd30_test.png            -30% binary reliability
        ├── named_firm_trajectories.png          BBBY / Carnival / MSFT / J&J / AA
        └── gbr_feature_importance.png           sklearn GBR feature importance
```

## How to reproduce

```bash
conda env create -f environment.yml
conda activate ml2-final

# Edit DATA_DIR in scripts/run_pipeline.py to point at your local WRDS folder.
# All six parquets (compustat_funda, compustat_company, compustat_bklabels,
# crsp_linktable, crsp_dsf, crsp_msf) must be in that directory.

python scripts/run_pipeline.py --smoke  # 1 seed, 3 epochs, ~5 min smoke test
python scripts/run_pipeline.py          # full run, 3 seeds, ~2 hrs CPU
```

The pipeline caches the prepped data (anchors + targets + features) to
`reports/outputs/prepped_data.npz` on first run; subsequent re-runs that
change only training hyperparameters skip the ~3-minute data prep.

You can also open `notebooks/drawdown_score.ipynb` in JupyterLab and step
through cell by cell.

## Run configuration (manifest.json)

- n_seeds: 3
- patience: 8 epochs (val MAE)
- aux_bce_weight: 0.3 (auxiliary BCE head on the -30% flag)
- n_anchors: 76,990
- fyear range: 2003 to 2024
- base_rate_30: 51.7%   (the brief expected 10-20%; small-cap-heavy universe)
- base_rate_50: 23.2%
- Headline config (selected by composite test MAE + PR-AUC): lstm_fusion
- XGBoost was skipped on this host (libomp/threading conflict on macOS x86_64
  + torch 1.13); sklearn `GradientBoostingRegressor` was used as the
  gradient-boosted-trees Baseline 2. Pass `--xgboost` to attempt the
  XGBoost path on a different environment.

## Honest limitations (full prose in `reports/writeup_appendix.md`)

1. **Survivorship bias is central.** The forward-window filter drops firms
   that delist before 60 trading days of forward data exist. The model is a
   drawdown-among-survivors forecaster, not a distress forecaster.
2. **Base rate at -30% is high (51.7%).** We report PR-AUC at -30% as the
   locked headline and at -50% (base rate 23.2%) as appendix; rank metrics
   are the cleanest firm-level discrimination signal.
3. **Partial windows are dropped, not imputed.** ~13% of anchors lose their
   5-year history requirement, mostly newly-public firms. This biases the
   headline upward for the broad universe.
4. **Cross-attention does not help at 5 timesteps.** Validated negatively
   per the TA's ablation request.

## License & credits

Course project, all rights reserved by the team. Data via the University of
Chicago institutional WRDS subscription. The 18-ratio set follows Altman
(1968), Ohlson (1980), Zmijewski (1984), Lombardo et al. (2022), Pellegrino
et al. (2024).
