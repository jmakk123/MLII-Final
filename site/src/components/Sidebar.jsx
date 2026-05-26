import {
  LayoutDashboard, BookOpen, Database, Cpu, BarChart2, Briefcase,
  Presentation, Gamepad2, GitFork, Sun, Moon, PanelLeftClose,
  Table, GitCompare, AlertTriangle, Rewind,
} from 'lucide-react'
import Monogram from './visuals/Monogram'

/* Home link sits above the groups, like Linear's Inbox or Stripe's Home. */
const HOME = { id: 'overview', label: 'Overview', Icon: LayoutDashboard }

const GROUPS = [
  {
    label: 'Model',
    items: [
      { id: 'predictions', label: 'Predictions', Icon: Table },
      { id: 'compare',     label: 'Compare',     Icon: GitCompare },
      { id: 'risks',       label: 'Top Risks',   Icon: AlertTriangle },
      { id: 'backtest',    label: 'Backtest',    Icon: Rewind },
    ],
  },
  {
    label: 'Project',
    items: [
      { id: 'intro',    label: 'Concepts',  Icon: BookOpen },
      { id: 'data',     label: 'Data',      Icon: Database },
      { id: 'models',   label: 'Models',    Icon: Cpu },
      { id: 'findings', label: 'Findings',  Icon: BarChart2 },
      { id: 'usecases', label: 'Use Cases', Icon: Briefcase },
      { id: 'slides',   label: 'Recap',     Icon: Presentation },
    ],
  },
]

export default function Sidebar({ current, navigate, onClose, theme, onToggleTheme }) {
  const isDark = theme === 'dark'

  const renderItem = ({ id, label, Icon }) => {
    const active = current === id
    return (
      <button
        key={id}
        onClick={() => navigate(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
          width: '100%', padding: 'var(--sp-2) var(--sp-4)',
          background: active ? 'var(--blue-50)' : 'transparent',
          border: 'none',
          borderLeft: `2px solid ${active ? 'var(--blue-500)' : 'transparent'}`,
          color: active ? 'var(--blue-700)' : 'var(--text-3)',
          fontSize: 'var(--text-sm)',
          fontWeight: active ? 600 : 400,
          cursor: 'pointer', textAlign: 'left',
          fontFamily: 'var(--sans)',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.color = 'var(--text-1)' } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' } }}
      >
        <Icon size={15} style={{ flexShrink: 0 }} />
        {label}
      </button>
    )
  }

  return (
    <aside className="sidebar">
      {/* Logo + theme toggle */}
      <div style={{ padding: 'var(--sp-5) var(--sp-4) var(--sp-4)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: 0 }}>
            <Monogram size={28} />
            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-1)', letterSpacing: 'var(--ls-tight)', whiteSpace: 'nowrap' }}>
              DrawdownSignal
            </span>
          </div>
          <button
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: 28, height: 28, borderRadius: 'var(--r-sm)',
              background: 'transparent', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-3)',
              transition: 'color .15s, border-color .15s, background .15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: 'var(--sp-3) 0' }}>
        {/* Home: Overview, lifted above all groups */}
        {renderItem(HOME)}

        {/* Visual hairline before first group */}
        <div style={{ height: 1, background: 'var(--border)', margin: 'var(--sp-3) var(--sp-4)' }} />

        {GROUPS.map((grp, gi) => (
          <div key={grp.label} style={{ marginBottom: gi < GROUPS.length - 1 ? 'var(--sp-2)' : 0 }}>
            <div style={{
              fontSize: 'var(--text-2xs)',
              fontWeight: 600,
              letterSpacing: 'var(--ls-wider)',
              textTransform: 'uppercase',
              color: 'var(--text-4)',
              padding: 'var(--sp-2) var(--sp-4) var(--sp-1)',
            }}>
              {grp.label}
            </div>
            {grp.items.map(renderItem)}
          </div>
        ))}

        {/* Activity, visually separated */}
        <div style={{
          fontSize: 'var(--text-2xs)',
          fontWeight: 600,
          letterSpacing: 'var(--ls-wider)',
          textTransform: 'uppercase',
          color: 'var(--text-4)',
          padding: 'var(--sp-3) var(--sp-4) var(--sp-1)',
          borderTop: '1px solid var(--border)',
          marginTop: 'var(--sp-2)',
        }}>
          Activity
        </div>
        <button
          onClick={() => navigate('activity')}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
            width: '100%', padding: 'var(--sp-2) var(--sp-4)',
            background: current === 'activity' ? 'rgba(245,158,11,.08)' : 'transparent',
            border: 'none',
            borderLeft: `2px solid ${current === 'activity' ? 'var(--amber)' : 'transparent'}`,
            color: current === 'activity' ? '#92400E' : 'var(--text-3)',
            fontSize: 'var(--text-sm)', fontWeight: current === 'activity' ? 600 : 400,
            cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--sans)',
            transition: 'all .15s',
          }}
          onMouseEnter={e => { if (current !== 'activity') { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.color = 'var(--text-1)' } }}
          onMouseLeave={e => { if (current !== 'activity') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' } }}
        >
          <Gamepad2 size={15} style={{ flexShrink: 0 }} />
          DrawdownMarket
          <span style={{
            marginLeft: 'auto', background: 'var(--amber)', color: '#fff',
            fontSize: 'var(--text-2xs)', fontWeight: 700, padding: '2px 6px',
            borderRadius: 3, letterSpacing: 'var(--ls-wide)'
          }}>LIVE</span>
        </button>
      </nav>

      {/* Footer */}
      <div style={{ padding: 'var(--sp-3) var(--sp-4) var(--sp-4)', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onClose}
          aria-label="Collapse sidebar"
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
            padding: 'var(--sp-2) var(--sp-3)',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            color: 'var(--text-2)',
            fontSize: 'var(--text-sm)', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--sans)',
            transition: 'border-color .15s, color .15s, background .15s',
            marginBottom: 'var(--sp-3)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--blue-500)'; e.currentTarget.style.color = 'var(--blue-700)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
        >
          <PanelLeftClose size={15} />
          Collapse sidebar
        </button>
        <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-4)', lineHeight: 1.6 }}>
          Data: WRDS Compustat + CRSP<br />
          <a
            href="https://github.com/jmakk123/MLII-Final"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--blue-500)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}
          >
            <GitFork size={11} /> GitHub
          </a>
        </div>
      </div>
    </aside>
  )
}
