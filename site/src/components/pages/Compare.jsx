import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, ArrowRight } from 'lucide-react'
import predictions from '../../data/predictions.json'

const OUTCOME_LABEL = {
  hit:         { label: 'Hit',         color: 'var(--green)', bg: 'var(--green-soft)' },
  safe:        { label: 'Safe',        color: 'var(--green)', bg: 'var(--green-soft)' },
  miss:        { label: 'Miss',        color: 'var(--red)',   bg: 'var(--red-soft)'   },
  false_alarm: { label: 'False alarm', color: 'var(--amber)', bg: 'var(--amber-lo)'   },
}

function pctFmt(v) { return (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%' }
function ddColor(v) {
  if (v == null) return 'var(--text-3)'
  if (v <= -0.50) return 'var(--red)'
  if (v <= -0.30) return 'var(--amber)'
  return 'var(--green)'
}

const POPULAR_NAMES = [
  'Microsoft', 'Bed Bath & Beyond', 'Netflix', 'Johnson & Johnson',
  'Carnival', 'Peloton Interactive', 'American Airlines',
]

function pickDefaultRow(name) {
  const matches = predictions.filter(r => r.n.toLowerCase().includes(name.toLowerCase()))
  return matches[0] || null
}

export default function Compare({ init }) {
  const [a, setA] = useState(() => init?.a ?? pickDefaultRow('Bed Bath & Beyond'))
  const [b, setB] = useState(() => init?.b ?? pickDefaultRow('Microsoft'))

  return (
    <div className="page-wrap">
      <div className="eyebrow">Model · Compare</div>
      <h1 className="page-title">Compare<br />Firms</h1>
      <p className="page-sub">
        Pick any two firm-year anchors from our test set and see the model&apos;s prediction next to the realized outcome for each. Useful for sanity-checking the model&apos;s contrasts: a leveraged retailer vs a cash-rich enterprise software firm, an airline before COVID vs a defensive stock.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 'var(--sp-3)', alignItems: 'stretch', marginBottom: 'var(--sp-6)' }}>
        <FirmCard label="Firm A" row={a} onChange={setA} highlightColor="var(--blue-500)" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', padding: 'var(--sp-3)' }}>
          <ArrowRight size={18} style={{ transform: 'rotate(0deg)' }} />
        </div>
        <FirmCard label="Firm B" row={b} onChange={setB} highlightColor="var(--amber)" />
      </div>

      {a && b && <CompareSummary a={a} b={b} />}

      <div style={{ marginTop: 'var(--sp-6)', display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)', fontFamily: 'var(--mono)' }}>
          Try
        </span>
        {POPULAR_NAMES.map(n => (
          <button
            key={n}
            onClick={() => {
              if (Math.random() > 0.5 || !a) setA(pickDefaultRow(n))
              else setB(pickDefaultRow(n))
            }}
            style={{
              padding: '4px 10px',
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--sans)',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-2)',
              cursor: 'pointer',
              transition: 'border-color .15s, color .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--blue-500)'; e.currentTarget.style.color = 'var(--blue-700)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
function FirmCard({ label, row, onChange, highlightColor }) {
  return (
    <div className="card" style={{ padding: 'var(--sp-4)', borderTop: `3px solid ${highlightColor}`, display: 'flex', flexDirection: 'column' }}>
      <div className="section-label" style={{ marginBottom: 'var(--sp-2)' }}>{label}</div>
      <FirmPicker value={row} onChange={onChange} />
      {row ? (
        <div style={{ marginTop: 'var(--sp-4)', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-1)', letterSpacing: 'var(--ls-tight)', lineHeight: 'var(--lh-snug)' }}>
            {row.n}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 4 }}>
            {row.s} · fyear {row.y} · anchored {row.d}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
            <Stat label="Predicted" value={row.p} />
            <Stat label="Realized"  value={row.a} />
          </div>
          <div style={{ marginTop: 'var(--sp-3)' }}>
            <span style={{
              display: 'inline-block',
              fontFamily: 'var(--mono)',
              fontSize: 'var(--text-2xs)',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: 'var(--r-sm)',
              background: OUTCOME_LABEL[row.o].bg,
              color: OUTCOME_LABEL[row.o].color,
            }}>
              {OUTCOME_LABEL[row.o].label.toUpperCase()}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 'var(--sp-4)', padding: 'var(--sp-6)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-3)', background: 'var(--bg-2)', borderRadius: 'var(--r-md)' }}>
          Choose a firm above
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)', fontFamily: 'var(--mono)' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: ddColor(value), fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginTop: 2 }}>
        {pctFmt(value)}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
function FirmPicker({ value, onChange }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const results = useMemo(() => {
    if (!q.trim()) return []
    const needle = q.toLowerCase()
    return predictions
      .filter(r => r.n.toLowerCase().includes(needle))
      .slice(0, 20)
  }, [q])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
        <input
          type="search"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          placeholder={value ? `${value.n} · fyear ${value.y}` : 'Search by company name'}
          style={{
            width: '100%',
            padding: '8px 30px 8px 32px',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            color: 'var(--text-1)',
            fontFamily: 'var(--sans)',
            fontSize: 'var(--text-sm)',
            outline: 'none',
            transition: 'border-color .15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-2)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        />
        {value && (
          <button
            onClick={() => { onChange(null); setQ(''); setOpen(true) }}
            aria-label="Clear"
            style={{
              position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)',
              width: 22, height: 22, borderRadius: 4,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 30,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              boxShadow: 'var(--shadow-md)',
              maxHeight: 320, overflowY: 'auto',
            }}
          >
            {results.map((r) => (
              <button
                key={`${r.g}-${r.y}`}
                onClick={() => { onChange(r); setQ(''); setOpen(false) }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 'var(--sp-2)',
                  fontFamily: 'var(--sans)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-1)',
                  transition: 'background .12s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span>{r.n}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
                  fyear {r.y}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
function CompareSummary({ a, b }) {
  const predDelta = a.p - b.p
  const actualDelta = a.a - b.a
  return (
    <div className="card" style={{ padding: 'var(--sp-5)' }}>
      <div className="section-label" style={{ marginBottom: 'var(--sp-3)' }}>Side by side</div>
      <Row label="Predicted forward 12m drawdown" a={a.p} b={b.p} />
      <Row label="Realized forward 12m drawdown" a={a.a} b={b.a} />
      <div style={{ marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--border)', fontSize: 'var(--text-xs)', color: 'var(--text-3)', lineHeight: 'var(--lh-relaxed)' }}>
        <strong style={{ color: 'var(--text-1)' }}>Model verdict.</strong>{' '}
        The model rated <strong>{a.n}</strong> as {a.p <= -0.30 ? 'higher-risk' : 'lower-risk'} ({pctFmt(a.p)}), and <strong>{b.n}</strong> as {b.p <= -0.30 ? 'higher-risk' : 'lower-risk'} ({pctFmt(b.p)}). The realized difference was {pctFmt(actualDelta)}; the model&apos;s predicted difference was {pctFmt(predDelta)}.
      </div>
    </div>
  )
}

function Row({ label, a, b }) {
  return (
    <div style={{ marginBottom: 'var(--sp-3)' }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <Bar value={a} side="right" color="var(--blue-500)" />
        <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-4)' }}>
          {pctFmt(a)} vs {pctFmt(b)}
        </div>
        <Bar value={b} side="left" color="var(--amber)" />
      </div>
    </div>
  )
}

function Bar({ value, side, color }) {
  const pct = Math.min(100, Math.abs(value) * 100)
  return (
    <div style={{
      position: 'relative', height: 18,
      background: 'var(--bg-2)', borderRadius: 'var(--r-sm)', overflow: 'hidden',
    }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          position: 'absolute', top: 0, bottom: 0,
          [side]: 0,
          background: color,
          borderRadius: 'var(--r-sm)',
        }}
      />
      <div style={{
        position: 'relative', height: '100%',
        display: 'flex', alignItems: 'center',
        padding: side === 'right' ? '0 6px 0 0' : '0 0 0 6px',
        justifyContent: side === 'right' ? 'flex-end' : 'flex-start',
        fontFamily: 'var(--mono)',
        fontSize: 'var(--text-2xs)',
        fontWeight: 600,
        color: '#fff',
        textShadow: '0 0 4px rgba(0,0,0,.3)',
      }}>
        {pctFmt(value)}
      </div>
    </div>
  )
}
