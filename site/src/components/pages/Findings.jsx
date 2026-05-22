import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const RESULTS = [
  { model: 'Vol-Only',      mae: 0.1532, rmse: 0.2091, r2: 0.1664, prauc: 0.8689, brier: 0.5732, spearman: '0.648†', topDec: '0.965‡', winner: false },
  { model: 'Ridge',         mae: 0.1692, rmse: 0.2183, r2: 0.0914, prauc: 0.8368, brier: 0.3306, spearman: '0.555†', topDec: '0.957‡', winner: false },
  { model: 'XGBoost',       mae: 0.1660, rmse: 0.2031, r2: 0.2137, prauc: 0.8531, brier: 0.3177, spearman: '0.598†', topDec: '0.963‡', winner: false },
  { model: 'Financial LSTM', mae: 0.1444, rmse: 0.1926, r2: 0.2926, prauc: 0.8662, brier: 0.2665, spearman: '0.645',  topDec: '0.441‡', winner: true },
]

const PRAUC_DATA = [
  { name: 'Vol-Only', val: 0.8689 }, { name: 'Ridge', val: 0.8368 },
  { name: 'XGBoost', val: 0.8531 }, { name: 'Fin LSTM', val: 0.8662 },
]
const MAE_DATA = [
  { name: 'Vol-Only', val: 0.1532 }, { name: 'Ridge', val: 0.1692 },
  { name: 'XGBoost', val: 0.1660 }, { name: 'Fin LSTM', val: 0.1444 },
]

const WINNERS = ['Fin LSTM']

function ModelChart({ data, domain, label, higherBetter }) {
  return (
    <div className="card card-p">
      <div className="section-label" style={{ marginBottom: '1rem' }}>{label}</div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-200)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--slate-500)', fontFamily: 'var(--mono)' }} axisLine={false} tickLine={false} />
          <YAxis domain={domain} tick={{ fontSize: 10, fill: 'var(--slate-400)', fontFamily: 'var(--mono)' }} axisLine={false} tickLine={false} width={42} />
          <Tooltip
            formatter={(v) => [v.toFixed(4), label]}
            contentStyle={{ background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 6, fontSize: 12, fontFamily: 'var(--mono)' }}
          />
          <Bar dataKey="val" radius={[4, 4, 0, 0]}>
            {data.map(({ name }) => (
              <Cell key={name} fill={name === 'Fin LSTM' ? 'var(--blue-700)' : 'var(--slate-200)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Findings() {
  return (
    <div className="page-wrap">
      <div className="eyebrow">04 — Findings / Analysis</div>
      <h1 className="page-title">The results.</h1>
      <p className="page-sub">The neural network beats the simple volatility baseline on most metrics — and by a large margin on crash probability calibration. One surprise: adding stock price data made things worse, not better.</p>

      {/* Finding cards */}
      <div className="finding-grid">
        <div className="finding-card amber">
          <div className="finding-title">Crash Probabilities — Way Better</div>
          <div className="finding-body">The vol-only model's probability estimates are barely better than random. Our neural net's crash probabilities are genuinely accurate — 54% lower Brier score.</div>
          <div className="finding-stat" style={{ color: 'var(--amber)' }}>0.267 <span style={{ fontSize: '.78rem', color: 'var(--slate-400)' }}>vs 0.573</span></div>
        </div>
        <div className="finding-card green">
          <div className="finding-title">Prediction Accuracy — Beats the Floor</div>
          <div className="finding-body">Our model's average prediction error is smaller and it explains nearly twice as much variation in actual drawdowns (R² from 0.17 → 0.29).</div>
          <div className="finding-stat" style={{ color: 'var(--green)' }}>0.144 <span style={{ fontSize: '.78rem', color: 'var(--slate-400)' }}>MAE vs 0.153</span></div>
        </div>
        <div className="finding-card blue">
          <div className="finding-title">Surprise: Price Data = Noise</div>
          <div className="finding-body">Adding recent stock price stats as a second input made every metric worse. The accounting history alone already captured what price data was trying to add.</div>
          <div className="finding-stat" style={{ color: 'var(--blue-500)', fontSize: '1rem', marginTop: '1.2rem' }}>Fin-only wins</div>
        </div>
      </div>

      {/* Results table */}
      <div style={{ border: '1px solid var(--slate-200)', borderRadius: 8, overflow: 'auto', marginBottom: '1.5rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Model</th><th>MAE ↓</th><th>RMSE ↓</th><th>R² ↑</th><th>PR-AUC ↑</th><th>Brier ↓</th><th>Spearman ↑</th><th>Top-Dec ↑</th>
            </tr>
          </thead>
          <tbody>
            {RESULTS.map(({ model, mae, rmse, r2, prauc, brier, spearman, topDec, winner }) => (
              <tr key={model} style={winner ? { background: 'var(--blue-50)' } : {}}>
                <td style={{ fontWeight: 600, color: winner ? 'var(--blue-700)' : 'var(--slate-900)' }}>
                  {model} {winner && <span className="badge badge-blue" style={{ fontSize: '.62rem', verticalAlign: 'middle' }}>best</span>}
                </td>
                <td>{winner ? <span className="num-win">{mae}</span> : <span className="num">{mae}</span>}</td>
                <td>{winner ? <span className="num-win">{rmse}</span> : <span className="num">{rmse}</span>}</td>
                <td>{winner ? <span className="num-win">{r2}</span> : <span className="num">{r2}</span>}</td>
                <td><span className="num">{prauc}</span></td>
                <td>{winner ? <span className="num-win">{brier}</span> : <span className="num">{brier}</span>}</td>
                <td><span className="num">{spearman}</span></td>
                <td><span className="num">{topDec}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="info-box" style={{ marginBottom: '1.5rem', fontSize: '.78rem' }}>
        † Baseline Spearman is computed pooled across all years — inflated because 2020 was a catastrophic year for everyone. Our neural net's 0.645 is computed <em>within each year separately</em>, which is a harder and more honest test.<br /><br />
        ‡ "Top-decile" means different things: baselines measure fraction that crossed −30%, our model measures fraction that landed in the actual worst-performing 10% for that year. These columns are not directly comparable.
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <ModelChart data={PRAUC_DATA} domain={[0.80, 0.90]} label="PR-AUC at −30% threshold" higherBetter />
        <ModelChart data={MAE_DATA} domain={[0.12, 0.18]} label="MAE — regression error (lower = better)" />
      </div>

      {/* Takeaway */}
      <div style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 8, padding: '1.35rem 1.5rem' }}>
        <div className="section-label" style={{ marginBottom: '.5rem' }}>Key Takeaway</div>
        <p style={{ fontSize: '.88rem', color: 'var(--slate-600)', lineHeight: 1.75 }}>
          The neural net clearly wins on prediction accuracy and probability calibration. PR-AUC — how well we rank risky stocks — is roughly tied with the simple volatility baseline.
          For someone making actual risk decisions, a well-calibrated crash probability <strong style={{ color: 'var(--slate-900)' }}>(54% better Brier score)</strong> is more useful than a slightly better ranking curve.
          The model wins where it counts in practice.
        </p>
      </div>
    </div>
  )
}
