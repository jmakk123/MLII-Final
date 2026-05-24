import { useEffect, useRef, useState } from 'react'
import { Database, Clock, Target } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'

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
  { name: 'Bed Bath & Beyond', drawdown: -60, sector: 'Retail' },
  { name: 'American Airlines', drawdown: -41, sector: 'Airlines' },
  { name: 'Microsoft',         drawdown: -31, sector: 'Software' },
  { name: 'Netflix',           drawdown: -58, sector: 'Streaming' },
  { name: 'Johnson & Johnson', drawdown: -13, sector: 'Healthcare' },
]

function ddColor(v) {
  if (v <= -50) return 'var(--red)'
  if (v <= -30) return 'var(--amber)'
  return 'var(--green)'
}

export default function Overview() {
  return (
    <div className="page-wrap">
      <div className="eyebrow">01 / Overview</div>
      <h1 className="page-title">Predicting<br />the <span style={{ color: 'var(--blue-700)' }}>Fall</span></h1>

      {/* Buildup */}
      <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-2)', lineHeight: 'var(--lh-relaxed)', maxWidth: '65ch', marginBottom: 'var(--sp-5)' }}>
        Risk managers, credit teams, and portfolio managers all need the same number: how much could this position lose before it recovers? Today they triangulate it from volatility, leverage, credit ratings, and gut. We tried to do better with a single learned score.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-10)' }}>
        <div className="card card-p">
          <div className="section-label">The motivating question</div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', lineHeight: 'var(--lh-relaxed)' }}>
            Bankruptcies are too rare to model reliably (only 387 in our dataset, roughly 0.3% of firm-years). Raw stock returns are too noisy to predict cleanly at any horizon. The number actually used by risk teams sits in between: the worst peak-to-trough loss over a defined window. We chose to predict that, 12 months forward, for every US public firm.
          </p>
        </div>
        <div className="card card-p">
          <div className="section-label">Team and course</div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', lineHeight: 'var(--lh-relaxed)' }}>
            Final project for Machine Learning II, UChicago MS-ADS, Spring 2026. Built over four weeks by Nick Dhaliwal, Jared Maksoud, Nicholas Mikhail, and Yung Chyi Yang. Architecture, training loop, and evaluation discipline all match the methodology submission the instructor graded "strongest in the cohort."
          </p>
        </div>
        <div className="card card-p">
          <div className="section-label">Our EDA journey</div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', lineHeight: 'var(--lh-relaxed)' }}>
            Three findings reshaped the project. The realized base rate of drawdowns past 30% was 51.7% on our universe, far above the 10 to 20% the brief expected (CRSP is small-cap heavy). COVID-era anchors had mean drawdowns near 50%, dominating any year-pooled metric. Newly public firms lacked 5 years of accounting history. The first pushed us toward rank metrics; the second told us validation had to be the COVID window; the third forced clean drop-not-impute handling.
          </p>
        </div>
        <div className="card card-p">
          <div className="section-label">What this is</div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', lineHeight: 'var(--lh-relaxed)' }}>
            This site is the presentation companion. The model is a real PyTorch checkpoint trained on 76,990 anchor rows; the headline numbers come from a 3-seed ensemble of our best architecture. The notebook, training pipeline, and trained weights all live in the public repo linked in the sidebar.
          </p>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 'var(--sp-10)' }}>
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
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-1)', marginBottom: 'var(--sp-2)' }}>
        What is forward drawdown?
      </h2>
      <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-2)', lineHeight: 'var(--lh-relaxed)', maxWidth: '65ch', marginBottom: 'var(--sp-4)' }}>
        Forward drawdown is the worst peak-to-trough percentage loss a stock will experience over the next 12 months.
        A value of <span style={{ color: 'var(--red)', fontWeight: 600 }}>-40%</span> means the stock fell 40% from its highest point during the year.
      </p>
      <div className="info-box" style={{ marginBottom: 'var(--sp-10)' }}>
        <strong style={{ color: 'var(--blue-900)' }}>How we built the metric.</strong>{' '}
        For every company-year, we anchor at fiscal-year-end plus 90 days (the realistic 10-K filing date), then take 12 months of adjusted CRSP daily prices and compute the worst close-to-peak decline.
        Delisted firms get full-loss treatment for bankruptcy or liquidation, terminal-value treatment for mergers. Every prediction uses only data available before the anchor date, so there is no look-ahead leakage.
      </div>

      {/* Reading the number in context */}
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-1)', marginBottom: 'var(--sp-2)' }}>
        Reading the number in context
      </h2>
      <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-2)', lineHeight: 'var(--lh-relaxed)', maxWidth: '65ch', marginBottom: 'var(--sp-4)' }}>
        Drawdown is one risk number among several. Practitioners typically read it alongside:
      </p>
      <div className="concept-grid" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="concept-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-base)', color: 'var(--blue-500)' }}>〜</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-1)' }}>Volatility</span>
          </div>
          <div className="concept-def">Day-to-day price variability. High vol firms can have high drawdowns even without a true distress event. Drawdown tells you how deep the worst dip got; vol tells you how bumpy the ride was.</div>
        </div>
        <div className="concept-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-base)', color: 'var(--blue-500)' }}>%</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-1)' }}>Value at Risk (VaR)</span>
          </div>
          <div className="concept-def">The worst loss expected at a given confidence level over a short horizon (a day, a week). Drawdown extends the same idea to a full year and to peak-to-trough, which is what actually triggers margin calls and stop-outs.</div>
        </div>
      </div>
      <div className="info-box" style={{ marginBottom: 'var(--sp-10)' }}>
        <strong style={{ color: 'var(--blue-900)' }}>How to use the score.</strong>{' '}
        A predicted -10% is a quiet year. A predicted -30% means the model expects a material drawdown, the same threshold the brief uses for the binary headline flag. Below -50% is in the genuine-distress range.
        Combine with volatility for sizing, with leverage for solvency context, and with sector trends for the macro picture.
      </div>

      {/* Sample drawdowns chart */}
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-1)', marginBottom: 'var(--sp-2)' }}>
        Sample realized drawdowns
      </h2>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', lineHeight: 'var(--lh-relaxed)', maxWidth: '65ch', marginBottom: 'var(--sp-4)' }}>
        Five firms from our test set (fyear 2020 to 2023). Realized drawdowns from CRSP daily prices, color-coded by severity.
      </p>
      <div className="card card-p" style={{ paddingTop: 'var(--sp-6)', paddingBottom: 'var(--sp-6)' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={DD_BARS}
            layout="vertical"
            margin={{ top: 4, right: 56, bottom: 4, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis
              type="number"
              domain={[-100, 0]}
              tick={{ fontSize: 11, fill: 'var(--text-4)', fontFamily: 'var(--mono)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: 'var(--text-2)', fontFamily: 'var(--sans)' }}
              axisLine={false}
              tickLine={false}
              width={160}
            />
            <Tooltip
              formatter={(v) => [`${v}%`, 'Realized drawdown']}
              labelStyle={{ color: 'var(--text-1)', fontWeight: 600 }}
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'var(--mono)',
                color: 'var(--text-2)',
              }}
            />
            <Bar dataKey="drawdown" radius={[0, 4, 4, 0]}>
              {DD_BARS.map((d) => <Cell key={d.name} fill={ddColor(d.drawdown)} />)}
              <LabelList
                dataKey="drawdown"
                position="right"
                formatter={(v) => `${v}%`}
                style={{ fill: 'var(--text-2)', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)', fontSize: 'var(--text-xs)', color: 'var(--text-3)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--green)' }} /> Mild (greater than -30%)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--amber)' }} /> Material (-30% to -50%)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--red)' }} /> Severe (worse than -50%)</span>
        </div>
      </div>
    </div>
  )
}
