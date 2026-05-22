import { LayoutDashboard, BookOpen, Database, Cpu, BarChart2, Briefcase, Presentation, Gamepad2, GitFork } from 'lucide-react'
import { motion } from 'framer-motion'

const NAV = [
  { id: 'overview',  label: 'Overview',          Icon: LayoutDashboard },
  { id: 'intro',     label: 'Key Concepts',       Icon: BookOpen },
  { id: 'data',      label: 'Data & Methodology', Icon: Database },
  { id: 'models',    label: 'Models & Process',   Icon: Cpu },
  { id: 'findings',  label: 'Findings',           Icon: BarChart2 },
  { id: 'usecases',  label: 'Use Cases',          Icon: Briefcase },
  { id: 'slides',    label: 'Presentation',       Icon: Presentation },
]

export default function Sidebar({ current, navigate }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '1.35rem 1.1rem 1rem', borderBottom: '1px solid var(--slate-200)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--blue-900)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <BarChart2 size={15} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--blue-950)', letterSpacing: '-.02em' }}>
            DrawdownSignal
          </span>
        </div>
        <div style={{ fontSize: '.65rem', color: 'var(--slate-500)', marginTop: '.3rem', marginLeft: '.05rem' }}>
          ML II · UChicago MS-ADS 2026
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '.5rem 0' }}>
        <div style={{ fontSize: '.6rem', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--slate-400)', padding: '.85rem 1.1rem .4rem' }}>
          Sections
        </div>
        {NAV.map(({ id, label, Icon }) => {
          const active = current === id
          return (
            <button
              key={id}
              onClick={() => navigate(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '.65rem',
                width: '100%', padding: '.55rem 1.1rem',
                background: active ? 'var(--blue-50)' : 'transparent',
                border: 'none', borderLeft: `2px solid ${active ? 'var(--blue-500)' : 'transparent'}`,
                color: active ? 'var(--blue-700)' : 'var(--slate-500)',
                fontSize: '.83rem', fontWeight: active ? 600 : 400,
                cursor: 'pointer', textAlign: 'left',
                fontFamily: 'var(--sans)',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--slate-50)'; e.currentTarget.style.color = 'var(--slate-900)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--slate-500)' } }}
            >
              <Icon size={15} style={{ flexShrink: 0 }} />
              {label}
            </button>
          )
        })}

        {/* Game — separated */}
        <div style={{ borderTop: '1px solid var(--slate-200)', marginTop: '.5rem', paddingTop: '.5rem' }}>
          <button
            onClick={() => navigate('activity')}
            style={{
              display: 'flex', alignItems: 'center', gap: '.65rem',
              width: '100%', padding: '.55rem 1.1rem',
              background: current === 'activity' ? 'rgba(245,158,11,.08)' : 'transparent',
              border: 'none', borderLeft: `2px solid ${current === 'activity' ? 'var(--amber)' : 'transparent'}`,
              color: current === 'activity' ? '#92400E' : 'var(--slate-500)',
              fontSize: '.83rem', fontWeight: current === 'activity' ? 600 : 400,
              cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--sans)',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { if (current !== 'activity') { e.currentTarget.style.background = 'var(--slate-50)'; e.currentTarget.style.color = 'var(--slate-900)' } }}
            onMouseLeave={e => { if (current !== 'activity') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--slate-500)' } }}
          >
            <Gamepad2 size={15} style={{ flexShrink: 0 }} />
            Activity
            <span style={{
              marginLeft: 'auto', background: 'var(--amber)', color: '#fff',
              fontSize: '.58rem', fontWeight: 700, padding: '.1rem .38rem',
              borderRadius: 3, letterSpacing: '.05em'
            }}>LIVE</span>
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '.85rem 1.1rem', borderTop: '1px solid var(--slate-200)' }}>
        <div style={{ fontSize: '.68rem', color: 'var(--slate-400)', lineHeight: 1.6 }}>
          Data: WRDS Compustat + CRSP<br />
          <a href="https://github.com/jmakk123/MLII-Final" target="_blank"
            style={{ color: 'var(--blue-500)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '.3rem', marginTop: '.2rem' }}>
            <GitFork size={11} /> GitHub
          </a>
        </div>
      </div>
    </aside>
  )
}
