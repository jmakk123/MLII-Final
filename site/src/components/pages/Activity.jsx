import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Trophy, GraduationCap, Users } from 'lucide-react'

/* Real test-fold (fyear 2020 to 2023) anchors using lstm_fusion ensemble
   predictions. Each round shows three simple indicators (vol, recent return,
   leverage) plus the model probability as a hint. Correct bets pay 2x. */
const STARTING_BANKROLL = 100_000

const ROUNDS = [
  {
    company: 'Bed Bath & Beyond (BBBY)',
    description: 'Big-box home goods retailer in slow decline. Heavy leverage, meme-stock vol. Typically large drawdowns.',
    vol: '81%', ret: '-42%', leverage: '94%',
    modelP: 0.70, predicted_dd: -0.41, actual_dd: -0.60, isBig: true,
  },
  {
    company: 'Carnival (CCL)',
    description: 'Global cruise operator with 100+ ships. Travel-demand sensitive. Typically large drawdowns during travel downturns.',
    vol: '62%', ret: '+18%', leverage: '78%',
    modelP: 0.80, predicted_dd: -0.48, actual_dd: -0.47, isBig: true,
  },
  {
    company: 'Johnson & Johnson (JNJ)',
    description: 'Diversified healthcare giant. Defensive name with steady cash flows. Typically small drawdowns.',
    vol: '13%', ret: '+15%', leverage: '58%',
    modelP: 0.20, predicted_dd: -0.18, actual_dd: -0.13, isBig: false,
  },
  {
    company: 'Microsoft (MSFT)',
    description: 'Enterprise software and cloud leader. Best-in-class margins. Typically small to moderate drawdowns.',
    vol: '18%', ret: '+55%', leverage: '52%',
    modelP: 0.30, predicted_dd: -0.19, actual_dd: -0.31, isBig: true,
  },
  {
    company: 'Netflix (NFLX)',
    description: 'Streaming entertainment platform with 200M+ subscribers. Growth-stock vol, surprise-driven. Typically moderate drawdowns.',
    vol: '31%', ret: '+11%', leverage: '68%',
    modelP: 0.32, predicted_dd: -0.25, actual_dd: -0.58, isBig: true,
  },
  {
    company: 'Peloton (PTON)',
    description: 'Home fitness platform. Pandemic darling, hyper-growth fading. Typically very large drawdowns.',
    vol: '68%', ret: '-78%', leverage: '71%',
    modelP: 0.85, predicted_dd: -0.52, actual_dd: -0.74, isBig: true,
    isFinal: true,
  },
]

const CHIPS = [
  { value: 5_000,  label: '$5K'  },
  { value: 10_000, label: '$10K' },
  { value: 25_000, label: '$25K' },
  { value: 50_000, label: '$50K' },
  { value: 'all',  label: 'ALL IN' },
]

const TEAMS = [
  { id: 'A', name: 'Team A',    Icon: Users,         color: 'var(--blue-500)' },
  { id: 'B', name: 'Team B',    Icon: Users,         color: 'var(--amber)' },
  { id: 'P', name: 'Professor', Icon: GraduationCap, color: 'var(--green)' },
]

function fmt$(n) { return '$' + Math.max(0, Math.round(n)).toLocaleString() }
function emptyBet() { return { side: null, chip: null } }

export default function Activity() {
  const [round, setRound] = useState(0)
  const [bankroll, setBankroll] = useState(
    Object.fromEntries(TEAMS.map(t => [t.id, STARTING_BANKROLL]))
  )
  const [bets, setBets] = useState(
    Object.fromEntries(TEAMS.map(t => [t.id, emptyBet()]))
  )
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)

  const r = ROUNDS[round]
  const isFinal = !!r.isFinal

  const allLocked = TEAMS.every(t => {
    const b = bets[t.id]
    if (isFinal) return b.side != null
    return b.side != null && b.chip != null
  })

  const restart = () => {
    setRound(0)
    setBankroll(Object.fromEntries(TEAMS.map(t => [t.id, STARTING_BANKROLL])))
    setBets(Object.fromEntries(TEAMS.map(t => [t.id, emptyBet()])))
    setRevealed(false)
    setDone(false)
  }

  function pickSide(teamId, side) {
    if (revealed) return
    setBets(b => ({ ...b, [teamId]: { ...b[teamId], side } }))
  }
  function pickChip(teamId, chip) {
    if (revealed || isFinal) return
    setBets(b => ({ ...b, [teamId]: { ...b[teamId], chip } }))
  }

  function betAmount(teamId) {
    const b = bets[teamId]
    if (isFinal) return bankroll[teamId]
    if (b.chip == null) return 0
    if (b.chip === 'all') return bankroll[teamId]
    return Math.min(b.chip, bankroll[teamId])
  }

  function reveal() {
    if (!allLocked) return
    setRevealed(true)
    setBankroll(prev => {
      const next = { ...prev }
      TEAMS.forEach(t => {
        const b = bets[t.id]
        const amt = isFinal ? prev[t.id] : (b.chip === 'all' ? prev[t.id] : Math.min(b.chip ?? 0, prev[t.id]))
        const correct = (b.side === 'yes') === r.isBig
        next[t.id] = prev[t.id] - amt + (correct ? amt * 2 : 0)
      })
      return next
    })
  }

  function next() {
    if (round + 1 >= ROUNDS.length) { setDone(true); return }
    setRound(round + 1)
    setBets(Object.fromEntries(TEAMS.map(t => [t.id, emptyBet()])))
    setRevealed(false)
  }

  if (done) {
    const ranking = TEAMS.map(t => ({ ...t, bankroll: bankroll[t.id] })).sort((a, b) => b.bankroll - a.bankroll)
    const winner = ranking[0]
    return (
      <div className="game-wrap">
        <div className="eyebrow">07 / Activity</div>
        <div className="gameover">
          <Trophy size={48} color="var(--amber)" style={{ margin: '0 auto var(--sp-3)' }} />
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-1)', letterSpacing: 'var(--ls-tight)', marginBottom: 'var(--sp-2)' }}>
            {winner.name} wins
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-4xl)', fontWeight: 700, color: 'var(--amber)', marginBottom: 'var(--sp-6)' }}>
            {fmt$(winner.bankroll)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TEAMS.length}, 1fr)`, gap: 'var(--sp-3)', maxWidth: 520, margin: '0 auto var(--sp-6)' }}>
            {ranking.map((t, i) => (
              <div key={t.id} style={{
                border: `1px solid ${i === 0 ? 'var(--amber)' : 'var(--border)'}`,
                background: i === 0 ? 'rgba(245,158,11,.05)' : 'var(--surface)',
                borderRadius: 'var(--r-md)',
                padding: 'var(--sp-3)',
              }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>
                  #{i + 1} · {t.name}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-1)', marginTop: 'var(--sp-1)' }}>
                  {fmt$(t.bankroll)}
                </div>
              </div>
            ))}
          </div>
          <button className="reveal-btn" onClick={restart}>New Game</button>
        </div>
      </div>
    )
  }

  return (
    <div className="game-wrap">
      <div className="eyebrow">07 / Activity</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--sp-2)', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--text-1)', letterSpacing: 'var(--ls-tight)' }}>
          DrawdownMarket
        </h1>
        {isFinal && (
          <span style={{
            background: 'var(--amber)', color: '#fff',
            padding: 'var(--sp-1) var(--sp-3)',
            borderRadius: 'var(--r-sm)',
            fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: 'var(--ls-wider)',
            textTransform: 'uppercase',
          }}>
            Final · Winner Takes All
          </span>
        )}
      </div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginBottom: 'var(--sp-6)', lineHeight: 'var(--lh-relaxed)' }}>
        Three teams. Same firm, same data, three bets. Bet correctly and double your wager; bet wrong and lose it. The model&apos;s predicted probability is shown as a hint.
      </p>

      <div className="game-topbar">
        <div>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>Round</div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-1)' }}>{round + 1} of {ROUNDS.length}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {ROUNDS.map((_, i) => (
            <div key={i} style={{
              width: 9, height: 9, borderRadius: '50%',
              background: i < round ? 'var(--blue-500)' : i === round ? 'var(--amber)' : 'var(--border-2)',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'center' }}>
          {TEAMS.map(t => (
            <div key={t.id} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>{t.name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 'var(--text-base)', color: bankroll[t.id] >= STARTING_BANKROLL ? 'var(--green)' : 'var(--red)' }}>
                {fmt$(bankroll[t.id])}
              </div>
            </div>
          ))}
        </div>
      </div>

      <motion.div key={round}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .2 }}
        className="market-card"
      >
        <div className="market-head">
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-1)', letterSpacing: 'var(--ls-tight)' }}>
            {r.company}
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginTop: 'var(--sp-2)', lineHeight: 'var(--lh-relaxed)', maxWidth: '65ch' }}>
            {r.description}
          </div>
        </div>

        <div className="fin-strip" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="fin-item">
            <div className="fin-key">Volatility (1y)</div>
            <div className="fin-val">{r.vol}</div>
          </div>
          <div className="fin-item">
            <div className="fin-key">Recent Return (1y)</div>
            <div className="fin-val">{r.ret}</div>
          </div>
          <div className="fin-item">
            <div className="fin-key">Leverage (Debt/Assets)</div>
            <div className="fin-val">{r.leverage}</div>
          </div>
        </div>

        <div style={{
          padding: 'var(--sp-4) var(--sp-6)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)', flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)', marginBottom: 'var(--sp-1)' }}>
              Model says
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: r.modelP > 0.5 ? 'var(--red)' : 'var(--green)' }}>
              {Math.round(r.modelP * 100)}% chance of big drop
            </div>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', maxWidth: 280, textAlign: 'right', lineHeight: 'var(--lh-relaxed)' }}>
            Use this as a hint. Correct bets pay 2x your wager.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TEAMS.length}, 1fr)`, gap: 1, background: 'var(--border)' }}>
          {TEAMS.map(t => {
            const b = bets[t.id]
            const amt = betAmount(t.id)
            return (
              <div key={t.id} style={{ background: 'var(--surface)', padding: 'var(--sp-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                  <t.Icon size={14} color={t.color} />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-1)' }}>{t.name}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                  <button
                    onClick={() => pickSide(t.id, 'no')}
                    disabled={revealed}
                    className={`outcome-tile tile-no ${b.side === 'no' ? 'sel' : ''}`}
                    style={{ padding: 'var(--sp-2)', textAlign: 'center' }}
                  >
                    <div className="tile-check"><Check size={12} color="var(--green)" /></div>
                    <div className="tile-label">No drop</div>
                  </button>
                  <button
                    onClick={() => pickSide(t.id, 'yes')}
                    disabled={revealed}
                    className={`outcome-tile tile-yes ${b.side === 'yes' ? 'sel' : ''}`}
                    style={{ padding: 'var(--sp-2)', textAlign: 'center' }}
                  >
                    <div className="tile-check"><Check size={12} color="var(--red)" /></div>
                    <div className="tile-label">Big drop</div>
                  </button>
                </div>

                {!isFinal ? (
                  <>
                    <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)', marginBottom: 'var(--sp-1)' }}>
                      Bet
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 'var(--sp-2)' }}>
                      {CHIPS.map(c => {
                        const disabled = revealed || (c.value !== 'all' && c.value > bankroll[t.id])
                        return (
                          <button
                            key={c.label}
                            onClick={() => pickChip(t.id, c.value)}
                            disabled={disabled}
                            className={`chip ${b.chip === c.value ? 'active' : ''}`}
                            style={{
                              padding: '4px 0',
                              fontSize: 'var(--text-2xs)',
                              fontFamily: 'var(--sans)',
                              fontWeight: 600,
                              opacity: disabled ? .4 : 1,
                            }}
                          >
                            {c.label}
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ marginBottom: 'var(--sp-2)' }}>
                    <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)', fontWeight: 700, marginBottom: 4 }}>
                      All-in mandatory
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
                      Risking {fmt$(bankroll[t.id])}
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {b.side && (isFinal || b.chip) && (
                    <motion.div
                      initial={{ opacity: 0, scale: .95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: .15 }}
                      style={{
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--r-sm)',
                        padding: 'var(--sp-1) var(--sp-2)',
                        fontSize: 'var(--text-2xs)',
                        fontFamily: 'var(--mono)',
                        color: 'var(--text-2)',
                        textAlign: 'center',
                      }}
                    >
                      Locked: {b.side === 'yes' ? 'BIG DROP' : 'NO DROP'} · {fmt$(amt)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {!revealed && (
          <div style={{ padding: 'var(--sp-4) var(--sp-6)', borderTop: '1px solid var(--border)' }}>
            <button
              className="reveal-btn"
              disabled={!allLocked}
              onClick={reveal}
              style={{ width: '100%' }}
            >
              {allLocked ? 'Reveal outcome' : 'Waiting for all 3 teams to lock in...'}
            </button>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .18 }}
            className={`result-card ${r.isBig ? 'loss' : 'win'}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--sp-3)' }}>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: r.isBig ? 'var(--red)' : 'var(--green)' }}>
                {r.isBig ? 'Big drop happened' : 'Held up, no big drop'}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
                realized drawdown
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap', marginBottom: 'var(--sp-4)' }}>
              <div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>
                  Model predicted
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-1)' }}>
                  {(r.predicted_dd * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>
                  Actual realized
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xl)', fontWeight: 700, color: r.isBig ? 'var(--red)' : 'var(--green)' }}>
                  {(r.actual_dd * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TEAMS.length}, 1fr)`, gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
              {TEAMS.map((t, idx) => {
                const b = bets[t.id]
                const correct = (b.side === 'yes') === r.isBig
                const amt = isFinal ? bankroll[t.id] : (b.chip === 'all' ? bankroll[t.id] : Math.min(b.chip ?? 0, bankroll[t.id]))
                const profit = correct ? amt : -amt
                return (
                  <motion.div
                    key={t.id}
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 + 0.08 * idx, duration: 0.2 }}
                    style={{
                      background: 'var(--surface)',
                      border: `1px solid ${correct ? 'var(--green)' : 'var(--red)'}`,
                      borderRadius: 'var(--r-md)',
                      padding: 'var(--sp-3)',
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>{t.name}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: correct ? 'var(--green)' : 'var(--red)' }}>
                      {correct ? '+' : '-'}{fmt$(Math.abs(profit))}
                    </div>
                    <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                      → {fmt$(bankroll[t.id])}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <button className="next-btn" onClick={next}>
              {round + 1 >= ROUNDS.length ? 'See final tally' : (round + 1 === ROUNDS.length - 1 ? 'On to the final round' : 'Next round')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
