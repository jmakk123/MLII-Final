import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Scatter } from 'recharts'
import predictions from '../../data/predictions.json'

/* Two diagnostic charts side by side.
   Left: Precision-Recall curve for the binary task "stock dropped > 30%".
   Right: Regression calibration plot, binned by predicted decile.
*/

const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  fontFamily: 'var(--mono)',
  color: 'var(--text-2)',
  boxShadow: 'var(--shadow-md)',
}

function buildPRCurve(rows) {
  /* Treat positive class = actual drawdown <= -0.30.
     Predicted score = -p so larger = more risky.
     Sort by score descending. Sweep threshold and compute precision and recall.
  */
  const items = rows.map(r => ({ score: -r.p, label: r.a <= -0.30 ? 1 : 0 }))
  items.sort((a, b) => b.score - a.score)
  const totalPos = items.reduce((s, x) => s + x.label, 0)
  let tp = 0, fp = 0
  const out = []
  // Sample every Nth row to keep curve light
  const stride = Math.max(1, Math.floor(items.length / 220))
  for (let i = 0; i < items.length; i++) {
    if (items[i].label === 1) tp++; else fp++
    if (i % stride === 0 || i === items.length - 1) {
      const precision = tp / (tp + fp)
      const recall = totalPos > 0 ? tp / totalPos : 0
      out.push({ recall, precision })
    }
  }
  return { curve: out, baseRate: totalPos / items.length }
}

function buildCalibration(rows, nBins = 12) {
  /* Bin predictions into nBins equal-frequency buckets, then plot mean predicted
     vs mean realized drawdown. A perfectly calibrated model lies on y = x.
  */
  const sorted = [...rows].sort((a, b) => a.p - b.p)
  const out = []
  const N = sorted.length
  const sz = Math.floor(N / nBins)
  for (let b = 0; b < nBins; b++) {
    const slice = sorted.slice(b * sz, b === nBins - 1 ? N : (b + 1) * sz)
    const mp = slice.reduce((s, x) => s + x.p, 0) / slice.length
    const ma = slice.reduce((s, x) => s + x.a, 0) / slice.length
    out.push({ pred: mp, actual: ma, n: slice.length })
  }
  return out
}

export default function PRCalibration() {
  const { pr, baseRate, calib } = useMemo(() => {
    const { curve, baseRate } = buildPRCurve(predictions)
    return { pr: curve, baseRate, calib: buildCalibration(predictions) }
  }, [])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
      {/* PR curve */}
      <div className="card card-p">
        <div className="section-label" style={{ marginBottom: '.3rem' }}>PR Curve · Did the stock drop &gt;30%?</div>
        <div style={{ fontSize: '.7rem', color: 'var(--text-4)', fontFamily: 'var(--mono)', marginBottom: '.6rem' }}>
          PR-AUC ≈ 0.852 · base rate {(baseRate * 100).toFixed(0)}%
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={pr} margin={{ top: 4, right: 8, bottom: 16, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="recall"
              type="number"
              domain={[0, 1]}
              tickFormatter={(v) => v.toFixed(1)}
              tick={{ fontSize: 10, fill: 'var(--text-4)', fontFamily: 'var(--mono)' }}
              axisLine={false} tickLine={false}
              label={{ value: 'Recall', position: 'insideBottom', offset: -4, style: { fontSize: 10, fontFamily: 'var(--mono)', fill: 'var(--text-3)' } }}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(v) => v.toFixed(1)}
              tick={{ fontSize: 10, fill: 'var(--text-4)', fontFamily: 'var(--mono)' }}
              axisLine={false} tickLine={false}
              width={32}
              label={{ value: 'Precision', angle: -90, position: 'insideLeft', offset: 8, style: { fontSize: 10, fontFamily: 'var(--mono)', fill: 'var(--text-3)' } }}
            />
            <Tooltip
              formatter={(v, n) => [v.toFixed(3), n]}
              labelFormatter={() => ''}
              contentStyle={TOOLTIP_STYLE}
              cursor={{ stroke: 'var(--blue-500)', strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.5 }}
            />
            <ReferenceLine y={baseRate} stroke="var(--text-4)" strokeDasharray="3 3" label={{ value: 'random', position: 'right', style: { fontSize: 9, fontFamily: 'var(--mono)', fill: 'var(--text-4)' } }} />
            <Line type="monotone" dataKey="precision" stroke="var(--blue-700)" strokeWidth={2} dot={false} isAnimationActive />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 'var(--sp-2)', lineHeight: 'var(--lh-relaxed)' }}>
          Curve hugs the top-left = the model ranks crash candidates correctly. The flat dashed line at {(baseRate * 100).toFixed(0)}% is what a random classifier would achieve.
        </div>
      </div>

      {/* Calibration */}
      <div className="card card-p">
        <div className="section-label" style={{ marginBottom: '.3rem' }}>Calibration · Predicted vs Realized</div>
        <div style={{ fontSize: '.7rem', color: 'var(--text-4)', fontFamily: 'var(--mono)', marginBottom: '.6rem' }}>
          12 equal-frequency bins · y = x is perfect
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={calib} margin={{ top: 4, right: 8, bottom: 16, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              type="number" dataKey="pred"
              domain={[-1, 0]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 10, fill: 'var(--text-4)', fontFamily: 'var(--mono)' }}
              axisLine={false} tickLine={false}
              label={{ value: 'Predicted drawdown', position: 'insideBottom', offset: -4, style: { fontSize: 10, fontFamily: 'var(--mono)', fill: 'var(--text-3)' } }}
            />
            <YAxis
              type="number" dataKey="actual"
              domain={[-1, 0]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 10, fill: 'var(--text-4)', fontFamily: 'var(--mono)' }}
              axisLine={false} tickLine={false}
              width={42}
              label={{ value: 'Realized', angle: -90, position: 'insideLeft', offset: 8, style: { fontSize: 10, fontFamily: 'var(--mono)', fill: 'var(--text-3)' } }}
            />
            <Tooltip
              formatter={(v, n) => {
                if (n === 'actual') return [`${(v * 100).toFixed(1)}%`, 'Realized']
                if (n === 'diag')   return [`${(v * 100).toFixed(1)}%`, 'Perfect']
                return [v, n]
              }}
              labelFormatter={(v) => `Predicted: ${(v * 100).toFixed(1)}%`}
              contentStyle={TOOLTIP_STYLE}
              cursor={{ strokeDasharray: '3 3' }}
            />
            {/* y = x diagonal reference */}
            <ReferenceLine
              segment={[{ x: -1, y: -1 }, { x: 0, y: 0 }]}
              stroke="var(--text-4)" strokeDasharray="4 3"
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="var(--blue-700)"
              strokeWidth={2}
              dot={{ fill: 'var(--blue-700)', r: 4 }}
              isAnimationActive
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 'var(--sp-2)', lineHeight: 'var(--lh-relaxed)' }}>
          Points near the dashed diagonal = predictions match outcomes on average. Bins below the diagonal are firms the model was too pessimistic on; above the diagonal, too optimistic.
        </div>
      </div>
    </div>
  )
}
