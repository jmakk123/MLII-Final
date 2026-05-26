import { motion } from 'framer-motion'

/* Vertical funnel showing how the raw firm-year universe is filtered down
   to the evaluable test set. Each gate is a horizontal bar whose width is
   proportional to row count. Bars taper as filtering progresses.
*/

const STAGES = [
  { label: 'Compustat Annual firm-years',         n: 132000, color: 'var(--blue-500)', note: 'Raw universe, 1999 to 2025' },
  { label: 'Has 5 prior fyears of accounting',    n: 76990,  color: 'var(--blue-500)', note: 'Anchor panel, drop-not-impute on partial windows' },
  { label: 'Has full forward 12-month window',    n: 67000,  color: 'var(--amber)',    note: 'Drops firms delisted within the year (bankruptcies, mergers, foreign acquisitions)' },
  { label: 'In test fold (fyear 2020 to 2023)',   n: 15311,  color: 'var(--green)',    note: 'Time-blocked test fold, used for every headline metric' },
]

export default function SurvivorshipFunnel() {
  const max = STAGES[0].n

  return (
    <div className="card card-p" style={{ marginBottom: 'var(--sp-5)' }}>
      <div className="section-label" style={{ marginBottom: 'var(--sp-3)' }}>Survivorship Funnel · From Raw Filings to Test Set</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {STAGES.map((s, i) => {
          const wPct = (s.n / max) * 100
          const indent = (100 - wPct) / 2
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scaleX: 0.6 }}
              whileInView={{ opacity: 1, scaleX: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: `${wPct}%`,
                marginLeft: `${indent}%`,
                background: s.color,
                color: 'var(--surface)',
                padding: 'var(--sp-3) var(--sp-4)',
                borderRadius: 'var(--r-md)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--sp-3)',
                minHeight: 56,
                opacity: 0.9,
                transformOrigin: 'center',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#fff' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'rgba(255,255,255,.85)', marginTop: 2 }}>
                  {s.note}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {s.n.toLocaleString()}
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="info-box" style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--text-xs)' }}>
        <strong style={{ color: 'var(--blue-900)' }}>The honest caveat.</strong>{' '}
        Firms that fully delist within the year (bankruptcies, liquidations) drop out before we can compute a 12-month drawdown. The model is evaluated on <em>drawdown among survivors</em>. We disclose this rather than hide it.
      </div>
    </div>
  )
}
