// Built-in vector product illustrations (studio-style, one per product type).
// They never break, cost no bandwidth, and are replaced by a real photo when a product
// has an `image` set in data/products.js.
const Defs = () => (
  <defs>
    <linearGradient id="pa-burg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a8323a" /><stop offset="1" stopColor="#4a0f18" /></linearGradient>
    <linearGradient id="pa-burg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8d2630" /><stop offset="1" stopColor="#3a0b13" /></linearGradient>
    <linearGradient id="pa-dark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3b3f47" /><stop offset="1" stopColor="#101216" /></linearGradient>
    <linearGradient id="pa-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e6e8ec" /><stop offset="1" stopColor="#8b9099" /></linearGradient>
    <linearGradient id="pa-screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#173a52" /><stop offset="1" stopColor="#07131c" /></linearGradient>
    <linearGradient id="pa-orange" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff7a45" /><stop offset="1" stopColor="#d6321a" /></linearGradient>
    <radialGradient id="pa-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#7c5cff" stopOpacity="0.85" /><stop offset="1" stopColor="#7c5cff" stopOpacity="0" /></radialGradient>
    <filter id="pa-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
  </defs>
);

const Shadow = ({ w = 70 }) => <ellipse cx="120" cy="158" rx={w} ry="8" fill="#000" opacity="0.28" filter="url(#pa-soft)" />;

const ART = {
  seat: (
    <g>
      <Shadow />
      <rect x="102" y="14" width="36" height="24" rx="11" fill="url(#pa-burg2)" />
      <path d="M78 150V72Q78 40 120 40Q162 40 162 72V150Z" fill="url(#pa-burg)" />
      <path d="M68 150Q68 126 100 124H140Q172 126 172 150Z" fill="url(#pa-burg2)" />
      <g stroke="#f3c9c9" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="3 3" fill="none">
        <path d="M95 52Q120 46 145 52" /><path d="M92 80H148" /><path d="M92 106H148" />
        <path d="M108 50V116" /><path d="M132 50V116" /><path d="M80 138Q120 130 160 138" />
      </g>
    </g>
  ),
  mats: (
    <g>
      <Shadow w={80} />
      <path d="M52 140L72 40Q74 30 84 30H132Q140 30 140 40L136 72Q150 76 154 92L166 140Q168 150 158 150H60Q50 150 52 140Z" fill="url(#pa-dark)" />
      <path d="M60 138L78 44Q79 38 85 38H129Q133 38 133 44L129 76Q146 80 150 96L160 138" fill="none" stroke="#c9a15b" strokeWidth="1.6" strokeDasharray="4 3" />
      <g fill="#fff" opacity="0.08">{[0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4, 5].map((c) => <rect key={r + '-' + c} x={78 + c * 14} y={54 + r * 16} width="9" height="9" rx="2" />))}</g>
      <rect x="96" y="112" width="34" height="14" rx="4" fill="#fff" opacity="0.1" />
    </g>
  ),
  gps: (
    <g>
      <Shadow w={78} />
      <rect x="36" y="38" width="168" height="98" rx="12" fill="url(#pa-dark)" />
      <rect x="44" y="46" width="152" height="82" rx="7" fill="url(#pa-screen)" />
      <path d="M44 100Q80 84 100 96T150 78T196 90" stroke="#2c6a8c" strokeWidth="9" fill="none" opacity="0.5" />
      <path d="M56 118C80 100 96 108 120 90S168 70 186 58" stroke="#ff7a45" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="186" cy="58" r="5" fill="#ff7a45" /><circle cx="56" cy="118" r="4" fill="#fff" />
      <rect x="112" y="136" width="16" height="14" fill="#1b1d22" /><rect x="94" y="148" width="52" height="6" rx="3" fill="#2a2d34" />
    </g>
  ),
  dashcam: (
    <g>
      <Shadow />
      <rect x="112" y="28" width="16" height="30" rx="3" fill="#2a2d34" />
      <rect x="64" y="52" width="112" height="64" rx="14" fill="url(#pa-dark)" />
      <circle cx="108" cy="84" r="22" fill="#0b0d10" /><circle cx="108" cy="84" r="15" fill="#10263a" /><circle cx="103" cy="78" r="5" fill="#fff" opacity="0.55" />
      <rect x="140" y="64" width="26" height="40" rx="5" fill="#0d0f13" />
      <circle cx="153" cy="74" r="3" fill="#ff4d2e" /><rect x="145" y="84" width="16" height="3" rx="1.5" fill="#4a4f59" /><rect x="145" y="92" width="16" height="3" rx="1.5" fill="#4a4f59" />
      <path d="M170 110Q190 124 176 146" stroke="#1b1d22" strokeWidth="3" fill="none" />
    </g>
  ),
  roof: (
    <g>
      <Shadow w={86} />
      <path d="M30 108Q32 70 80 62L176 60Q208 62 212 100L210 118H34Z" fill="url(#pa-dark)" />
      <path d="M40 106Q44 78 84 72L172 70Q198 72 202 98" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M60 110H190" stroke="#fff" strokeOpacity="0.14" strokeWidth="2" />
      <rect x="48" y="118" width="12" height="16" rx="2" fill="url(#pa-steel)" /><rect x="180" y="118" width="12" height="16" rx="2" fill="url(#pa-steel)" />
      <rect x="30" y="132" width="180" height="8" rx="4" fill="url(#pa-steel)" />
      <rect x="116" y="88" width="14" height="6" rx="3" fill="#ff4d2e" />
    </g>
  ),
  led: (
    <g>
      <ellipse cx="120" cy="96" rx="92" ry="50" fill="url(#pa-glow)" />
      <path d="M36 118Q80 56 120 78T204 52" stroke="#a78bff" strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.5" filter="url(#pa-soft)" />
      <path d="M36 118Q80 56 120 78T204 52" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M36 118Q80 56 120 78T204 52" stroke="#7c5cff" strokeWidth="2" strokeLinecap="round" fill="none" />
      <rect x="92" y="122" width="56" height="26" rx="8" fill="url(#pa-dark)" /><circle cx="120" cy="135" r="6" fill="#7c5cff" />
    </g>
  ),
  carplay: (
    <g>
      <Shadow w={60} />
      <rect x="82" y="40" width="76" height="96" rx="16" fill="url(#pa-dark)" />
      <rect x="92" y="52" width="56" height="34" rx="9" fill="url(#pa-screen)" />
      <circle cx="120" cy="69" r="10" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="2" /><path d="M115 69L122 63V75Z" fill="#fff" />
      <rect x="108" y="96" width="24" height="5" rx="2.5" fill="#4a4f59" /><rect x="100" y="108" width="40" height="5" rx="2.5" fill="#2a2d34" />
      <rect x="112" y="136" width="16" height="12" fill="url(#pa-steel)" />
      <path d="M120 148Q120 160 150 158" stroke="#1b1d22" strokeWidth="3.5" fill="none" />
    </g>
  ),
  vacuum: (
    <g>
      <Shadow />
      <path d="M58 76H132Q150 76 156 92L164 112Q166 122 156 122H76Q58 122 58 106Z" fill="url(#pa-dark)" />
      <path d="M132 86L204 112" stroke="url(#pa-steel)" strokeWidth="14" strokeLinecap="round" />
      <rect x="64" y="88" width="42" height="22" rx="6" fill="url(#pa-orange)" />
      <rect x="118" y="124" width="20" height="30" rx="6" fill="#16181d" /><rect x="120" y="128" width="16" height="4" rx="2" fill="#ff7a45" />
      <circle cx="82" cy="99" r="5" fill="#fff" opacity="0.7" />
    </g>
  ),
  inflator: (
    <g>
      <Shadow />
      <rect x="58" y="52" width="112" height="84" rx="16" fill="url(#pa-dark)" />
      <circle cx="104" cy="92" r="30" fill="#0d0f13" /><circle cx="104" cy="92" r="25" fill="#101c26" stroke="#4a4f59" strokeWidth="2" />
      <text x="104" y="98" textAnchor="middle" fontSize="19" fontWeight="700" fill="#7be0ff" fontFamily="monospace">36</text>
      <rect x="146" y="66" width="14" height="14" rx="3" fill="url(#pa-orange)" /><rect x="146" y="90" width="14" height="14" rx="3" fill="#2a2d34" />
      <path d="M170 112Q206 112 204 140" stroke="#1b1d22" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="204" cy="144" r="8" fill="url(#pa-steel)" />
    </g>
  ),
  wheel: (
    <g>
      <Shadow />
      <circle cx="120" cy="92" r="58" fill="none" stroke="#1b1d22" strokeWidth="22" />
      <circle cx="120" cy="92" r="58" fill="none" stroke="url(#pa-burg)" strokeWidth="14" />
      <circle cx="120" cy="92" r="58" fill="none" stroke="#f3d9b0" strokeWidth="1.4" strokeDasharray="3 4" />
      <path d="M62 92H98L108 112H132L142 92H178" stroke="#1b1d22" strokeWidth="14" fill="none" strokeLinejoin="round" />
      <circle cx="120" cy="92" r="14" fill="#0e1014" /><circle cx="120" cy="92" r="6" fill="url(#pa-steel)" />
    </g>
  ),
  sensors: (
    <g>
      <Shadow w={88} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx={58 + i * 42} cy="104" r="15" fill="url(#pa-dark)" /><circle cx={58 + i * 42} cy="104" r="7.5" fill="#0b0d10" stroke="#4a4f59" strokeWidth="1.5" />
          <path d={`M${50 + i * 42} 78Q${58 + i * 42} 70 ${66 + i * 42} 78`} stroke="#ff7a45" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d={`M${45 + i * 42} 68Q${58 + i * 42} 56 ${71 + i * 42} 68`} stroke="#ff7a45" strokeOpacity="0.55" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
      ))}
      <rect x="82" y="132" width="76" height="18" rx="5" fill="url(#pa-dark)" /><rect x="90" y="138" width="22" height="6" rx="3" fill="#ff4d2e" /><rect x="118" y="138" width="14" height="6" rx="3" fill="#ffb02e" /><rect x="138" y="138" width="10" height="6" rx="3" fill="#3ddc84" />
    </g>
  ),
  headlamp: (
    <g>
      <Shadow w={80} />
      <path d="M32 112Q30 70 74 58L200 48Q218 48 214 70L206 112Q130 124 32 112Z" fill="url(#pa-dark)" />
      <circle cx="92" cy="90" r="24" fill="#0b0d10" /><circle cx="92" cy="90" r="16" fill="url(#pa-steel)" /><circle cx="92" cy="90" r="9" fill="#10263a" />
      <circle cx="150" cy="86" r="20" fill="#0b0d10" /><circle cx="150" cy="86" r="13" fill="url(#pa-steel)" /><circle cx="150" cy="86" r="7" fill="#10263a" />
      <path d="M58 66Q130 54 202 58" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  mirror: (
    <g>
      <Shadow w={70} />
      <path d="M60 70Q60 40 100 38L170 40Q196 44 192 76Q188 100 150 104L96 106Q60 104 60 70Z" fill="url(#pa-dark)" />
      <path d="M72 70Q72 50 100 48L166 50Q182 54 180 74Q176 92 148 94L98 96Q72 94 72 70Z" fill="url(#pa-steel)" />
      <rect x="176" y="76" width="34" height="14" rx="6" fill="#23262d" />
      <path d="M96 58L164 60" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  dash: (
    <g>
      <Shadow w={88} />
      <path d="M26 96Q30 54 120 48Q210 54 214 96L214 118Q120 104 26 118Z" fill="url(#pa-burg2)" />
      <path d="M40 98Q120 72 200 98" stroke="#f3d9b0" strokeOpacity="0.6" strokeWidth="1.4" strokeDasharray="4 3" fill="none" />
      <rect x="82" y="84" width="34" height="10" rx="3" fill="#16181d" /><rect x="124" y="84" width="34" height="10" rx="3" fill="#16181d" />
      <circle cx="60" cy="102" r="8" fill="#1b1d22" /><circle cx="180" cy="102" r="8" fill="#1b1d22" />
    </g>
  ),
  cushion: (
    <g>
      <Shadow w={70} />
      <rect x="52" y="52" width="136" height="74" rx="30" fill="url(#pa-burg)" />
      <path d="M62 70Q120 50 178 70" stroke="#f3c9c9" strokeOpacity="0.5" strokeWidth="1.4" strokeDasharray="4 3" fill="none" />
      <rect x="104" y="122" width="32" height="8" rx="4" fill="#16181d" />
    </g>
  ),
  gear: (
    <g>
      <Shadow w={56} />
      <rect x="108" y="86" width="24" height="52" rx="8" fill="url(#pa-steel)" />
      <path d="M96 90Q96 40 120 36Q144 40 144 90Z" fill="url(#pa-dark)" />
      <path d="M108 56Q120 48 132 56" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" fill="none" />
      <rect x="78" y="138" width="84" height="14" rx="5" fill="#1b1d22" />
    </g>
  ),
  pedal: (
    <g>
      <Shadow w={72} />
      <rect x="70" y="40" width="40" height="96" rx="8" fill="url(#pa-steel)" />
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x="76" y={50 + i * 14} width="28" height="5" rx="2.5" fill="#2a2d34" />)}
      <rect x="130" y="70" width="44" height="64" rx="8" fill="url(#pa-steel)" />
      {[0, 1, 2, 3].map((i) => <rect key={'b' + i} x="136" y={80 + i * 13} width="32" height="5" rx="2.5" fill="#2a2d34" />)}
    </g>
  ),
  sill: (
    <g>
      <Shadow w={88} />
      <path d="M30 104L60 78H190L214 104Z" fill="url(#pa-steel)" />
      <path d="M44 102L66 84H184L202 102Z" fill="#1b1d22" />
      <path d="M70 96H176" stroke="#7be0ff" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  ),
  handle: (
    <g>
      <Shadow w={70} />
      <rect x="40" y="62" width="160" height="56" rx="18" fill="url(#pa-dark)" />
      <rect x="56" y="76" width="128" height="22" rx="11" fill="url(#pa-steel)" />
      <rect x="62" y="80" width="116" height="6" rx="3" fill="#fff" opacity="0.6" />
      <circle cx="196" cy="90" r="5" fill="#0b0d10" />
    </g>
  ),
  fog: (
    <g>
      <Shadow w={74} />
      <rect x="52" y="48" width="136" height="84" rx="26" fill="url(#pa-dark)" />
      <circle cx="120" cy="90" r="30" fill="#0b0d10" />
      <circle cx="120" cy="90" r="22" fill="url(#pa-steel)" />
      <circle cx="120" cy="90" r="13" fill="#e8f3ff" />
      <circle cx="114" cy="84" r="4" fill="#fff" />
    </g>
  ),
  grille: (
    <g>
      <Shadow w={84} />
      <path d="M30 64Q120 40 210 64L200 124Q120 138 40 124Z" fill="url(#pa-dark)" />
      {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4, 5, 6, 7].map((c) => <rect key={r + '-' + c} x={58 + c * 16 + (r % 2) * 8} y={72 + r * 13} width="9" height="8" rx="2" fill="url(#pa-steel)" />))}
    </g>
  ),
  taillamp: (
    <g>
      <Shadow w={78} />
      <path d="M34 70Q40 50 86 50L206 56Q220 58 214 84L206 110Q120 126 38 110Z" fill="url(#pa-dark)" />
      <path d="M52 86H198" stroke="#ff7a45" strokeWidth="8" strokeLinecap="round" />
      <path d="M52 104H176" stroke="#ff4d2e" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
    </g>
  ),
  skid: (
    <g>
      <Shadow w={88} />
      <path d="M26 112L58 66H182L214 112Q120 128 26 112Z" fill="url(#pa-steel)" />
      <path d="M46 108L68 76H172L194 108Q120 120 46 108Z" fill="#8b9099" />
      <rect x="96" y="86" width="48" height="10" rx="5" fill="#1b1d22" />
    </g>
  ),
  alloy: (
    <g>
      <Shadow w={64} />
      <circle cx="120" cy="86" r="62" fill="#1b1d22" />
      <circle cx="120" cy="86" r="52" fill="url(#pa-steel)" />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d="M120 86L134 44L106 44Z" fill="url(#pa-dark)" transform={'rotate(' + i * 72 + ' 120 86)'} />)}
      <circle cx="120" cy="86" r="11" fill="#0e1014" />
      <circle cx="120" cy="86" r="5" fill="url(#pa-steel)" />
    </g>
  ),
  tyre: (
    <g>
      <Shadow w={64} />
      <circle cx="120" cy="86" r="62" fill="#111215" />
      <circle cx="120" cy="86" r="62" fill="none" stroke="#2a2d34" strokeWidth="2" strokeDasharray="5 6" />
      <circle cx="120" cy="86" r="38" fill="#1b1d22" />
      <circle cx="120" cy="86" r="32" fill="url(#pa-steel)" />
      <circle cx="120" cy="86" r="10" fill="#0e1014" />
    </g>
  ),
  disc: (
    <g>
      <Shadow w={62} />
      <circle cx="120" cy="86" r="60" fill="url(#pa-steel)" />
      <circle cx="120" cy="86" r="22" fill="#2a2d34" />
      {Array.from({ length: 12 }).map((_, i) => <circle key={i} cx={120 + Math.cos((i * Math.PI) / 6) * 42} cy={86 + Math.sin((i * Math.PI) / 6) * 42} r="4" fill="#4a4f59" />)}
      <circle cx="120" cy="86" r="8" fill="#0e1014" />
      <rect x="164" y="110" width="26" height="22" rx="5" fill="url(#pa-orange)" />
    </g>
  ),
  armrest: (
    <g>
      <Shadow w={74} />
      <rect x="34" y="62" width="172" height="52" rx="22" fill="url(#pa-dark)" />
      <rect x="46" y="70" width="148" height="30" rx="15" fill="url(#pa-burg)" />
      <path d="M58 85H182" stroke="#f3c9c9" strokeOpacity="0.5" strokeWidth="1.4" strokeDasharray="4 3" />
      <rect x="104" y="112" width="32" height="12" rx="4" fill="#16181d" />
    </g>
  ),
  panel: (
    <g>
      <Shadow w={84} />
      <path d="M40 40H200L190 128H52Z" fill="url(#pa-dark)" />
      <path d="M54 54H186L178 100H62Z" fill="url(#pa-burg)" />
      <path d="M66 70H174" stroke="#f3c9c9" strokeOpacity="0.5" strokeWidth="1.4" strokeDasharray="4 3" />
      <rect x="64" y="108" width="112" height="10" rx="5" fill="url(#pa-steel)" />
      <rect x="150" y="62" width="22" height="9" rx="4.5" fill="url(#pa-steel)" />
    </g>
  ),
  cluster: (
    <g>
      <Shadow w={84} />
      <rect x="28" y="44" width="184" height="84" rx="20" fill="url(#pa-dark)" />
      <circle cx="82" cy="86" r="30" fill="#0b0d10" stroke="#3a3f49" strokeWidth="2" />
      <circle cx="158" cy="86" r="30" fill="#0b0d10" stroke="#3a3f49" strokeWidth="2" />
      <path d="M82 86L100 70" stroke="#ff7a45" strokeWidth="3" strokeLinecap="round" />
      <path d="M158 86L142 100" stroke="#7be0ff" strokeWidth="3" strokeLinecap="round" />
      <rect x="104" y="96" width="32" height="14" rx="4" fill="#1b2430" />
    </g>
  ),
  spoiler: (
    <g>
      <Shadow w={88} />
      <path d="M26 84Q30 66 70 62L172 62Q206 62 214 78L216 94Q200 90 166 92L60 96Q34 98 26 84Z" fill="url(#pa-dark)" />
      <path d="M40 80Q70 72 170 72Q200 72 208 82" stroke="#fff" strokeOpacity="0.28" strokeWidth="2" fill="none" />
      <rect x="62" y="94" width="14" height="40" rx="3" fill="#16181d" /><rect x="164" y="94" width="14" height="40" rx="3" fill="#16181d" />
      <rect x="44" y="132" width="152" height="8" rx="4" fill="#23262d" />
    </g>
  ),
};

export default function ProductArt({ type, image, alt = '' }) {
  if (image) return <img className="pa-img" src={image} alt={alt} loading="lazy" />;
  return (
    <svg className="pa-svg" viewBox="0 0 240 170" role="img" aria-label={alt}>
      <Defs />
      {ART[type] || ART.gps}
    </svg>
  );
}
