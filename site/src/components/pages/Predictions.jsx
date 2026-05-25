import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronUp, ChevronDown, X, ExternalLink } from 'lucide-react'
import predictions from '../../data/predictions.json'

const SECTORS = Array.from(new Set(predictions.map(r => r.s))).sort()
const YEARS   = Array.from(new Set(predictions.map(r => r.y))).sort()
const OUTCOMES = [
  { value: 'all',         label: 'All outcomes' },
  { value: 'hit',         label: 'Hits (model + reality both flag risk)' },
  { value: 'safe',        label: 'Safe (model + reality both quiet)' },
  { value: 'miss',        label: 'Misses (model said safe, reality crashed)' },
  { value: 'false_alarm', label: 'False alarms (model flagged, reality fine)' },
]

const OUTCOME_LABEL = {
  hit:         { label: 'Hit',         color: 'var(--green)',  bg: 'var(--green-soft)' },
  safe:        { label: 'Safe',        color: 'var(--green)',  bg: 'var(--green-soft)' },
  miss:        { label: 'Miss',        color: 'var(--red)',    bg: 'var(--red-soft)'   },
  false_alarm: { label: 'False alarm', color: 'var(--amber)',  bg: 'var(--amber-lo)'   },
}

const PAGE_SIZE = 75

function pctFmt(v) {
  if (v == null || Number.isNaN(v)) return '—'
  const s = v >= 0 ? '+' : ''
  return `${s}${(v * 100).toFixed(1)}%`
}

function ddColor(v) {
  if (v == null) return 'var(--text-3)'
  if (v <= -0.50) return 'var(--red)'
  if (v <= -0.30) return 'var(--amber)'
  return 'var(--green)'
}

export default function Predictions() {
  const [search, setSearch]   = useState('')
  const [sector, setSector]   = useState('all')
  const [year, setYear]       = useState('all')
  const [outcome, setOutcome] = useState('all')
  const [sortKey, setSortKey] = useState('p')   // p = predicted (most-negative first by default)
  const [sortDir, setSortDir] = useState('asc') // asc = most-negative first
  const [page, setPage]       = useState(0)
  const [selected, setSelected] = useState(null) // {row}

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [search, sector, year, outcome, sortKey, sortDir])

  // Lock scroll on body when drawer is open
  useEffect(() => {
    if (!selected) return
    const handler = (e) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = predictions
    if (sector !== 'all') rows = rows.filter(r => r.s === sector)
    if (year   !== 'all') rows = rows.filter(r => r.y === Number(year))
    if (outcome !== 'all') rows = rows.filter(r => r.o === outcome)
    if (q)                rows = rows.filter(r => r.n.toLowerCase().includes(q))
    const dir = sortDir === 'asc' ? 1 : -1
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'string') return dir * av.localeCompare(bv)
      return dir * (av - bv)
    })
    return rows
  }, [search, sector, year, outcome, sortKey, sortDir])

  const visible = filtered.slice(0, (page + 1) * PAGE_SIZE)
  const hasMore = filtered.length > visible.length

  const setSort = (key) => {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'n' || key === 's' ? 'asc' : 'asc')   // ascending defaults
    }
  }

  const SortHead = ({ k, label, align = 'left' }) => (
    <th
      onClick={() => setSort(k)}
      style={{ cursor: 'pointer', textAlign: align, userSelect: 'none' }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {sortKey === k && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
      </span>
    </th>
  )

  return (
    <div className="page-wrap">
      <div className="eyebrow">Model · Predictions</div>
      <h1 className="page-title">Drawdown<br />Predictions</h1>
      <p className="page-sub">
        Every prediction the model made on the test fold. 15,311 firm-years across 2020 to 2023, 4,561 unique firms. Search a company, filter by sector or year, click any row for detail.
      </p>

      {/* Filter bar */}
      <div className="card" style={{ padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) 1fr 1fr 1.4fr', gap: 'var(--sp-3)' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)',
              color: 'var(--text-4)',
            }} />
            <input
              type="search"
              placeholder="Search by company name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                color: 'var(--text-1)',
                fontFamily: 'var(--sans)',
                fontSize: 'var(--text-sm)',
                outline: 'none',
                transition: 'border-color .15s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--blue-500)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          {/* Sector */}
          <FilterSelect value={sector} onChange={setSector} label="Sector">
            <option value="all">All sectors</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>
          {/* Year */}
          <FilterSelect value={year} onChange={setYear} label="Year">
            <option value="all">All years</option>
            {YEARS.map(y => <option key={y} value={y}>fyear {y}</option>)}
          </FilterSelect>
          {/* Outcome */}
          <FilterSelect value={outcome} onChange={setOutcome} label="Outcome">
            {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </FilterSelect>
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 'var(--sp-2)', color: 'var(--text-3)', fontSize: 'var(--text-xs)',
      }}>
        <span>
          {filtered.length.toLocaleString()} prediction{filtered.length !== 1 ? 's' : ''} match
        </span>
        <span style={{ fontFamily: 'var(--mono)' }}>
          Showing {visible.length.toLocaleString()} of {filtered.length.toLocaleString()}
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <SortHead k="n" label="Company" />
                <SortHead k="s" label="Sector" />
                <SortHead k="y" label="Year" align="right" />
                <SortHead k="p" label="Predicted" align="right" />
                <SortHead k="a" label="Realized" align="right" />
                <SortHead k="o" label="Outcome" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={`${r.g}-${r.y}`}
                  onClick={() => setSelected(r)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontWeight: 500, color: 'var(--text-1)', maxWidth: 280 }}>{r.n}</td>
                  <td style={{ color: 'var(--text-3)', fontSize: 'var(--text-xs)' }}>{r.s}</td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--text-3)' }}>{r.y}</td>
                  <td className="num" style={{ textAlign: 'right', color: ddColor(r.p), fontWeight: 600 }}>{pctFmt(r.p)}</td>
                  <td className="num" style={{ textAlign: 'right', color: ddColor(r.a), fontWeight: 600 }}>{pctFmt(r.a)}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      fontFamily: 'var(--mono)',
                      fontSize: 'var(--text-2xs)',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--r-sm)',
                      background: OUTCOME_LABEL[r.o].bg,
                      color: OUTCOME_LABEL[r.o].color,
                    }}>
                      {OUTCOME_LABEL[r.o].label}
                    </span>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--sp-8)', color: 'var(--text-3)' }}>
                    No predictions match. Try widening filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div style={{ padding: 'var(--sp-3)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <button
              onClick={() => setPage(p => p + 1)}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                color: 'var(--text-2)',
                fontFamily: 'var(--sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'border-color .15s, color .15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--blue-500)'; e.currentTarget.style.color = 'var(--blue-700)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
            >
              Show {Math.min(PAGE_SIZE, filtered.length - visible.length).toLocaleString()} more
            </button>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <FirmDetailDrawer row={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function FilterSelect({ value, onChange, label, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      style={{
        padding: '8px 12px',
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        color: 'var(--text-1)',
        fontFamily: 'var(--sans)',
        fontSize: 'var(--text-sm)',
        cursor: 'pointer',
        outline: 'none',
        transition: 'border-color .15s',
      }}
    >
      {children}
    </select>
  )
}

function FirmDetailDrawer({ row, onClose }) {
  return (
    <AnimatePresence>
      {row && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(4px)',
              zIndex: 80,
            }}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            style={{
              position: 'fixed',
              top: 0, right: 0, bottom: 0,
              width: 'min(92vw, 520px)',
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
              zIndex: 90,
              overflowY: 'auto',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <FirmDetailBody row={row} onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function FirmDetailBody({ row, onClose }) {
  if (!row) return null
  const verdict = OUTCOME_LABEL[row.o]
  const predBig = row.p <= -0.30
  const actualBig = row.a <= -0.30
  return (
    <div style={{ padding: 'var(--sp-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-4)' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 'var(--sp-1)' }}>
            {row.s} · fyear {row.y}
          </div>
          <h2 style={{
            fontFamily: 'var(--display)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            color: 'var(--text-1)',
            letterSpacing: 'var(--ls-tight)',
            lineHeight: 'var(--lh-snug)',
          }}>
            {row.n}
          </h2>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 'var(--sp-1)' }}>
            gvkey {row.g} · anchored {row.d}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close detail"
          style={{
            width: 32, height: 32, borderRadius: 'var(--r-sm)',
            background: 'transparent', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-3)',
            transition: 'color .15s, border-color .15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Predicted vs Realized */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
        <div className="card card-p" style={{ borderTop: `3px solid ${ddColor(row.p)}` }}>
          <div className="section-label" style={{ marginBottom: 'var(--sp-1)' }}>Predicted</div>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 'var(--text-3xl)',
            fontWeight: 700,
            color: ddColor(row.p),
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
          }}>
            {pctFmt(row.p)}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 'var(--sp-1)' }}>
            {predBig ? 'Big drop forecast (>30%)' : 'No big drop forecast'}
          </div>
        </div>
        <div className="card card-p" style={{ borderTop: `3px solid ${ddColor(row.a)}` }}>
          <div className="section-label" style={{ marginBottom: 'var(--sp-1)' }}>Realized</div>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 'var(--text-3xl)',
            fontWeight: 700,
            color: ddColor(row.a),
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
          }}>
            {pctFmt(row.a)}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 'var(--sp-1)' }}>
            {actualBig ? 'Big drop happened' : 'Held up, no big drop'}
          </div>
        </div>
      </div>

      {/* Outcome chip */}
      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="section-label" style={{ marginBottom: 'var(--sp-2)' }}>Outcome</div>
        <div style={{
          display: 'inline-block',
          padding: 'var(--sp-2) var(--sp-3)',
          background: verdict.bg,
          color: verdict.color,
          fontFamily: 'var(--mono)',
          fontSize: 'var(--text-sm)',
          fontWeight: 700,
          borderRadius: 'var(--r-md)',
          border: `1px solid ${verdict.color}`,
        }}>
          {verdict.label.toUpperCase()}
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginTop: 'var(--sp-2)', lineHeight: 'var(--lh-relaxed)' }}>
          {row.o === 'hit'         && `Model flagged risk and the stock fell more than 30% over the following 12 months. Error: ${pctFmt(row.a - row.p)} from the predicted drawdown.`}
          {row.o === 'safe'        && `Model rated this firm as low risk and the stock did not fall more than 30%. Error: ${pctFmt(row.a - row.p)} from the predicted drawdown.`}
          {row.o === 'miss'        && `Model under-predicted the risk: rated it safe, but the stock fell more than 30%. Error: ${pctFmt(row.a - row.p)} from the predicted drawdown.`}
          {row.o === 'false_alarm' && `Model flagged risk that did not materialize: predicted a big drop, but the stock held up. Error: ${pctFmt(row.a - row.p)} from the predicted drawdown.`}
        </p>
      </div>

      {/* Drawdown visual */}
      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="section-label" style={{ marginBottom: 'var(--sp-2)' }}>Drawdown depth</div>
        <DrawdownBar value={row.p} label="Predicted" />
        <DrawdownBar value={row.a} label="Realized" />
        <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', marginTop: 'var(--sp-1)', fontFamily: 'var(--mono)' }}>
          Scale: 0% to -100%. Vertical line at -30% binary threshold.
        </div>
      </div>

      {/* Methodology link */}
      <div className="info-box" style={{ fontSize: 'var(--text-xs)' }}>
        <strong style={{ color: 'var(--blue-900)' }}>How this prediction was made.</strong>{' '}
        The Financial LSTM ensemble (3 seeds) read five years of accounting ratios plus seven price-derived features for {row.n} as of {row.d}, then produced a single forward 12-month max drawdown forecast. Read the architecture in <a href="#models" style={{ color: 'var(--blue-500)', textDecoration: 'underline' }}>Models &amp; Process</a> or see the headline metrics in <a href="#findings" style={{ color: 'var(--blue-500)', textDecoration: 'underline' }}>Findings</a>.
      </div>
    </div>
  )
}

function DrawdownBar({ value, label }) {
  const pct = Math.min(100, Math.abs(value) * 100)
  return (
    <div style={{ marginBottom: 'var(--sp-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 'var(--text-xs)' }}>
        <span style={{ color: 'var(--text-3)' }}>{label}</span>
        <span className="num" style={{ fontWeight: 600, color: ddColor(value) }}>{pctFmt(value)}</span>
      </div>
      <div style={{ position: 'relative', height: 8, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: ddColor(value),
            borderRadius: 999,
          }}
        />
        {/* -30% reference */}
        <div style={{
          position: 'absolute', top: -2, bottom: -2,
          left: '30%',
          width: 1,
          background: 'var(--text-4)',
          opacity: 0.5,
        }} />
      </div>
    </div>
  )
}
