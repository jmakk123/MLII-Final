import { useEffect, useState } from 'react'

/* Thin scroll progress bar pinned to the top of the main scroll container.
   Updates a CSS variable on the host element so the bar width tracks the
   scroll position smoothly. Independent of the sticky header underneath.
*/

export default function ScrollProgress({ scrollRef }) {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      const max = el.scrollHeight - el.clientHeight
      const p = max > 0 ? el.scrollTop / max : 0
      setPct(Math.min(1, Math.max(0, p)))
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [scrollRef])

  return (
    <div
      aria-hidden
      style={{
        position: 'sticky',
        top: 0,
        height: 2,
        zIndex: 41,
        background: 'transparent',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct * 100}%`,
          background: 'linear-gradient(90deg, var(--blue-500), var(--blue-700))',
          transition: 'width .08s linear',
          boxShadow: pct > 0.02 ? '0 0 6px rgba(59,130,246,.4)' : 'none',
        }}
      />
    </div>
  )
}
