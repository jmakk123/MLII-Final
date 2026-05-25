import { useEffect, useRef, useState } from 'react'

const PAGE_META = {
  predictions: { eyebrow: 'Model · Predictions',    title: 'Drawdown Predictions' },
  compare:     { eyebrow: 'Model · Compare',         title: 'Compare Firms' },
  risks:       { eyebrow: 'Model · Top Risks',       title: 'Top Predicted Drawdowns' },
  backtest:    { eyebrow: 'Model · Backtest',        title: 'Backtest by Year' },
  overview:    { eyebrow: '01 / Overview',           title: 'Predicting the Fall' },
  intro:       { eyebrow: 'Key Concepts',            title: 'Key Concepts' },
  data:        { eyebrow: '02 / Data & Methodology', title: 'From raw filings to tensors' },
  models:      { eyebrow: '03 / Models & Process',   title: 'Eight models, one winner' },
  findings:    { eyebrow: '04 / Findings',           title: 'Findings' },
  usecases:    { eyebrow: '05 / Use Cases',          title: 'Who uses a drawdown signal' },
  slides:      { eyebrow: '06 / Quick Recap',        title: 'Quick Recap' },
  activity:    { eyebrow: '07 / Activity',           title: 'DrawdownMarket' },
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
