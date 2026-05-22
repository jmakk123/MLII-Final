export default function Data() {
  return (
    <div className="page-wrap">
      <div className="eyebrow">02 — Data & Methodology</div>
      <h1 className="page-title">Where the data<br />comes from.</h1>
      <p className="page-sub">Two databases, one pipeline — turning decades of company filings and stock prices into model inputs, with no information leaking from the future into training.</p>

      {/* Pipeline */}
      <div className="section-label">Data pipeline</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ fontSize: '.68rem', fontFamily: 'var(--mono)', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.5rem' }}>Raw Sources</div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="pipe-node">Compustat Annual<small>132K rows · 1999–2025</small></div>
            <span className="pipe-arrow">→</span>
            <div className="pipe-node">CRSP Daily Prices<small>29M rows · 2016–2024</small></div>
            <span className="pipe-arrow">→</span>
            <div className="pipe-node">CCM Link Table<small>Company → price ID links</small></div>
          </div>
        </div>
        <div style={{ textAlign: 'center', color: 'var(--slate-300)', fontSize: '1.1rem' }}>↓</div>
        <div>
          <div style={{ fontSize: '.68rem', fontFamily: 'var(--mono)', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.5rem' }}>Feature Engineering</div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="pipe-node hi">18 Financial Ratios<small>Altman · Ohlson · margins</small></div>
            <span className="pipe-arrow">+</span>
            <div className="pipe-node hi">5-Year Windows<small>Sequence per company-year</small></div>
            <span className="pipe-arrow">+</span>
            <div className="pipe-node hi">7 Price Features<small>vol · return · skew · beta</small></div>
            <span className="pipe-arrow">=</span>
            <div className="pipe-node hi">97 Features<small>per anchor · train-only scaling</small></div>
          </div>
        </div>
        <div style={{ textAlign: 'center', color: 'var(--slate-300)', fontSize: '1.1rem' }}>↓</div>
        <div>
          <div style={{ fontSize: '.68rem', fontFamily: 'var(--mono)', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.5rem' }}>Time-Blocked Split</div>
          <div className="split-row">
            <div className="split-block train"><div className="split-name">Train</div><div className="split-years">2003 – 2017</div><div className="split-n">~65K company-years</div></div>
            <div className="split-block val"><div className="split-name">Validation</div><div className="split-years">2018 – 2019</div><div className="split-n">~11K company-years</div></div>
            <div className="split-block test"><div className="split-name">Test</div><div className="split-years">2020 – 2023</div><div className="split-n">~12K company-years</div></div>
          </div>
        </div>
      </div>

      <div className="divider" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        <div>
          <div className="section-label">The 18 Financial Ratios</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
            {['r_wc_ta · X1','r_re_ta · X2','r_ebit_ta · X3','r_mv_tl · X4','r_sale_ta · X5','r_tl_ta','r_cl_ca','r_ni_ta','r_log_at','r_gross_margin','r_oper_margin','r_net_margin','r_ebitda_margin','r_opex_ratio','r_da_intensity','r_ltdebt_ta','r_inv_turn','r_recv_turn'].map(r => (
              <span key={r} className="tag">{r}</span>
            ))}
          </div>
          <p style={{ fontSize: '.78rem', color: 'var(--slate-500)', lineHeight: 1.65, marginTop: '.85rem' }}>
            Drawn from classical frameworks: Altman Z-Score (X1–X5), Ohlson O-Score, Zmijewski, plus modern margin and leverage ratios. Each company gets 5 consecutive years → a time-ordered sequence the LSTM reads.
          </p>
        </div>
        <div>
          <div className="section-label">No future data leaking in</div>
          <div className="info-box">
            <strong style={{ color: 'var(--blue-900)' }}>Train-only scaling.</strong> All normalization statistics (outlier cutoffs, means, standard deviations) are calculated using only training-period data, then frozen and applied to validation and test sets.
            <br /><br />
            This matters: if you let test data influence your preprocessing, your results look better than they really are. We don't do that.
          </div>
        </div>
      </div>
    </div>
  )
}
