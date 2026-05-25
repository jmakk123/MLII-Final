import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import Sidebar from './components/Sidebar'
import StickyHeader from './components/StickyHeader'
import ShortcutsOverlay from './components/ShortcutsOverlay'
import Footer from './components/Footer'

/* Lazy-loaded pages so initial bundle stays small.
   Each page becomes its own chunk in the build output. */
const Predictions  = lazy(() => import('./components/pages/Predictions'))
const Compare      = lazy(() => import('./components/pages/Compare'))
const TopRisks     = lazy(() => import('./components/pages/TopRisks'))
const Backtest     = lazy(() => import('./components/pages/Backtest'))
const Overview     = lazy(() => import('./components/pages/Overview'))
const KeyConcepts  = lazy(() => import('./components/pages/KeyConcepts'))
const Data         = lazy(() => import('./components/pages/Data'))
const Models       = lazy(() => import('./components/pages/Models'))
const Findings     = lazy(() => import('./components/pages/Findings'))
const UseCases     = lazy(() => import('./components/pages/UseCases'))
const Presentation = lazy(() => import('./components/pages/Presentation'))
const Activity     = lazy(() => import('./components/pages/Activity'))

const PAGES = {
  predictions: Predictions,
  compare:     Compare,
  risks:       TopRisks,
  backtest:    Backtest,
  overview:    Overview,
  intro:       KeyConcepts,
  data:        Data,
  models:      Models,
  findings:    Findings,
  usecases:    UseCases,
  slides:      Presentation,
  activity:    Activity,
}

const PAGE_ORDER = ['predictions', 'compare', 'risks', 'backtest', 'overview', 'intro', 'data', 'models', 'findings', 'usecases', 'slides', 'activity']

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

const NUM_KEY_PAGE = {
  '1': 'predictions', '2': 'compare', '3': 'risks', '4': 'backtest',
  '5': 'overview', '6': 'intro', '7': 'data', '8': 'models',
  '9': 'findings',
}

export default function App() {
  const [page, setPage] = useState('overview')
  const [direction, setDirection] = useState(1)        // 1 = forward, -1 = back
  const [pageInit, setPageInit] = useState(null)       // optional initial state passed to next page
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { const v = localStorage.getItem(SB_KEY); return v === null ? true : v === '1' } catch { return true }
  })
  const [theme, setTheme] = useState(getInitialTheme)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const scrollRef = useRef(null)

  /* Persist + apply theme */
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme) } catch {}
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    try { localStorage.setItem(SB_KEY, sidebarOpen ? '1' : '0') } catch {}
  }, [sidebarOpen])

  const navigate = (id, init) => {
    if (id === page && !init) return
    const cur = PAGE_ORDER.indexOf(page)
    const next = PAGE_ORDER.indexOf(id)
    setDirection(next > cur ? 1 : -1)
    setPageInit(init ?? null)
    setPage(id)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setShortcutsOpen(o => !o)
        return
      }
      if (e.key === 'Escape') { setShortcutsOpen(false); return }
      if (e.shiftKey && (e.key === 'T' || e.key === 't')) { e.preventDefault(); toggleTheme(); return }
      if (e.shiftKey && (e.key === 'S' || e.key === 's')) { e.preventDefault(); setSidebarOpen(o => !o); return }

      if (!e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (NUM_KEY_PAGE[e.key]) { navigate(NUM_KEY_PAGE[e.key]); return }
        if (e.key === 'g' || e.key === 'G') { navigate('activity'); return }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [page])

  const PageComponent = PAGES[page] ?? Overview

  const variants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 24 : -24 }),
    center: { opacity: 1, x: 0, transition: { duration: .26, ease: [0.22, 1, 0.36, 1] } },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -24 : 24, transition: { duration: .15, ease: 'easeIn' } }),
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <>
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
          title="Open sidebar (Shift+S)"
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
        <StickyHeader page={page} scrollRef={scrollRef} />
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <Suspense fallback={<div style={{ padding: 'var(--sp-10)', color: 'var(--text-3)' }}>Loading…</div>}>
              <PageComponent navigate={navigate} init={pageInit} />
            </Suspense>
          </motion.div>
        </AnimatePresence>
        <Footer />
      </div>

      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}
