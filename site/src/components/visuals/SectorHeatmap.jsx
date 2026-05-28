import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import predictions from '../../data/predictions.json'

/* Per-sector hit-rate heatmap. Rows = sectors, columns = test years.
   Each cell shows the fraction of model-flagged top picks that actually
   crashed (>30% drawdown) within that sector and year.
*/

const SECTORS = [
  'Information Technology', 'Health Care', 'Financials', 'Consumer Discretionary',
  'Industrials', 'Communication Services', 'Consumer Staples', 'Energy',
  'Real Estate', 'Materials', 'Utilities', 'Other',
]
const YEARS = [2020, 2021, 2022, 2023]
const TOP_K_FRAC = 0.10   // top 10% riskiest in each (sector, year) cell

function colorFor(rate) {
  if (rate == null) return 'var(--bg-2)'
  // Map rate [0,1] -> blend from amber/red to green
  if (rate >= 0.7)  return 'rgba(34,197,94,.90)'
  if (rate >= 0.55) return 'rgba(34,197,94,.65)'
  if (rate >= 0.40) return 'rgba(245,158,11,.55)'
  if (rate >= 0.25) return 'rgba(245,158,11,.75)'
  return 'rgba(239,68,68,.55)'
}

export default function SectorHeatmap() {
  const [hover, setHover] = useState(null)
  const cells = useMemo(() => {
    const out = {}
    for (const sector of SECTORS) {
      for (const year of YEARS) {
        const rows = predictions.filter(r => r.s === sector && r.y === year)
        if (rows.length === 0) {
          out[`${sector}|${year}`] = { rate: null, n: 0 }
          continue
        }
        const topN = Math.max(1, Math.floor(rows.length * TOP_K_FRAC))
        const top = [...rows].sort((a, b) => a.p - b.p).slice(0, topN)
        const hits = top.filter(r => r.a <= -0.30).length
        out[`${sector}|${year}`] = {
          rate: hits / top.length,
          n: top.length,
          total: rows.length,
          hits
        }
      }
    }
    return out
  }, [])

  return (
    <div className="card card-p" style={{ marginBottom: 'var(--sp-5)' }}>
      <div className="section-label" style={{ marginBottom: 'var(--sp-3)' }}>Sector hit rate by year, top 10% riskiest per cell</div>

      <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(4, 1fr)', gap: 4 }}>
        {/* Header row */}
        <div />
        {YEARS.map(y => (
          <div key={y} style={{
            textAlign: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--text-3)'
          }}>
            {y}
          </div>
        ))}

        {/* Rows */}
        {SECTORS.map((sector, si) => (
          <Row key={sector} sector={sector} si={si} cells={cells} onHover={setHover} hover={hover} />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)', flexWrap: 'wrap', fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
        <span style={{ fontFamily: 'var(--mono)' }}>Hit rate:</span>
        {[
          { v: '0-25%',  c: 'rgba(239,68,68,.55)' },
          { v: '25-40%', c: 'rgba(245,158,11,.75)' },
          { v: '40-55%', c: 'rgba(245,158,11,.55)' },
          { v: '55-70%', c: 'rgba(34,197,94,.65)' },
          { v: '70%+',   c: 'rgba(34,197,94,.90)' },
        ].map(({ v, c }) => (
          <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, background: c, borderRadius: 3 }} />
            <span style={{ fontFamily: 'var(--mono)' }}>{v}</span>
          </span>
        ))}
      </div>

      {hover && (
        <div style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--text-xs)', color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>
          {hover.sector} · {hover.year}: <strong>{hover.hits} / {hover.n}</strong> top picks crashed
          {hover.total != null && <> (out of {hover.total} firms in this cell)</>}
        </div>
      )}
    </div>
  )
}

function Row({ sector, si, cells, onHover, hover }) {
  return (
    <>
      <div style={{
        fontSize: 'var(--text-xs)',
        color: 'var(--text-2)',
        padding: '0 var(--sp-2)',
        display: 'flex', alignItems: 'center',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      }}
        title={sector}
      >
        {sector}
      </div>
      {YEARS.map((year, yi) => {
        const cell = cells[`${sector}|${year}`]
        const rate = cell.rate
        const isHovered = hover && hover.sector === sector && hover.year === year
        return (
          <motion.div
            key={year}
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.18, delay: (si * 4 + yi) * 0.012 }}
            onMouseEnter={() => onHover({ sector, year, ...cell })}
            onMouseLeave={() => onHover(null)}
            style={{
              background: colorFor(rate),
              border: `1px solid ${isHovered ? 'var(--text-1)' : 'transparent'}`,
              borderRadius: 4,
              minHeight: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--mono)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: rate != null ? '#fff' : 'var(--text-4)',
              cursor: 'default',
              transition: 'border-color .15s'
            }}
          >
            {rate != null ? `${(rate * 100).toFixed(0)}%` : '—'}
          </motion.div>
        )
      })}
    </>
  )
}
