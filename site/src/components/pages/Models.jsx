import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ArchitectureFlow from '../visuals/ArchitectureFlow'

const MODELS = [
  {
    id: 'B0', name: 'Volatility-Only', kind: 'Baseline',
    desc: 'Linear regression on trailing 12-month realized volatility.',
    arch: [
      { label: 'Input', val: 'trailing_vol (1 feature)' },
      { label: 'Linear', val: 'y = α · vol + β' },
      { label: 'Output', val: 'predicted drawdown' },
    ],
    pros: ['Two parameters, fully interpretable.', 'No training pipeline needed.', 'Volatility itself is a strong forward drawdown predictor.'],
    cons: ['Ignores fundamentals entirely.', 'Cannot beat firm-specific distress patterns.', 'No way to incorporate accounting history.'],
    verdict: 'Solid floor. Beats Ridge on PR-AUC headline at the locked threshold because vol is genuinely informative.'
  },
  {
    id: 'B1', name: 'Ridge Regression', kind: 'Baseline',
    desc: 'L2-regularized linear regression on the 97-d flattened input.',
    arch: [
      { label: 'Input', val: '97-d (90 financial + 7 price)' },
      { label: 'Linear', val: 'RidgeCV(α ∈ [.01, .1, 1, 10, 100, 1000])' },
      { label: 'Output', val: 'predicted drawdown' },
    ],
    pros: ['Fast, deterministic, single hyperparameter.', 'Handles correlated features well via L2.', 'Best CV alpha selected on training fold.'],
    cons: ['Linear, no interactions.', 'Treats year lags independently.', 'No temporal structure.'],
    verdict: 'Strong baseline. Beats vol-only on MAE, R², and rank metrics. Loses on calibration.'
  },
  {
    id: 'B2', name: 'Gradient-Boosted Trees', kind: 'Baseline',
    desc: 'Sklearn GradientBoostingRegressor with MAE loss on the 97-d input.',
    arch: [
      { label: 'Input', val: '97-d (90 financial + 7 price)' },
      { label: 'Trees', val: 'GBR(n_est=500, depth=5, lr=.05, loss=MAE)' },
      { label: 'Output', val: 'predicted drawdown' },
    ],
    pros: ['Captures nonlinearity and feature interactions.', 'Handles raw tabular features, no scaling needed.', 'Feature importance is easy to extract.'],
    cons: ['No notion of time order across year lags.', 'No clean uncertainty estimate.', 'Single-threaded fit, slow on large grids.'],
    verdict: 'Competitive with the deep model on MAE. Loses on rank precision and Brier calibration.'
  },
  {
    id: 'N1', name: 'Financial LSTM (Full Fusion)', kind: 'Neural · Winner',
    winner: true,
    desc: 'Dual-stream: LSTM on financial history + MLP on price features + concat fusion head.',
    arch: [
      { label: 'Financial branch', val: '(B, 5, 18) → LSTM(2L, h=64) → Linear(32)' },
      { label: 'Price branch', val: '(B, 7) → MLP[32,32,16]' },
      { label: 'Fusion head', val: 'concat (48d) → LayerNorm → MLP[32,32] → scalar' },
      { label: 'Loss', val: 'Huber(δ=.05) + 0.3 · BCE(@-30%)' },
      { label: 'Optim', val: 'AdamW(1e-3, wd=1e-4) · cosine · 50 epochs · patience 8' },
      { label: 'Inference', val: '3-seed ensemble of test predictions' },
    ],
    pros: ['Respects 5-year sequence structure of accounting data.', 'Fuses two structurally different inputs cleanly.', 'Multi-seed ensemble reduces selection noise.', 'Auxiliary BCE head sharpens binary discrimination.'],
    cons: ['More parameters than baselines.', 'Slower training (CPU runs take 1-3 min per seed).', 'Single-seed runs are noisier than the ensemble.'],
    verdict: 'Best on MAE, Spearman within-year, and top-decile precision. Our headline model.'
  },
  {
    id: 'N2', name: 'MLP Fusion', kind: 'Ablation',
    desc: 'Same as N1 but the financial branch is a flattened MLP, not an LSTM.',
    arch: [
      { label: 'Financial branch', val: '(B, 5, 18) → flatten(90) → MLP[128, 64] → Linear(32)' },
      { label: 'Price branch', val: '(B, 7) → MLP[32,32,16]' },
      { label: 'Fusion head', val: 'concat (48d) → LayerNorm → MLP[32,32] → scalar' },
    ],
    pros: ['Simpler, faster.', 'No recurrent dependencies.', 'Loses none of the financial information.'],
    cons: ['Drops the explicit time-order inductive bias.', 'Slightly behind the LSTM on rank metrics.'],
    verdict: 'Statistically tied with N1. 5 timesteps is too short for sequential modeling to dominate.'
  },
  {
    id: 'N3', name: 'Financials Only', kind: 'Ablation',
    desc: 'LSTM on the (5, 18) financial sequence with the price branch removed.',
    arch: [
      { label: 'Financial branch', val: '(B, 5, 18) → LSTM(2L, h=64) → Linear(32)' },
      { label: 'Head', val: 'LayerNorm → MLP[32,32] → scalar' },
    ],
    pros: ['Clean test of pure fundamentals signal.', 'Smaller model, easier to overfit-check.'],
    cons: ['Ignores the strongest single predictor (recent vol).', 'No price-derived momentum or beta context.'],
    verdict: 'Worst of the neural models. Confirms price features carry real information.'
  },
  {
    id: 'N4', name: 'Price Only', kind: 'Ablation',
    desc: 'MLP on the 7 price features with the financial branch removed.',
    arch: [
      { label: 'Price branch', val: '(B, 7) → MLP[32,32,16]' },
      { label: 'Head', val: 'LayerNorm → MLP[32,32] → scalar' },
    ],
    pros: ['Isolates the market-derived signal.', 'Trains in under a minute.'],
    cons: ['Ignores accounting fundamentals.', 'Cannot distinguish firms with similar recent price action but different balance sheets.'],
    verdict: 'Surprisingly competitive on PR-AUC. Price features alone almost match Ridge.'
  },
  {
    id: 'N5', name: 'Cross-Attention Fusion', kind: 'Ablation',
    desc: 'Price embedding queries the LSTM hidden states via single-head attention, then fused.',
    arch: [
      { label: 'Financial branch', val: '(B, 5, 18) → LSTM(2L, h=64) → all 5 hidden states (B, 5, 64)' },
      { label: 'Price branch', val: '(B, 7) → MLP → (B, 16), projects to query (B, 1, 32)' },
      { label: 'Attention', val: '1-head MultiheadAttention(d=32), price queries LSTM states' },
      { label: 'Fusion head', val: 'concat(attn_out (32) + price (16)) → MLP[32,32] → scalar' },
    ],
    pros: ['Adds Week 7 attention coverage (instructor priority).', 'Lets price context select temporally relevant accounting state.', 'Sound modern architecture.'],
    cons: ['No statistical improvement at 5 timesteps.', 'Extra parameters with no payoff.'],
    verdict: 'Ties N1 within seed noise. Honest negative ablation: attention is unnecessary at short sequences.'
  },
]

function ArchDiagram({ model }) {
  return (
    <div className="arch-block" style={{ minHeight: 360 }}>
      <div style={{ fontSize: '.68rem', color: 'var(--blue-500)', fontFamily: 'var(--sans)', fontWeight: 600, letterSpacing: '.08em', marginBottom: '.85rem' }}>
        {model.name} · {model.kind}
      </div>
      <div style={{ marginBottom: '1rem', fontFamily: 'var(--sans)', fontSize: '.82rem', color: 'var(--slate-600)', lineHeight: 1.55 }}>
        {model.desc}
      </div>
      {model.arch.map((row, i) => (
        <div key={i} style={{ marginBottom: '.45rem' }}>
          <span className="cmt" style={{ fontFamily: 'var(--sans)', fontSize: '.7rem', letterSpacing: '.06em' }}>
            {row.label}
          </span>
          <div style={{ paddingLeft: '1rem' }}>
            <span className="hi">{row.val}</span>
          </div>
        </div>
      ))}
      <div className="divider" style={{ background: 'var(--slate-200)', margin: '1rem 0' }} />
      <div style={{ fontFamily: 'var(--sans)' }}>
        <div style={{ fontSize: '.7rem', fontWeight: 600, color: 'var(--green)', letterSpacing: '.08em', marginBottom: '.3rem' }}>Pros</div>
        <ul style={{ paddingLeft: '1.1rem', fontSize: '.78rem', color: 'var(--slate-600)', lineHeight: 1.6, marginBottom: '.85rem' }}>
          {model.pros.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
        <div style={{ fontSize: '.7rem', fontWeight: 600, color: 'var(--red)', letterSpacing: '.08em', marginBottom: '.3rem' }}>Cons</div>
        <ul style={{ paddingLeft: '1.1rem', fontSize: '.78rem', color: 'var(--slate-600)', lineHeight: 1.6, marginBottom: '.85rem' }}>
          {model.cons.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
        <div style={{ fontSize: '.78rem', color: 'var(--slate-700)', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 6, padding: '.55rem .75rem', lineHeight: 1.5 }}>
          <span style={{ fontSize: '.65rem', fontWeight: 600, color: '#92400E', letterSpacing: '.08em', marginRight: '.4rem' }}>Verdict</span>
          {model.verdict}
        </div>
      </div>
    </div>
  )
}

export default function Models() {
  const [selected, setSelected] = useState('N1')
  const model = MODELS.find(m => m.id === selected) ?? MODELS[3]

  return (
    <div className="page-wrap">
      <div className="eyebrow">Project · Models</div>
      <h1 className="page-title">Models and Architecture</h1>
      <p className="page-sub">Three baselines, four ablations, and one full fusion model. Click any model to see its architecture, tradeoffs, and verdict for our use case.</p>

      <ArchitectureFlow />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 1.4fr', gap: '1.5rem', marginBottom: '2.5rem', alignItems: 'start' }}>
        {/* Model ladder (left) */}
        <div>
          <div className="section-label" style={{ marginBottom: '.85rem' }}>Model Ladder</div>
          {MODELS.map((m) => {
            const isSel = selected === m.id
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`model-row${m.winner ? ' winner' : ''}`}
                style={{
                  width: '100%', cursor: 'pointer', textAlign: 'left',
                  background: isSel ? (m.winner ? 'rgba(245,158,11,.1)' : 'var(--blue-50)') : (m.winner ? 'rgba(245,158,11,.04)' : 'var(--white)'),
                  borderColor: isSel ? (m.winner ? 'var(--amber)' : 'var(--blue-500)') : (m.winner ? 'var(--amber)' : 'var(--slate-200)')
                }}
              >
                <div className="model-num">{m.id}</div>
                <div style={{ flex: 1 }}>
                  <div className="model-name">{m.name}</div>
                  <div className="model-desc">{m.desc}</div>
                </div>
                {m.winner && <span className="badge badge-amber">WINNER</span>}
              </button>
            )
          })}
        </div>

        {/* Architecture detail (right) */}
        <div>
          <div className="section-label" style={{ marginBottom: '.85rem' }}>Architecture · Pros · Cons · Verdict</div>
          <AnimatePresence mode="wait">
            <motion.div key={selected}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: .15 }}
            >
              <ArchDiagram model={model} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="info-box">
        <strong style={{ color: 'var(--blue-900)' }}>Where the signal comes from.</strong>{' '}
        The features split cleanly into market signals (volatility, prior drawdown, dollar volume, beta) and balance-sheet stress signals (operating margin, leverage, profitability). Neither side dominates, which is why the dual-stream design works: the financial branch captures structural stress that takes years to develop, and the price branch captures recent regime shifts that the accounting data has not yet absorbed.
      </div>
    </div>
  )
}
