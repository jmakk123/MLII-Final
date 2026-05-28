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

const GAPS = [
  { bad: true,  title: 'They look backward', body: 'Volatility tells you how bumpy the past was. Credit ratings react slowly: Enron was investment-grade three months before it collapsed. VaR assumes bell-curve returns. Markets do not.' },
  { bad: true,  title: 'They do not quantify the drop', body: '"High beta" tells you a stock is sensitive to the market. It does not say how far it could fall over the next year, the number risk managers actually need.' },
  { bad: false, title: 'What we do differently', body: 'We feed 5 years of a company\'s accounting history through a neural network and predict the worst-case stock loss over the next 12 months, forward-looking and actionable.' },
  { bad: false, title: 'Why not just predict bankruptcy?', body: 'Bankruptcies are rare (387 in our dataset). Rare events are hard to model reliably. A large drawdown is much more common, and just as useful as an early warning signal.' },
]

export default function KeyConcepts({ navigate }) {
  return (
    <div className="page-wrap">
      <div className="eyebrow">Project · Concepts</div>
      <h1 className="page-title">Concepts</h1>
      <p className="page-sub">Everything you need to follow along, defined in plain English.</p>

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
        <span style={{ color: 'var(--blue-500)', cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate('data')}>Data</span>
        {' '}to see how we built the dataset, or jump to{' '}
        <span style={{ color: 'var(--blue-500)', cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate('findings')}>Findings</span>
        {' '}to see the results.
      </div>
    </div>
  )
}
