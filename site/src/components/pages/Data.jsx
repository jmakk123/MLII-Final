import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SOURCES = [
  {
    name: 'Compustat Annual',
    sub: '132K rows · 1999 to 2025',
    facets: [
      '11,953 unique firms, NYSE and NASDAQ only',
      '39 columns including 18 line items for our ratios (act, at, ebit, re, lt, sale, ni, dltt, oibdp, etc.)',
      'Filter at pull time: total assets > 0',
    ],
  },
  {
    name: 'Compustat Company',
    sub: '45K rows · static reference',
    facets: [
      'GICS sector / industry hierarchy for industry analysis',
      'dlrsn delisting codes used to handle bankruptcies and mergers in the target window',
      'IPO dates for newly public firm flags',
    ],
  },
  {
    name: 'CRSP Daily Prices',
    sub: '29M rows · 1999 to 2024',
    facets: [
      'Daily adjusted prices for every US-listed common stock',
      'Drives both the realized drawdown target and the 7 price features',
      'cfacpr split factor applied so prices are continuous across corporate actions',
    ],
  },
  {
    name: 'CCM Link Table',
    sub: '38K rows · gvkey to permno',
    facets: [
      'Resolves Compustat firm IDs to CRSP price IDs with date validity windows',
      'Primary link preference (linkprim = P) on ties',
      'Required because the same firm can have different IDs in the two databases',
    ],
  },
]

const FE_BOXES = [
  {
    name: '18 Financial Ratios',
    sub: 'Altman · Ohlson · margins',
    facets: [
      'Working capital, retained earnings, EBIT, market value, asset turnover (Altman X1 to X5)',
      'Leverage, current ratio, ROA, log size (Ohlson and Zmijewski)',
      'Gross / operating / net / EBITDA margins, OpEx ratio, D&A intensity, long-term debt, inventory and receivables turnover',
    ],
  },
  {
    name: '5-Year Sequence',
    sub: '(N, 5, 18) tensor per anchor',
    facets: [
      'Each anchor pulls fyear-4 through fyear of the 18 ratios',
      'Anchors without all 5 prior years are dropped, not imputed (13% loss, mostly newly public firms)',
      'Lag order is oldest to newest, the natural read order for the LSTM',
    ],
  },
  {
    name: '7 Price Features',
    sub: 'Prior 252 trading days',
    facets: [
      'Annualized vol, 12-month return, return skew and kurtosis, max prior drawdown',
      'Beta vs equal-weighted market portfolio, log average daily dollar volume',
      'Window ends strictly before anchor_date; an assertion enforces no look-ahead leakage',
    ],
  },
  {
    name: '97-d Concatenated',
    sub: 'Per anchor, train-fold scaling',
    facets: [
      '90 flattened financial features plus 7 price features',
      'Winsorize at 1st and 99th pct, z-score, statistics frozen on training rows only',
      'Same 97-d vector feeds the Ridge and gradient-boosted baselines for fair comparison',
    ],
  },
]

function HoverBox({ box, color, hi }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: 'relative' }}
    >
      <div
        className={hi ? 'pipe-node hi' : 'pipe-node'}
        style={{ cursor: 'help', userSelect: 'none' }}
      >
        {box.name}
        <small>{box.sub}</small>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: .14 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 260,
              background: 'var(--white)',
              border: '1px solid var(--slate-200)',
              borderRadius: 8,
              padding: '.7rem .85rem',
              boxShadow: '0 4px 16px rgba(0,0,0,.08)',
              zIndex: 10,
            }}
          >
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '.74rem', color: 'var(--slate-600)', lineHeight: 1.55 }}>
              {box.facets.map((f, i) => <li key={i} style={{ marginBottom: i < box.facets.length - 1 ? '.3rem' : 0 }}>{f}</li>)}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Data() {
  return (
    <div className="page-wrap">
      <div className="eyebrow">Project · Data</div>
      <h1 className="page-title">From raw filings<br />to tensors.</h1>
      <p className="page-sub">
        Two databases, one pipeline. 76,990 anchor rows across fyear 2003 to 2024, each with five years of accounting history and one year of price context. Strict time-blocked train, validation, and test folds. Train-fold-only scaling. No information leaks from the future.
      </p>

      {/* Pipeline */}
      <div className="section-label">Data pipeline</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ fontSize: '.68rem', fontFamily: 'var(--mono)', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.5rem' }}>
            Raw Sources · hover for details
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {SOURCES.map((s, i) => (
              <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
                <HoverBox box={s} />
                {i < SOURCES.length - 1 && <span className="pipe-arrow">→</span>}
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center', color: 'var(--slate-300)', fontSize: '1.1rem' }}>↓</div>
        <div>
          <div style={{ fontSize: '.68rem', fontFamily: 'var(--mono)', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.5rem' }}>
            Feature Engineering · hover for details
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {FE_BOXES.map((b, i) => (
              <span key={b.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
                <HoverBox box={b} hi />
                {i < FE_BOXES.length - 1 && <span className="pipe-arrow">{i === FE_BOXES.length - 2 ? '=' : '+'}</span>}
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center', color: 'var(--slate-300)', fontSize: '1.1rem' }}>↓</div>
        <div>
          <div style={{ fontSize: '.68rem', fontFamily: 'var(--mono)', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.5rem' }}>
            Time-Blocked Split
          </div>
          <div className="split-row">
            <div className="split-block train"><div className="split-name">Train</div><div className="split-years">2003 to 2017</div><div className="split-n">54,316 firm-years</div></div>
            <div className="split-block val"><div className="split-name">Validation</div><div className="split-years">2018 to 2019</div><div className="split-n">7,196 firm-years</div></div>
            <div className="split-block test"><div className="split-name">Test</div><div className="split-years">2020 to 2023</div><div className="split-n">15,311 firm-years</div></div>
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* Target construction + leakage */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start', marginBottom: '2rem' }}>
        <div>
          <div className="section-label">Target construction</div>
          <ul style={{ fontSize: '.82rem', color: 'var(--slate-600)', lineHeight: 1.7, paddingLeft: '1.1rem', margin: 0 }}>
            <li>Anchor date is fiscal-year-end plus 90 days, modeling the realistic 10-K filing lag.</li>
            <li>Forward window is 365 calendar days of CRSP adjusted prices, requiring at least 60 trading days of data.</li>
            <li>Realized drawdown is the worst peak-to-trough close on the window.</li>
            <li>Delisted firms: dlrsn 02 / 03 / 04 (bankruptcy, liquidation, cease ops) force the target to -1.0; dlrsn 01 / 07 (merger, foreign acquisition) keep terminal value.</li>
          </ul>
        </div>
        <div>
          <div className="section-label">No future data leaking in</div>
          <div className="info-box">
            <strong style={{ color: 'var(--blue-900)' }}>Train-only scaling.</strong> Winsorize cutoffs and z-score means and stds are computed on training rows only, then frozen and applied to validation and test.
            <br /><br />
            <strong style={{ color: 'var(--blue-900)' }}>Strict-before windowing.</strong> An assertion in <code style={{ fontFamily: 'var(--mono)', fontSize: '.78rem', background: 'rgba(0,0,0,.04)', padding: '0 .25rem', borderRadius: 3 }}>src/price/features.py</code> guarantees every feature row used for an anchor predates that anchor.
          </div>
        </div>
      </div>

      {/* COVID + post-COVID handling */}
      <div className="section-label">COVID and post-COVID handling</div>
      <div className="info-box" style={{ marginBottom: '1rem' }}>
        <strong style={{ color: 'var(--blue-900)' }}>The validation fold is the COVID stress fold by design.</strong>{' '}
        Fyear 2018 anchors land at March 2019 with a forward window running into March 2020. Fyear 2019 anchors run into March 2021. The COVID crash sits inside validation, so any model that overfits to calm regimes gets killed during model selection.
      </div>
      <ul style={{ fontSize: '.83rem', color: 'var(--slate-600)', lineHeight: 1.75, paddingLeft: '1.1rem', marginBottom: '2rem' }}>
        <li>The realized base rate of drawdowns past -30% spiked to 86.9% in fyear 2018, 53.7% in fyear 2019 (COVID forward window), and 53.8% to 69.9% across the 2020 to 2023 test years (rate hikes, regional bank stress).</li>
        <li>That mean the headline binary metric at -30% is heavily macro-driven. We report it because the brief locks it as the headline, but lean on within-year rank metrics for honest firm-level discrimination.</li>
        <li>We also report PR-AUC at -50% as an appendix threshold. At that deeper cut the base rate falls to 23.2% (closer to the 10-20% tail mass the original brief expected) and the model&apos;s lift over volatility widens to roughly 6 percentage points.</li>
        <li>Industry-conditional results on the fyear 2018 COVID anchor show the model correctly elevating airlines, hospitality, cruise lines, and retail before COVID arrived, providing a sanity check that the learned signal is firm-specific and not just market timing.</li>
      </ul>

      <div className="divider" />

      <div className="section-label">The 18 Financial Ratios · hover any tag for definition</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginBottom: 'var(--sp-3)' }}>
        {RATIOS.map(r => <RatioTag key={r.name} ratio={r} />)}
      </div>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', lineHeight: 'var(--lh-relaxed)' }}>
        Drawn from Altman 1968, Ohlson 1980, Zmijewski 1984, plus standard margin, turnover, and leverage ratios from Lombardo et al. 2022 and Pellegrino et al. 2024. The same five-year sequence per anchor feeds both the recurrent and feed-forward financial encoders.
      </p>
    </div>
  )
}

const RATIOS = [
  { name: 'r_wc_ta · X1',     desc: 'Working capital divided by total assets. Altman X1, a liquidity buffer indicator.' },
  { name: 'r_re_ta · X2',     desc: 'Retained earnings divided by total assets. Altman X2, captures cumulative profitability over the firm\'s lifetime.' },
  { name: 'r_ebit_ta · X3',   desc: 'EBIT divided by total assets. Altman X3, current operating profitability.' },
  { name: 'r_mv_tl · X4',     desc: 'Market value of equity divided by total liabilities. Altman X4, market-implied solvency cushion.' },
  { name: 'r_sale_ta · X5',   desc: 'Sales divided by total assets. Altman X5, asset turnover efficiency.' },
  { name: 'r_tl_ta',          desc: 'Total liabilities divided by total assets. Leverage ratio used in Ohlson and Zmijewski models.' },
  { name: 'r_cl_ca',          desc: 'Current liabilities divided by current assets. Short-term solvency stress when above 1.' },
  { name: 'r_ni_ta',          desc: 'Net income divided by total assets. Return on assets (ROA).' },
  { name: 'r_log_at',         desc: 'Log of total assets. Firm size proxy; larger firms tend to have smaller relative drawdowns.' },
  { name: 'r_gross_margin',   desc: 'Gross profit divided by sales. Pricing power and unit economics.' },
  { name: 'r_oper_margin',    desc: 'Operating profit (EBIT) divided by sales. Operational efficiency.' },
  { name: 'r_net_margin',     desc: 'Net income divided by sales. Bottom-line profitability after all costs.' },
  { name: 'r_ebitda_margin',  desc: 'EBITDA (operating income before depreciation) divided by sales. Cash earnings margin.' },
  { name: 'r_opex_ratio',     desc: 'Operating expenses divided by sales. Indicator of cost-base efficiency.' },
  { name: 'r_da_intensity',   desc: 'Depreciation and amortization divided by total assets. Capital intensity proxy.' },
  { name: 'r_ltdebt_ta',      desc: 'Long-term debt divided by total assets. Solvency tied to debt structure.' },
  { name: 'r_inv_turn',       desc: 'Cost of goods sold divided by inventory. Inventory turnover; NaN for financial firms, imputed by industry-year median.' },
  { name: 'r_recv_turn',      desc: 'Sales divided by receivables. Collection efficiency; NaN for financial firms, imputed similarly.' },
]

function RatioTag({ ratio }) {
  const [open, setOpen] = useState(false)
  return (
    <span
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <span className="tag" style={{ cursor: 'help' }}>{ratio.name}</span>
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: .12 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 260,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 'var(--sp-2) var(--sp-3)',
              boxShadow: 'var(--shadow-md)',
              zIndex: 20,
              fontSize: 'var(--text-xs)',
              color: 'var(--text-2)',
              lineHeight: 'var(--lh-relaxed)',
              fontFamily: 'var(--sans)',
              whiteSpace: 'normal',
              textAlign: 'left',
            }}
          >
            {ratio.desc}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
