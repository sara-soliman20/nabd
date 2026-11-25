// «نبوض»: قلب لطيف بضمادة. يظهر في الواجهة وفي أيقونة التطبيق.
// mood: happy | wave | worry | cheer
export default function Mascot({ size = 120, mood = 'happy', animate = true, className = '' }) {
  const INK = '#33252F'
  const arm = (d, hand) => (<g>
    <path d={d} fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" />
    <path d={d} fill="none" stroke="#FF7C99" strokeWidth="6" strokeLinecap="round" />
    <circle cx={hand[0]} cy={hand[1]} r="8" fill="#FF7C99" stroke={INK} strokeWidth="4" /></g>)
  return (<svg viewBox="0 0 200 200" width={size} height={size} className={`${animate ? 'mascot-bob' : ''} ${className}`} role="img" aria-label="Nabd" focusable="false">
    <ellipse cx="100" cy="190" rx="46" ry="6" fill={INK} opacity=".12" />
    <g className={animate ? 'mascot-body' : ''}>
      {mood === 'wave' || mood === 'cheer' ? arm('M168 104 Q190 92 186 66', [186, 62]) : arm('M168 112 Q184 118 182 132', [182, 135])}
      {mood === 'cheer' ? arm('M32 104 Q10 92 14 66', [14, 62]) : arm('M32 112 Q16 118 18 132', [18, 135])}
      <path d="M100 178 C40 134 12 100 12 66 C12 38 34 18 62 18 C80 18 94 28 100 42 C106 28 120 18 138 18 C166 18 188 38 188 66 C188 100 160 134 100 178 Z" fill="#FF6B8B" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M40 60 C40 48 50 38 62 38" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="8" strokeLinecap="round" />
      <g transform="rotate(-32 150 40)"><rect x="124" y="30" width="52" height="22" rx="8" fill="#FFE8A3" stroke={INK} strokeWidth="4" />
        <rect x="140" y="30" width="20" height="22" fill="#FFD36B" stroke={INK} strokeWidth="0" /><circle cx="146" cy="38" r="1.8" fill={INK} /><circle cx="154" cy="38" r="1.8" fill={INK} /><circle cx="146" cy="45" r="1.8" fill={INK} /><circle cx="154" cy="45" r="1.8" fill={INK} /></g>
      <g className={animate ? 'mascot-eye' : ''}>
        {mood === 'cheer'
          ? (<><path d="M62 96 Q74 80 86 96" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" /><path d="M114 96 Q126 80 138 96" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" /></>)
          : (<><ellipse cx="74" cy="94" rx="9" ry="12" fill={INK} /><ellipse cx="126" cy="94" rx="9" ry="12" fill={INK} /><circle cx="77" cy="89" r="3.4" fill="#fff" /><circle cx="129" cy="89" r="3.4" fill="#fff" /></>)}
      </g>
      <ellipse cx="54" cy="114" rx="12" ry="7.5" fill="#FFB3C6" /><ellipse cx="146" cy="114" rx="12" ry="7.5" fill="#FFB3C6" />
      {mood === 'worry'
        ? <path d="M90 124 Q100 114 110 124" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
        : mood === 'cheer'
          ? <path d="M88 110 Q100 132 112 110 Z" fill="#fff" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          : <path d="M89 112 Q100 124 111 112" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />}
    </g>
  </svg>)
}
