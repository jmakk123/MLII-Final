import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const SHORTCUTS = [
  { keys: ['1'], label: 'Predictions' },
  { keys: ['2'], label: 'Overview' },
  { keys: ['3'], label: 'Key Concepts' },
  { keys: ['4'], label: 'Data & Methodology' },
  { keys: ['5'], label: 'Models & Process' },
  { keys: ['6'], label: 'Findings' },
  { keys: ['7'], label: 'Use Cases' },
  { keys: ['8'], label: 'Quick Recap' },
  { keys: ['G'], label: 'DrawdownMarket (game)' },
  { keys: ['Shift', 'T'], label: 'Toggle dark / light theme' },
  { keys: ['Shift', 'S'], label: 'Toggle sidebar' },
  { keys: ['?'], label: 'Show this shortcut overlay' },
  { keys: ['Esc'], label: 'Close any overlay' },
]

export default function ShortcutsOverlay({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="kb-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className="kb-panel"
            initial={{ scale: 0.94, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
              <div style={{
                fontFamily: 'var(--display)',
                fontSize: 'var(--text-lg)',
                fontWeight: 700,
                color: 'var(--text-1)',
                letterSpacing: 'var(--ls-tight)',
              }}>
                Keyboard Shortcuts
              </div>
              <button
                onClick={onClose}
                aria-label="Close shortcuts overlay"
                style={{
                  width: 28, height: 28, borderRadius: 'var(--r-sm)',
                  background: 'transparent', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-3)',
                }}
              >
                <X size={14} />
              </button>
            </div>
            {SHORTCUTS.map(({ keys, label }) => (
              <div className="kb-row" key={label}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>{label}</span>
                <span style={{ display: 'flex', gap: 4 }}>
                  {keys.map(k => <span className="kb-key" key={k}>{k}</span>)}
                </span>
              </div>
            ))}
            <div style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
              Click outside or press <span className="kb-key">Esc</span> to close.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
