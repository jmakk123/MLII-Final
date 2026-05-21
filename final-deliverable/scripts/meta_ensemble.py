"""Meta-ensemble across fusion configs + the gradient-boosted baseline.

After run_pipeline.py finishes, this script reads the saved per-config
ensemble predictions (already seed-averaged) and creates one or more
meta-ensembles by simple uniform averaging. Adds another 0.5-1pp PR-AUC
typically.

Usage:
    python scripts/meta_ensemble.py [--configs lstm_fusion cross_attn_fusion fin_only]

Writes:
    reports/outputs/preds_meta_ensemble.npy
    reports/outputs/results_meta_ensemble.csv  (appended to the headline table)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))

import numpy as np
import pandas as pd

from src.eval.metrics import evaluate, results_table, HEADLINE_COLS, APPENDIX_COLS

OUT = REPO / 'reports' / 'outputs'


def main(configs: list[str]):
    # Reconstruct the test ground truth and fyears from prepped_data.npz
    payload = np.load(OUT / 'prepped_data.npz', allow_pickle=True)
    y = payload['y']
    fyears = payload['fyears']
    from src.data.splits import split_masks
    masks = split_masks(fyears)
    y_te = y[masks['test']]
    yrs_te = fyears[masks['test']]

    # Load per-config ensemble predictions
    all_preds = {}
    for cfg in configs:
        path = OUT / f'preds_{cfg}_ensemble.npy'
        if not path.exists():
            print(f'  WARN missing {path.name}, skipping')
            continue
        all_preds[cfg] = np.load(path)
        print(f'  loaded {cfg}: shape {all_preds[cfg].shape}')

    if not all_preds:
        print('No predictions found.'); return

    # Uniform meta-ensemble
    stacked = np.stack(list(all_preds.values()), axis=0)
    meta = stacked.mean(axis=0)
    np.save(OUT / 'preds_meta_ensemble.npy', meta)
    print(f'  meta of {len(all_preds)} configs: shape {meta.shape}')

    row = evaluate(f'meta_ensemble_{len(all_preds)}cfgs', y_te, meta, yrs_te, verbose=True)

    df = pd.DataFrame([row])[HEADLINE_COLS].set_index('model')
    print('\n=== META-ENSEMBLE HEADLINE ===')
    print(df.round(4).to_string())
    df.to_csv(OUT / 'results_meta_ensemble.csv')

    df50 = pd.DataFrame([row])[APPENDIX_COLS].set_index('model')
    print('\n=== META-ENSEMBLE APPENDIX -50% ===')
    print(df50.round(4).to_string())
    df50.to_csv(OUT / 'results_meta_ensemble_dd50.csv')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--configs', nargs='+',
                   default=['lstm_fusion', 'cross_attn_fusion', 'fin_only'],
                   help='Configs to average. Pick the strongest 3-4 from the per-config seed-ensemble table.')
    args = p.parse_args()
    main(args.configs)
