import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, X as XIcon, AlertTriangle, ShieldCheck } from 'lucide-react'
import predictions from '../../data/predictions.json'

/* 2x2 outcome breakdown.
   Model said risky ↓ × Stock actually fell ↓
        Stock fell >30%      Stock held up
   Said risky    HIT (TP)    FALSE ALARM (FP)
   Said safe     MISS (FN)   SAFE  (TN)
*/

const TILES = [
  { key: 'hit',         row: 0, col: 0, label: 'Hit',          desc: 'Model flagged risk and stock crashed',  Icon: Check,          color: 'var(--green)', bg: 'var(--green-soft)',  good: true  },
  { key: 'false_alarm', row: 0, col: 1, label: 'False Alarm',  desc: 'Model flagged risk but stock held',     Icon: AlertTriangle,  color: 'var(--amber)', bg: 'var(--amber-lo)',    good: false },
  { key: 'miss',        row: 1, col: 0, label: 'Miss',         desc: 'Stock crashed but model did not flag',  Icon: XIcon,          color: 'var(--red)',   bg: 'var(--red-soft)',    good: false },
  { key: 'safe',        row: 1, col: 1, label: 'Safe',         desc: 'Model said safe and stock held',        Icon: ShieldCheck,    color: 'var(--green)', bg: 'var(--green-soft)',  good: true  },
]

export default function OutcomeBreakdown() {
  const counts = useMemo(() => {
    const c = { hit: 0, false_alarm: 0, miss: 0, safe: 0 }
    for (const r of predictions) c[r.o]++
    return c
  }, [])
  const total = predictions.length
  const correct = counts.hit + counts.safe
  const accuracy = correct / total

  return (
    <div className="card card-p" style={{ marginBottom: 'var(--sp-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--sp-3)', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        <div className="section-label" style={{ margin: 0 }}>Outcome Breakdown · 15,311 Test Predictions</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>
          Overall accuracy:{' '}
          <span style={{ color: 'var(--blue-700)', fontWeight: 700 }}>
            {(accuracy * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr 1fr',
        gridTemplateRows: 'auto auto auto',
        gap: 'var(--sp-2)',
        alignItems: 'stretch',
      }}>
        {/* Headers (top) */}
        <div />
        <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>
          Stock fell &gt;30%
        </div>
        <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>
          Stock held up
        </div>

        {/* Row 1: Said risky */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)', color: 'var(--text-3)',
          paddingRight: 'var(--sp-2)', textAlign: 'right',
        }}>
          Model said<br/><strong style={{ color: 'var(--text-1)' }}>"risky"</strong>
        </div>
        {TILES.filter(t => t.row === 0).sort((a,b) => a.col - b.col).map((t, idx) => (
          <Tile key={t.key} tile={t} count={counts[t.key]} total={total} delay={idx * 0.05} />
        ))}

        {/* Row 2: Said safe */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)', color: 'var(--text-3)',
          paddingRight: 'var(--sp-2)', textAlign: 'right',
        }}>
          Model said<br/><strong style={{ color: 'var(--text-1)' }}>"safe"</strong>
        </div>
        {TILES.filter(t => t.row === 1).sort((a,b) => a.col - b.col).map((t, idx) => (
          <Tile key={t.key} tile={t} count={counts[t.key]} total={total} delay={0.1 + idx * 0.05} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', marginTop: 'var(--sp-3)', fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
        <span><strong style={{ color: 'var(--green)' }}>{counts.hit.toLocaleString()}</strong> correct crash calls</span>
        <span><strong style={{ color: 'var(--red)' }}>{counts.miss.toLocaleString()}</strong> missed crashes</span>
        <span><strong style={{ color: 'var(--amber)' }}>{counts.false_alarm.toLocaleString()}</strong> false alarms</span>
        <span><strong style={{ color: 'var(--green)' }}>{counts.safe.toLocaleString()}</strong> correct holds</span>
      </div>
    </div>
  )
}

function Tile({ tile, count, total, delay }) {
  const pct = (count / total) * 100
  const { Icon, label, desc, color, bg, good } = tile
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.3, delay }}
      style={{
        background: bg,
        border: `1.5px solid ${good ? color : 'transparent'}`,
        borderColor: color + '55',
        borderRadius: 'var(--r-md)',
        padding: 'var(--sp-4)',
        textAlign: 'center',
      }}
    >
      <Icon size={18} color={color} style={{ marginBottom: 6 }} />
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {count.toLocaleString()}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-3)', marginTop: 4 }}>
        {pct.toFixed(1)}%
      </div>
      <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)', marginTop: 6, lineHeight: 1.4 }}>
        {desc}
      </div>
    </motion.div>
  )
}
