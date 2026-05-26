import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine, Area, AreaChart } from 'recharts'

const EXISTING = [
  { icon: '〜', name: 'Volatility', def: 'Measures how much a stock bounces around day-to-day. High vol means unpredictable price moves.', ex: 'A stock moving plus or minus 3% every day has high volatility.' },
  { icon: 'β',  name: 'Beta',       def: 'Measures how much a stock amplifies market swings. Beta 2.0 means it moves twice as much as the S&P 500.', ex: 'Market drops 10%, a beta-2 stock drops about 20%.' },
  { icon: '%',  name: 'Value at Risk (VaR)', def: 'Statistical estimate of the worst expected loss over a short period at a given confidence level.', ex: '"5% chance of losing more than $50K this month."' },
  { icon: 'A',  name: 'Credit Ratings', def: 'Letter grades (AAA to D) assigned to a company\'s debt based on its ability to repay.', ex: 'BBB minus is the lowest investment-grade rating.' },
  { icon: 'Z',  name: 'Altman Z-Score', def: 'A 1968 formula combining five accounting ratios into a single bankruptcy-risk score.', ex: 'Z under 1.81 is distress zone; Z over 2.99 is safe zone.' },
  { icon: '▼',  name: 'Forward Drawdown', def: 'The maximum peak-to-trough loss over the next 12 months, predicted before it happens. This is ours.', ex: 'A number from 0% (no loss) to -100% (total collapse).', ours: true },
]

const GAPS = [
  { bad: true,  title: 'They look backward', body: 'Volatility tells you how bumpy the past was. Credit ratings react slowly: Enron was investment-grade three months before it collapsed. VaR assumes bell-curve returns. Markets do not.' },
  { bad: true,  title: 'They do not quantify the drop', body: '"High beta" tells you a stock is sensitive to the market. It does not say how far it could fall over the next year, the number risk managers actually need.' },
  { bad: false, title: 'What we do differently', body: 'We feed 5 years of a company\'s accounting history through a neural network and predict the worst-case stock loss over the next 12 months, forward-looking and actionable.' },
  { bad: false, title: 'Why not just predict bankruptcy?', body: 'Bankruptcies are rare (387 in our dataset). Rare events are hard to model reliably. A large drawdown is much more common, and just as useful as an early warning signal.' },
]

/* Build a realistic-looking 12-month price path:
   - Starts at 100
   - Rises with mild noise to a peak around month 5
   - Sharp drawdown event in months 6-9
   - Partial recovery by month 12
   - 60 data points (5 per month) for a smooth continuous line
*/
function buildPricePath() {
  const points = []
  const N = 60   // ~5 per month
  let price = 100
  let trend = 0
  // Seeded pseudo-random for repeatability
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed / 2147483647 - 0.5) * 2   // -1..1
  }
  for (let i = 0; i < N; i++) {
    const phase = i / (N - 1)
    let drift
    if (phase < 0.45) drift = 0.55              // rising phase
    else if (phase < 0.75) drift = -1.7         // crash phase
    else drift = 0.35                            // recovery
    const noise = rand() * 0.9
    trend = 0.65 * trend + 0.35 * (drift + noise)
    price = Math.max(20, price + trend)
    points.push({
      i,
      month: i / 5,    // month index
      price: Number(price.toFixed(2)),
    })
  }
  return points
}

export default function KeyConcepts({ navigate }) {
  const path = useMemo(buildPricePath, [])
  // Peak and trough
  const peak = path.reduce((acc, p) => (p.price > acc.price ? p : acc), path[0])
  const troughAfterPeak = path
    .filter((p) => p.i >= peak.i)
    .reduce((acc, p) => (p.price < acc.price ? p : acc), { price: Infinity, i: peak.i })
  const drawdownPct = ((troughAfterPeak.price - peak.price) / peak.price) * 100

  return (
    <div className="page-wrap">
      <div className="eyebrow">Project · Concepts</div>
      <h1 className="page-title">Not a finance person?<br /><span style={{ color: 'var(--blue-700)' }}>No problem.</span></h1>
      <p className="page-sub">Everything you need to follow along, defined in plain English.</p>

      {/* What is a drawdown */}
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-1)', marginBottom: 'var(--sp-2)' }}>What is a drawdown?</h2>
      <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-2)', lineHeight: 'var(--lh-relaxed)', maxWidth: '65ch', marginBottom: 'var(--sp-5)' }}>
        A <strong style={{ color: 'var(--text-1)' }}>drawdown</strong> is how far a stock falls from its highest point to its lowest point over a period.
        If a stock hits $100 then drops to $60, that is a <strong style={{ color: 'var(--red)' }}>-40% drawdown</strong>.
        We predict this number <em>before</em> it happens, using only information available at the start of the year.
      </p>

      {/* Realistic continuous price path */}
      <div className="card card-p" style={{ marginBottom: 'var(--sp-8)' }}>
        <div className="section-label" style={{ marginBottom: 'var(--sp-3)' }}>
          Stock price over 12 months, illustrative
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={path} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--blue-500)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--blue-500)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, 12]}
              ticks={[0, 3, 6, 9, 12]}
              tickFormatter={(v) => ['Jan','Apr','Jul','Oct','Dec'][[0,3,6,9,12].indexOf(v)] ?? ''}
              tick={{ fontSize: 11, fill: 'var(--text-4)', fontFamily: 'var(--mono)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${v}`}
              domain={['auto', 'auto']}
              tick={{ fontSize: 11, fill: 'var(--text-4)', fontFamily: 'var(--mono)' }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip
              labelFormatter={(v) => `month ${v.toFixed(1)}`}
              formatter={(v) => [`$${v}`, 'Price']}
              cursor={{ stroke: 'var(--blue-500)', strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.6 }}
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: 'var(--mono)',
                color: 'var(--text-2)',
                boxShadow: 'var(--shadow-md)',
              }}
            />
            <ReferenceLine y={peak.price} stroke="var(--amber)" strokeDasharray="4 3" strokeOpacity={0.6} />
            <ReferenceLine y={troughAfterPeak.price} stroke="var(--red)" strokeDasharray="4 3" strokeOpacity={0.6} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="var(--blue-500)"
              strokeWidth={2}
              fill="url(#priceFill)"
              isAnimationActive={true}
              animationDuration={1200}
            />
            <ReferenceDot x={peak.month} y={peak.price} r={6} fill="var(--amber)" stroke="var(--surface)" strokeWidth={2} />
            <ReferenceDot x={troughAfterPeak.month} y={troughAfterPeak.price} r={6} fill="var(--red)" stroke="var(--surface)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 'var(--sp-2)', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)' }} />
            Peak ${peak.price.toFixed(0)} around month {peak.month.toFixed(1)}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
            Trough ${troughAfterPeak.price.toFixed(0)} around month {troughAfterPeak.month.toFixed(1)}
          </span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--red)', fontWeight: 600 }}>
            Drawdown = {drawdownPct.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="divider" />

      {/* Existing metrics */}
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-1)', marginBottom: 'var(--sp-2)' }}>How risk is measured today</h2>
      <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-3)', lineHeight: 'var(--lh-relaxed)', marginBottom: 'var(--sp-5)', maxWidth: '65ch' }}>
        Finance already has a toolkit of risk metrics. Here is what they are and what they miss.
      </p>
      <div className="concept-grid" style={{ marginBottom: 'var(--sp-8)' }}>
        {EXISTING.map(({ icon, name, def, ex, ours }) => (
          <motion.div key={name}
            className="concept-card"
            style={ours ? { borderColor: 'var(--blue-500)', background: 'var(--blue-50)' } : {}}
            whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
            transition={{ duration: .15 }}
          >
            <div style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--sp-1)', color: 'var(--text-2)' }}>{icon}</div>
            <div className="concept-name" style={ours ? { color: 'var(--blue-700)' } : {}}>
              {name} {ours && <span className="badge badge-blue" style={{ fontSize: 'var(--text-2xs)', verticalAlign: 'middle' }}>ours</span>}
            </div>
            <div className="concept-def">{def}</div>
            <div className="concept-ex">{ex}</div>
          </motion.div>
        ))}
      </div>

      <div className="divider" />

      {/* The gap */}
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-1)', marginBottom: 'var(--sp-4)' }}>Why existing metrics fall short</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-8)' }}>
        {GAPS.map(({ bad, title, body }) => (
          <div key={title} className="card card-p"
            style={{ borderLeft: `3px solid ${bad ? 'var(--red)' : 'var(--green)'}` }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-1)', marginBottom: 'var(--sp-1)' }}>{title}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', lineHeight: 'var(--lh-relaxed)' }}>{body}</div>
          </div>
        ))}
      </div>

      <div className="info-box">
        <strong style={{ color: 'var(--blue-900)' }}>Ready to go deeper?</strong>{' '}
        Head to{' '}
        <span style={{ color: 'var(--blue-500)', cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate('data')}>Data & Methodology</span>
        {' '}to see how we built the dataset, or jump to{' '}
        <span style={{ color: 'var(--blue-500)', cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate('findings')}>Findings</span>
        {' '}to see the results.
      </div>
    </div>
  )
}
