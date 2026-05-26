/* Tiny drawdown-curve monogram. A line rises, peaks, falls, and recovers.
   Used as the sidebar logo mark and exported for the favicon.
   Two sizes:
     <Monogram />            for the sidebar (compact, 28px square)
     <Monogram size={64} />  for a larger context if needed
*/

export default function Monogram({ size = 28, strokeColor = 'var(--surface)', fillColor = 'var(--blue-900)' }) {
  const stroke = Math.max(1.8, size / 14)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      role="img"
      aria-label="DrawdownSignal monogram"
    >
      <rect x={0} y={0} width={28} height={28} rx={6} fill={fillColor} />
      {/* Drawdown curve: rise, peak, plunge, partial recovery */}
      <path
        d="M 4 18 Q 8 14, 11 10 Q 13 8.5, 14 9 Q 16 13, 18 19 Q 20 22, 22 20"
        fill="none"
        stroke={strokeColor}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Peak dot */}
      <circle cx={13} cy={8.7} r={1.6} fill="#F59E0B" />
      {/* Trough dot */}
      <circle cx={19} cy={20} r={1.6} fill="#EF4444" />
    </svg>
  )
}
