import { useMemo, useState } from 'react'
import predictions from '../../data/predictions.json'

/* Two diagnostic plots rendered as custom SVG for full control.
   PR curve on the left, regression calibration on the right.
*/

function buildPRCurve(rows) {
  const items = rows.map(r => ({ score: -r.p, label: r.a <= -0.30 ? 1 : 0 }))
  items.sort((a, b) => b.score - a.score)
  const totalPos = items.reduce((s, x) => s + x.label, 0)
  let tp = 0, fp = 0
  const out = []
  const stride = Math.max(1, Math.floor(items.length / 220))
  for (let i = 0; i < items.length; i++) {
    if (items[i].label === 1) tp++; else fp++
    if (i % stride === 0 || i === items.length - 1) {
      out.push({
        recall: totalPos > 0 ? tp / totalPos : 0,
        precision: tp / (tp + fp)
      })
    }
  }
  return { curve: out, baseRate: totalPos / items.length }
}

function buildCalibration(rows, nBins = 12) {
  const sorted = [...rows].sort((a, b) => a.p - b.p)
  const N = sorted.length
  const sz = Math.floor(N / nBins)
  const out = []
  for (let b = 0; b < nBins; b++) {
    const slice = sorted.slice(b * sz, b === nBins - 1 ? N : (b + 1) * sz)
    out.push({
      pred: slice.reduce((s, x) => s + x.p, 0) / slice.length,
      actual: slice.reduce((s, x) => s + x.a, 0) / slice.length,
      n: slice.length
    })
  }
  return out
}

/* ─────────────────────────── PR Curve ─────────────────────────── */

function PRPanel({ curve, baseRate, prauc = 0.852 }) {
  const W = 380, H = 280
  const padL = 50, padR = 18, padT = 22, padB = 42
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const x = r => padL + r * innerW
  const y = p => padT + (1 - p) * innerH

  const [hover, setHover] = useState(null)

  const path = curve.map((c, i) =>
    `${i === 0 ? 'M' : 'L'} ${x(c.recall).toFixed(2)} ${y(c.precision).toFixed(2)}`
  ).join(' ')
  const fill = `${path} L ${x(curve[curve.length - 1].recall).toFixed(2)} ${y(0).toFixed(2)} L ${x(0).toFixed(2)} ${y(0).toFixed(2)} Z`

  return (
    <div className="card card-p">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div className="section-label" style={{ margin: 0 }}>Precision-recall curve, drop greater than 30%</div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
          PR-AUC <strong style={{ color: 'var(--blue-700)' }}>{prauc.toFixed(3)}</strong>
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="prFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue-500)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--blue-500)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <g key={`gx${t}`}>
            <line x1={x(t)} x2={x(t)} y1={padT} y2={padT + innerH}
              stroke="var(--border)" strokeDasharray="2 3" />
            <text x={x(t)} y={H - 22} textAnchor="middle"
              fontFamily="var(--mono)" fontSize={10} fill="var(--text-4)"
            >{t.toFixed(2)}</text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <g key={`gy${t}`}>
            <line x1={padL} x2={padL + innerW} y1={y(t)} y2={y(t)}
              stroke="var(--border)" strokeDasharray="2 3" />
            <text x={padL - 8} y={y(t) + 3} textAnchor="end"
              fontFamily="var(--mono)" fontSize={10} fill="var(--text-4)"
            >{t.toFixed(2)}</text>
          </g>
        ))}

        {/* Random baseline */}
        <line x1={padL} x2={padL + innerW} y1={y(baseRate)} y2={y(baseRate)}
          stroke="var(--text-4)" strokeDasharray="4 3" strokeWidth={1} />
        <text x={padL + innerW - 4} y={y(baseRate) - 5} textAnchor="end"
          fontFamily="var(--mono)" fontSize={9} fill="var(--text-4)"
        >random {(baseRate * 100).toFixed(0)}%</text>

        {/* Perfect corner marker */}
        <g>
          <circle cx={x(1)} cy={y(1)} r={3.5} fill="var(--green)" />
          <text x={x(1) - 6} y={y(1) + 14}
            textAnchor="end" fontFamily="var(--mono)" fontSize={9}
            fill="var(--green)"
          >perfect</text>
        </g>

        {/* Filled area */}
        <path d={fill} fill="url(#prFill)" />
        {/* Curve */}
        <path d={path} fill="none" stroke="var(--blue-700)" strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Axis titles */}
        <text x={padL + innerW / 2} y={H - 6} textAnchor="middle"
          fontFamily="var(--mono)" fontSize={10} fill="var(--text-3)"
        >Recall</text>
        <text x={14} y={padT + innerH / 2} textAnchor="middle"
          transform={`rotate(-90, 14, ${padT + innerH / 2})`}
          fontFamily="var(--mono)" fontSize={10} fill="var(--text-3)"
        >Precision</text>

        {/* Hover capture: invisible rect with crosshair */}
        <rect
          x={padL} y={padT} width={innerW} height={innerH}
          fill="transparent"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const px = (e.clientX - rect.left) / rect.width
            const r = Math.max(0, Math.min(1, px * (innerW / (innerW)) ))
            // find nearest curve point by recall
            let nearest = curve[0]
            let bestD = Math.abs(curve[0].recall - r)
            for (const c of curve) {
              const d = Math.abs(c.recall - r)
              if (d < bestD) { bestD = d; nearest = c }
            }
            setHover(nearest)
          }}
        />
        {hover && (
          <g pointerEvents="none">
            <line x1={x(hover.recall)} x2={x(hover.recall)} y1={padT} y2={padT + innerH}
              stroke="var(--blue-500)" strokeDasharray="3 3" strokeOpacity={0.6} />
            <circle cx={x(hover.recall)} cy={y(hover.precision)} r={4}
              fill="var(--blue-700)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 8, fontFamily: 'var(--mono)' }}>
        {hover ? (
          <>
            <span>recall <strong style={{ color: 'var(--text-1)' }}>{(hover.recall * 100).toFixed(0)}%</strong></span>
            <span>precision <strong style={{ color: 'var(--blue-700)' }}>{(hover.precision * 100).toFixed(0)}%</strong></span>
          </>
        ) : (
          <span style={{ color: 'var(--text-3)', fontSize: 'var(--text-xs)' }}>
            Top-left corner = ideal. The dashed line is the rate a coin flip would get.
          </span>
        )}
      </div>
    </div>
  )
}

/* ────────────────────────── Calibration ────────────────────────── */

function CalibrationPanel({ calib }) {
  const W = 380, H = 280
  const padL = 56, padR = 18, padT = 22, padB = 42
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  // Map drawdown values in [-1, 0] onto plot coords
  const x = v => padL + ((v - (-1)) / 1) * innerW
  const y = v => padT + (1 - (v - (-1)) / 1) * innerH

  const linePath = calib.map((c, i) =>
    `${i === 0 ? 'M' : 'L'} ${x(c.pred).toFixed(2)} ${y(c.actual).toFixed(2)}`
  ).join(' ')

  const [hoverIdx, setHoverIdx] = useState(null)

  return (
    <div className="card card-p">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div className="section-label" style={{ margin: 0 }}>Regression calibration, predicted vs realized</div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
          12 equal-frequency bins
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          {/* Subtle shaded zones: above diag = under-predicted (model too optimistic),
              below diag = over-predicted (model too pessimistic) */}
          <pattern id="diagAbove" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--amber)" strokeOpacity="0.06" strokeWidth="4" />
          </pattern>
          <pattern id="diagBelow" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--green)" strokeOpacity="0.05" strokeWidth="4" />
          </pattern>
        </defs>

        {/* Triangles representing the over/under zones */}
        <path
          d={`M ${x(-1)} ${y(-1)} L ${x(0)} ${y(0)} L ${x(-1)} ${y(0)} Z`}
          fill="url(#diagAbove)" />
        <path
          d={`M ${x(-1)} ${y(-1)} L ${x(0)} ${y(0)} L ${x(0)} ${y(-1)} Z`}
          fill="url(#diagBelow)" />

        {/* Gridlines + ticks */}
        {[-1, -0.75, -0.5, -0.25, 0].map(t => (
          <g key={`gx${t}`}>
            <line x1={x(t)} x2={x(t)} y1={padT} y2={padT + innerH}
              stroke="var(--border)" strokeDasharray="2 3" />
            <text x={x(t)} y={H - 22} textAnchor="middle"
              fontFamily="var(--mono)" fontSize={10} fill="var(--text-4)"
            >{(t * 100).toFixed(0)}%</text>
          </g>
        ))}
        {[-1, -0.75, -0.5, -0.25, 0].map(t => (
          <g key={`gy${t}`}>
            <line x1={padL} x2={padL + innerW} y1={y(t)} y2={y(t)}
              stroke="var(--border)" strokeDasharray="2 3" />
            <text x={padL - 8} y={y(t) + 3} textAnchor="end"
              fontFamily="var(--mono)" fontSize={10} fill="var(--text-4)"
            >{(t * 100).toFixed(0)}%</text>
          </g>
        ))}

        {/* y = x diagonal */}
        <line x1={x(-1)} y1={y(-1)} x2={x(0)} y2={y(0)}
          stroke="var(--text-4)" strokeDasharray="5 3" strokeWidth={1.2} />
        <text x={x(-0.45)} y={y(-0.5) - 8}
          fontFamily="var(--mono)" fontSize={9} fill="var(--text-4)"
          transform={`rotate(-32, ${x(-0.45)}, ${y(-0.5) - 8})`}
        >perfect (y = x)</text>

        {/* Calibration line + dots */}
        <path d={linePath} fill="none" stroke="var(--blue-700)" strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />
        {calib.map((c, i) => (
          <g key={i}>
            <circle
              cx={x(c.pred)} cy={y(c.actual)} r={hoverIdx === i ? 6 : 4}
              fill="var(--blue-700)" stroke="var(--surface)" strokeWidth={2}
              onMouseEnter={() => setHoverIdx(i)}
              style={{ transition: 'r .12s', cursor: 'pointer' }}
            />
          </g>
        ))}

        {/* Axis titles */}
        <text x={padL + innerW / 2} y={H - 6} textAnchor="middle"
          fontFamily="var(--mono)" fontSize={10} fill="var(--text-3)"
        >Predicted drawdown</text>
        <text x={14} y={padT + innerH / 2} textAnchor="middle"
          transform={`rotate(-90, 14, ${padT + innerH / 2})`}
          fontFamily="var(--mono)" fontSize={10} fill="var(--text-3)"
        >Realized</text>
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 8, fontFamily: 'var(--mono)' }}>
        {hoverIdx != null ? (
          <>
            <span>predicted <strong style={{ color: 'var(--text-1)' }}>{(calib[hoverIdx].pred * 100).toFixed(1)}%</strong></span>
            <span>realized <strong style={{ color: 'var(--blue-700)' }}>{(calib[hoverIdx].actual * 100).toFixed(1)}%</strong></span>
            <span>n={calib[hoverIdx].n}</span>
          </>
        ) : (
          <span style={{ color: 'var(--text-3)', fontSize: 'var(--text-xs)' }}>
            Bins on the line = predictions match outcomes. Off the line = systematic miscalibration.
          </span>
        )}
      </div>
    </div>
  )
}

export default function PRCalibration() {
  const { curve, baseRate, calib } = useMemo(() => {
    const { curve, baseRate } = buildPRCurve(predictions)
    return { curve, baseRate, calib: buildCalibration(predictions) }
  }, [])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
      <PRPanel curve={curve} baseRate={baseRate} />
      <CalibrationPanel calib={calib} />
    </div>
  )
}
