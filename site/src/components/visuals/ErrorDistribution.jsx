import { useMemo, useState } from 'react'
import predictions from '../../data/predictions.json'

/* Histogram of residuals (predicted minus actual) across all 15,311 test
   predictions. Shows where the MAE = 0.121 headline actually lives:
   most predictions are close, with a thin two-sided tail.
*/

const N_BINS = 41             // odd so 0 sits in a bin center
const RANGE  = 0.6            // plot -0.6 to +0.6

function buildHistogram(rows) {
  const errs = rows.map(r => r.p - r.a)
  const min = -RANGE, max = RANGE
  const w = (max - min) / N_BINS
  const counts = new Array(N_BINS).fill(0)
  let underflow = 0, overflow = 0
  for (const e of errs) {
    if (e < min) { underflow++; continue }
    if (e >= max) { overflow++; continue }
    const i = Math.min(N_BINS - 1, Math.floor((e - min) / w))
    counts[i]++
  }
  const bins = counts.map((c, i) => ({
    center: min + (i + 0.5) * w,
    edgeL:  min + i * w,
    edgeR:  min + (i + 1) * w,
    count: c,
  }))

  const sorted = [...errs].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const mean   = errs.reduce((s, x) => s + x, 0) / errs.length
  const mae    = errs.reduce((s, x) => s + Math.abs(x), 0) / errs.length
  const within10pp = errs.filter(e => Math.abs(e) <= 0.10).length / errs.length
  const within20pp = errs.filter(e => Math.abs(e) <= 0.20).length / errs.length

  return { bins, mean, median, mae, within10pp, within20pp, underflow, overflow, w }
}

export default function ErrorDistribution() {
  const { bins, mean, median, mae, within10pp, within20pp, underflow, overflow, w } = useMemo(
    () => buildHistogram(predictions), []
  )
  const [hover, setHover] = useState(null)

  const W = 760, H = 280
  const padL = 50, padR = 24, padT = 26, padB = 50
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const maxCount = Math.max(...bins.map(b => b.count))
  const xs = v => padL + ((v - (-RANGE)) / (2 * RANGE)) * innerW
  const ys = c => padT + (1 - c / maxCount) * innerH

  const barW = innerW / N_BINS - 1.5

  return (
    <div className="card card-p" style={{ marginBottom: 'var(--sp-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--sp-3)', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        <div className="section-label" style={{ margin: 0 }}>Error Distribution · Predicted minus Realized</div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
          MAE <strong style={{ color: 'var(--blue-700)' }}>{mae.toFixed(3)}</strong>
          {'  ·  '}mean <strong style={{ color: 'var(--text-2)' }}>{(mean >= 0 ? '+' : '') + mean.toFixed(3)}</strong>
          {'  ·  '}median <strong style={{ color: 'var(--text-2)' }}>{(median >= 0 ? '+' : '') + median.toFixed(3)}</strong>
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Y gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const c = Math.round(t * maxCount)
          return (
            <g key={t}>
              <line x1={padL} x2={padL + innerW} y1={ys(c)} y2={ys(c)}
                stroke="var(--border)" strokeDasharray="2 3" />
              <text x={padL - 8} y={ys(c) + 3} textAnchor="end"
                fontFamily="var(--mono)" fontSize={10} fill="var(--text-4)"
              >{c.toLocaleString()}</text>
            </g>
          )
        })}

        {/* Zero line */}
        <line x1={xs(0)} x2={xs(0)} y1={padT} y2={padT + innerH}
          stroke="var(--text-3)" strokeDasharray="4 3" strokeWidth={1} />
        <text x={xs(0)} y={padT - 8} textAnchor="middle"
          fontFamily="var(--mono)" fontSize={10} fontWeight={600} fill="var(--text-2)"
        >0</text>

        {/* Bars */}
        {bins.map((b, i) => {
          const inGoodZone = Math.abs(b.center) <= 0.10
          const inOKZone   = Math.abs(b.center) <= 0.20 && !inGoodZone
          const color = inGoodZone ? 'var(--green)' : inOKZone ? 'var(--amber)' : 'var(--red)'
          const isHover = hover === i
          return (
            <rect
              key={i}
              x={xs(b.edgeL) + 1}
              y={ys(b.count)}
              width={Math.max(1, (xs(b.edgeR) - xs(b.edgeL)) - 1.5)}
              height={(padT + innerH) - ys(b.count)}
              fill={color}
              fillOpacity={isHover ? 0.95 : 0.7}
              rx={2}
              onMouseEnter={() => setHover(i)}
              style={{ cursor: 'pointer', transition: 'fill-opacity .1s' }}
            />
          )
        })}

        {/* Mean and median lines */}
        <line x1={xs(mean)} x2={xs(mean)} y1={padT} y2={padT + innerH}
          stroke="var(--blue-700)" strokeWidth={1.5} />
        <text x={xs(mean) + 4} y={padT + 12}
          fontFamily="var(--mono)" fontSize={10} fontWeight={600} fill="var(--blue-700)"
        >mean</text>

        {/* X axis ticks */}
        {[-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6].map(t => (
          <g key={t}>
            <line x1={xs(t)} x2={xs(t)} y1={padT + innerH} y2={padT + innerH + 4}
              stroke="var(--text-4)" />
            <text x={xs(t)} y={padT + innerH + 18} textAnchor="middle"
              fontFamily="var(--mono)" fontSize={10} fill="var(--text-3)"
            >{(t > 0 ? '+' : '') + (t * 100).toFixed(0) + 'pp'}</text>
          </g>
        ))}

        {/* X axis title */}
        <text x={padL + innerW / 2} y={H - 10} textAnchor="middle"
          fontFamily="var(--mono)" fontSize={10} fill="var(--text-3)"
        >
          predicted − realized   (negative = model under-predicts, positive = over-predicts)
        </text>

        {/* Y axis title */}
        <text x={12} y={padT + innerH / 2} textAnchor="middle"
          transform={`rotate(-90, 12, ${padT + innerH / 2})`}
          fontFamily="var(--mono)" fontSize={10} fill="var(--text-3)"
        >count</text>
      </svg>

      {/* Side strip with extra context */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 'var(--sp-2)',
        marginTop: 'var(--sp-2)',
      }}>
        <Stat label="Within ±10 pp" value={(within10pp * 100).toFixed(1) + '%'} color="var(--green)" hint="Predictions inside the green core" />
        <Stat label="Within ±20 pp" value={(within20pp * 100).toFixed(1) + '%'} color="var(--amber)" hint="Including the amber zone" />
        <Stat label="Tail miss (>60 pp)" value={(underflow + overflow).toLocaleString()} color="var(--red)" hint="Catastrophic outliers, both sides" />
        <Stat
          label={hover != null ? 'Hovered bin' : 'Hover any bar'}
          value={
            hover != null
              ? `${bins[hover].count.toLocaleString()} firms`
              : '—'
          }
          color="var(--blue-700)"
          hint={hover != null
            ? `${(bins[hover].edgeL * 100).toFixed(0)} to ${(bins[hover].edgeR * 100).toFixed(0)} pp`
            : 'see counts per bin'}
        />
      </div>

      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 'var(--sp-3)', lineHeight: 'var(--lh-relaxed)' }}>
        The histogram peaks tight around zero. <strong style={{ color: 'var(--text-2)' }}>{(within10pp * 100).toFixed(0)}% of test-fold predictions land within 10 percentage points</strong> of the realized drawdown. The mean residual is near zero, so the model is not systematically biased in either direction; what error there is sits in symmetric tails.
      </div>
    </div>
  )
}

function Stat({ label, value, color, hint }) {
  return (
    <div style={{
      padding: 'var(--sp-3)',
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)', color: 'var(--text-3)' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-1)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)', marginTop: 4 }}>
        {hint}
      </div>
    </div>
  )
}
