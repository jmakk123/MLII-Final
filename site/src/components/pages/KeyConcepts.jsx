import { motion } from 'framer-motion'

const EXISTING = [
  { icon: '〜', name: 'Volatility', def: "Measures how much a stock bounces around day-to-day. High vol = unpredictable price moves.", ex: "A stock moving ±3% every day has high volatility." },
  { icon: 'β',  name: 'Beta',       def: "Measures how much a stock amplifies market swings. Beta 2.0 means it moves twice as much as the S&P 500.", ex: "Market drops 10% → a beta-2 stock drops ~20%." },
  { icon: '%',  name: 'Value at Risk (VaR)', def: "Statistical estimate of the worst expected loss over a short period at a given confidence level.", ex: "\"5% chance of losing more than $50K this month.\"" },
  { icon: 'A',  name: 'Credit Ratings', def: "Letter grades (AAA → D) assigned to a company's debt based on its ability to repay.", ex: "BBB− is the lowest investment-grade rating." },
  { icon: 'Z',  name: 'Altman Z-Score', def: "A 1968 formula combining five accounting ratios into a single bankruptcy-risk score.", ex: "Z < 1.81 = distress zone; Z > 2.99 = safe zone." },
  { icon: '▼',  name: 'Forward Drawdown', def: "The maximum peak-to-trough loss over the next 12 months — predicted before it happens. This is ours.", ex: "A number from 0% (no loss) to −100% (total collapse).", ours: true },
]

const GAPS = [
  { bad: true,  title: 'They look backward', body: "Volatility tells you how bumpy the past was. Credit ratings react slowly — Enron was investment-grade three months before it collapsed. VaR assumes bell-curve returns. They don't." },
  { bad: true,  title: "They don't quantify the drop", body: "\"High beta\" tells you a stock is sensitive to the market. It doesn't say how far it could fall over the next year — the number risk managers actually need." },
  { bad: false, title: 'What we do differently', body: "We feed 5 years of a company's accounting history through a neural network and predict the worst-case stock loss over the next 12 months — forward-looking and actionable." },
  { bad: false, title: 'Why not just predict bankruptcy?', body: "Bankruptcies are rare (387 in our dataset). Rare events are hard to model reliably. A large drawdown is much more common — and just as useful as an early warning signal." },
]

const METRICS = [
  { name: 'MAE',    full: 'Mean Absolute Error',    def: 'Average prediction error in pct points. If we predict −40% and reality is −50%, error = 10pp.',      scale: 'Lower = better ↓' },
  { name: 'RMSE',   full: 'Root Mean Sq. Error',    def: 'Like MAE but punishes big mistakes more. A few catastrophic mispredictions will spike RMSE.',          scale: 'Lower = better ↓' },
  { name: 'R²',     full: 'Explained Variance',     def: 'How much variation in actual drawdowns our model explains. 0 = no better than guessing the mean. 1 = perfect.', scale: 'Higher = better ↑  (0→1)' },
  { name: 'PR-AUC', full: 'Precision-Recall AUC',   def: 'How well we identify stocks that will crash 30%+. Measures ranking quality for the riskiest names.',  scale: 'Higher = better ↑  (0→1)' },
  { name: 'Brier',  full: 'Brier Score',            def: 'How well-calibrated our crash probabilities are. If we say 80% chance of crash, the true rate should be 80%.', scale: 'Lower = better ↓  (0=perfect)' },
  { name: 'ρ',      full: 'Spearman Rank Corr.',    def: 'Whether we correctly rank companies by risk within a single year — does our highest-risk flag actually fall the most?', scale: 'Higher = better ↑  (−1→1)' },
]

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

export default function KeyConcepts({ navigate }) {
  return (
    <div className="page-wrap">
      <div className="eyebrow">Key Concepts</div>
      <h1 className="page-title">Not a finance person?<br /><span style={{ color: 'var(--blue-700)' }}>No problem.</span></h1>
      <p className="page-sub">Everything you need to follow along — defined in plain English.</p>

      {/* What is a drawdown */}
      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--slate-900)', marginBottom: '.5rem' }}>What is a drawdown?</h2>
      <p style={{ fontSize: '.875rem', color: 'var(--slate-500)', lineHeight: 1.75, maxWidth: 600, marginBottom: '1.25rem' }}>
        A <strong style={{ color: 'var(--slate-900)' }}>drawdown</strong> is how far a stock falls from its highest point to its lowest point over a period.
        If a stock hits $100 then drops to $60, that's a <strong style={{ color: 'var(--red)' }}>−40% drawdown</strong>.
        We predict this number <em>before</em> it happens, using only information available at the start of the year.
      </p>

      {/* Visual */}
      <div className="card card-p" style={{ marginBottom: '2rem' }}>
        <div className="section-label" style={{ marginBottom: '.85rem' }}>Stock price over 12 months — illustrative</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, marginBottom: '.5rem' }}>
          {[45,52,61,70,80,88,100,88,72,60,48,40].map((h, i) => (
            <motion.div key={i}
              initial={{ height: 0 }}
              whileInView={{ height: `${h}%` }}
              viewport={{ once: true }}
              transition={{ duration: .5, delay: i * .05, ease: 'easeOut' }}
              style={{
                flex: 1, borderRadius: '3px 3px 0 0',
                background: i === 6 ? 'var(--amber)' : i < 6 ? 'var(--green)' : 'var(--red)',
                opacity: i === 6 ? 1 : .65,
                minWidth: 8,
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'var(--slate-400)' }}>
          <span>Jan — Rising</span>
          <span style={{ color: 'var(--amber)', fontWeight: 600 }}>Peak $100</span>
          <span style={{ color: 'var(--red)', fontWeight: 600 }}>Trough $60 → −40%</span>
          <span>Dec</span>
        </div>
      </div>

      <div className="divider" />

      {/* Existing metrics */}
      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--slate-900)', marginBottom: '.5rem' }}>How risk is measured today</h2>
      <p style={{ fontSize: '.875rem', color: 'var(--slate-500)', lineHeight: 1.75, marginBottom: '1.1rem' }}>Finance already has a toolkit of risk metrics. Here's what they are and what they miss.</p>
      <div className="concept-grid" style={{ marginBottom: '2rem' }}>
        {EXISTING.map(({ icon, name, def, ex, ours }) => (
          <motion.div key={name}
            className="concept-card"
            style={ours ? { borderColor: 'var(--blue-500)', background: 'var(--blue-50)' } : {}}
            whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,.07)' }}
            transition={{ duration: .15 }}
          >
            <div style={{ fontSize: '1.4rem', marginBottom: '.4rem' }}>{icon}</div>
            <div className="concept-name" style={ours ? { color: 'var(--blue-700)' } : {}}>
              {name} {ours && <span className="badge badge-blue" style={{ fontSize: '.6rem', verticalAlign: 'middle' }}>ours</span>}
            </div>
            <div className="concept-def">{def}</div>
            <div className="concept-ex">{ex}</div>
          </motion.div>
        ))}
      </div>

      <div className="divider" />

      {/* The gap */}
      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--slate-900)', marginBottom: '.5rem' }}>Why existing metrics fall short</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '2rem' }}>
        {GAPS.map(({ bad, title, body }) => (
          <div key={title} className="card card-p"
            style={{ borderLeft: `3px solid ${bad ? 'var(--red)' : 'var(--green)'}` }}>
            <div style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--slate-900)', marginBottom: '.35rem' }}>{title}</div>
            <div style={{ fontSize: '.78rem', color: 'var(--slate-500)', lineHeight: 1.65 }}>{body}</div>
          </div>
        ))}
      </div>

      <div className="divider" />

      {/* Metrics we use */}
      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--slate-900)', marginBottom: '.5rem' }}>How we score our model</h2>
      <p style={{ fontSize: '.875rem', color: 'var(--slate-500)', lineHeight: 1.75, marginBottom: '1.1rem' }}>When you look at our results table, here's what each column means.</p>
      <div className="metric-grid" style={{ marginBottom: '2rem' }}>
        {METRICS.map(m => (
          <div key={m.name} className="me-card">
            <div className="me-name">{m.name}</div>
            <div className="me-full">{m.full}</div>
            <div className="me-def">{m.def}</div>
            <div className="me-scale">{m.scale}</div>
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
