import { useEffect, useRef, useState } from 'react'

const PAGE_META = {
  overview:    { eyebrow: 'Overview',                  title: 'Predicting the Fall' },
  predictions: { eyebrow: 'Model · Predictions',       title: 'Drawdown Predictions' },
  compare:     { eyebrow: 'Model · Compare',           title: 'Compare Firms' },
  risks:       { eyebrow: 'Model · Top Risks',         title: 'Top Predicted Drawdowns' },
  backtest:    { eyebrow: 'Model · Backtest',          title: 'Backtest by Year' },
  intro:       { eyebrow: 'Project · Concepts',        title: 'Key Concepts' },
  data:        { eyebrow: 'Project · Data',            title: 'From raw filings to tensors' },
  models:      { eyebrow: 'Project · Models',          title: 'Eight models, one winner' },
  findings:    { eyebrow: 'Project · Findings',        title: 'Findings' },
  usecases:    { eyebrow: 'Project · Use Cases',       title: 'Who uses a drawdown signal' },
  slides:      { eyebrow: 'Project · Recap',           title: 'Quick Recap' },
  activity:    { eyebrow: 'Activity · DrawdownMarket', title: 'DrawdownMarket' }
}

/* Shows a sticky bar at the top of main-content once the user has
   scrolled past the page-title element. */
export default function StickyHeader({ page, scrollRef }) {
  const [visible, setVisible] = useState(false)
  const sentinelRef = useRef(null)

  useEffect(() => {
    setVisible(false)
    if (!scrollRef?.current) return
    const root = scrollRef.current
    // Place a sentinel at the very top of the scroll area; we observe the
    // page-title via IntersectionObserver against root.
    const titleEl = root.querySelector('.page-title')
    if (!titleEl) return
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { root, threshold: 0, rootMargin: '-8px 0px 0px 0px' }
    )
    obs.observe(titleEl)
    return () => obs.disconnect()
  }, [page, scrollRef])

  const meta = PAGE_META[page] ?? PAGE_META.overview

  return (
    <>
      <div ref={sentinelRef} />
      <div className={`sticky-header ${visible ? 'visible' : ''}`}>
        <div className="sticky-header-inner">
          <span className="eyebrow">{meta.eyebrow}</span>
          <span style={{ color: 'var(--text-4)', fontSize: 'var(--text-xs)' }}>·</span>
          <span className="sh-title">{meta.title}</span>
        </div>
      </div>
    </>
  )
}
