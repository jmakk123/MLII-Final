import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Rewind, Check, X as XIcon } from 'lucide-react'
import predictions from '../../data/predictions.json'

const YEARS = Array.from(new Set(predictions.map(r => r.y))).sort()
const TOP_N = 10

const NARRATIVE = {
  2020: 'Anchored March 2021. The forward window covered the post-vaccine reopening, supply chain whiplash, and the start of the meme-stock era.',
  2021: 'Anchored March 2022. The forward window includes the 2022 tech sell-off and the start of the Fed rate-hike cycle.',
  2022: 'Anchored March 2023. The forward window captures the regional bank stress (SVB, First Republic) and the AI rally.',
  2023: 'Anchored March 2024. The forward window covers the AI mania pullback in mid-2024 and the late-cycle macro debate.',
}

function pctFmt(v) { return (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%' }
function ddColor(v) {
  if (v <= -0.50) return 'var(--red)'
  if (v <= -0.30) return 'var(--amber)'
  return 'var(--green)'
}

export default function Backtest({ init }) {
  const [year, setYear] = useState(init?.year ?? YEARS[YEARS.length - 1])

  const top = useMemo(() => {
    return [...predictions]
      .filter(r => r.y === year)
      .sort((a, b) => a.p - b.p)
      .slice(0, TOP_N)
  }, [year])

  const hits = top.filter(r => r.a <= -0.30).length
  const avgPred = top.length ? top.reduce((s, r) => s + r.p, 0) / top.length : 0
  const avgActual = top.length ? top.reduce((s, r) => s + r.a, 0) / top.length : 0

  return (
    <div className="page-wrap">
      <div className="eyebrow">Model · Backtest</div>
      <h1 className="page-title">Backtest<br />by Year</h1>
      <p className="page-sub">
        Pick a year. We pull the model&apos;s 10 most-pessimistic forecasts anchored at that fiscal-year-end, then reveal what actually happened over the following 12 months. The cleanest read of whether the model would have helped you avoid the worst names.
      </p>

      {/* Year selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--sp-5)', flexWrap: 'wrap' }}>
        {YEARS.map(y => (
          <button
            key={y}
            onClick={() => setYear(y)}
            style={{
              padding: '10px 18px',
              background: year === y ? 'var(--blue-700)' : 'var(--surface)',
              color:      year === y ? '#fff'              : 'var(--text-2)',
              border: '1px solid ' + (year === y ? 'var(--blue-700)' : 'var(--border)'),
              borderRadius: 'var(--r-md)',
              fontFamily: 'var(--mono)',
              fontSize: 'var(--text-base)',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            fyear {y}
          </button>
        ))}
      </div>

      <div className="info-box" style={{ marginBottom: 'var(--sp-5)' }}>
        {NARRATIVE[year]}
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
        <BigStat label="Hit rate" value={`${hits} / ${TOP_N}`} sub={`${((hits / TOP_N) * 100).toFixed(0)}% of top picks fell >30%`} accent={hits >= 6 ? 'var(--green)' : hits >= 4 ? 'var(--amber)' : 'var(--red)'} />
        <BigStat label="Avg predicted" value={pctFmt(avgPred)}    sub="Across the top 10 risk picks" accent={ddColor(avgPred)} />
        <BigStat label="Avg realized"  value={pctFmt(avgActual)}  sub="Same names, over the 12 months that followed" accent={ddColor(avgActual)} />
      </div>

      {/* Leaderboard */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Rewind size={14} color="var(--blue-500)" />
            <span style={{ fontFamily: 'var(--display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-1)' }}>
              Model&apos;s top {TOP_N} risk picks · fyear {year}
            </span>
          </div>
        </div>
        <AnimatePresence mode="popLayout">
          {top.map((r, i) => (
            <motion.div
              key={`${r.g}-${r.y}`}
              layout
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, delay: 0.05 * i, ease: 'easeOut' }}
              style={{
                display: 'grid',
                gridTemplateColumns: '50px 1fr auto 130px 130px 90px',
                gap: 'var(--sp-3)',
                alignItems: 'center',
                padding: 'var(--sp-3) var(--sp-5)',
                borderBottom: i < top.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div className="num" style={{
                textAlign: 'right',
                color: i < 3 ? 'var(--amber)' : 'var(--text-4)',
                fontWeight: i < 3 ? 700 : 500,
                fontSize: i < 3 ? 'var(--text-base)' : 'var(--text-sm)',
              }}>
                #{i + 1}
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-1)' }}>{r.n}</div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)' }}>{r.s}</div>
              </div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: r.a <= -0.30 ? 'var(--green-soft)' : 'var(--red-soft)' }}>
                {r.a <= -0.30
                  ? <Check size={16} color="var(--green)" strokeWidth={3} />
                  : <XIcon size={16} color="var(--red)"   strokeWidth={3} />}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>
                  Predicted
                </div>
                <div className="num" style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: ddColor(r.p) }}>
                  {pctFmt(r.p)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>
                  Realized
                </div>
                <div className="num" style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: ddColor(r.a) }}>
                  {pctFmt(r.a)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>
                  Error
                </div>
                <div className="num" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-3)' }}>
                  {pctFmt(r.a - r.p)}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="info-box" style={{ marginTop: 'var(--sp-5)', fontSize: 'var(--text-xs)' }}>
        <strong style={{ color: 'var(--blue-900)' }}>What this tells you.</strong>{' '}
        A hit means the model flagged risk and the stock actually fell more than 30%. Across all four backtested years, the model&apos;s top-{TOP_N} picks hit on most of them, with the worst predictions corresponding to firms in measurable distress. The misses tend to cluster in firms that look stressed on accounting alone but were rescued by a sector tailwind (AI for chips, reopening for travel).
      </div>
    </div>
  )
}

function BigStat({ label, value, sub, accent }) {
  return (
    <div className="card" style={{ padding: 'var(--sp-4)', borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)', fontFamily: 'var(--mono)' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: accent, marginTop: 4, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 4, lineHeight: 'var(--lh-relaxed)' }}>{sub}</div>}
    </div>
  )
}
