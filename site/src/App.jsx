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

const SB_KEY = 'ds.sidebar.open'

export default function App() {
  const [page, setPage] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { const v = localStorage.getItem(SB_KEY); return v === null ? true : v === '1' } catch { return true }
  })
  const scrollRef = useRef(null)

  useEffect(() => {
    try { localStorage.setItem(SB_KEY, sidebarOpen ? '1' : '0') } catch {}
  }, [sidebarOpen])

  const navigate = (id) => {
    setPage(id)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  const PageComponent = PAGES[page] ?? Overview

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {sidebarOpen && (
        <Sidebar current={page} navigate={navigate} onClose={() => setSidebarOpen(false)} />
      )}

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          title="Open sidebar"
          style={{
            position: 'fixed', top: 14, left: 14, zIndex: 50,
            width: 36, height: 36, borderRadius: 7,
            background: 'var(--white)', border: '1px solid var(--slate-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--slate-700)',
            boxShadow: '0 1px 3px rgba(0,0,0,.04)',
            transition: 'border-color .15s, box-shadow .15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--blue-500)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(30,64,175,.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--slate-200)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.04)' }}
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
