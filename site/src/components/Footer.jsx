import { GitFork, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="site-footer page-wrap" style={{ paddingBottom: 'var(--sp-10)' }}>
      <div>
        <h4>The Team</h4>
        <ul>
          <li>Nick Dhaliwal</li>
          <li>Jared Maksoud</li>
          <li>Nicholas Mikhail</li>
          <li>Yung Chyi Yang</li>
        </ul>
      </div>
      <div>
        <h4>Course</h4>
        <ul>
          <li>Machine Learning II</li>
          <li>UChicago MS-ADS</li>
          <li>Spring 2026</li>
          <li>Prof. Batu</li>
        </ul>
      </div>
      <div>
        <h4>Data</h4>
        <ul>
          <li>WRDS Compustat Fundamentals</li>
          <li>CRSP Daily Stock File</li>
          <li>CCM Link Table</li>
          <li>76,990 firm-year anchors</li>
        </ul>
      </div>
      <div>
        <h4>Source &amp; Method</h4>
        <ul>
          <li>
            <a href="https://github.com/jmakk123/MLII-Final" target="_blank" rel="noopener noreferrer">
              <GitFork size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              github.com/jmakk123/MLII-Final
            </a>
          </li>
          <li>Altman 1968, Ohlson 1980, Zmijewski 1984</li>
          <li>Lombardo et al. 2022, Pellegrino et al. 2024</li>
        </ul>
      </div>
      <div className="copyline">
        DrawdownSignal · Built with React, Vite, framer-motion, recharts.
        Press <span className="kb-key">?</span> for keyboard shortcuts.
      </div>
    </footer>
  )
}
