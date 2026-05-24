import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Overview from './components/pages/Overview'
import KeyConcepts from './components/pages/KeyConcepts'
import Data from './components/pages/Data'
import Models from './components/pages/Models'
import Findings from './components/pages/Findings'
import UseCases from './components/pages/UseCases'
import Presentation from './components/pages/Presentation'
import Activity from './components/pages/Activity'

const PAGES = {
  overview: Overview,
  intro:    KeyConcepts,
  data:     Data,
  models:   Models,
  findings: Findings,
  usecases: UseCases,
  slides:   Presentation,
  activity: Activity,
}

const variants = {
  initial:  { opacity: 0, y: 8 },
  animate:  { opacity: 1, y: 0, transition: { duration: .2, ease: 'easeOut' } },
  exit:     { opacity: 0, transition: { duration: .12 } },
}

const SB_KEY    = 'ds.sidebar.open'
const THEME_KEY = 'ds.theme'

function getInitialTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {}
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export default function App() {
  const [page, setPage] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { const v = localStorage.getItem(SB_KEY); return v === null ? true : v === '1' } catch { return true }
  })
  const [theme, setTheme] = useState(getInitialTheme)
  const scrollRef = useRef(null)

  // Persist + apply theme
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme) } catch {}
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    try { localStorage.setItem(SB_KEY, sidebarOpen ? '1' : '0') } catch {}
  }, [sidebarOpen])

  const navigate = (id) => {
    setPage(id)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  const PageComponent = PAGES[page] ?? Overview

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <>
          {/* Backdrop only visible on small screens (CSS-driven) */}
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <Sidebar
            current={page}
            navigate={navigate}
            onClose={() => setSidebarOpen(false)}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        </>
      )}

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          title="Open sidebar"
          style={{
            position: 'fixed', top: 16, left: 16, zIndex: 50,
            width: 40, height: 40, borderRadius: 'var(--r-md)',
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-2)',
            boxShadow: 'var(--shadow-md)',
            transition: 'border-color .15s, color .15s, transform .1s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--blue-500)'; e.currentTarget.style.color = 'var(--blue-700)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(1px)' }}
          onMouseUp={(e) => { e.currentTarget.style.transform = '' }}
        >
          <Menu size={18} />
        </button>
      )}

      <div className="main-content" ref={scrollRef}>
        <AnimatePresence mode="wait">
          <motion.div key={page} variants={variants} initial="initial" animate="animate" exit="exit">
            <PageComponent navigate={navigate} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
