const MODELS = [
  { id: 'B0', name: 'Vol-Only',          desc: 'Just uses past volatility to predict future drawdown. Our floor to beat.' },
  { id: 'B1', name: 'Ridge Regression',  desc: 'Simple linear model on all 97 features. Fast but can\'t learn complex patterns.' },
  { id: 'B2', name: 'XGBoost',           desc: 'Tree-based model. Good at tabular data, no notion of time order.' },
  { id: 'N1', name: 'LSTM + Price Branch', desc: 'Neural net reading 5 years of accounting history + recent stock stats.' },
  { id: 'N2', name: 'MLP + Price Branch', desc: 'Same two inputs but a simpler non-sequential network for accounting data.' },
  { id: 'N3', name: 'Financial LSTM',    desc: 'LSTM on accounting data only — no price branch. Cleanest signal.', winner: true },
]

const FEATS = [
  { name: 'pf_vol',          val: 0.143 },
  { name: 'lag3_ebit_sale',  val: 0.121 },
  { name: 'pf_max_dd',       val: 0.098 },
  { name: 'ebit_ta',         val: 0.052 },
  { name: 'oancf_at',        val: 0.039 },
]

export default function Models() {
  return (
    <div className="page-wrap">
      <div className="eyebrow">03 — Models & Process</div>
      <h1 className="page-title">Four models.<br />One winner.</h1>
      <p className="page-sub">We built several versions of a neural network and compared them against simpler baselines. The best model turned out to be simpler than expected.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginBottom: '2.5rem', alignItems: 'start' }}>
        <div>
          <div className="section-label" style={{ marginBottom: '1rem' }}>Architecture</div>
          <div className="arch-block">
            <div style={{ fontSize: '.68rem', color: 'var(--blue-500)', fontFamily: 'var(--sans)', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '.85rem' }}>Plain PyTorch — dual-stream design</div>
            <div className="cmt">┌─ Financial Branch ──────────────────┐</div>
            <div style={{ paddingLeft: '1.5rem' }}>
              Input <span className="dim">(batch, 5, 18)</span><br />
              LSTM 2-layer h=64 → Linear → <span className="out">32d</span><br />
              <span className="cmt">— or — Flatten → MLP[128,64] → <span className="out">32d</span></span>
            </div>
            <div className="cmt">├─ Price Branch ──────────────────────┤</div>
            <div style={{ paddingLeft: '1.5rem' }}>
              Input <span className="dim">(batch, 7)</span><br />
              MLP 2-layer h=32 → <span className="out">16d</span>
            </div>
            <div className="cmt">├─ Fusion Head ───────────────────────┤</div>
            <div style={{ paddingLeft: '1.5rem' }}>
              LayerNorm(<span className="dim">48d</span>) → MLP[32] → <span className="out">scalar</span><br />
              <span className="cmt">Dropout 0.2 · Weight decay 1e-4</span>
            </div>
            <div className="cmt">└─ Training ───────────────────────────┘</div>
            <div style={{ paddingLeft: '1.5rem' }}>
              Huber loss · AdamW lr=1e-3<br />
              Cosine anneal · 50 epochs · Early stop
            </div>
          </div>
        </div>

        <div>
          <div className="section-label" style={{ marginBottom: '1rem' }}>Model Ladder</div>
          {MODELS.map(({ id, name, desc, winner }) => (
            <div key={id} className={`model-row${winner ? ' winner' : ''}`}>
              <div className="model-num">{id}</div>
              <div style={{ flex: 1 }}>
                <div className="model-name">{name}</div>
                <div className="model-desc">{desc}</div>
              </div>
              {winner && <span className="badge badge-amber">WINNER</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="divider" />

      <div className="section-label" style={{ marginBottom: '.85rem' }}>Top XGBoost Feature Importance</div>
      {FEATS.map(({ name, val }) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.6rem' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '.75rem', color: 'var(--slate-600)', width: 140, flexShrink: 0 }}>{name}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(val / .143) * 100}%`, background: 'var(--blue-500)' }} />
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '.74rem', color: 'var(--blue-700)', width: 38, textAlign: 'right', flexShrink: 0 }}>{val.toFixed(3)}</span>
        </div>
      ))}
      <p style={{ fontSize: '.82rem', color: 'var(--slate-500)', marginTop: '1.1rem', lineHeight: 1.7 }}>
        Past volatility and prior drawdown are the strongest single predictors. The key surprise: EBIT margin from 3 years ago is the top accounting signal. When we added recent stock price stats as a second neural network input, it actually <strong style={{ color: 'var(--slate-700)' }}>hurt</strong> performance — the accounting history alone already captured what price data was trying to add.
      </p>
    </div>
  )
}
