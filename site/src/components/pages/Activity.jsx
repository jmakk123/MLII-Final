import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Trophy, GraduationCap, Users, Sparkles, Lightbulb } from 'lucide-react'

/* Real test-fold (fyear 2020 to 2023) anchors using lstm_fusion ensemble
   predictions. Each round shows three indicators (vol, recent return,
   leverage). The model probability is HIDDEN unless a team spends a hint
   token, and each team gets two hint tokens for the whole game. Model
   probability has been aligned to the outcome direction so a hint genuinely
   helps. */
const STARTING_BANKROLL = 100_000
const HINTS_PER_TEAM = 2

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
    modelP: 0.58, predicted_dd: -0.32, actual_dd: -0.31, isBig: true,
  },
  {
    company: 'Netflix (NFLX)',
    description: 'Streaming entertainment platform with 200M+ subscribers. Growth-stock vol, surprise-driven. Typically moderate drawdowns.',
    vol: '31%', ret: '+11%', leverage: '68%',
    modelP: 0.65, predicted_dd: -0.36, actual_dd: -0.58, isBig: true,
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
function emptyBet() { return { side: null, chip: null, hintUsed: false } }

/* -------------------- Celebration overlay -------------------- */
const CONFETTI_COLORS = ['#ff3d54', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#06b6d4', '#ec4899', '#facc15']
function CelebrationOverlay() {
  const lasers = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      key: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      top: `${5 + (i * 11) % 90}%`,
      delay: (i * 0.12) % 2.2,
      duration: 1.6 + ((i * 0.17) % 0.6),
      angle: (-30 + (i * 17) % 60),
    }))
  }, [])
  const confetti = useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => ({
      key: i,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 1.4,
      duration: 2 + Math.random() * 2,
      rotate: Math.random() * 720 - 360,
      drift: (Math.random() - 0.5) * 280,
      size: 6 + Math.random() * 6,
      shape: i % 3,
    }))
  }, [])
  return (
    <div className="celebration-overlay" aria-hidden>
      {/* Lasers */}
      {lasers.map(l => (
        <div
          key={`l-${l.key}`}
          className="laser"
          style={{
            top: l.top,
            color: l.color,
            animationDelay: `${l.delay}s`,
            animationDuration: `${l.duration}s`,
            '--ang': `${l.angle}deg`,
          }}
        />
      ))}
      {/* Confetti */}
      {confetti.map(c => (
        <motion.div
          key={`c-${c.key}`}
          initial={{ y: -40, x: 0, rotate: 0, opacity: 0 }}
          animate={{
            y: ['-5vh', '110vh'],
            x: [0, c.drift],
            rotate: [0, c.rotate],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: c.duration,
            delay: c.delay,
            ease: 'linear',
            times: [0, 0.05, 0.85, 1],
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: `${c.left}%`,
            width: c.size,
            height: c.size * (c.shape === 0 ? 1 : 0.4),
            background: c.color,
            borderRadius: c.shape === 2 ? '50%' : 2,
            boxShadow: `0 0 4px ${c.color}66`,
          }}
        />
      ))}
    </div>
  )
}

/* -------------------- Main component -------------------- */
export default function Activity() {
  const [round, setRound] = useState(0)
  const [bankroll, setBankroll] = useState(
    Object.fromEntries(TEAMS.map(t => [t.id, STARTING_BANKROLL]))
  )
  const [bets, setBets] = useState(
    Object.fromEntries(TEAMS.map(t => [t.id, emptyBet()]))
  )
  const [hintsLeft, setHintsLeft] = useState(
    Object.fromEntries(TEAMS.map(t => [t.id, HINTS_PER_TEAM]))
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
    setHintsLeft(Object.fromEntries(TEAMS.map(t => [t.id, HINTS_PER_TEAM])))
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
  function useHint(teamId) {
    if (revealed) return
    if (hintsLeft[teamId] <= 0) return
    if (bets[teamId].hintUsed) return
    setHintsLeft(h => ({ ...h, [teamId]: h[teamId] - 1 }))
    setBets(b => ({ ...b, [teamId]: { ...b[teamId], hintUsed: true } }))
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

  /* -------------------- Done screen -------------------- */
  if (done) {
    const ranking = TEAMS.map(t => ({ ...t, bankroll: bankroll[t.id] })).sort((a, b) => b.bankroll - a.bankroll)
    const winner = ranking[0]
    return (
      <div className="game-wrap" style={{ position: 'relative' }}>
        <CelebrationOverlay />
        <div className="eyebrow">07 / Activity</div>
        <div className="gameover" style={{ position: 'relative', zIndex: 2 }}>
          <div className="trophy-bounce" style={{ display: 'inline-block', marginBottom: 'var(--sp-3)' }}>
            <Trophy size={64} color="var(--amber)" />
          </div>
          <div style={{
            fontFamily: 'var(--display)',
            fontSize: 'var(--text-3xl)',
            fontWeight: 700,
            color: 'var(--text-1)',
            letterSpacing: 'var(--ls-tight)',
            marginBottom: 'var(--sp-2)',
          }}>
            <span className="rainbow-text glow-text">{winner.name} WINS</span>
          </div>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 'var(--text-5xl)',
            fontWeight: 700,
            color: 'var(--amber)',
            marginBottom: 'var(--sp-2)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmt$(winner.bankroll)}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginBottom: 'var(--sp-6)' }}>
            <Sparkles size={14} color="var(--amber)" /> WINNER TAKES ALL <Sparkles size={14} color="var(--amber)" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TEAMS.length}, 1fr)`, gap: 'var(--sp-3)', maxWidth: 560, margin: '0 auto var(--sp-6)' }}>
            {ranking.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.3 }}
                style={{
                  border: `2px solid ${i === 0 ? 'var(--amber)' : 'var(--border)'}`,
                  background: i === 0 ? 'rgba(245,158,11,.08)' : 'var(--surface)',
                  borderRadius: 'var(--r-md)',
                  padding: 'var(--sp-3)',
                  boxShadow: i === 0 ? '0 0 24px rgba(245,158,11,.35)' : 'none',
                }}
              >
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>
                  #{i + 1} · {t.name}
                </div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 'var(--text-xl)', fontWeight: 700,
                  color: 'var(--text-1)', marginTop: 'var(--sp-1)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmt$(t.bankroll)}
                </div>
              </motion.div>
            ))}
          </div>
          <button className="reveal-btn" onClick={restart}>New Game</button>
        </div>
      </div>
    )
  }

  /* -------------------- Round view -------------------- */
  return (
    <div className="game-wrap">
      <div className="eyebrow">07 / Activity</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--sp-2)', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <h1 style={{
          fontFamily: 'var(--display)',
          fontSize: 'var(--text-3xl)',
          fontWeight: 700,
          color: 'var(--text-1)',
          letterSpacing: 'var(--ls-tight)',
        }}>
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
        Three teams. Six rounds. Each team starts with {fmt$(STARTING_BANKROLL)} and has {HINTS_PER_TEAM} model hints for the whole game. Bet correctly to double your wager. Last round is winner-takes-all.
      </p>

      <div className="game-topbar">
        <div>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>Round</div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
            {round + 1} of {ROUNDS.length}
          </div>
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
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>
                {t.name}
              </div>
              <div style={{
                fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 'var(--text-base)',
                color: bankroll[t.id] >= STARTING_BANKROLL ? 'var(--green)' : 'var(--red)',
                fontVariantNumeric: 'tabular-nums',
              }}>
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
          <div style={{
            fontFamily: 'var(--display)',
            fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-1)',
            letterSpacing: 'var(--ls-tight)',
          }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TEAMS.length}, 1fr)`, gap: 1, background: 'var(--border)' }}>
          {TEAMS.map(t => {
            const b = bets[t.id]
            const amt = betAmount(t.id)
            const hl = hintsLeft[t.id]
            return (
              <div key={t.id} style={{ background: 'var(--surface)', padding: 'var(--sp-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <t.Icon size={14} color={t.color} />
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-1)' }}>{t.name}</span>
                  </div>
                  <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>
                    Hints {hl}/{HINTS_PER_TEAM}
                  </span>
                </div>

                {/* Hint area */}
                <AnimatePresence mode="wait">
                  {b.hintUsed ? (
                    <motion.div
                      key="hint-shown"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        background: 'var(--blue-50)',
                        border: '1px solid var(--blue-100)',
                        borderLeft: '3px solid var(--blue-500)',
                        borderRadius: 'var(--r-md)',
                        padding: 'var(--sp-2) var(--sp-3)',
                        marginBottom: 'var(--sp-3)',
                      }}
                    >
                      <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--blue-700)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>
                        Model hint
                      </div>
                      <div style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 'var(--text-base)',
                        fontWeight: 700,
                        color: r.modelP > 0.5 ? 'var(--red)' : 'var(--green)',
                        marginTop: 2,
                      }}>
                        {Math.round(r.modelP * 100)}% chance of big drop
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="hint-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => useHint(t.id)}
                      disabled={hl <= 0 || revealed}
                      whileHover={{ scale: hl > 0 && !revealed ? 1.02 : 1 }}
                      whileTap={{ scale: hl > 0 && !revealed ? 0.98 : 1 }}
                      style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: 'var(--sp-2)',
                        background: hl > 0 ? 'var(--surface)' : 'var(--bg-2)',
                        border: `1px dashed ${hl > 0 ? 'var(--blue-500)' : 'var(--border)'}`,
                        borderRadius: 'var(--r-md)',
                        color: hl > 0 ? 'var(--blue-700)' : 'var(--text-4)',
                        cursor: hl > 0 && !revealed ? 'pointer' : 'not-allowed',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        fontFamily: 'var(--sans)',
                        marginBottom: 'var(--sp-3)',
                        transition: 'background .15s, color .15s',
                      }}
                    >
                      <Lightbulb size={13} />
                      {hl > 0 ? `Use hint (${hl} left)` : 'No hints left'}
                    </motion.button>
                  )}
                </AnimatePresence>

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
                          <motion.button
                            key={c.label}
                            onClick={() => pickChip(t.id, c.value)}
                            disabled={disabled}
                            whileHover={!disabled ? { scale: 1.05 } : {}}
                            whileTap={!disabled ? { scale: 0.95 } : {}}
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
                          </motion.button>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ marginBottom: 'var(--sp-2)' }}>
                    <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)', fontWeight: 700, marginBottom: 4 }}>
                      All-in mandatory
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                      Risking {fmt$(bankroll[t.id])}
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {b.side && (isFinal || b.chip) && (
                    <motion.div
                      initial={{ opacity: 0, scale: .9, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      style={{
                        background: b.side === 'yes' ? 'var(--red-soft)' : 'var(--green-soft)',
                        border: `1px solid ${b.side === 'yes' ? 'var(--red)' : 'var(--green)'}`,
                        borderRadius: 'var(--r-sm)',
                        padding: 'var(--sp-1) var(--sp-2)',
                        fontSize: 'var(--text-2xs)',
                        fontFamily: 'var(--mono)',
                        color: b.side === 'yes' ? 'var(--red)' : 'var(--green)',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      LOCKED: {b.side === 'yes' ? 'BIG DROP' : 'NO DROP'} · {fmt$(amt)}
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
                <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
                  {(r.predicted_dd * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--ls-wide)' }}>
                  Actual realized
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xl)', fontWeight: 700, color: r.isBig ? 'var(--red)' : 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
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
                      border: `2px solid ${correct ? 'var(--green)' : 'var(--red)'}`,
                      borderRadius: 'var(--r-md)',
                      padding: 'var(--sp-3)',
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>{t.name}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: correct ? 'var(--green)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                      {correct ? '+' : '-'}{fmt$(Math.abs(profit))}
                    </div>
                    <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', fontFamily: 'var(--mono)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
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
