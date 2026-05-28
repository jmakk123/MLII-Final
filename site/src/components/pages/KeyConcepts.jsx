import { motion } from 'framer-motion'
import DrawdownAnimation from '../visuals/DrawdownAnimation'

const EXISTING = [
  { icon: '〜', name: 'Volatility', def: 'Measures how much a stock bounces around day-to-day. High vol means unpredictable price moves.', ex: 'A stock moving plus or minus 3% every day has high volatility.' },
  { icon: 'β',  name: 'Beta',       def: 'Measures how much a stock amplifies market swings. Beta 2.0 means it moves twice as much as the S&P 500.', ex: 'Market drops 10%, a beta-2 stock drops about 20%.' },
  { icon: '%',  name: 'Value at Risk (VaR)', def: 'Statistical estimate of the worst expected loss over a short period at a given confidence level.', ex: '"5% chance of losing more than $50K this month."' },
  { icon: 'A',  name: 'Credit Ratings', def: 'Letter grades (AAA to D) assigned to a company\'s debt based on its ability to repay.', ex: 'BBB minus is the lowest investment-grade rating.' },
  { icon: 'Z',  name: 'Altman Z-Score', def: 'A 1968 formula combining five accounting ratios into a single bankruptcy-risk score.', ex: 'Z under 1.81 is distress zone; Z over 2.99 is safe zone.' },
  { icon: '▼',  name: 'Forward Drawdown', def: 'The maximum peak-to-trough loss over the next 12 months, predicted before it happens. This is ours.', ex: 'A number from 0% (no loss) to -100% (total collapse).', ours: true },
]

export default function KeyConcepts({ navigate }) {
  return (
    <div className="page-wrap">
      <h1 className="page-title">Background Concepts</h1>
      <p className="page-sub">Everything you need to follow along, in plain English.</p>

      {/* What is a drawdown */}
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-1)', marginBottom: 'var(--sp-2)' }}>What is a drawdown?</h2>
      <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-2)', lineHeight: 'var(--lh-relaxed)', maxWidth: '65ch', marginBottom: 'var(--sp-5)' }}>
        A <strong style={{ color: 'var(--text-1)' }}>drawdown</strong> is how far a stock falls from its highest point to its lowest point over a period.
        If a stock hits $100 then drops to $60, that is a <strong style={{ color: 'var(--red)' }}>-40% drawdown</strong>.
        We predict this number <em>before</em> it happens, using only information available at the start of the year.
      </p>

      <DrawdownAnimation />

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
            whileHover={{ borderColor: 'var(--text-3)' }}
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

    </div>
  )
}
