import { motion } from 'framer-motion'

/* Survivorship waterfall.

   Each stage is a full-width row. The label sits ABOVE the row, the
   count sits to the RIGHT of the row, and a horizontal bar fills the
   row proportional to the stage size. Between stages, a small connector
   shows the absolute drop and the percent retained.

   Putting labels outside the bar means nothing gets cramped when a
   stage shrinks to 12% of its previous size.
*/

const STAGES = [
  { label: 'Compustat firm-years',                  caption: 'Raw universe pulled from WRDS Compustat Annual, 1999 to 2025.', n: 132000, color: 'var(--blue-500)' },
  { label: 'Anchor panel',                          caption: 'Filtered to firm-years with five prior fyears of accounting history. Drop-not-impute on partial windows.', n: 76990,  color: 'var(--blue-500)' },
  { label: 'Has full forward 12-month window',      caption: 'Drops firms delisted within the year (bankruptcies, liquidations, foreign acquisitions).', n: 67000,  color: 'var(--amber)'    },
  { label: 'Test fold, fyear 2020 to 2023',         caption: 'Time-blocked test slice used for every headline metric on this page.', n: 15311,  color: 'var(--green)'    },
]

export default function SurvivorshipFunnel() {
  const max = STAGES[0].n

  return (
    <div className="card card-p" style={{ marginBottom: 'var(--sp-5)' }}>
      <div className="section-label" style={{ marginBottom: 'var(--sp-3)' }}>Survivorship funnel, raw universe to test fold</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {STAGES.map((s, i) => {
          const wPct = (s.n / max) * 100
          const prev = i > 0 ? STAGES[i - 1] : null
          const dropped = prev ? prev.n - s.n : 0
          const retained = prev ? (s.n / prev.n) * 100 : 100

          return (
            <div key={s.label}>
              {/* Connector between stages */}
              {prev && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--sp-2)',
                    padding: '4px 0 8px 0',
                    fontFamily: 'var(--mono)',
                    fontSize: 'var(--text-2xs)',
                    color: 'var(--text-4)'
                  }}
                >
                  <span style={{ width: 1, height: 14, background: 'var(--border-2)', marginLeft: 8 }} />
                  <span>
                    Dropped <strong style={{ color: 'var(--red)' }}>{dropped.toLocaleString()}</strong>
                    {'  ·  '}
                    <strong style={{ color: 'var(--text-2)' }}>{retained.toFixed(1)}%</strong> retained
                  </span>
                </div>
              )}

              {/* Stage row */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 160px',
                  gap: 'var(--sp-4)',
                  alignItems: 'center'
                }}
              >
                {/* Left: label + bar */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    marginBottom: 4,
                    letterSpacing: 'var(--ls-tight)'
                  }}>
                    {s.label}
                  </div>

                  {/* Bar */}
                  <div style={{
                    position: 'relative',
                    height: 26,
                    background: 'var(--bg-2)',
                    borderRadius: 'var(--r-sm)',
                    overflow: 'hidden'
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${wPct}%` }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        height: '100%',
                        background: `linear-gradient(90deg, ${s.color}, color-mix(in srgb, ${s.color} 70%, var(--text-1) 30%))`,
                        borderRadius: 'var(--r-sm)'
                      }}
                    />
                  </div>

                  <div style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-3)',
                    lineHeight: 'var(--lh-relaxed)',
                    marginTop: 6
                  }}>
                    {s.caption}
                  </div>
                </div>

                {/* Right: count */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 700,
                    color: 'var(--text-1)',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                    letterSpacing: 'var(--ls-tight)'
                  }}>
                    {s.n.toLocaleString()}
                  </div>
                  <div style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 'var(--text-2xs)',
                    color: 'var(--text-4)',
                    marginTop: 4
                  }}>
                    {((s.n / max) * 100).toFixed(1)}% of raw
                  </div>
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>

      <div className="info-box" style={{ marginTop: 'var(--sp-4)', fontSize: 'var(--text-xs)' }}>
        <strong style={{ color: 'var(--blue-900)' }}>The honest caveat.</strong>{' '}
        Firms that fully delist within the year (bankruptcies, liquidations) drop out before we can compute a 12-month drawdown. The model is evaluated on <em>drawdown among survivors</em>. We disclose this rather than hide it.
      </div>
    </div>
  )
}
