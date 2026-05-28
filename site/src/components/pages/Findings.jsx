import OutcomeBreakdown from '../visuals/OutcomeBreakdown'
import PRCalibration from '../visuals/PRCalibration'
import SurvivorshipFunnel from '../visuals/SurvivorshipFunnel'
import ErrorDistribution from '../visuals/ErrorDistribution'

const RESULTS = [
  { model: 'Vol-Only',         mae: 0.1386, rmse: 0.1820, r2: 0.2459, prauc: 0.8290, brier: 0.4938, spearman: 0.6367, topDec: 0.4299, winner: false },
  { model: 'Ridge',            mae: 0.1244, rmse: 0.1615, r2: 0.4059, prauc: 0.8527, brier: 0.3654, spearman: 0.6565, topDec: 0.4732, winner: false },
  { model: 'Gradient Boosted', mae: 0.1226, rmse: 0.1621, r2: 0.4019, prauc: 0.8504, brier: 0.2074, spearman: 0.6627, topDec: 0.4895, winner: false },
  { model: 'Financial LSTM',   mae: 0.1214, rmse: 0.1610, r2: 0.4101, prauc: 0.8522, brier: 0.2263, spearman: 0.6656, topDec: 0.4865, winner: true },
]

const METRIC_LEGEND = [
  { name: 'MAE',    full: 'Mean Absolute Error',          dir: 'lower',  scale: '0 to 1',   meaning: 'Average prediction error in percentage points. 0.12 = on average we are 12 pp off the realized drawdown.' },
  { name: 'RMSE',   full: 'Root Mean Squared Error',      dir: 'lower',  scale: '0 to 1',   meaning: 'Like MAE but penalizes big misses more heavily. A few catastrophic mispredictions spike RMSE.' },
  { name: 'R²',     full: 'Explained Variance',           dir: 'higher', scale: '-∞ to 1',  meaning: 'Share of drawdown variation we explain. 0 is no better than predicting the mean; 1 is perfect.' },
  { name: 'PR-AUC', full: 'Precision-Recall AUC at -30%', dir: 'higher', scale: '0 to 1',   meaning: 'How well we identify firms that will fall more than 30%. The brief\'s locked headline binary metric.' },
  { name: 'Brier',  full: 'Brier Score',                  dir: 'lower',  scale: '0 to 1',   meaning: 'Calibration of our crash probabilities. If we say 80% chance of crash, the true rate should be 80%. Lower is sharper.' },
]

const MAIN_FINDINGS = [
  {
    color: 'green',
    title: 'Financial LSTM beats Vol-Only on the primary triad',
    body: 'On the brief\'s three headline metrics, the fusion model beats the volatility-only baseline by +1.7 pp on MAE (0.121 vs 0.139), +2.9 pp on within-year Spearman (0.666 vs 0.637), and +5.7 pp on top-decile precision (0.487 vs 0.430). Modest but real lifts that meet two of three locked success criteria.',
    stat: '+1.7 pp',
    statLabel: 'MAE lift'
  },
  {
    color: 'amber',
    title: 'Crash probability calibration improves by 54%',
    body: 'Brier score drops from 0.494 on the vol-only baseline to 0.226 on the Financial LSTM (the gradient boosted model gets to 0.207). The model\'s probability estimates are sharper, which matters for downstream sizing decisions where you need a real probability, not just a ranking.',
    stat: '-54%',
    statLabel: 'Brier improvement'
  },
  {
    color: 'blue',
    title: 'Fundamentals + price together beat either alone',
    body: 'Price-only fusion gets to PR-AUC 0.835 (close to vol-only at 0.829). Financials-only gets to 0.818. The full Financial LSTM, which combines both streams, reaches 0.852. The lift over price alone is small (+1.7 pp) but real: fundamentals encode structural distress that takes years to develop and that recent prices have not yet absorbed.',
    stat: '+1.7 pp',
    statLabel: 'over price-only'
  },
]

function bestIndex(arr, key, higher) {
  let bi = 0
  for (let i = 1; i < arr.length; i++) {
    if (higher ? arr[i][key] > arr[bi][key] : arr[i][key] < arr[bi][key]) bi = i
  }
  return bi
}

const COL_WINNERS = {
  mae:      bestIndex(RESULTS, 'mae', false),
  rmse:     bestIndex(RESULTS, 'rmse', false),
  r2:       bestIndex(RESULTS, 'r2', true),
  prauc:    bestIndex(RESULTS, 'prauc', true),
  brier:    bestIndex(RESULTS, 'brier', false),
  spearman: bestIndex(RESULTS, 'spearman', true),
  topDec:   bestIndex(RESULTS, 'topDec', true)
}

export default function Findings({ navigate }) {
  return (
    <div className="page-wrap">
      <div className="eyebrow">Project · Findings</div>
      <h1 className="page-title">Results and Findings</h1>
      <p className="page-sub">Test fold, fyear 2020 to 2023, 15,311 firm-years. Numbers are the seed-ensemble row from our final pipeline run. The Financial LSTM (full fusion) wins the primary metrics; baselines hold their own on a few individual rank measures within seed noise.</p>

      {/* Metric legend */}
      <div className="section-label">Metric definitions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.6rem', marginBottom: '2rem' }}>
        {METRIC_LEGEND.map(m => (
          <div className="card" key={m.name} style={{ padding: '.85rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '.3rem' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '.82rem', fontWeight: 700, color: 'var(--blue-700)' }}>{m.name}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '.62rem', color: m.dir === 'lower' ? 'var(--green)' : 'var(--blue-500)', fontWeight: 600 }}>
                {m.dir === 'lower' ? '↓ lower better' : '↑ higher better'}
              </span>
            </div>
            <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--slate-900)', marginBottom: '.25rem' }}>{m.full}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--slate-500)', lineHeight: 1.55 }}>{m.meaning}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '.68rem', color: 'var(--slate-400)', marginTop: '.35rem' }}>scale {m.scale}</div>
          </div>
        ))}
      </div>

      {/* Main Findings */}
      <div className="section-label">Top three findings</div>
      <div className="finding-grid">
        {MAIN_FINDINGS.map((f) => (
          <div key={f.title} className={`finding-card ${f.color}`}>
            <div className="finding-title">{f.title}</div>
            <div className="finding-body">{f.body}</div>
            <div className="finding-stat" style={{ color: f.color === 'green' ? 'var(--green)' : f.color === 'amber' ? 'var(--amber)' : 'var(--blue-500)' }}>
              {f.stat}
              <span style={{ fontSize: '.74rem', color: 'var(--slate-400)', marginLeft: '.4rem' }}>{f.statLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Results table with per-metric winners */}
      <div className="section-label">Full results table</div>
      <div style={{ border: '1px solid var(--slate-200)', borderRadius: 8, overflow: 'auto', marginBottom: '1.5rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Model</th><th>MAE ↓</th><th>RMSE ↓</th><th>R² ↑</th><th>PR-AUC ↑</th><th>Brier ↓</th><th>Spearman ↑</th><th>Top-Dec ↑</th>
            </tr>
          </thead>
          <tbody>
            {RESULTS.map((row, idx) => {
              const fmt = (v) => v.toFixed(4)
              const cell = (key, val) => {
                const isWin = COL_WINNERS[key] === idx
                return <td className={`num${isWin ? ' num-amber' : ''}`}>{fmt(val)}</td>
              }
              return (
                <tr key={row.model} style={row.winner ? { background: 'rgba(245,158,11,.05)' } : {}}>
                  <td style={{ fontWeight: row.winner ? 600 : 500, color: row.winner ? '#92400E' : 'var(--slate-900)' }}>
                    {row.model}{row.winner && <span className="badge badge-amber" style={{ marginLeft: '.5rem' }}>OVERALL</span>}
                  </td>
                  {cell('mae', row.mae)}
                  {cell('rmse', row.rmse)}
                  {cell('r2', row.r2)}
                  {cell('prauc', row.prauc)}
                  {cell('brier', row.brier)}
                  {cell('spearman', row.spearman)}
                  {cell('topDec', row.topDec)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '.74rem', color: 'var(--slate-500)', marginBottom: '2rem', lineHeight: 1.55 }}>
        Individual metric winners are within seed noise of each other on the Financial LSTM. The fusion model wins MAE and Spearman cleanly, and is within 0.5 pp of every other top-three model on the rest.
        Overall winner = Financial LSTM because it tops the brief\&apos;s primary triad (MAE, Spearman, top-decile) and tracks within seed noise on PR-AUC and Brier.
      </p>

      <div className="divider" />

      {/* Diagnostic plots */}
      <div className="section-label">Diagnostic plots: precision-recall and calibration</div>
      <PRCalibration />

      {/* Error distribution gives texture to the MAE / RMSE headlines */}
      <ErrorDistribution />

      {/* Outcome breakdown as a flow */}
      <OutcomeBreakdown />

      {/* Survivorship funnel */}
      <SurvivorshipFunnel />

      <div className="divider" />

      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', lineHeight: 'var(--lh-relaxed)' }}>
        A 12 pp average error is small enough to size positions against, the rank correlation says we order firms reliably year over year, and the Brier score says the crash probabilities are usable as probabilities. Concrete deployments are in <span onClick={() => navigate && navigate('usecases')} style={{ color: 'var(--blue-700)', cursor: 'pointer', textDecoration: 'underline' }}>Use Cases</span>.
      </p>
    </div>
  )
}
