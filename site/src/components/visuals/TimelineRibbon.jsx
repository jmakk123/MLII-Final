/* Horizontal timeline 2003-2024 with train / val / test bands and market
   shock markers. Replaces (or complements) the split-block boxes on Data.
*/

const YEARS = Array.from({ length: 22 }, (_, i) => 2003 + i)

const BANDS = [
  { name: 'Train',      start: 2003, end: 2017, color: 'var(--blue-500)',  count: '54,316 firm-years' },
  { name: 'Validation', start: 2018, end: 2019, color: 'var(--amber)',     count: '7,196 firm-years' },
  { name: 'Test',       start: 2020, end: 2023, color: 'var(--green)',     count: '15,311 firm-years' },
]

const EVENTS = [
  { year: 2008, label: 'Lehman / GFC',    color: 'var(--red)' },
  { year: 2020, label: 'COVID crash',     color: 'var(--red)' },
  { year: 2022, label: 'Fed rate hikes',  color: 'var(--amber)' },
]

export default function TimelineRibbon() {
  const startYear = 2003
  const endYear = 2024
  const span = endYear - startYear

  const W = 760
  const padL = 50, padR = 30, padT = 70, padB = 60
  const innerW = W - padL - padR
  const ribbonY = padT + 14
  const ribbonH = 22

  const yearToX = (y) => padL + ((y - startYear) / span) * innerW

  const H = padT + ribbonH + padB

  return (
    <div className="card card-p" style={{ marginBottom: 'var(--sp-6)' }}>
      <div className="section-label" style={{ marginBottom: 'var(--sp-3)' }}>Time-Blocked Split · 2003 to 2024</div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {/* Bands */}
        {BANDS.map(b => {
          const x = yearToX(b.start)
          const x2 = yearToX(b.end + 1)   // include the year fully
          return (
            <g key={b.name}>
              <rect x={x} y={ribbonY} width={x2 - x} height={ribbonH}
                fill={b.color} fillOpacity={0.18}
                stroke={b.color} strokeWidth={1.5}
                rx={4}
              />
              <text x={(x + x2) / 2} y={ribbonY - 8} textAnchor="middle"
                fontSize={12} fontFamily="var(--sans)" fontWeight={700}
                fill={b.color}
              >{b.name}</text>
              <text x={(x + x2) / 2} y={ribbonY + ribbonH + 16} textAnchor="middle"
                fontSize={10} fontFamily="var(--mono)"
                fill="var(--text-3)"
              >{b.count}</text>
            </g>
          )
        })}

        {/* Year tick marks */}
        {YEARS.filter((_, i) => i % 2 === 0).map(y => {
          const x = yearToX(y)
          return (
            <g key={y}>
              <line x1={x} x2={x} y1={ribbonY + ribbonH + 24} y2={ribbonY + ribbonH + 30}
                stroke="var(--text-4)" strokeWidth={1} />
              <text x={x} y={ribbonY + ribbonH + 42} textAnchor="middle"
                fontSize={10} fontFamily="var(--mono)"
                fill="var(--text-3)"
              >{y}</text>
            </g>
          )
        })}

        {/* Event markers */}
        {EVENTS.map(e => {
          const x = yearToX(e.year + 0.5)
          return (
            <g key={e.label}>
              <line x1={x} x2={x} y1={ribbonY - 4} y2={ribbonY + ribbonH + 4}
                stroke={e.color} strokeWidth={2} strokeDasharray="3 3" />
              <circle cx={x} cy={ribbonY - 4} r={4} fill={e.color} />
              <text x={x} y={ribbonY - 28} textAnchor="middle"
                fontSize={10} fontFamily="var(--mono)" fontWeight={600}
                fill={e.color}
              >{e.label}</text>
              <text x={x} y={ribbonY - 16} textAnchor="middle"
                fontSize={9} fontFamily="var(--mono)"
                fill={e.color} opacity={0.7}
              >{e.year}</text>
            </g>
          )
        })}
      </svg>

      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 'var(--sp-2)', lineHeight: 'var(--lh-relaxed)' }}>
        Validation is the COVID stress fold by design (fyear 2018 anchors run into March 2020). Test crosses recovery, the AI rally, and the rate-hike cycle.
      </div>
    </div>
  )
}
