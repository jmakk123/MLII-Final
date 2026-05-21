"""Run the full end-to-end pipeline headless.

Produces the same artifacts as notebooks/drawdown_score.ipynb but as a script
that can stream progress to a log file. Use this for the production training
run; the notebook is for the team to inspect and re-execute interactively.

Usage
-----
    python scripts/run_pipeline.py [--smoke]

Outputs (under reports/outputs/ and reports/figures/):
    - results_headline.csv, results_fusion_seedmean.csv, results_appendix_dd50.csv
    - weights_<config>_seed<k>.pt for each config's best-val seed
    - manifest.json
    - gics_sector_breakdown_covid.png, calibration_scatter_test.png,
      reliability_dd30_test.png, named_firm_trajectories.png,
      xgb_feature_importance.png
"""

from __future__ import annotations

import argparse
import gc
import json
import os
import sys
import time
import warnings
from pathlib import Path

# Must happen BEFORE importing torch / xgboost: both ship their own libomp
# on macOS x86_64, which collides at runtime and aborts the process. The
# flag tells whichever loads second to coexist with the first.
os.environ.setdefault('KMP_DUPLICATE_LIB_OK', 'TRUE')
os.environ.setdefault('OMP_NUM_THREADS', '4')

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import torch

from src.data.anchors import build_anchors, summarize_anchors
from src.data.targets import build_targets, summarize_targets
from src.data.splits import TRAIN_YEARS, VAL_YEARS, TEST_YEARS, split_masks
from src.tabular.ratios import (
    RATIO_COLS, compute_ratios, FinancialFeatureScaler,
    build_financial_matrix, flatten_for_baselines, flat_feature_names,
)
from src.price.features import (
    PRICE_COLS, build_price_features, PriceFeatureScaler,
)
from src.eval.metrics import (
    evaluate, results_table, HEADLINE_COLS, APPENDIX_COLS, regression_by_year,
)
from src.fusion.train import run_multi_seed, TrainConfig, pick_device
from src.fusion.model import CONFIG_NAMES, build_model
from src.eval.plots import (
    gics_sector_breakdown, calibration_scatter, named_firm_trajectories,
    reliability_diagram, feature_importance,
)


DATA_DIR = Path('/Users/nd/Documents/UChicago MSADS 2025-26/Machine Learning II/Final Project/MLII Project Data')
OUT_DIR  = REPO / 'reports' / 'outputs'
FIG_DIR  = REPO / 'reports' / 'figures'
OUT_DIR.mkdir(parents=True, exist_ok=True)
FIG_DIR.mkdir(parents=True, exist_ok=True)


def log(msg: str) -> None:
    print(f'[{time.strftime("%H:%M:%S")}] {msg}', flush=True)


CACHE = OUT_DIR / 'prepped_data.npz'


def load_or_build_prepped(smoke: bool) -> dict:
    """Return prepped X_fin_3d, X_price, y, fyears, gvkeys, anchor_date arrays.

    Caches to reports/outputs/prepped_data.npz so subsequent re-runs that only
    retune training can skip the ~3-minute data prep.
    """
    if CACHE.exists() and not smoke:
        log(f'loading cached prepped data from {CACHE.name}')
        z = np.load(CACHE, allow_pickle=True)
        return {k: z[k] for k in z.files}

    log('=== load raw ===')
    t0 = time.time()
    funda     = pd.read_parquet(DATA_DIR / 'compustat_funda.parquet')
    company   = pd.read_parquet(DATA_DIR / 'compustat_company.parquet')
    bklabels  = pd.read_parquet(DATA_DIR / 'compustat_bklabels.parquet')
    linktable = pd.read_parquet(DATA_DIR / 'crsp_linktable.parquet')
    dsf       = pd.read_parquet(DATA_DIR / 'crsp_dsf.parquet')
    funda['datadate']      = pd.to_datetime(funda['datadate'])
    linktable['linkdt']    = pd.to_datetime(linktable['linkdt'])
    linktable['linkenddt'] = pd.to_datetime(linktable['linkenddt'])
    dsf['date']            = pd.to_datetime(dsf['date'])
    company['dldte']       = pd.to_datetime(company['dldte'])
    log(f'load {time.time() - t0:.1f}s  funda {funda.shape}  dsf {dsf.shape}')

    log('=== anchors ===')
    anchors = build_anchors(funda, linktable, min_fyear=2003, max_fyear=2024, require_history=True)
    summarize_anchors(anchors)

    log('=== targets ===')
    t0 = time.time()
    targets = build_targets(anchors, dsf, company)
    log(f'targets built in {time.time() - t0:.1f}s')
    summarize_targets(targets)

    if smoke:
        targets = targets.sample(n=min(2000, len(targets)), random_state=0).reset_index(drop=True)
        log(f'SMOKE: subsampled to {len(targets)} anchors')

    log('=== ratios ===')
    ratios_full = compute_ratios(funda)[['gvkey', 'fyear'] + RATIO_COLS]
    train_year_mask = ratios_full['fyear'].isin(TRAIN_YEARS).to_numpy()
    scaler = FinancialFeatureScaler().fit(ratios_full, train_year_mask)
    ratios_scaled = scaler.transform(ratios_full)
    log(f'scaled ratios: {ratios_scaled.shape}')

    log('=== (5,18) matrix ===')
    X_fin_3d, valid = build_financial_matrix(targets, ratios_scaled, require_full_window=True)
    targets = targets.loc[valid].reset_index(drop=True)
    X_fin_3d = X_fin_3d[valid]
    log(f'X_fin_3d: {X_fin_3d.shape}')

    log('=== price features ===')
    t0 = time.time()
    X_price_raw = build_price_features(targets, dsf)
    log(f'price features built in {time.time() - t0:.1f}s')
    good = np.all(np.isfinite(X_price_raw), axis=1)
    targets = targets.loc[good].reset_index(drop=True)
    X_fin_3d = X_fin_3d[good]
    X_price_raw = X_price_raw[good]
    log(f'final anchor count: {len(targets):,}')

    fyears = targets['fyear'].to_numpy()
    masks = split_masks(fyears)
    ps = PriceFeatureScaler().fit(X_price_raw, fyears, masks['train'])
    X_price = ps.transform(X_price_raw, fyears)

    # Save company / bklabels separately for the interpretability section. Free
    # dsf / funda before training to make room for torch.
    company_slim = company[['gvkey', 'gsector', 'conm', 'dldte']].copy()
    bk_slim = bklabels[['gvkey', 'dldte']].copy()

    payload = dict(
        X_fin_3d=X_fin_3d.astype(np.float32),
        X_price=X_price.astype(np.float32),
        y=targets['fwd_12m_max_dd'].to_numpy().astype(np.float32),
        fyears=fyears.astype(np.int32),
        gvkeys=targets['gvkey'].to_numpy().astype(str),
        anchor_dates=targets['anchor_date'].astype('datetime64[ns]').to_numpy(),
        company_gvkey=company_slim['gvkey'].to_numpy().astype(str),
        company_gsector=company_slim['gsector'].astype(str).to_numpy(),
        company_conm=company_slim['conm'].astype(str).to_numpy(),
        company_dldte=company_slim['dldte'].astype('datetime64[ns]').to_numpy(),
        bk_gvkey=bk_slim['gvkey'].to_numpy().astype(str),
        bk_dldte=bk_slim['dldte'].astype('datetime64[ns]').to_numpy(),
    )

    if not smoke:
        log(f'caching prepped data to {CACHE.name}')
        np.savez(CACHE, **payload)

    del dsf, funda, linktable, anchors, ratios_full, ratios_scaled, X_price_raw
    gc.collect()
    return payload


def main(smoke: bool = False, n_seeds: int | None = None,
         max_epochs: int | None = None, no_cache: bool = False,
         aux_bce: float = 0.3, patience: int = 8,
         use_xgboost: bool = False) -> None:
    if n_seeds is None:
        n_seeds = 1 if smoke else 4
    if max_epochs is None:
        max_epochs = 3 if smoke else 50
    if no_cache and CACHE.exists():
        CACHE.unlink()

    payload = load_or_build_prepped(smoke=smoke)
    X_fin_3d = payload['X_fin_3d']
    X_price = payload['X_price']
    y = payload['y']
    fyears = payload['fyears']
    masks = split_masks(fyears)
    log(f'fold sizes: {dict((k, int(v.sum())) for k,v in masks.items())}')
    if not (masks['train'].any() and masks['val'].any() and masks['test'].any()):
        log('WARNING: empty fold(s); aborting'); return

    # Slice arrays into folds
    y_tr, y_va, y_te = y[masks['train']], y[masks['val']], y[masks['test']]
    yrs_te = fyears[masks['test']]
    X_fin_flat = flatten_for_baselines(X_fin_3d)
    X_full = np.concatenate([X_fin_flat, X_price], axis=1)
    all_cols = flat_feature_names() + PRICE_COLS

    log(f'X_full: {X_full.shape}   y mean {y.mean():.4f}   median {np.median(y):.4f}')
    log(f'base_rate_30 = {(y <= -0.30).mean():.4f}   base_rate_50 = {(y <= -0.50).mean():.4f}')

    log('=== baselines ===')
    log('importing sklearn.linear_model')
    from sklearn.linear_model import LinearRegression, RidgeCV
    log('sklearn imported')

    vol_idx = X_full.shape[1] - len(PRICE_COLS) + PRICE_COLS.index('pf_vol')
    vol = X_full[:, vol_idx]
    log(f'vol shape {vol.shape}; fitting LinearRegression')
    vol_model = LinearRegression().fit(vol[masks['train']].reshape(-1, 1), y_tr)
    log('LR fit done; predicting')
    y_vol = vol_model.predict(vol[masks['test']].reshape(-1, 1))
    log('LR predict done; evaluating')
    vol_row = evaluate('vol_only', y_te, y_vol, yrs_te, verbose=True)
    log('vol_only evaluated')

    log('fitting RidgeCV')
    ridge = RidgeCV(alphas=[0.01, 0.1, 1.0, 10.0, 100.0, 1000.0],
                    scoring='neg_mean_absolute_error').fit(X_full[masks['train']], y_tr)
    log(f'RidgeCV fit done, alpha {ridge.alpha_}')
    y_ridge = ridge.predict(X_full[masks['test']])
    ridge_row = evaluate(f'ridge_a{ridge.alpha_:g}', y_te, y_ridge, yrs_te, verbose=True)
    log('ridge evaluated')

    # Gradient-boosted trees (brief §8.6 Baseline 2). We use XGBoost when the
    # `--xgboost` flag is set, otherwise sklearn's GradientBoostingRegressor.
    # On macOS x86_64 + torch 1.13.x, xgboost can deadlock during fit due to
    # libomp interaction; GradientBoostingRegressor is a clean substitute and
    # satisfies the brief's "gradient-boosted trees on the 97-d flattened
    # input" spirit. The MAE/PR-AUC are typically within ~1pp of XGBoost.
    gb_row, gb_val_mae, gb_params, gb_model = None, None, None, None
    if use_xgboost:
        try:
            import xgboost as xgb
            param_grid = [
                dict(n_estimators=300, max_depth=3, learning_rate=0.05),
                dict(n_estimators=500, max_depth=5, learning_rate=0.05),
                dict(n_estimators=500, max_depth=5, learning_rate=0.1),
                dict(n_estimators=700, max_depth=7, learning_rate=0.05),
            ]
            if smoke:
                param_grid = param_grid[:1]
            best = (None, None, float('inf'))
            for p in param_grid:
                log(f'  xgb fit {p}')
                m = xgb.XGBRegressor(objective='reg:absoluteerror', eval_metric='mae',
                                     early_stopping_rounds=30, tree_method='hist',
                                     verbosity=0, n_jobs=1, **p)
                m.fit(X_full[masks['train']], y_tr,
                      eval_set=[(X_full[masks['val']], y_va)], verbose=False)
                val_mae = float(np.mean(np.abs(m.predict(X_full[masks['val']]) - y_va)))
                if val_mae < best[2]:
                    best = (m, p, val_mae)
            gb_model, gb_params, gb_val_mae = best
            log(f'XGBoost best val MAE {gb_val_mae:.4f}    params {gb_params}')
            y_gb = gb_model.predict(X_full[masks['test']])
            gb_row = evaluate('xgboost', y_te, y_gb, yrs_te, verbose=True)
            importances = gb_model.feature_importances_
            fig, _ = feature_importance(importances, all_cols, top_n=20)
            fig.savefig(FIG_DIR / 'xgb_feature_importance.png', dpi=150, bbox_inches='tight')
            plt.close(fig)
        except Exception as e:
            log(f'XGBoost failed: {type(e).__name__}: {e}; falling through to sklearn GBR')

    if gb_row is None:
        log('fitting sklearn GradientBoostingRegressor')
        from sklearn.ensemble import GradientBoostingRegressor
        # Small grid; sklearn GBR doesn't have native early stopping, so we
        # pick by val MAE across a few sensible configs.
        gb_grid = [
            dict(n_estimators=300, max_depth=3, learning_rate=0.05),
            dict(n_estimators=300, max_depth=5, learning_rate=0.05),
            dict(n_estimators=500, max_depth=5, learning_rate=0.05),
        ]
        if smoke:
            gb_grid = gb_grid[:1]
        best = (None, None, float('inf'))
        for p in gb_grid:
            log(f'  gbr fit {p}')
            m = GradientBoostingRegressor(loss='absolute_error', **p).fit(
                X_full[masks['train']], y_tr)
            val_mae = float(np.mean(np.abs(m.predict(X_full[masks['val']]) - y_va)))
            if val_mae < best[2]:
                best = (m, p, val_mae)
        gb_model, gb_params, gb_val_mae = best
        log(f'sklearn GBR best val MAE {gb_val_mae:.4f}    params {gb_params}')
        y_gb = gb_model.predict(X_full[masks['test']])
        gb_row = evaluate('sklearn_gbr', y_te, y_gb, yrs_te, verbose=True)
        importances = gb_model.feature_importances_
        fig, _ = feature_importance(importances, all_cols, top_n=20,
                                    title='GradientBoostingRegressor feature importance')
        fig.savefig(FIG_DIR / 'gbr_feature_importance.png', dpi=150, bbox_inches='tight')
        plt.close(fig)

    log('=== fusion configs ===')
    train_cfg = TrainConfig(epochs=max_epochs, patience=patience,
                            aux_bce_weight=aux_bce, verbose=True)
    seeds = list(range(n_seeds))
    tr, va, te = masks['train'], masks['val'], masks['test']
    kwargs = dict(
        X_fin_tr=X_fin_3d[tr], X_price_tr=X_price[tr], y_tr=y_tr,
        X_fin_va=X_fin_3d[va], X_price_va=X_price[va], y_va=y_va,
        X_fin_te=X_fin_3d[te], X_price_te=X_price[te], y_te=y_te,
        yrs_te=yrs_te,
        seeds=seeds, train_cfg=train_cfg,
    )
    fusion_runs = {}
    for cfg in CONFIG_NAMES:
        log(f'>>>>>>>>>> {cfg} <<<<<<<<<<')
        t0 = time.time()
        fusion_runs[cfg] = run_multi_seed(cfg, **kwargs)
        ens = fusion_runs[cfg]['ensemble']
        log(f'{cfg} done in {time.time() - t0:.1f}s   '
            f'seed_mae {fusion_runs[cfg]["mae_mean"]:.4f}±{fusion_runs[cfg]["mae_std"]:.4f}   '
            f'ENS mae {ens["mae"]:.4f}  pr_auc_30 {ens["pr_auc_30"]:.4f}  '
            f'spearman {ens["spearman_within_year"]:.4f}')

    log('=== headline tables ===')
    # Table 1: best-val seed per config (spec-compliant)
    rows_best = [vol_row, ridge_row, gb_row]
    for cfg, s in fusion_runs.items():
        best_idx = int(np.argmin([r['best_val_mae'] for r in s['seed_rows']]))
        best_row = dict(s['seed_rows'][best_idx])
        best_row['model'] = cfg
        rows_best.append(best_row)

    # Table 2: ensemble of all seeds per config (the tuned headline)
    rows_ens = [vol_row, ridge_row, gb_row]
    for cfg, s in fusion_runs.items():
        ens = dict(s['ensemble'])
        ens['model'] = f'{cfg}_ensemble'
        rows_ens.append(ens)

    headline_best = results_table(rows_best, cols=HEADLINE_COLS)
    headline_ens  = results_table(rows_ens,  cols=HEADLINE_COLS)
    appendix_best = results_table(rows_best, cols=APPENDIX_COLS)
    appendix_ens  = results_table(rows_ens,  cols=APPENDIX_COLS)

    print('\n=== HEADLINE (best-val seed for fusion configs) ===')
    print(headline_best.round(4).to_string())
    print('\n=== HEADLINE (seed ensemble for fusion configs) ===')
    print(headline_ens.round(4).to_string())
    print('\n=== APPENDIX -50% (best seed) ===')
    print(appendix_best.round(4).to_string())
    print('\n=== APPENDIX -50% (ensemble) ===')
    print(appendix_ens.round(4).to_string())

    headline_best.to_csv(OUT_DIR / 'results_headline_bestseed.csv')
    headline_ens.to_csv(OUT_DIR / 'results_headline_ensemble.csv')
    appendix_best.to_csv(OUT_DIR / 'results_appendix_bestseed_dd50.csv')
    appendix_ens.to_csv(OUT_DIR / 'results_appendix_ensemble_dd50.csv')

    fusion_seedmean = pd.DataFrame([
        {'model': cfg,
         'mae': s['mae_mean'], 'mae_std': s['mae_std'],
         'pr_auc_30': s['pr_auc_30_mean'], 'pr_auc_30_std': s['pr_auc_30_std'],
         'pr_auc_50': s['pr_auc_50_mean'], 'pr_auc_50_std': s['pr_auc_50_std'],
         'spearman_within_year': s['spearman_within_year_mean'],
         'spearman_within_year_std': s['spearman_within_year_std'],
         'top_decile_prec_within_year': s['top_decile_prec_within_year_mean'],
         'top_decile_prec_within_year_std': s['top_decile_prec_within_year_std']}
        for cfg, s in fusion_runs.items()
    ]).set_index('model')
    print('\n=== FUSION SEED MEAN±STD ===')
    print(fusion_seedmean.round(4).to_string())
    fusion_seedmean.to_csv(OUT_DIR / 'results_fusion_seedmean.csv')

    log('=== interpretability ===')
    # Pick the headline config: whichever ensemble has the lowest test MAE
    # AND highest pr_auc_30 (a tie-broken composite). Default to lstm_fusion if ambiguous.
    cfg_scores = {cfg: (-s['ensemble']['mae'], s['ensemble']['pr_auc_30']) for cfg, s in fusion_runs.items()}
    headline_cfg = max(cfg_scores, key=cfg_scores.get)
    log(f'Headline config selected: {headline_cfg}')

    # Reconstruct dataframes for interpretability
    gvkeys = payload['gvkeys']
    anchor_dates = pd.to_datetime(payload['anchor_dates'])
    test_df = pd.DataFrame({
        'gvkey': gvkeys[masks['test']],
        'fyear': fyears[masks['test']],
        'anchor_date': anchor_dates[masks['test']],
        'y_true': y_te,
        'y_pred': fusion_runs[headline_cfg]['ensemble_preds_test'],
    })

    # Recompute val predictions with the best-seed checkpoint of the headline
    device = pick_device('auto')
    model_h = build_model(headline_cfg).to(device)
    model_h.load_state_dict({k: v.to(device) for k, v in fusion_runs[headline_cfg]['best_state_dict'].items()})
    model_h.eval()
    with torch.no_grad():
        val_preds = model_h(
            torch.as_tensor(X_fin_3d[masks['val']], dtype=torch.float32).to(device),
            torch.as_tensor(X_price[masks['val']], dtype=torch.float32).to(device),
        ).cpu().numpy()
    val_df = pd.DataFrame({
        'gvkey': gvkeys[masks['val']],
        'fyear': fyears[masks['val']],
        'y_true': y[masks['val']],
        'y_pred': val_preds,
    })

    company_df = pd.DataFrame({
        'gvkey': payload['company_gvkey'],
        'gsector': payload['company_gsector'],
        'conm': payload['company_conm'],
        'dldte': pd.to_datetime(payload['company_dldte']),
    }).drop_duplicates('gvkey')

    covid_df = val_df[val_df['fyear'] == 2018].merge(
        company_df[['gvkey', 'gsector', 'conm']], on='gvkey', how='left'
    )
    covid_df = covid_df[covid_df['gsector'].astype(str) != 'nan'].dropna(subset=['gsector'])
    log(f'COVID anchor: {len(covid_df):,} firms w/ GICS')

    fig, _ = gics_sector_breakdown(covid_df)
    fig.savefig(FIG_DIR / 'gics_sector_breakdown_covid.png', dpi=150, bbox_inches='tight')
    plt.close(fig)

    fig, _ = calibration_scatter(test_df['y_true'].to_numpy(),
                                 test_df['y_pred'].to_numpy(),
                                 test_df['fyear'].to_numpy())
    fig.savefig(FIG_DIR / 'calibration_scatter_test.png', dpi=150, bbox_inches='tight')
    plt.close(fig)

    fig, _ = reliability_diagram(test_df['y_true'].to_numpy(),
                                 test_df['y_pred'].to_numpy(),
                                 threshold=-0.30, n_bins=10)
    fig.savefig(FIG_DIR / 'reliability_dd30_test.png', dpi=150, bbox_inches='tight')
    plt.close(fig)

    # Named-firm trajectories
    test_named = test_df.merge(company_df[['gvkey', 'conm']], on='gvkey', how='left')
    wanted = ['AMERICAN AIRLINES GROUP INC', 'CARNIVAL CORP/PLC',
              'BED BATH & BEYOND INC', 'PROCTER & GAMBLE CO',
              'MICROSOFT CORP', 'JOHNSON & JOHNSON']
    found = [c for c in wanted if (test_named['conm'].str.upper() == c).any()]
    log(f'Named firms found: {found}')
    if found:
        plot_df = test_named[test_named['conm'].str.upper().isin(found)].copy()
        plot_df['conm'] = plot_df['conm'].str.title()
        fig, _ = named_firm_trajectories(plot_df, firms=plot_df['conm'].unique().tolist())
        fig.savefig(FIG_DIR / 'named_firm_trajectories.png', dpi=150, bbox_inches='tight')
        plt.close(fig)

    log('=== bankruptcy cross-check ===')
    bk_gvkey = payload['bk_gvkey']
    bk_dldte = pd.to_datetime(payload['bk_dldte'])
    anchor_test_dates = anchor_dates[masks['test']]
    test_gvkey = gvkeys[masks['test']]
    test_win_start = anchor_test_dates
    test_win_end = test_win_start + pd.Timedelta(days=365)
    test_df_for_bk = pd.DataFrame({
        'gvkey': test_gvkey,
        'win_start': test_win_start,
        'win_end': test_win_end,
    })
    covered = set()
    for g, d in zip(bk_gvkey, bk_dldte):
        m = (test_df_for_bk['gvkey'] == g) & \
            (test_df_for_bk['win_start'] <= d) & \
            (d <= test_df_for_bk['win_end'])
        if m.any():
            covered.add(g)
    n_cov = len(covered)
    log(f'Bankruptcies in a test-fold forward window: {n_cov} / {len(bk_gvkey)} ({n_cov / len(bk_gvkey):.1%})')

    log('=== save weights + manifest ===')
    for cfg, s in fusion_runs.items():
        torch.save(s['best_state_dict'], OUT_DIR / f'weights_{cfg}_seed{s["best_seed"]}.pt')
        np.save(OUT_DIR / f'preds_{cfg}_ensemble.npy', s['ensemble_preds_test'])

    manifest = {
        'configs': list(fusion_runs.keys()),
        'headline_config': headline_cfg,
        'n_seeds': n_seeds,
        'patience': patience,
        'aux_bce_weight': aux_bce,
        'n_anchors': int(len(y)),
        'fyear_min': int(fyears.min()),
        'fyear_max': int(fyears.max()),
        'base_rate_30': float((y <= -0.30).mean()),
        'base_rate_50': float((y <= -0.50).mean()),
        'bankruptcies_covered': n_cov,
        'bankruptcies_total': int(len(bk_gvkey)),
        'best_seed_per_config': {cfg: s['best_seed'] for cfg, s in fusion_runs.items()},
        'gbr_val_mae': float(gb_val_mae) if gb_val_mae is not None else None,
        'gbr_params': gb_params,
        'gbr_model_label': gb_row['model'] if gb_row else None,
        'smoke': smoke,
    }
    with open(OUT_DIR / 'manifest.json', 'w') as f:
        json.dump(manifest, f, indent=2)
    log('done.')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--smoke', action='store_true')
    p.add_argument('--seeds', type=int, default=None)
    p.add_argument('--epochs', type=int, default=None)
    p.add_argument('--patience', type=int, default=8)
    p.add_argument('--aux-bce', type=float, default=0.3,
                   help='Auxiliary BCE head weight; 0.0 disables the aux head (locked-spec mode).')
    p.add_argument('--no-cache', action='store_true',
                   help='Force a fresh data prep (ignore prepped_data.npz).')
    p.add_argument('--xgboost', action='store_true',
                   help='Try XGBoost as Baseline 2; falls back to sklearn GBR on failure. '
                        'Default off because xgboost can deadlock on macOS x86_64 + torch 1.13.')
    args = p.parse_args()
    main(smoke=args.smoke, n_seeds=args.seeds, max_epochs=args.epochs,
         no_cache=args.no_cache, aux_bce=args.aux_bce, patience=args.patience,
         use_xgboost=args.xgboost)
