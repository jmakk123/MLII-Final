import { motion } from 'framer-motion'

const UCS = [
  {
    logo: 'SG', name: 'Soldman Gachs', type: 'Investment Banking · Credit Risk',
    bg: '#0F1628', border: '#C6A962', logoStyle: { background: 'linear-gradient(135deg,#C6A962,#e8c97a)', color: '#071120' },
    nameColor: '#C6A962',
    rows: [
      { ticker: 'ACME',  pct: 78, color: 'var(--red)',   val: '-78%', badge: 'REVIEW', bdg: 'badge-red' },
      { ticker: 'GLOBX', pct: 43, color: 'var(--amber)', val: '-43%', badge: 'WATCH',  bdg: 'badge-amber' },
      { ticker: 'INITC', pct: 19, color: 'var(--green)', val: '-19%', badge: 'STABLE', bdg: 'badge-green' },
      { ticker: 'UMBRL', pct: 91, color: 'var(--red)',   val: '-91%', badge: 'REVIEW', bdg: 'badge-red' },
    ],
    desc: 'Investment banks already monitor loan books via quarterly statements and rating-agency feeds, both of which lag real distress by months. The drawdown signal moves at the speed of accounting filings (annually) and price action (daily), so a deteriorating borrower triggers a credit review weeks earlier than standard processes.',
    use: 'Wire the signal into the credit risk monitoring system. Any borrower whose predicted forward drawdown worsens by more than 15 pp quarter over quarter, or breaches -30% in absolute terms, is auto-escalated to the credit committee.',
    quote: '"Flag any borrower whose signal worsens by more than 15 pp QoQ for immediate review."'
  },
  {
    logo: 'ZC', name: 'Z Combinator', type: 'Venture Capital · Portfolio Screening',
    bg: '#1A0E00', border: '#FF6B00', logoStyle: { background: '#FF6B00', color: '#fff' },
    nameColor: '#FF8C33',
    rows: [
      { ticker: 'AIRBZ', pct: 18, color: 'var(--green)', val: '-18%', badge: '✓ GO',   bdg: 'badge-green' },
      { ticker: 'STRPX', pct: 22, color: 'var(--green)', val: '-22%', badge: '✓ GO',   bdg: 'badge-green' },
      { ticker: 'ELCTR', pct: 67, color: 'var(--red)',   val: '-67%', badge: '⚠ FLAG', bdg: 'badge-red' },
      { ticker: 'SAASZ', pct: 15, color: 'var(--green)', val: '-15%', badge: '✓ GO',   bdg: 'badge-green' },
    ],
    desc: 'Venture firms cannot run the model directly on private startups, since their financial filings are not public. They can run it on listed comparable companies, however, to gauge category-level risk before committing follow-on capital to a private bet in the same vertical.',
    use: 'For each portfolio company at Series B or later, identify 3 to 5 public comps and run them through the signal. If two or more comps land in the bottom two drawdown deciles, the follow-on round gets a sector-risk review before partner approval.',
    quote: '"Screen public comps in the bottom-two drawdown deciles before committing to the next tranche."'
  },
  {
    logo: '2Σ', name: 'Two Stigma', type: 'Quantitative Hedge Fund',
    bg: '#0A0A0A', border: '#FFD700', logoStyle: { background: 'linear-gradient(135deg,#FFD700,#e6be00)', color: '#0A0A0A', fontWeight: 700, fontSize: '1rem' },
    nameColor: '#FFD700',
    rows: [
      { ticker: 'BBBY', pct: 82, color: 'var(--red)',   val: '-82%', badge: 'SHORT', bdg: 'badge-red' },
      { ticker: 'PTON', pct: 78, color: 'var(--red)',   val: '-78%', badge: 'SHORT', bdg: 'badge-red' },
      { ticker: 'MSFT', pct: 21, color: 'var(--green)', val: '-21%', badge: 'LONG',  bdg: 'badge-green' },
      { ticker: 'JNJ',  pct: 16, color: 'var(--green)', val: '-16%', badge: 'LONG',  bdg: 'badge-green' },
    ],
    desc: 'Quantitative funds want signals that are both reliable enough to bet on and orthogonal to existing factors (vol, value, momentum). The within-year rank correlation of 0.67 is high enough to build a sector-neutral long-short book, and the lift over vol-only means the signal carries information beyond pure market risk.',
    use: 'Quarterly rebalance: rank the universe by predicted drawdown within each GICS sector, short the worst decile and long the best decile, sector-neutral. Anchor rebalances at 10-K filing dates so feature inputs are fresh.',
    quote: '"Rotate shorts quarterly using the worst-predicted decile; rebalance at 10-K anchor dates."'
  },
  {
    logo: '🎩', name: 'The Charles Schwabfather', type: 'Asset Manager · Risk Platform',
    bg: '#001A14', border: '#2DD4BF', logoStyle: { background: 'linear-gradient(135deg,#2DD4BF,#14b8a6)', color: '#001A14', fontSize: '1.1rem' },
    nameColor: '#2DD4BF',
    rows: [
      { ticker: 'AAL',  pct: 88, color: '#2DD4BF', val: '14.2%', badge: 'PUTS', bdg: 'badge-blue' },
      { ticker: 'CCL',  pct: 72, color: '#2DD4BF', val: '11.8%', badge: 'PUTS', bdg: 'badge-blue' },
      { ticker: 'MSFT', pct: 25, color: '#2DD4BF', val: '4.1%',  badge: 'PUTS', bdg: 'badge-blue' },
      { ticker: 'JNJ',  pct: 14, color: '#2DD4BF', val: '2.3%',  badge: 'PUTS', bdg: 'badge-blue' },
    ],
    desc: 'Long-only asset managers do not short, but they do hedge concentrated positions with put options or VIX exposure. The drawdown score is a natural input for sizing those hedges: a stock with a high predicted drawdown deserves more protection than one with a low score.',
    use: 'Allocate the hedge budget for each holding proportional to its predicted forward drawdown. A position with a -50% score gets roughly four times the put exposure of a position with a -12% score. Reweight at every earnings season.',
    quote: '"Allocate put-option budget proportional to each holding\'s drawdown signal."'
  },
]

export default function UseCases() {
  return (
    <div className="page-wrap">
      <div className="eyebrow">Project · Use Cases</div>
      <h1 className="page-title">Use Cases and Deployment</h1>
      <p className="page-sub">Four contexts where a calibrated forward-drawdown score plugs into existing risk processes: banks, venture, quant, and asset management.</p>

      <div className="uc-grid">
        {UCS.map(({ logo, name, type, bg, border, logoStyle, nameColor, rows, desc, use, quote }) => (
          <motion.div key={name} className="uc-card"
            whileHover={{ borderColor: 'var(--text-3)' }}
            transition={{ duration: .18 }}
          >
            <div className="uc-header" style={{ background: bg, borderBottom: `1px solid ${border}25` }}>
              <div className="uc-logo" style={logoStyle}>{logo}</div>
              <div style={{ minWidth: 0 }}>
                <div className="uc-name" style={{ color: nameColor }}>
                  {name}
                </div>
                <div className="uc-type">{type}</div>
              </div>
            </div>
            <div className="uc-screen">
              {rows.map(({ ticker, pct, color, val, badge, bdg }) => (
                <div key={ticker} className="uc-row">
                  <span className="uc-ticker">{ticker}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)', width: 44, textAlign: 'right', color, flexShrink: 0 }}>{val}</span>
                  <span className={`badge ${bdg}`}>{badge}</span>
                </div>
              ))}
            </div>
            <div className="uc-desc">{desc}</div>
            <div style={{ padding: '0 var(--sp-5) var(--sp-2)' }}>
              <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 600, color: 'var(--blue-500)', marginBottom: 'var(--sp-1)' }}>
                How they would use the signal
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', lineHeight: 'var(--lh-relaxed)' }}>{use}</div>
            </div>
            <div className="uc-quote" style={{ borderLeftColor: border }}>{quote}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
