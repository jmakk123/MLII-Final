import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

/* Animated drawdown explainer.

   Sequence:
     1. Axes appear.
     2. Price line draws left to right.
     3. Running peak marker animates along the rising portion.
     4. Trough marker drops into place at the worst point.
     5. Vertical bracket between peak and trough fades in with -X% label.

   The user can replay the sequence with a button.
*/

function buildPath() {
  const pts = []
  const N = 80
  let price = 100
  let trend = 0
  let seed = 11
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed / 2147483647 - 0.5) * 2
  }
  for (let i = 0; i < N; i++) {
    const phase = i / (N - 1)
    let drift
    if (phase < 0.45) drift = 0.55
    else if (phase < 0.75) drift = -1.7
    else drift = 0.35
    const noise = rand() * 0.9
    trend = 0.65 * trend + 0.35 * (drift + noise)
    price = Math.max(20, price + trend)
    pts.push({ i, x: phase, y: price })
  }
  return pts
}

export default function DrawdownAnimation() {
  const [version, setVersion] = useState(0)
  const points = useMemo(buildPath, [])
  const minY = Math.min(...points.map(p => p.y))
  const maxY = Math.max(...points.map(p => p.y))
  const peak = points.reduce((a, p) => p.y > a.y ? p : a, points[0])
  const trough = points.filter(p => p.i >= peak.i).reduce((a, p) => p.y < a.y ? p : a, { y: Infinity })
  const ddPct = ((trough.y - peak.y) / peak.y) * 100

  const W = 760
  const H = 320
  const padL = 50, padR = 80, padT = 24, padB = 36
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const sx = (x) => padL + x * innerW
  const sy = (y) => padT + (1 - (y - minY) / (maxY - minY)) * innerH

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`).join(' ')

  // Phases (delays in seconds)
  const D_LINE_END = 1.6
  const D_PEAK_AT = D_LINE_END + 0.1
  const D_TROUGH_AT = D_PEAK_AT + 0.35
  const D_BRACKET_AT = D_TROUGH_AT + 0.3

  return (
    <div className="card card-p" style={{ marginBottom: 'var(--sp-8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
        <div className="section-label" style={{ margin: 0 }}>Sample 12-month price path with peak and trough</div>
        <button
          onClick={() => setVersion(v => v + 1)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 10px',
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)', fontWeight: 600,
            color: 'var(--text-2)', cursor: 'pointer',
            transition: 'border-color .15s, color .15s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--blue-500)'; e.currentTarget.style.color = 'var(--blue-700)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
        >
          <RotateCcw size={12} /> Replay
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} key={version}>
        <defs>
          <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue-500)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--blue-500)" stopOpacity="0" />
          </linearGradient>
          <clipPath id="ddLineClip">
            <motion.rect
              x={padL} y={padT - 4} height={innerH + 8}
              initial={{ width: 0 }}
              animate={{ width: innerW }}
              transition={{ duration: D_LINE_END, ease: [0.22, 1, 0.36, 1] }}
            />
          </clipPath>
        </defs>

        {/* Horizontal gridlines + Y labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const y = padT + t * innerH
          const value = maxY - t * (maxY - minY)
          return (
            <g key={t}>
              <line x1={padL} x2={padL + innerW} y1={y} y2={y}
                stroke="var(--border)" strokeDasharray="3 3" strokeWidth={1} />
              <text x={padL - 8} y={y + 4}
                fontSize={10}
                fontFamily="var(--mono)"
                textAnchor="end"
                fill="var(--text-4)"
              >${value.toFixed(0)}</text>
            </g>
          )
        })}

        {/* X labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const labels = ['Jan', 'Apr', 'Jul', 'Oct', 'Dec']
          const idx = Math.round(t * 4)
          return (
            <text key={t} x={sx(t)} y={H - 10}
              fontSize={10}
              fontFamily="var(--mono)"
              textAnchor="middle"
              fill="var(--text-4)"
            >{labels[idx]}</text>
          )
        })}

        {/* Peak reference line */}
        <motion.line
          x1={padL} x2={padL + innerW}
          y1={sy(peak.y)} y2={sy(peak.y)}
          stroke="var(--amber)" strokeDasharray="4 3" strokeOpacity="0.5" strokeWidth={1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: D_PEAK_AT, duration: 0.3 }}
        />
        {/* Trough reference line */}
        <motion.line
          x1={padL} x2={padL + innerW}
          y1={sy(trough.y)} y2={sy(trough.y)}
          stroke="var(--red)" strokeDasharray="4 3" strokeOpacity="0.5" strokeWidth={1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: D_TROUGH_AT, duration: 0.3 }}
        />

        {/* Filled area under line */}
        <g clipPath="url(#ddLineClip)">
          <path
            d={`${d} L ${sx(points[points.length - 1].x)} ${padT + innerH} L ${sx(points[0].x)} ${padT + innerH} Z`}
            fill="url(#ddFill)"
          />
          <path
            d={d}
            fill="none"
            stroke="var(--blue-500)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Drawdown bracket */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: D_BRACKET_AT, duration: 0.45 }}
        >
          {(() => {
            const bracketX = sx(trough.x) + 22
            return (
              <>
                <line x1={bracketX} x2={bracketX} y1={sy(peak.y)} y2={sy(trough.y)}
                  stroke="var(--red)" strokeWidth={2} />
                <line x1={bracketX - 5} x2={bracketX + 5} y1={sy(peak.y)} y2={sy(peak.y)}
                  stroke="var(--red)" strokeWidth={2} />
                <line x1={bracketX - 5} x2={bracketX + 5} y1={sy(trough.y)} y2={sy(trough.y)}
                  stroke="var(--red)" strokeWidth={2} />
                <rect
                  x={bracketX + 8}
                  y={(sy(peak.y) + sy(trough.y)) / 2 - 11}
                  width={52} height={22}
                  rx={4}
                  fill="var(--red)"
                />
                <text
                  x={bracketX + 34}
                  y={(sy(peak.y) + sy(trough.y)) / 2 + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fontFamily="var(--mono)"
                  fontWeight={700}
                  fill="#fff"
                >{ddPct.toFixed(0)}%</text>
              </>
            )
          })()}
        </motion.g>

        {/* Peak marker */}
        <motion.g
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: D_PEAK_AT, duration: 0.4, ease: 'backOut' }}
          style={{ transformOrigin: `${sx(peak.x)}px ${sy(peak.y)}px` }}
        >
          <circle cx={sx(peak.x)} cy={sy(peak.y)} r={7}
            fill="var(--amber)" stroke="var(--surface)" strokeWidth={2.5} />
          <text x={sx(peak.x)} y={sy(peak.y) - 14}
            textAnchor="middle"
            fontSize={11}
            fontFamily="var(--mono)"
            fontWeight={600}
            fill="var(--amber)"
          >Peak ${peak.y.toFixed(0)}</text>
        </motion.g>

        {/* Trough marker */}
        <motion.g
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: D_TROUGH_AT, duration: 0.4, ease: 'backOut' }}
        >
          <circle cx={sx(trough.x)} cy={sy(trough.y)} r={7}
            fill="var(--red)" stroke="var(--surface)" strokeWidth={2.5} />
          <text x={sx(trough.x)} y={sy(trough.y) + 22}
            textAnchor="middle"
            fontSize={11}
            fontFamily="var(--mono)"
            fontWeight={600}
            fill="var(--red)"
          >Trough ${trough.y.toFixed(0)}</text>
        </motion.g>
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 'var(--sp-2)', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)' }} />
          Peak: the highest close before the fall
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
          Trough: the worst close after the peak
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
          Drawdown: (Trough &minus; Peak) / Peak
        </span>
      </div>
    </div>
  )
}
