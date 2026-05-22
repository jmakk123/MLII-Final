const SLIDES = [
  {
    num: '01', eyebrow: 'The Problem', title: 'Predicting the Fall Before It Happens',
    body: 'Bankruptcies are too rare to model well. Raw returns are too noisy. Forward maximum drawdown is the number in between — measurable for every public company, and directly useful to risk managers.',
    callout: '52% of companies in our test set fell more than 30% at some point during 2020–2023. This is not a rare edge case — it\'s routine.', calloutStyle: 'amber',
  },
  {
    num: '02', eyebrow: 'The Data', title: '25 Years, Two Sources, One Tensor',
    body: 'Annual company financial filings (1999–2025) linked to daily stock prices. For each company-year, we build a 5-year window of 18 accounting ratios plus 7 recent price stats. Everything is scaled using only training-era data.',
    callout: '87,995 company-years · 29M daily stock rows · no future data leaking into training', calloutStyle: 'blue',
  },
  {
    num: '03', eyebrow: 'The Architecture', title: 'Four Variants, One Winner',
    body: 'We tested different network architectures — with and without stock price data as a second input. The winner: accounting data only, read as a time sequence. Adding stock prices actually made things worse — five years of financial ratios already contains what the price data was trying to add.',
    callout: 'Architecture: 5-year accounting sequence → LSTM → 32 features → prediction. Trained with early stopping to avoid overfitting.', calloutStyle: 'blue',
  },
  {
    num: '04', eyebrow: 'The Result', title: 'Beats Vol-Only — With a Surprise', hi: true,
    body: 'Our model beats the simple volatility baseline on MAE (−6%), R² (+76%), and Brier score (−54%). Ranking accuracy is roughly tied. The key finding: stock price data added noise, not signal — accounting history alone was enough.',
    callout: '✓ MAE −5.8%   ✓ R² +76%   ✓ Brier −54%   ≈ PR-AUC (tie)', calloutStyle: 'blue',
  },
  {
    num: '05', eyebrow: 'Why It Matters', title: 'From Signal to Decision',
    body: 'A reliable drawdown score is immediately useful: banks can flag risky borrowers earlier, hedge funds can build their short lists, VCs can screen investments, and portfolio managers can size hedges. The score updates once per year when a company files its annual report.',
    callout: '9 out of 10 companies we flag as highest-risk actually end up in the worst-performing 10% that year.', calloutStyle: 'amber',
  },
  {
    num: '06', eyebrow: 'Honest Assessment', title: 'Limitations & Next Steps',
    body: 'Stock price features added noise rather than signal — an unexpected result. Next steps: train separate models per industry sector, add macro features like interest rates and market volatility, and update predictions quarterly instead of annually.',
    callout: 'This is a risk screener, not a crystal ball. Knowing which 10% of companies are most likely to collapse is already very valuable.', calloutStyle: 'amber',
  },
]

export default function Presentation() {
  return (
    <div className="page-wrap">
      <div className="eyebrow">06 — Presentation</div>
      <h1 className="page-title">The story<br />in six slides.</h1>
      <p className="page-sub">The main points from our final presentation, condensed.</p>
      {SLIDES.map(({ num, eyebrow, title, body, callout, calloutStyle, hi }) => (
        <div key={num} className="slide">
          <div className={`slide-num${hi ? ' hi' : ''}`}>{num}</div>
          <div>
            <div className="slide-eyebrow">{eyebrow}</div>
            <div className="slide-title">{title}</div>
            <div className="slide-body">{body}</div>
            <div className={`slide-callout ${calloutStyle}`}>{callout}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
