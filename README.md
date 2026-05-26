# Forward 12-Month Drawdown Prediction

Machine Learning II · MS-ADS · University of Chicago · Spring 2026
Team: Nick Dhaliwal, Jared Maksoud, Nicholas Mikhail, Yung Chyi Yang

A dual-stream neural network that forecasts the maximum peak-to-trough drawdown a US public company will experience over the next 12 months. The model reads five years of Compustat accounting ratios through an LSTM and seven CRSP-derived price features through an MLP, then fuses the two streams to produce a single forecast in `[-1, 0]`.

**Live site:** https://jmakk123.github.io/MLII-Final/

## Headline Results

Test fold, fyear 2020 to 2023, 15,311 firm-years, 3-seed ensemble.

| Metric                       | Value  | Direction        |
|------------------------------|--------|------------------|
| MAE                          | 0.121  | lower is better  |
| RMSE                         | 0.161  | lower is better  |
| R²                           | 0.410  | higher is better |
| PR-AUC at -30%               | 0.852  | higher is better |
| Brier score                  | 0.226  | lower is better  |
| Within-year Spearman         | 0.666  | higher is better |
| Top-decile precision         | 0.487  | higher is better |

Beats the volatility-only baseline on every primary metric.

## Repository Layout

```
MLII-Final/
├── README.md                       this file
├── environment.yml                 conda environment, Python 3.11
├── .gitignore                      excludes raw data, models, tool internals
│
├── src/                            canonical Python package
│   ├── data/                       anchors, features, splits, targets
│   ├── price/                      price-derived feature engineering
│   ├── tabular/                    18 financial ratios
│   ├── temporal/                   LSTM sequence encoder
│   ├── fusion/                     fusion model + training loop
│   └── eval/                       metrics, plots, calibration
│
├── notebooks/                      Jupyter pipeline
│   ├── 00_build_master_dataset.ipynb   build anchor panel + features + targets
│   ├── 01_extract_wrds_raw.ipynb       pull raw parquets from WRDS
│   ├── 02_baselines.ipynb              vol-only, Ridge, gradient-boosted trees
│   ├── 03_fusion_model.ipynb           dual-stream fusion model + ablations
│   ├── drawdown_score.ipynb            end-to-end production run
│   ├── features.py                     legacy module used by older notebooks
│   ├── metrics.py                      legacy module used by older notebooks
│   └── targets.py                      legacy module used by older notebooks
│
├── scripts/                        runnable pipelines
│   ├── run_pipeline.py             end-to-end training + evaluation
│   └── meta_ensemble.py            seed-averaged ensemble at inference
│
├── reports/                        figures, results, writeup
│   ├── figures/                    PR curves, calibration, sector breakdowns
│   ├── outputs/                    headline result CSVs + saved weights + npy preds
│   ├── progress_report_2026-05-19  midpoint progress submission
│   └── writeup_appendix.md         methodology appendix
│
├── models/                         shipped model checkpoint
│   └── fusion_model_best.pt        best fusion model weights
│
├── data/                           gitignored, see data/README.md
│
├── site/                           React source for the live site
├── docs/                           pre-built static site served by GitHub Pages
│
└── presentation/                   slide and presentation artifacts
    ├── HANDOFF.md                  team handoff doc
    ├── PROJECT_BRIEF.md            problem statement for new collaborators
    ├── speaker_notes.docx          12-minute presentation script
    ├── build_speaker_notes.py      regenerator for the speaker notes docx
    └── design-system/              DrawdownSignal visual identity master
```

## Quick Start

### 1. Browse the site (zero setup)

```bash
python3 -m http.server 8080 --directory docs
open http://localhost:8080
```

### 2. Run the model

```bash
conda env create -f environment.yml
conda activate ml2-drawdown

# Pull raw data (needs WRDS credentials, see notebooks/01)
jupyter notebook notebooks/01_extract_wrds_raw.ipynb

# Build the anchor panel
jupyter notebook notebooks/00_build_master_dataset.ipynb

# Train and evaluate the fusion model
python scripts/run_pipeline.py

# Or run the polished end-to-end notebook
jupyter notebook notebooks/drawdown_score.ipynb
```

### 3. Develop the site

```bash
cd site
npm install
npm run dev          # local dev server with HMR
npm run build        # rebuilds ../docs for GitHub Pages
```

## Data

Compustat and CRSP are licensed and not shipped with this repo. See `data/README.md` for the expected layout and retrieval instructions via WRDS.

The 387 historical bankruptcies referenced in the slides come from CRSP delisting codes (`dlrsn` 02 / 03 / 04). They are not used as a training label because they are too sparse; we use forward 12-month max drawdown as the regression target instead, which is defined for every firm-year.

## Architecture

The winning model is a dual-stream encoder with a small fusion head.

```
financial ratios (B, 5, 18)  →  LSTM(2 layers, h=64)  → Linear(32) ┐
                                                                    ├→ concat (48-d) → MLP[32, 32] → scalar
price features    (B, 7)     →  MLP[32, 32, 16]                    ┘
```

Loss = `Huber(δ=0.05) + 0.3 · BCE(@-30%)`. Optimizer = `AdamW(1e-3, wd=1e-4)` with cosine annealing, batch 256, patience 8. Inference is a 3-seed ensemble.

Ablations tested: financial-only, price-only, MLP-fusion (drops the recurrent inductive bias), cross-attention fusion. The full LSTM fusion ensemble wins on MAE, Spearman, and top-decile precision; the other neural variants tie within seed noise on PR-AUC and Brier. See `notebooks/03_fusion_model.ipynb`.

## Reproducibility

Every run uses a fixed seed. The 3 seeds used for the headline ensemble are 0, 1, 2 (see `scripts/run_pipeline.py`). With raw parquets in place under `data/raw/`, the full pipeline reproduces the headline numbers in `reports/outputs/results_headline_ensemble.csv` to four decimals.

The trained weights for every reported configuration are committed in `reports/outputs/weights_*.pt` and the saved test-fold prediction arrays in `reports/outputs/preds_*.npy`, so the metrics can be recomputed from `reports/outputs/` alone without running training.

## License

Code: MIT. Data is licensed by WRDS / S&P Compustat / CRSP and is not redistributable.
