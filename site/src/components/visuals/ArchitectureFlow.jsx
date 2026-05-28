import { motion } from 'framer-motion'

/* Visual architecture data-flow diagram for the Financial LSTM (Full Fusion).
   Two input tensors flow into the LSTM and MLP branches, fuse, and produce
   a single predicted drawdown. Animated dots travel down each branch on load.
*/

const Box = ({ x, y, w, h, label, sub, color = 'var(--blue-50)', stroke = 'var(--blue-500)', textColor = 'var(--blue-700)', mono = false }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={8} fill={color} stroke={stroke} strokeWidth={1.5} />
    <text x={x + w / 2} y={y + h / 2 - 4} textAnchor="middle"
      fontSize={12} fontWeight={700}
      fontFamily={mono ? 'var(--mono)' : 'var(--sans)'}
      fill={textColor}
    >{label}</text>
    {sub && (
      <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle"
        fontSize={10}
        fontFamily="var(--mono)"
        fill="var(--text-3)"
      >{sub}</text>
    )}
  </g>
)

const Arrow = ({ from, to, delay = 0 }) => {
  const [x1, y1] = from
  const [x2, y2] = to
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="var(--border-2)" strokeWidth={1.5} strokeLinecap="round"
        markerEnd="url(#arrowHead)"
      />
      <motion.circle r={4} fill="var(--blue-500)"
        initial={{ cx: x1, cy: y1, opacity: 0 }}
        animate={{ cx: [x1, x2], cy: [y1, y2], opacity: [0, 1, 1, 0] }}
        transition={{
          delay,
          duration: 1.6,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatDelay: 1.2
        }}
      />
    </g>
  )
}

export default function ArchitectureFlow() {
  const W = 760
  const H = 360

  // Layout coordinates
  const finIn   = { x: 60,  y: 30,  w: 200, h: 56 }
  const lstm    = { x: 60,  y: 130, w: 200, h: 56 }
  const priceIn = { x: 500, y: 30,  w: 200, h: 56 }
  const mlp     = { x: 500, y: 130, w: 200, h: 56 }
  const fusion  = { x: 240, y: 230, w: 280, h: 56 }
  const head    = { x: 290, y: 305, w: 180, h: 40 }

  return (
    <div className="card card-p" style={{ marginBottom: 'var(--sp-6)' }}>
      <div className="section-label" style={{ marginBottom: 'var(--sp-3)' }}>Architecture</div>
      <svg viewBox={`0 0 ${W} ${H + 20}`} width="100%" style={{ display: 'block' }}>
        <defs>
          <marker id="arrowHead" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-2)" />
          </marker>
        </defs>

        {/* Inputs */}
        <Box x={finIn.x} y={finIn.y} w={finIn.w} h={finIn.h}
          label="Financial Ratios"
          sub="(B, 5, 18) tensor"
          color="var(--blue-50)" stroke="var(--blue-500)" textColor="var(--blue-700)"
        />
        <Box x={priceIn.x} y={priceIn.y} w={priceIn.w} h={priceIn.h}
          label="Price Features"
          sub="(B, 7) tensor"
          color="rgba(245,158,11,.10)" stroke="var(--amber)" textColor="#92400E"
        />

        {/* Encoders */}
        <Box x={lstm.x} y={lstm.y} w={lstm.w} h={lstm.h}
          label="LSTM"
          sub="2 layers · hidden 64"
          color="var(--surface)" stroke="var(--blue-500)" textColor="var(--text-1)"
        />
        <Box x={mlp.x} y={mlp.y} w={mlp.w} h={mlp.h}
          label="MLP"
          sub="32 → 32 → 16"
          color="var(--surface)" stroke="var(--amber)" textColor="var(--text-1)"
        />

        {/* Fusion */}
        <Box x={fusion.x} y={fusion.y} w={fusion.w} h={fusion.h}
          label="Concat → Fusion Head"
          sub="48-d → LayerNorm → MLP[32,32]"
          color="var(--bg-2)" stroke="var(--border-2)" textColor="var(--text-1)"
        />

        {/* Output */}
        <Box x={head.x} y={head.y} w={head.w} h={head.h}
          label="Predicted Drawdown"
          color="rgba(34,197,94,.10)" stroke="var(--green)" textColor="var(--green)" mono={false}
        />

        {/* Arrows */}
        <Arrow from={[finIn.x + finIn.w / 2, finIn.y + finIn.h]} to={[lstm.x + lstm.w / 2, lstm.y]} delay={0} />
        <Arrow from={[priceIn.x + priceIn.w / 2, priceIn.y + priceIn.h]} to={[mlp.x + mlp.w / 2, mlp.y]} delay={0.2} />
        <Arrow from={[lstm.x + lstm.w / 2, lstm.y + lstm.h]} to={[fusion.x + fusion.w / 2 - 60, fusion.y]} delay={0.5} />
        <Arrow from={[mlp.x + mlp.w / 2, mlp.y + mlp.h]} to={[fusion.x + fusion.w / 2 + 60, fusion.y]} delay={0.7} />
        <Arrow from={[fusion.x + fusion.w / 2, fusion.y + fusion.h]} to={[head.x + head.w / 2, head.y]} delay={1.0} />
      </svg>

      <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', marginTop: 'var(--sp-3)', fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
        <span>Loss: <strong style={{ color: 'var(--text-2)' }}>Huber(δ=.05)</strong> + <strong style={{ color: 'var(--text-2)' }}>0.3 · BCE</strong> auxiliary head</span>
        <span>Optim: <strong style={{ color: 'var(--text-2)' }}>AdamW(1e-3)</strong> · cosine schedule · patience 8</span>
        <span>Inference: <strong style={{ color: 'var(--text-2)' }}>3-seed ensemble</strong></span>
      </div>
    </div>
  )
}
