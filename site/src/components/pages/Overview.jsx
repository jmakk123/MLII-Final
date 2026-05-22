import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { TrendingDown, Database, Clock, Target } from 'lucide-react'

function CountUp({ target, decimals = 0, prefix = '', suffix = '' }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      const start = Date.now()
      const dur = 1200
      const tick = () => {
        const t = Math.min((Date.now() - start) / dur, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        setVal(eased * target)
        if (t < 1) requestAnimationFrame(tick)
      }
      tick()
    }, { threshold: .3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  const display = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString()
  return <span ref={ref}>{prefix}{display}{suffix}</span>
}

const KPIS = [
  { Icon: Database, num: 87995,  suffix: '',    label: 'Company-years in dataset', decimals: 0 },
  { Icon: Clock,    num: 29,     suffix: 'M',   label: 'Daily stock price rows',   decimals: 0 },
  { Icon: Clock,    num: 25,     suffix: ' yrs', label: 'Historical data 1999–2025', decimals: 0 },
  { Icon: Target,   num: 54,     suffix: '%',   label: 'Better crash probability vs baseline', decimals: 0, prefix: '−' },
]

const DD_BARS = [
  { name: 'Microsoft (MSFT)', pct: 24, color: 'var(--green)',  val: '−24%' },
  { name: 'Procter & Gamble (PG)', pct: 20, color: 'var(--green)', val: '−20%' },
  { name: 'Netflix (NFLX)', pct: 77, color: 'var(--amber)',  val: '−77%' },
  { name: 'American Airlines (AAL)', pct: 72, color: 'var(--red)', val: '−72%' },
  { name: 'Bed Bath & Beyond (BBBY)', pct: 92, color: 'var(--red)', val: '−92%' },
]

const QUICK = [
  { id: 'intro',    label: 'Key Concepts',      sub: 'Drawdown, metrics, plain English' },
  { id: 'data',     label: 'Data & Methodology', sub: 'Where the data comes from' },
  { id: 'models',   label: 'Models & Process',   sub: 'What we built and tested' },
  { id: 'findings', label: 'Findings',            sub: 'Results & key takeaways' },
  { id: 'usecases', label: 'Use Cases',           sub: 'Who uses this and how' },
  { id: 'activity', label: 'Activity',            sub: 'Bet on real companies from our test set', highlight: true },
]

export default function Overview({ navigate }) {
  return (
    <div className="page-wrap">
      <div className="eyebrow">01 — Overview</div>
      <h1 className="page-title">Predicting<br />the <span style={{ color: 'var(--blue-700)' }}>Fall</span></h1>
      <p className="page-sub">
        A neural network that predicts how far a US public company's stock will fall over the next 12 months — trained on 25 years of accounting data.
      </p>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
        {KPIS.map(({ Icon, num, suffix, label, decimals, prefix }) => (
          <div className="kpi-cell" key={label}>
            <div className="kpi-num">
              <CountUp target={num} decimals={decimals} prefix={prefix ?? ''} suffix={suffix} />
            </div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Why */}
      <div className="info-box" style={{ marginBottom: '2rem' }}>
        <strong style={{ color: 'var(--blue-900)' }}>Why predict drawdown?</strong>{' '}
        Bankruptcies are too rare to model well (only 387 in our dataset). Raw stock returns are too noisy.
        Forward drawdown — the worst drop from peak to trough over the next 12 months — is measurable for every
        public company and gives a clear, actionable risk number.
      </div>

      {/* Example bars */}
      <div className="card card-p" style={{ marginBottom: '2rem' }}>
        <div className="section-label" style={{ marginBottom: '1rem' }}>Sample realized drawdowns — test set 2020–2023</div>
        {DD_BARS.map(({ name, pct, color, val }) => (
          <div key={name} style={{ marginBottom: '.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: 'var(--slate-600)', marginBottom: '.3rem' }}>
              <span>{name}</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color }}>{val}</span>
            </div>
            <div className="dd-bar-track">
              <motion.div
                className="dd-bar-fill"
                style={{ background: color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: .8, ease: 'easeOut', delay: .1 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div className="section-label">Explore the project</div>
      <div className="qnav-grid">
        {QUICK.map(({ id, label, sub, highlight }) => (
          <div
            key={id}
            className="qnav-card"
            onClick={() => navigate(id)}
            style={highlight ? { borderColor: 'rgba(245,158,11,.4)', background: 'rgba(245,158,11,.04)' } : {}}
          >
            <div>
              <div className="qnav-label" style={highlight ? { color: '#92400E' } : {}}>{label}</div>
              <div className="qnav-sub">{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
