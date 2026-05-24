import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Database, Clock, Target } from 'lucide-react'

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
  { Icon: Database, num: 76990,  suffix: '',    label: 'Firm-years in our anchor panel', decimals: 0 },
  { Icon: Clock,    num: 29,     suffix: 'M',   label: 'Daily stock-price rows',   decimals: 0 },
  { Icon: Clock,    num: 22,     suffix: ' yrs', label: 'Anchor years, fyear 2003 to 2024', decimals: 0 },
  { Icon: Target,   num: 12.1,   suffix: '%',   label: 'Mean absolute error on forward drawdown', decimals: 1 },
]

const DD_BARS = [
  { name: 'Bed Bath & Beyond (BBBY)', pct: 60, color: 'var(--red)',   val: '-60%' },
  { name: 'American Airlines (AAL)',  pct: 41, color: 'var(--red)',   val: '-41%' },
  { name: 'Microsoft (MSFT)',         pct: 31, color: 'var(--amber)', val: '-31%' },
  { name: 'Netflix (NFLX)',           pct: 58, color: 'var(--red)',   val: '-58%' },
  { name: 'Johnson & Johnson (JNJ)',  pct: 13, color: 'var(--green)', val: '-13%' },
]

export default function Overview() {
  const [hovered, setHovered] = useState(null)

  return (
    <div className="page-wrap">
      <div className="eyebrow">01 / Overview</div>
      <h1 className="page-title">Predicting<br />the <span style={{ color: 'var(--blue-700)' }}>Fall</span></h1>
      <p className="page-sub">
        A neural network that predicts how far a US public company&apos;s stock will fall over the next 12 months,
        trained on 25 years of accounting data and daily price history.
      </p>

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

      {/* What is forward drawdown */}
      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--slate-900)', marginBottom: '.45rem' }}>What is forward drawdown?</h2>
      <p style={{ fontSize: '.92rem', color: 'var(--slate-700)', lineHeight: 1.7, maxWidth: 720, marginBottom: '1rem' }}>
        Forward drawdown is the worst peak-to-trough percentage loss a stock will experience over the next 12 months.
        A value of <span style={{ color: 'var(--red)', fontWeight: 600 }}>-40%</span> means the stock fell 40% from its highest point during the year.
      </p>
      <div className="info-box" style={{ marginBottom: '2rem' }}>
        <strong style={{ color: 'var(--blue-900)' }}>How we built the metric.</strong>{' '}
        For every company-year, we anchor at fiscal-year-end plus 90 days (the realistic 10-K filing date), then take 12 months of adjusted CRSP daily prices and compute the worst close-to-peak decline.
        Delisted firms get full-loss treatment for bankruptcy or liquidation, terminal-value treatment for mergers. Every prediction uses only data available before the anchor date, so there is no look-ahead leakage.
      </div>

      {/* Why */}
      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--slate-900)', marginBottom: '.45rem' }}>Why predict drawdown?</h2>
      <p style={{ fontSize: '.88rem', color: 'var(--slate-500)', lineHeight: 1.75, maxWidth: 720, marginBottom: '2rem' }}>
        Bankruptcies are too rare to model reliably (only 387 in the dataset). Raw stock returns are too noisy.
        Forward drawdown sits in the middle: it is continuous, defined for every public company, and directly useful for sizing positions, setting stop-loss levels, and flagging firms that warrant deeper review.
      </p>

      {/* Drawdown in context */}
      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--slate-900)', marginBottom: '.45rem' }}>Reading the number in context</h2>
      <p style={{ fontSize: '.88rem', color: 'var(--slate-500)', lineHeight: 1.75, maxWidth: 720, marginBottom: '1rem' }}>
        Drawdown is one risk number among several. Practitioners typically read it alongside:
      </p>
      <div className="concept-grid" style={{ marginBottom: '1rem' }}>
        <div className="concept-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '1rem', color: 'var(--blue-500)' }}>〜</span>
            <span style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--slate-900)' }}>Volatility</span>
          </div>
          <div className="concept-def">Day-to-day price variability. High vol firms can have high drawdowns even without a true distress event. Drawdown tells you how deep the worst dip got; vol tells you how bumpy the ride was.</div>
        </div>
        <div className="concept-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '1rem', color: 'var(--blue-500)' }}>%</span>
            <span style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--slate-900)' }}>Value at Risk (VaR)</span>
          </div>
          <div className="concept-def">The worst loss expected at a given confidence level over a short horizon (a day, a week). Drawdown extends the same idea to a full year and to peak-to-trough, which is what actually triggers margin calls and stop-outs.</div>
        </div>
      </div>
      <div className="info-box">
        <strong style={{ color: 'var(--blue-900)' }}>How to use the score.</strong>{' '}
        A predicted -10% is a quiet year. A predicted -30% means the model expects a material drawdown, the same threshold the brief uses for the binary headline flag. Below -50% is in the genuine-distress range.
        Combine with volatility for sizing, with leverage for solvency context, and with sector trends for the macro picture.
      </div>

      {/* Sample bars, hover-driven */}
      <div className="card card-p" style={{ marginTop: '2rem' }}>
        <div className="section-label" style={{ marginBottom: '.4rem' }}>Sample realized drawdowns from our test set, fyear 2020 to 2023</div>
        <div style={{ fontSize: '.72rem', color: 'var(--slate-500)', marginBottom: '1rem' }}>Hover a company name to reveal its realized drawdown.</div>
        {DD_BARS.map(({ name, pct, color, val }) => {
          const isHover = hovered === name
          return (
            <div
              key={name}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
              style={{
                marginBottom: '.75rem', cursor: 'default',
                padding: '.35rem .5rem', marginLeft: '-.5rem', marginRight: '-.5rem',
                borderRadius: 6, transition: 'background .15s',
                background: isHover ? 'var(--slate-50)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.85rem', color: 'var(--slate-700)', marginBottom: '.35rem' }}>
                <span style={{ fontWeight: 500 }}>{name}</span>
                <motion.span
                  initial={false}
                  animate={{ opacity: isHover ? 1 : 0, x: isHover ? 0 : 6 }}
                  transition={{ duration: .14 }}
                  style={{ fontFamily: 'var(--mono)', fontWeight: 600, color }}
                >
                  {val}
                </motion.span>
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
          )
        })}
      </div>
    </div>
  )
}
