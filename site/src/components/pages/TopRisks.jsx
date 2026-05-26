import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, TrendingDown } from 'lucide-react'
import predictions from '../../data/predictions.json'

const OUTCOME_LABEL = {
  hit:         { label: 'Hit',         color: 'var(--green)', bg: 'var(--green-soft)' },
  safe:        { label: 'Safe',        color: 'var(--green)', bg: 'var(--green-soft)' },
  miss:        { label: 'Miss',        color: 'var(--red)',   bg: 'var(--red-soft)'   },
  false_alarm: { label: 'False alarm', color: 'var(--amber)', bg: 'var(--amber-lo)'   },
}

const YEARS = Array.from(new Set(predictions.map(r => r.y))).sort((a, b) => b - a)

function pctFmt(v) { return (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%' }
function ddColor(v) {
  if (v <= -0.50) return 'var(--red)'
  if (v <= -0.30) return 'var(--amber)'
  return 'var(--green)'
}

export default function TopRisks({ init, navigate }) {
  const [year, setYear]   = useState(init?.year ?? YEARS[0])
  const [count, setCount] = useState(25)

  const top = useMemo(() => {
    return [...predictions]
      .filter(r => r.y === year)
      .sort((a, b) => a.p - b.p)   // most negative first
      .slice(0, count)
  }, [year, count])

  const hits = top.filter(r => r.a <= -0.30).length
  const hitRate = top.length > 0 ? hits / top.length : 0

  return (
    <div className="page-wrap">
      <div className="eyebrow">Model · Top Risks</div>
      <h1 className="page-title">
        Top {count} Predicted<br />Drawdowns
      </h1>
      <p className="page-sub">
        The firms our model flagged as the deepest forecast drawdowns going into the next 12 months, for the fyear you select below. This is the watchlist a risk team would walk through at a morning meeting.
      </p>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--sp-5)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="section-label" style={{ margin: 0 }}>Year</span>
          {YEARS.map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              style={{
                padding: '6px 12px',
                background: year === y ? 'var(--blue-700)' : 'var(--bg-2)',
                color:      year === y ? '#fff'              : 'var(--text-2)',
                border: '1px solid ' + (year === y ? 'var(--blue-700)' : 'var(--border)'),
                borderRadius: 'var(--r-md)',
                fontFamily: 'var(--mono)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all .15s',
              }}
            >
              {y}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          <Summary label="Hits" value={`${hits} / ${top.length}`} sub={`${(hitRate * 100).toFixed(0)}% accuracy`} accent="var(--green)" />
          <Summary
            label="Worst predicted"
            value={top[0] ? pctFmt(top[0].p) : '—'}
            sub={top[0] ? top[0].n : ''}
            accent={top[0] ? ddColor(top[0].p) : 'var(--text-3)'}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'right', width: 50 }}>#</th>
                <th>Company</th>
                <th>Sector</th>
                <th style={{ textAlign: 'right' }}>Predicted</th>
                <th style={{ textAlign: 'right' }}>Realized</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r, i) => (
                <motion.tr
                  key={`${r.g}-${r.y}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(i * 0.015, 0.4) }}
                >
                  <td className="num" style={{ textAlign: 'right', color: i < 3 ? 'var(--amber)' : 'var(--text-4)', fontWeight: i < 3 ? 700 : 400 }}>
                    {i + 1}
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--text-1)', maxWidth: 280 }}>{r.n}</td>
                  <td style={{ color: 'var(--text-3)', fontSize: 'var(--text-xs)' }}>{r.s}</td>
                  <td className="num" style={{ textAlign: 'right', color: ddColor(r.p), fontWeight: 600 }}>{pctFmt(r.p)}</td>
                  <td className="num" style={{ textAlign: 'right', color: ddColor(r.a), fontWeight: 600 }}>{pctFmt(r.a)}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      fontFamily: 'var(--mono)',
                      fontSize: 'var(--text-2xs)',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--r-sm)',
                      background: OUTCOME_LABEL[r.o].bg,
                      color: OUTCOME_LABEL[r.o].color,
                    }}>
                      {OUTCOME_LABEL[r.o].label}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', justifyContent: 'center' }}>
        {[10, 25, 50, 100].map(c => (
          <button
            key={c}
            onClick={() => setCount(c)}
            style={{
              padding: '6px 14px',
              background: count === c ? 'var(--blue-50)' : 'transparent',
              color:      count === c ? 'var(--blue-700)' : 'var(--text-3)',
              border: '1px solid ' + (count === c ? 'var(--blue-500)' : 'var(--border)'),
              borderRadius: 'var(--r-md)',
              fontFamily: 'var(--mono)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            Top {c}
          </button>
        ))}
      </div>

      <div className="info-box" style={{ marginTop: 'var(--sp-5)', fontSize: 'var(--text-xs)' }}>
        <strong style={{ color: 'var(--blue-900)' }}>How to read this list.</strong>{' '}
        Rows are sorted by predicted forward 12-month drawdown (most negative first). "Hit" means the model flagged risk and the stock actually fell &gt;30%. "False alarm" means the model flagged risk but the stock held up. For the full prediction set or to filter by sector and outcome, open <span onClick={() => navigate && navigate('predictions')} style={{ color: 'var(--blue-700)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}>Predictions</span>.
      </div>
    </div>
  )
}

function Summary({ label, value, sub, accent }) {
  return (
    <div className="card card-p" style={{ minWidth: 160, padding: 'var(--sp-3)' }}>
      <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)', fontFamily: 'var(--mono)' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
