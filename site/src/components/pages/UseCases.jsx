import { motion } from 'framer-motion'

const UCS = [
  {
    logo: 'SG', name: 'SOLDMAN GACHS', type: 'Investment Banking & Credit',
    bg: '#0F1628', border: '#C6A962', logoStyle: { background: 'linear-gradient(135deg,#C6A962,#e8c97a)', color: '#071120' },
    nameColor: '#C6A962',
    rows: [
      { ticker: 'ACME',  pct: 78, color: 'var(--red)',   val: '−78%', badge: 'REVIEW', bdg: 'badge-red' },
      { ticker: 'GLOBX', pct: 43, color: 'var(--amber)', val: '−43%', badge: 'WATCH',  bdg: 'badge-amber' },
      { ticker: 'INITC', pct: 19, color: 'var(--green)', val: '−19%', badge: 'STABLE', bdg: 'badge-green' },
      { ticker: 'UMBRL', pct: 91, color: 'var(--red)',   val: '−91%', badge: 'REVIEW', bdg: 'badge-red' },
    ],
    desc: 'Banks incorporate the drawdown signal into loan covenant triggers. A rising predicted drawdown prompts watchlist escalation before financial statements deteriorate.',
    quote: '"Flag any borrower whose signal worsens >15pp quarter-over-quarter for immediate credit review."',
  },
  {
    logo: 'ZC', name: 'Z COMBINATOR', type: 'W25 Batch · Portfolio Screening',
    bg: '#1A0E00', border: '#FF6B00', logoStyle: { background: '#FF6B00', color: '#fff' },
    nameColor: '#FF8C33',
    rows: [
      { ticker: 'AIRBZ', pct: 18, color: 'var(--green)', val: '−18%', badge: '✓ GO',   bdg: 'badge-green' },
      { ticker: 'STRPX', pct: 22, color: 'var(--green)', val: '−22%', badge: '✓ GO',   bdg: 'badge-green' },
      { ticker: 'ELCTR', pct: 67, color: 'var(--red)',   val: '−67%', badge: '⚠ FLAG', bdg: 'badge-red' },
      { ticker: 'SAASZ', pct: 15, color: 'var(--green)', val: '−15%', badge: '✓ GO',   bdg: 'badge-green' },
    ],
    desc: 'VCs screen public-company comps to gauge market distress risk before committing follow-on capital. High predicted drawdown at Series B/C is a category-level warning flag.',
    quote: '"Screen comps in the bottom-two drawdown deciles before committing to the next tranche."',
  },
  {
    logo: '🏰', name: 'CITIDAL SECURITIES', type: 'Quantitative Strategies',
    bg: '#0A0A0A', border: '#FFD700', logoStyle: { background: 'linear-gradient(135deg,#FFD700,#e6be00)', fontSize: '1rem' },
    nameColor: '#FFD700',
    rows: [
      { ticker: 'BBBY', pct: 82, color: 'var(--red)',   val: '−82%', badge: 'SHORT', bdg: 'badge-red' },
      { ticker: 'PTON', pct: 78, color: 'var(--red)',   val: '−78%', badge: 'SHORT', bdg: 'badge-red' },
      { ticker: 'MSFT', pct: 21, color: 'var(--green)', val: '−21%', badge: 'LONG',  bdg: 'badge-green' },
      { ticker: 'JNJ',  pct: 16, color: 'var(--green)', val: '−16%', badge: 'LONG',  bdg: 'badge-green' },
    ],
    desc: 'Rank the universe by drawdown signal quarterly. Short the worst-predicted decile, long the best. 96%+ top-decile precision makes short-side selection highly accurate.',
    quote: '"Rotate shorts quarterly using worst-predicted decile; rebalance at 10-K anchor dates."',
  },
  {
    logo: '◆', name: 'BLARKROCK', type: 'Aladdin Risk Platform',
    bg: '#001A14', border: '#2DD4BF', logoStyle: { background: 'linear-gradient(135deg,#2DD4BF,#14b8a6)', fontSize: '1rem' },
    nameColor: '#2DD4BF',
    rows: [
      { ticker: 'AAL', pct: 88, color: '#2DD4BF', val: '14.2%', badge: 'PUTS', bdg: 'badge-blue' },
      { ticker: 'CCL', pct: 72, color: '#2DD4BF', val: '11.8%', badge: 'PUTS', bdg: 'badge-blue' },
      { ticker: 'MSFT',pct: 25, color: '#2DD4BF', val: '4.1%',  badge: 'PUTS', bdg: 'badge-blue' },
      { ticker: 'JNJ', pct: 14, color: '#2DD4BF', val: '2.3%',  badge: 'PUTS', bdg: 'badge-blue' },
    ],
    desc: 'Asset managers dynamically size hedges — put options or VIX exposure — proportional to each holding\'s drawdown score. Rebalanced at earnings season.',
    quote: '"Allocate put-option budget proportionally to each holding\'s drawdown signal."',
  },
]

export default function UseCases() {
  return (
    <div className="page-wrap">
      <div className="eyebrow">05 — Use Cases / Applications</div>
      <h1 className="page-title">Who uses<br />a drawdown signal?</h1>
      <p className="page-sub">A predicted drawdown score is useful in four very different contexts — from bank lending to hedge fund short books.</p>

      <div className="uc-grid">
        {UCS.map(({ logo, name, type, bg, border, logoStyle, nameColor, rows, desc, quote }) => (
          <motion.div key={name} className="uc-card"
            whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,.1)' }}
            transition={{ duration: .18 }}
          >
            <div className="uc-header" style={{ background: bg, borderBottom: `1px solid ${border}25` }}>
              <div className="uc-logo" style={logoStyle}>{logo}</div>
              <div>
                <div className="uc-name" style={{ color: nameColor }}>{name}</div>
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
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '.72rem', width: 36, textAlign: 'right', color, flexShrink: 0 }}>{val}</span>
                  <span className={`badge ${bdg}`}>{badge}</span>
                </div>
              ))}
            </div>
            <div className="uc-desc">{desc}</div>
            <div className="uc-quote" style={{ borderLeftColor: border }}>{quote}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
