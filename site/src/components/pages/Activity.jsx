import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

// All rounds are TEST-FOLD anchors (fyear 2020 to 2023), so the model has
// never seen the realized outcome. modelP is derived from the actual
// per-anchor predicted drawdown in preds_lstm_fusion_ensemble.npy.
const ROUNDS = [
  {
    hidden:  'Specialty Home Goods Retailer · Mall Anchor',
    company: 'Bed Bath & Beyond (BBBY)',
    sector:  'Consumer Discretionary',
    fyear:   2021,
    anchor:  '2022-03-31',
    vol:     '81%',
    ret:     '-42%',
    fin: { 'Debt/Assets': '94%', 'Op. Margin': '-7.3%', 'Cash/Assets': '6.2%', 'EBIT/Assets': '-5.1%' },
    modelP:  0.70,
    predicted_dd: -0.41,
    actual_dd:    -0.60,
    isBig:   true,
    story:   'Model flagged severe distress. Near-terminal leverage, negative margins, meme-stock volatility. Filed Chapter 11 in April 2023, three weeks after our 12-month window closed.',
  },
  {
    hidden:  'Global Cruise Line Operator · 100+ Ships',
    company: 'Carnival (CCL)',
    sector:  'Consumer Discretionary',
    fyear:   2020,
    anchor:  '2021-02-28',
    vol:     '62%',
    ret:     '+18%',
    fin: { 'Debt/Assets': '78%', 'Op. Margin': '-122%', 'Cash/Assets': '31%', 'EBIT/Assets': '-29%' },
    modelP:  0.80,
    predicted_dd: -0.48,
    actual_dd:    -0.47,
    isBig:   true,
    story:   'Near-perfect call. Cruises still mostly suspended, post-vaccine optimism had a long way to fall back. Model predicted -48%, actual was -47%.',
  },
  {
    hidden:  'Diversified Healthcare · Pharma, Devices, Consumer',
    company: 'Johnson & Johnson (JNJ)',
    sector:  'Healthcare',
    fyear:   2020,
    anchor:  '2021-03-31',
    vol:     '13%',
    ret:     '+15%',
    fin: { 'Debt/Assets': '58%', 'Op. Margin': '19.8%', 'Cash/Assets': '8.4%', 'EBIT/Assets': '16.1%' },
    modelP:  0.20,
    predicted_dd: -0.18,
    actual_dd:    -0.13,
    isBig:   false,
    story:   'Classic defensive healthcare. Lowest volatility in the test universe, pristine margins. Model rated SAFE and was right.',
  },
  {
    hidden:  'Cloud Computing & Productivity Software · Enterprise Leader',
    company: 'Microsoft (MSFT)',
    sector:  'Information Technology',
    fyear:   2021,
    anchor:  '2021-09-28',
    vol:     '18%',
    ret:     '+55%',
    fin: { 'Debt/Assets': '52%', 'Op. Margin': '42%', 'Cash/Assets': '13.6%', 'EBIT/Assets': '24.8%' },
    modelP:  0.25,
    predicted_dd: -0.19,
    actual_dd:    -0.31,
    isBig:   true,
    story:   'Model rated SAFE. Actual dipped just past -30% in the 2022 tech sell-off. Directionally right about resilience, missed the depth by 12 pp.',
  },
  {
    hidden:  'Streaming Entertainment Platform · 200M+ Subscribers',
    company: 'Netflix (NFLX)',
    sector:  'Communication Services',
    fyear:   2021,
    anchor:  '2022-03-31',
    vol:     '31%',
    ret:     '+11%',
    fin: { 'Debt/Assets': '68%', 'Op. Margin': '20.6%', 'Cash/Assets': '11.2%', 'EBIT/Assets': '13.4%' },
    modelP:  0.32,
    predicted_dd: -0.25,
    actual_dd:    -0.58,
    isBig:   true,
    isMiss:  true,
    story:   'Model miss. Predicted -25% (moderate), actual was -58%. The April 2022 subscriber miss was outside what five years of accounting data could see.',
  },
  {
    hidden:  'AI / Semiconductor Designer · Data Center Build-Out',
    company: 'NVIDIA (NVDA)',
    sector:  'Information Technology',
    fyear:   2022,
    anchor:  '2023-04-30',
    vol:     '52%',
    ret:     '+125%',
    fin: { 'Debt/Assets': '42%', 'Op. Margin': '15.6%', 'Cash/Assets': '38%', 'EBIT/Assets': '9.8%' },
    modelP:  0.55,
    predicted_dd: -0.37,
    actual_dd:    -0.20,
    isBig:   false,
    isFalseAlarm: true,
    story:   'False alarm. Model saw high vol + recent volatility and flagged risk. The AI boom pulled NVDA up by triple digits instead. Accounting data cannot predict a regime shift.',
  },
]

const CHIPS = [250, 500, 1000, 2000, 5000]

function fmt$(n) { return '$' + n.toLocaleString() }
function fmtPct(p) { return (p >= 0 ? '+' : '') + (p * 100).toFixed(1) + '%' }
function odds(p) { return Math.round(p * 100) + '¢' }

export default function Activity() {
  const [round, setRound] = useState(0)
  const [bankroll, setBankroll] = useState(10000)
  const [bet, setBet] = useState(250)
  const [pick, setPick] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)
  const [wins, setWins] = useState(0)
  const [losses, setLosses] = useState(0)

  const r = ROUNDS[round]

  const restart = () => {
    setRound(0); setBankroll(10000); setBet(250); setPick(null); setRevealed(false); setDone(false); setWins(0); setLosses(0)
  }

  const resolve = () => {
    if (!pick) return
    setRevealed(true)
    const correct = (pick === 'yes') === r.isBig
    const payout = pick === 'yes' ? r.modelP : (1 - r.modelP)
    const profit = correct ? Math.round(bet * (1 / payout - 1)) : -bet
    setBankroll(b => b + profit)
    if (correct) setWins(w => w + 1); else setLosses(l => l + 1)
  }

  const next = () => {
    if (round + 1 >= ROUNDS.length) { setDone(true); return }
    setRound(r => r + 1); setPick(null); setRevealed(false)
  }

  const correct = revealed && (pick === 'yes') === r.isBig
  const profit = revealed ? (correct ? Math.round(bet * (1 / (pick === 'yes' ? r.modelP : 1 - r.modelP) - 1)) : -bet) : 0

  if (done) {
    const net = bankroll - 10000
    return (
      <div className="game-wrap">
        <div className="eyebrow">07 / Activity</div>
        <div className="gameover">
          <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>{net > 0 ? '🎉' : net < 0 ? '📉' : '🤝'}</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--slate-900)', letterSpacing: '-.03em', marginBottom: '.5rem' }}>
            {net > 0 ? 'Nice work.' : net < 0 ? 'Market wins.' : 'Broke even.'}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '2.5rem', fontWeight: 700, margin: '1rem 0', color: net > 0 ? 'var(--green)' : net < 0 ? 'var(--red)' : 'var(--amber)' }}>
            {fmt$(bankroll)}
          </div>
          <div style={{ fontSize: '.82rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>
            {wins}W / {losses}L · Net {net >= 0 ? '+' : ''}{fmt$(net)} from $10,000
          </div>
          <button className="reveal-btn" onClick={restart}>New Session</button>
        </div>
      </div>
    )
  }

  return (
    <div className="game-wrap">
      <div className="eyebrow">07 / Activity</div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--blue-950)', letterSpacing: '-.03em', marginBottom: '.35rem' }}>DrawdownMarket</h1>
      <p style={{ fontSize: '.85rem', color: 'var(--slate-500)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Six real companies from our test set. Bet on whether each will fall more than 30% over the next 12 months. Odds come from the Financial LSTM&apos;s actual predicted drawdown for that firm-year.
      </p>

      <div className="game-topbar">
        <div>
          <div style={{ fontSize: '.62rem', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.1rem' }}>Round</div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '.95rem', color: 'var(--slate-900)' }}>{round + 1} of {ROUNDS.length}</div>
        </div>
        <div style={{ display: 'flex', gap: '.35rem' }}>
          {ROUNDS.map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < round ? 'var(--blue-500)' : i === round ? 'var(--amber)' : 'var(--slate-200)' }} />
          ))}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '.62rem', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.1rem' }}>Bankroll</div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '.95rem', color: bankroll >= 10000 ? 'var(--green)' : 'var(--red)' }}>{fmt$(bankroll)}</div>
        </div>
      </div>

      <motion.div key={round}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .18 }}
        className="market-card"
      >
        <div className="market-head">
          <div style={{ fontSize: '.62rem', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{r.sector} · {r.hidden}</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-900)', marginTop: '.2rem', letterSpacing: '-.02em' }}>
            {r.company}
          </div>
          <div style={{ fontSize: '.72rem', color: 'var(--slate-500)', fontFamily: 'var(--mono)', marginTop: '.15rem' }}>
            fyear {r.fyear} · anchor {r.anchor} · forward 12 months from anchor
          </div>
        </div>

        <div className="fin-strip">
          <div className="fin-item"><div className="fin-key">Vol (1y)</div><div className="fin-val">{r.vol}</div></div>
          <div className="fin-item"><div className="fin-key">Return (1y)</div><div className="fin-val">{r.ret}</div></div>
          {Object.entries(r.fin).map(([k, v]) => (
            <div className="fin-item" key={k}><div className="fin-key">{k}</div><div className="fin-val">{v}</div></div>
          ))}
        </div>

        <div className="outcomes">
          <button className={`outcome-tile tile-no ${pick === 'no' ? 'sel' : ''}`} onClick={() => !revealed && setPick('no')} disabled={revealed}>
            <div className="tile-check"><Check size={14} color="var(--green)" /></div>
            <div className="tile-label">No big drop</div>
            <div className="tile-odds">{odds(1 - r.modelP)}</div>
            <div className="tile-sub">drawdown &gt; -30%</div>
          </button>
          <button className={`outcome-tile tile-yes ${pick === 'yes' ? 'sel' : ''}`} onClick={() => !revealed && setPick('yes')} disabled={revealed}>
            <div className="tile-check"><Check size={14} color="var(--red)" /></div>
            <div className="tile-label">Big drop</div>
            <div className="tile-odds">{odds(r.modelP)}</div>
            <div className="tile-sub">drawdown &le; -30%</div>
          </button>
        </div>

        <div className="bet-area">
          <div style={{ fontSize: '.7rem', color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>Bet size</div>
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.75rem' }}>
            {CHIPS.map(amt => (
              <button key={amt} className={`chip ${bet === amt ? 'active' : ''}`} onClick={() => !revealed && setBet(amt)} disabled={revealed || amt > bankroll}>
                ${amt.toLocaleString()}
              </button>
            ))}
          </div>
          {!revealed ? (
            <button className="reveal-btn" disabled={!pick} onClick={resolve} style={{ width: '100%' }}>
              {pick ? `Lock in ${fmt$(bet)} on ${pick.toUpperCase()}` : 'Pick an outcome'}
            </button>
          ) : null}
        </div>
      </motion.div>

      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`result-card ${correct ? 'win' : 'loss'}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '.5rem' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '.72rem', color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Outcome
              </div>
              <div style={{ fontSize: '.95rem', fontWeight: 700, color: correct ? 'var(--green)' : 'var(--red)' }}>
                {correct ? `+${fmt$(profit)}` : fmt$(profit)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '.5rem' }}>
              <div>
                <div style={{ fontSize: '.65rem', color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Model predicted</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-700)' }}>
                  {fmtPct(r.predicted_dd)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '.65rem', color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Actual realized</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '1.15rem', fontWeight: 700, color: r.isBig ? 'var(--red)' : 'var(--green)' }}>
                  {fmtPct(r.actual_dd)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '.65rem', color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Verdict</div>
                <div style={{ fontSize: '.8rem', fontWeight: 600, color: r.isMiss ? 'var(--red)' : r.isFalseAlarm ? 'var(--amber)' : 'var(--green)' }}>
                  {r.isMiss ? 'Model missed' : r.isFalseAlarm ? 'False alarm' : 'Model hit'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '.82rem', color: 'var(--slate-600)', lineHeight: 1.6, marginBottom: '.85rem' }}>{r.story}</div>
            <button className="next-btn" onClick={next}>
              {round + 1 >= ROUNDS.length ? 'See final tally →' : `Next round →`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
