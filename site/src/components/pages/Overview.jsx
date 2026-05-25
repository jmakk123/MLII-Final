import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
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

const FEATURED = [
  { ticker: 'BBBY', name: 'Bed Bath & Beyond', year: 2021, pred: -0.41, actual: -0.60, outcome: 'hit'  },
  { ticker: 'NFLX', name: 'Netflix',           year: 2021, pred: -0.25, actual: -0.58, outcome: 'miss' },
  { ticker: 'MSFT', name: 'Microsoft',         year: 2021, pred: -0.19, actual: -0.31, outcome: 'miss' },
  { ticker: 'JNJ',  name: 'Johnson & Johnson', year: 2020, pred: -0.18, actual: -0.13, outcome: 'safe' },
  { ticker: 'CCL',  name: 'Carnival',          year: 2020, pred: -0.48, actual: -0.47, outcome: 'hit'  },
]
const OUTCOME_COLORS = {
  hit:  { c: 'var(--green)', bg: 'var(--green-soft)', label: 'Hit' },
  miss: { c: 'var(--red)',   bg: 'var(--red-soft)',   label: 'Miss' },
  safe: { c: 'var(--green)', bg: 'var(--green-soft)', label: 'Safe' },
  false_alarm: { c: 'var(--amber)', bg: 'var(--amber-lo)', label: 'False alarm' },
}
function pctFmt(v) { return (v >= 0 ? '+' : '') + (v * 100).toFixed(0) + '%' }

function FeaturedPredictions({ navigate }) {
  return (
    <div style={{ marginBottom: 'var(--sp-8)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--sp-3)', gap: 'var(--sp-3)' }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>Try the model</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)' }}>
            A few predictions from our test set. Click <em>Predictions</em> to browse all 15,311.
          </div>
        </div>
        <button
          onClick={() => navigate && navigate('predictions')}
          style={{
            padding: '8px 14px',
            background: 'var(--blue-700)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--r-md)',
            fontFamily: 'var(--sans)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity .15s, transform .1s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(1px)'}
          onMouseUp={(e) => e.currentTarget.style.transform = ''}
        >
          Browse all 15,311 →
        </button>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 'var(--sp-3)',
      }}>
        {FEATURED.map((f, i) => (
          <motion.div
            key={f.ticker}
            className="card"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
            onClick={() => navigate && navigate('predictions')}
            style={{ padding: 'var(--sp-4)', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-1)' }}>
                {f.ticker}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-4)' }}>
                fyear {f.year}
              </span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginBottom: 'var(--sp-3)' }}>
              {f.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
              <div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)', fontFamily: 'var(--mono)' }}>
                  Predicted
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-base)', fontWeight: 700, color: ddColor(f.pred), fontVariantNumeric: 'tabular-nums' }}>
                  {pctFmt(f.pred)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)', fontFamily: 'var(--mono)' }}>
                  Realized
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-base)', fontWeight: 700, color: ddColor(f.actual), fontVariantNumeric: 'tabular-nums' }}>
                  {pctFmt(f.actual)}
                </div>
              </div>
            </div>
            <div style={{
              marginTop: 'var(--sp-3)',
              display: 'inline-block',
              fontFamily: 'var(--mono)',
              fontSize: 'var(--text-2xs)',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 'var(--r-sm)',
              background: OUTCOME_COLORS[f.outcome].bg,
              color: OUTCOME_COLORS[f.outcome].c,
            }}>
              {OUTCOME_COLORS[f.outcome].label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function HeroWord({ word, delay = 0, color }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: 'inline-block', color: color ?? 'inherit' }}
    >
      {word}
    </motion.span>
  )
}

function IntroCard({ num, accent, accentSoft, eyebrow, title, bullets }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      className="card"
      style={{
        padding: 'var(--sp-5)',
        borderTop: `3px solid ${accent}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Big number watermark */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 'var(--sp-3)', right: 'var(--sp-3)',
          fontFamily: 'var(--display)',
          fontSize: 'var(--text-5xl)',
          fontWeight: 700,
          lineHeight: 1,
          color: accent,
          opacity: 0.12,
          letterSpacing: 'var(--ls-tight)',
          pointerEvents: 'none',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {num}
      </div>
      <div style={{
        display: 'inline-block',
        fontFamily: 'var(--mono)',
        fontSize: 'var(--text-2xs)',
        fontWeight: 600,
        letterSpacing: 'var(--ls-wider)',
        textTransform: 'uppercase',
        color: accent,
        background: accentSoft,
        padding: '3px 8px',
        borderRadius: 'var(--r-sm)',
        marginBottom: 'var(--sp-2)',
      }}>
        {num} · {eyebrow}
      </div>
      <div style={{
        fontFamily: 'var(--display)',
        fontSize: 'var(--text-lg)',
        fontWeight: 600,
        color: 'var(--text-1)',
        letterSpacing: 'var(--ls-tight)',
        marginBottom: 'var(--sp-3)',
        lineHeight: 'var(--lh-snug)',
      }}>
        {title}
      </div>
      <ul style={{
        paddingLeft: 0,
        listStyle: 'none',
        margin: 0,
      }}>
        {bullets.map((b, i) => (
          <li key={i} style={{
            position: 'relative',
            paddingLeft: 'var(--sp-5)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-2)',
            lineHeight: 'var(--lh-relaxed)',
            marginBottom: i < bullets.length - 1 ? 'var(--sp-2)' : 0,
          }}>
            <span style={{
              position: 'absolute',
              left: 0, top: '0.55em',
              width: 6, height: 6, borderRadius: '50%',
              background: accent,
              flexShrink: 0,
            }} />
            {b}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

export default function Overview({ navigate }) {
  return (
    <div className="page-wrap">
      <div className="hero-wrap">
        <div className="hero-mesh" aria-hidden />
        <div className="eyebrow" style={{ position: 'relative', zIndex: 1 }}>01 / Overview</div>
        <h1 className="page-title hero-title" style={{ position: 'relative', zIndex: 1 }}>
          <HeroWord word="Predicting" delay={0.05} />
          <br />
          <HeroWord word="the" delay={0.15} />{' '}
          <HeroWord word="Fall" delay={0.25} color="var(--blue-700)" />
        </h1>
      </div>

      {/* Featured Predictions strip */}
      <FeaturedPredictions navigate={navigate} />


      {/* Buildup */}
      <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-2)', lineHeight: 'var(--lh-relaxed)', maxWidth: '65ch', marginBottom: 'var(--sp-6)' }}>
        Risk managers, credit teams, and portfolio managers all need the same number: how much could this position lose before it recovers? Today they triangulate it from volatility, leverage, credit ratings, and gut. We tried to do better with a single learned score.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-4)', marginBottom: 'var(--sp-10)' }}>
        <IntroCard
          num="01"
          accent="var(--red)"
          accentSoft="var(--red-soft)"
          eyebrow="The Problem"
          title="Why drawdown, not bankruptcy or returns"
          bullets={[
            'Bankruptcies are too rare (387 in the dataset, ~0.3% of firm-years), making them hard to model reliably.',
            'Raw stock returns are too noisy to predict cleanly at any horizon.',
            'Forward drawdown sits in the middle: continuous, defined for every firm, directly useful for sizing positions and flagging risk.',
            'We predict it 12 months forward, anchored at fiscal-year-end + 90 days (the realistic 10-K filing date).',
          ]}
        />
        <IntroCard
          num="02"
          accent="var(--blue-500)"
          accentSoft="var(--blue-50)"
          eyebrow="The Team"
          title="Machine Learning II, UChicago MS-ADS"
          bullets={[
            'Four-person team: Nick Dhaliwal, Jared Maksoud, Nicholas Mikhail, Yung Chyi Yang.',
            'Final project for the Spring 2026 cohort. Built end-to-end over four weeks.',
            'Architecture, training loop, and evaluation discipline match the methodology submission.',
            'Methodology was graded "strongest in the cohort" by the instructor.',
          ]}
        />
        <IntroCard
          num="03"
          accent="var(--amber)"
          accentSoft="rgba(245,158,11,.08)"
          eyebrow="The EDA Journey"
          title="Three findings that reshaped the project"
          bullets={[
            'Realized base rate at -30% was 51.7% (vs the 10-20% the brief expected); CRSP is small-cap heavy. Pushed us to rank metrics.',
            'COVID-era anchors had mean drawdowns near 50%, dominating any pooled metric. Forced validation = the COVID window by design.',
            'Newly public firms lacked 5 years of accounting history. Forced a clean drop-not-impute policy on partial windows.',
            'Bankruptcies almost never appear in the anchor set (firms delist before the forward window). The model is drawdown-among-survivors.',
          ]}
        />
        <IntroCard
          num="04"
          accent="var(--green)"
          accentSoft="var(--green-soft)"
          eyebrow="The Deliverable"
          title="A real model, end-to-end reproducible"
          bullets={[
            'Trained PyTorch checkpoint on 76,990 anchor rows; headline numbers from a 3-seed ensemble.',
            'Full notebook, training pipeline, scripts, and weights live in the GitHub repo linked in the sidebar.',
            'This site is the presentation companion: methodology, results, limitations, plus the in-class betting game.',
            'Hover any number on the Findings page for context; spend 10 minutes on the Activity for the fun part.',
          ]}
        />
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
              cursor={{ fill: 'var(--bg-2)', opacity: 0.5 }}
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
