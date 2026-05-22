import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ROUNDS = [
  { hidden:"Legacy U.S. Airline — Major Domestic & International Routes", company:"American Airlines (AAL)", sector:"Airlines", fyear:2019, vol:"38%", ret:"+12%", fin:{"Debt/Assets":"87%","Op. Margin":"8.2%","Cash/Assets":"4.1%","EBIT/Assets":"6.1%"}, modelP:0.78, actual:-0.718, isBig:true, story:"Massive leverage + total travel collapse. COVID erased nearly all 2019 gains within weeks." },
  { hidden:"Global Consumer Staples Giant — 180+ Countries, Household Brands", company:"Procter & Gamble (PG)", sector:"Consumer Staples", fyear:2019, vol:"14%", ret:"+28%", fin:{"Debt/Assets":"62%","Op. Margin":"18.4%","Cash/Assets":"3.2%","EBIT/Assets":"14.1%"}, modelP:0.23, actual:-0.196, isBig:false, story:"Defensive staples with pristine margins. COVID demand for cleaning products actually helped." },
  { hidden:"Global Cruise Line Operator — 100+ Ships, Worldwide Fleet", company:"Carnival Corporation (CCL)", sector:"Consumer Disc.", fyear:2019, vol:"22%", ret:"−8%", fin:{"Debt/Assets":"38%","Op. Margin":"15.7%","Cash/Assets":"3.8%","EBIT/Assets":"11.2%"}, modelP:0.68, actual:-0.841, isBig:true, story:"Revenue went to zero overnight when ports closed. Model caught leverage + momentum deterioration." },
  { hidden:"Home Fitness Platform — Connected Hardware + Subscription Content", company:"Peloton Interactive (PTON)", sector:"Consumer Disc.", fyear:2021, vol:"68%", ret:"−26%", fin:{"Debt/Assets":"71%","Op. Margin":"−28%","Cash/Assets":"22%","EBIT/Assets":"−19%"}, modelP:0.82, actual:-0.868, isBig:true, story:"Pandemic darling that ran out of story. By 2022 the growth thesis collapsed entirely." },
  { hidden:"Cloud Computing & Productivity Software — Global Enterprise Leader", company:"Microsoft (MSFT)", sector:"Technology", fyear:2019, vol:"18%", ret:"+55%", fin:{"Debt/Assets":"52%","Op. Margin":"34.1%","Cash/Assets":"13.6%","EBIT/Assets":"24.8%"}, modelP:0.21, actual:-0.241, isBig:false, story:"Best-in-class margins, pristine balance sheet. Brief March 2020 dip then straight up." },
  { hidden:"Specialty Home Goods Retailer — U.S. Mall Anchor", company:"Bed Bath & Beyond (BBBY)", sector:"Consumer Disc.", fyear:2021, vol:"81%", ret:"−42%", fin:{"Debt/Assets":"94%","Op. Margin":"−7.3%","Cash/Assets":"6.2%","EBIT/Assets":"−5.1%"}, modelP:0.91, actual:-0.916, isBig:true, story:"Near-terminal leverage, negative margins, meme-stock vol. Maximum alarm on every metric." },
  { hidden:"Streaming Entertainment Platform — 200M+ Global Subscribers", company:"Netflix (NFLX)", sector:"Comm. Services", fyear:2021, vol:"31%", ret:"+11%", fin:{"Debt/Assets":"68%","Op. Margin":"20.6%","Cash/Assets":"11.2%","EBIT/Assets":"13.4%"}, modelP:0.52, actual:-0.765, isBig:true, story:"Model was moderate at 52%. Actual crash was 77%. The Q1 2022 subscriber miss blindsided everyone." },
  { hidden:"Diversified Healthcare — Pharma, Medical Devices & Consumer", company:"Johnson & Johnson (JNJ)", sector:"Healthcare", fyear:2019, vol:"13%", ret:"+15%", fin:{"Debt/Assets":"58%","Op. Margin":"19.8%","Cash/Assets":"8.4%","EBIT/Assets":"16.1%"}, modelP:0.17, actual:-0.161, isBig:false, story:"Classic defensive healthcare. Lowest volatility in the test universe. Model nailed it." },
]

const CHIPS = [250, 500, 1000, 2000, 5000]

function fmt$(n) { return '$' + n.toLocaleString() }
function pct(p) { return Math.round(p * 100) + '%' }
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

  const placeBet = (side) => {
    if (pick !== null) return
    setPick(side)
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
        <div className="eyebrow">07 — Activity</div>
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
      <div className="eyebrow">07 — Activity</div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--blue-950)', letterSpacing: '-.03em', marginBottom: '.35rem' }}>DrawdownMarket</h1>
      <p style={{ fontSize: '.85rem', color: 'var(--slate-500)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        8 real companies from our test set. Bet on whether they crash 30%+. Odds are derived from the model's predicted probability.
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
          <div style={{ fontSize: '.62rem', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.1rem' }}>Portfolio</div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '1rem', color: 'var(--green)' }}>{fmt$(bankroll)}</div>
        </div>
      </div>

      <div className="market-card">
        <div className="market-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', fontSize: '.65rem', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--slate-400)', marginBottom: '.55rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 5px var(--green)' }} />
            Active Market
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--slate-900)', letterSpacing: '-.02em', lineHeight: 1.3, marginBottom: '.3rem' }}>
            Will this company experience a <span style={{ color: 'var(--red)' }}>30%+ drawdown</span> in the next 12 months?
          </div>
          {!revealed
            ? <div style={{ fontSize: '.88rem', color: 'var(--slate-500)', marginTop: '.25rem' }}>{r.hidden}</div>
            : <div style={{ fontSize: '.88rem', color: 'var(--blue-700)', fontWeight: 600, marginTop: '.25rem' }}>{r.company}</div>
          }
          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.8rem', flexWrap: 'wrap' }}>
            {[['Sector', r.sector], ['Anchor Year', r.fyear], ['12M Vol', r.vol], ['12M Return', r.ret]].map(([k, v]) => (
              <div key={k} style={{ fontSize: '.7rem', color: 'var(--slate-500)' }}>
                <strong style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '.8rem', color: 'var(--slate-900)' }}>{v}</strong>
                {k}
              </div>
            ))}
          </div>
        </div>

        <div className="fin-strip">
          {Object.entries(r.fin).map(([k, v]) => (
            <div key={k} className="fin-item">
              <div className="fin-key">{k}</div>
              <div className="fin-val">{v}</div>
            </div>
          ))}
        </div>

        <div className="outcomes">
          {[
            { side: 'no',  label: 'NO — Safe',   sub: 'Drawdown stays under 30%', oddVal: odds(1 - r.modelP), color: 'var(--green)' },
            { side: 'yes', label: 'YES — Crash',  sub: 'Drawdown exceeds 30%',    oddVal: odds(r.modelP),     color: 'var(--red)' },
          ].map(({ side, label, sub, oddVal, color }) => (
            <div key={side}
              className={`outcome-tile tile-${side}${pick === side ? ' sel' : ''}`}
              onClick={() => !revealed && placeBet(side)}
              style={{ cursor: revealed ? 'default' : 'pointer' }}
            >
              {pick === side && <div className="tile-check">✓</div>}
              <div className="tile-label">{label}</div>
              <div className="tile-odds" style={{ color }}>{oddVal}</div>
              <div className="tile-sub">{sub}</div>
            </div>
          ))}
        </div>

        <div className="bet-area">
          <div style={{ fontSize: '.65rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--slate-500)', marginBottom: '.55rem' }}>Bet size</div>
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.85rem' }}>
            {CHIPS.map(c => (
              <button key={c} className={`chip${bet === c ? ' active' : ''}`} onClick={() => !revealed && setBet(c)}>${c >= 1000 ? c / 1000 + 'K' : c}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
            <button className="buy-btn buy-no" onClick={() => placeBet('no')} disabled={revealed || pick !== null}>BUY NO — Safe</button>
            <button className="buy-btn buy-yes" onClick={() => placeBet('yes')} disabled={revealed || pick !== null}>BUY YES — Crash</button>
          </div>
        </div>
      </div>

      {pick && !revealed && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--white)', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '.85rem 1.25rem', marginTop: '.65rem' }}>
          <div>
            <div style={{ fontSize: '.65rem', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.1rem' }}>Your Position</div>
            <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--slate-900)' }}>
              {fmt$(bet)} on {pick === 'yes' ? 'CRASH (>30%)' : 'SAFE (<30%)'}
            </div>
          </div>
          <button className="reveal-btn" onClick={resolve}>Resolve Market</button>
        </motion.div>
      )}

      <AnimatePresence>
        {revealed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`result-card ${correct ? 'win' : 'loss'}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.45rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: correct ? 'var(--green)' : 'var(--red)' }}>
                {correct ? 'Correct!' : 'Wrong.'}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '1.6rem', fontWeight: 700, color: correct ? 'var(--green)' : 'var(--red)' }}>
                {pct(r.actual)}
              </div>
            </div>
            <div style={{ fontSize: '.82rem', color: 'var(--slate-500)', lineHeight: 1.55, marginBottom: '.5rem' }}>{r.story}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '.9rem', fontWeight: 600, color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {profit >= 0 ? '+' : ''}{fmt$(profit)} · Model said {pct(r.modelP)} crash probability
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {revealed && (
        <button className="next-btn" style={{ marginTop: '.5rem' }} onClick={next}>
          {round + 1 >= ROUNDS.length ? 'See Final Results →' : 'Next Market →'}
        </button>
      )}
    </div>
  )
}
