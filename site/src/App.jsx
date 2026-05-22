import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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

export default function App() {
  const [page, setPage] = useState('overview')
  const scrollRef = useRef(null)

  const navigate = (id) => {
    setPage(id)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  const PageComponent = PAGES[page] ?? Overview

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar current={page} navigate={navigate} />
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
