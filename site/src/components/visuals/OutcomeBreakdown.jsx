import { useMemo, useState } from 'react'
import predictions from '../../data/predictions.json'

/* Sankey-style outcome flow.

   Left:  what the model said      (Risky vs Safe)
   Right: what actually happened   (Crashed vs Held)
   Four cubic-bezier ribbons connect the four sides, sized by row count.

   Hover any ribbon to highlight its bucket and surface counts.
*/

const FLOWS = [
  { key: 'hit',         from: 'risky', to: 'crashed', color: 'var(--green)', label: 'Hit',         note: 'Model flagged risk and the stock crashed.'   },
  { key: 'false_alarm', from: 'risky', to: 'held',    color: 'var(--amber)', label: 'False alarm', note: 'Model flagged risk but the stock held up.'    },
  { key: 'miss',        from: 'safe',  to: 'crashed', color: 'var(--red)',   label: 'Miss',        note: 'Stock crashed but the model did not flag it.' },
  { key: 'safe',        from: 'safe',  to: 'held',    color: 'var(--green)', label: 'Safe',        note: 'Model said safe and the stock held up.'      },
]

export default function OutcomeBreakdown() {
  const counts = useMemo(() => {
    const c = { hit: 0, false_alarm: 0, miss: 0, safe: 0 }
    for (const r of predictions) c[r.o]++
    return c
  }, [])
  const total = predictions.length

  const saidRisky  = counts.hit + counts.false_alarm
  const saidSafe   = counts.miss + counts.safe
  const crashed    = counts.hit + counts.miss
  const held       = counts.false_alarm + counts.safe
  const correct    = counts.hit + counts.safe
  const accuracy   = correct / total

  // SVG geometry
  const W = 760
  const H = 280
  const padL = 28, padR = 28, padT = 30, padB = 30
  const barW = 14
  const leftX  = padL + 110          // left edge of "What model said" bar
  const rightX = W - padR - 110 - barW    // left edge of "What happened" bar
  const innerH = H - padT - padB
  const gap = 18

  // Left segment Ys (Risky on top)
  const lyTop = padT
  const lyMid = lyTop + (saidRisky / total) * innerH
  const lyBot = padT + innerH
  // Account for the gap between segments
  const lRiskyTop = lyTop
  const lRiskyBot = lyTop + (saidRisky / total) * (innerH - gap)
  const lSafeTop  = lRiskyBot + gap
  const lSafeBot  = padT + innerH

  // Right segment Ys (Crashed on top)
  const rCrashedTop = padT
  const rCrashedBot = padT + (crashed / total) * (innerH - gap)
  const rHeldTop    = rCrashedBot + gap
  const rHeldBot    = padT + innerH

  // For each flow, figure out the vertical slice on each side
  // Left bar order top -> bottom: hit, false_alarm | miss, safe
  // Right bar order top -> bottom: hit, miss | false_alarm, safe
  const leftSeg = {
    hit:         { top: lRiskyTop,                                 h: (counts.hit         / total) * (innerH - gap) },
    false_alarm: { top: lRiskyTop + (counts.hit / total) * (innerH - gap), h: (counts.false_alarm / total) * (innerH - gap) },
    miss:        { top: lSafeTop,                                  h: (counts.miss        / total) * (innerH - gap) },
    safe:        { top: lSafeTop + (counts.miss / total) * (innerH - gap), h: (counts.safe        / total) * (innerH - gap) }
  }
  const rightSeg = {
    hit:         { top: rCrashedTop,                                h: (counts.hit         / total) * (innerH - gap) },
    miss:        { top: rCrashedTop + (counts.hit / total) * (innerH - gap), h: (counts.miss        / total) * (innerH - gap) },
    false_alarm: { top: rHeldTop,                                   h: (counts.false_alarm / total) * (innerH - gap) },
    safe:        { top: rHeldTop + (counts.false_alarm / total) * (innerH - gap), h: (counts.safe        / total) * (innerH - gap) }
  }

  const [hover, setHover] = useState(null)

  const ribbon = (k) => {
    const L = leftSeg[k], R = rightSeg[k]
    const x1 = leftX + barW
    const x2 = rightX
    const mid = (x1 + x2) / 2
    const lt = L.top, lb = L.top + L.h
    const rt = R.top, rb = R.top + R.h
    return `M ${x1} ${lt}
            C ${mid} ${lt}, ${mid} ${rt}, ${x2} ${rt}
            L ${x2} ${rb}
            C ${mid} ${rb}, ${mid} ${lb}, ${x1} ${lb}
            Z`
  }

  return (
    <div className="card card-p" style={{ marginBottom: 'var(--sp-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--sp-3)', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        <div className="section-label" style={{ margin: 0 }}>Outcome breakdown, model call vs reality</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
          {total.toLocaleString()} test predictions · accuracy{' '}
          <span style={{ color: 'var(--blue-700)', fontWeight: 700 }}>{(accuracy * 100).toFixed(1)}%</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {/* Column headers */}
        <text x={leftX + barW / 2} y={padT - 10}
          textAnchor="middle"
          fontFamily="var(--mono)"
          fontSize={11}
          fontWeight={600}
          fill="var(--text-3)"
        >MODEL CALLED</text>
        <text x={rightX + barW / 2} y={padT - 10}
          textAnchor="middle"
          fontFamily="var(--mono)"
          fontSize={11}
          fontWeight={600}
          fill="var(--text-3)"
        >WHAT HAPPENED</text>

        {/* Ribbons */}
        {FLOWS.map(f => (
          <path
            key={f.key}
            d={ribbon(f.key)}
            fill={f.color}
            fillOpacity={hover && hover !== f.key ? 0.10 : 0.32}
            stroke={hover === f.key ? f.color : 'none'}
            strokeWidth={hover === f.key ? 1 : 0}
            style={{ transition: 'fill-opacity .15s', cursor: 'pointer' }}
            onMouseEnter={() => setHover(f.key)}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {/* Left bar segments */}
        <rect x={leftX} y={lRiskyTop} width={barW} height={lRiskyBot - lRiskyTop}
          fill="var(--red)" fillOpacity={0.85} rx={2} />
        <rect x={leftX} y={lSafeTop} width={barW} height={lSafeBot - lSafeTop}
          fill="var(--green)" fillOpacity={0.85} rx={2} />

        {/* Left labels */}
        <text x={leftX - 10} y={(lRiskyTop + lRiskyBot) / 2 - 4}
          textAnchor="end" fontFamily="var(--sans)" fontSize={12} fontWeight={600}
          fill="var(--text-1)"
        >Risky</text>
        <text x={leftX - 10} y={(lRiskyTop + lRiskyBot) / 2 + 12}
          textAnchor="end" fontFamily="var(--mono)" fontSize={11}
          fill="var(--text-3)" style={{ fontVariantNumeric: 'tabular-nums' }}
        >{saidRisky.toLocaleString()} · {((saidRisky / total) * 100).toFixed(0)}%</text>

        <text x={leftX - 10} y={(lSafeTop + lSafeBot) / 2 - 4}
          textAnchor="end" fontFamily="var(--sans)" fontSize={12} fontWeight={600}
          fill="var(--text-1)"
        >Safe</text>
        <text x={leftX - 10} y={(lSafeTop + lSafeBot) / 2 + 12}
          textAnchor="end" fontFamily="var(--mono)" fontSize={11}
          fill="var(--text-3)" style={{ fontVariantNumeric: 'tabular-nums' }}
        >{saidSafe.toLocaleString()} · {((saidSafe / total) * 100).toFixed(0)}%</text>

        {/* Right bar segments */}
        <rect x={rightX} y={rCrashedTop} width={barW} height={rCrashedBot - rCrashedTop}
          fill="var(--red)" fillOpacity={0.85} rx={2} />
        <rect x={rightX} y={rHeldTop} width={barW} height={rHeldBot - rHeldTop}
          fill="var(--green)" fillOpacity={0.85} rx={2} />

        {/* Right labels */}
        <text x={rightX + barW + 10} y={(rCrashedTop + rCrashedBot) / 2 - 4}
          fontFamily="var(--sans)" fontSize={12} fontWeight={600}
          fill="var(--text-1)"
        >Crashed &gt;30%</text>
        <text x={rightX + barW + 10} y={(rCrashedTop + rCrashedBot) / 2 + 12}
          fontFamily="var(--mono)" fontSize={11}
          fill="var(--text-3)" style={{ fontVariantNumeric: 'tabular-nums' }}
        >{crashed.toLocaleString()} · {((crashed / total) * 100).toFixed(0)}%</text>

        <text x={rightX + barW + 10} y={(rHeldTop + rHeldBot) / 2 - 4}
          fontFamily="var(--sans)" fontSize={12} fontWeight={600}
          fill="var(--text-1)"
        >Held up</text>
        <text x={rightX + barW + 10} y={(rHeldTop + rHeldBot) / 2 + 12}
          fontFamily="var(--mono)" fontSize={11}
          fill="var(--text-3)" style={{ fontVariantNumeric: 'tabular-nums' }}
        >{held.toLocaleString()} · {((held / total) * 100).toFixed(0)}%</text>
      </svg>

      {/* Legend / detail row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--sp-2)',
        marginTop: 'var(--sp-3)'
      }}>
        {FLOWS.map(f => {
          const c = counts[f.key]
          const pct = (c / total) * 100
          const isHover = hover === f.key
          return (
            <div
              key={f.key}
              onMouseEnter={() => setHover(f.key)}
              onMouseLeave={() => setHover(null)}
              style={{
                padding: 'var(--sp-3)',
                borderRadius: 'var(--r-md)',
                background: isHover ? `color-mix(in srgb, ${f.color} 14%, transparent)` : 'var(--bg-2)',
                border: `1px solid ${isHover ? f.color : 'var(--border)'}`,
                transition: 'background .15s, border-color .15s',
                cursor: 'default'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-2xs)', fontWeight: 700, color: f.color }}>
                  {f.label}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-4)' }}>
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {c.toLocaleString()}
              </div>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)', marginTop: 6, lineHeight: 1.45 }}>
                {f.note}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
