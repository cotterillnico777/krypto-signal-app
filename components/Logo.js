// Offizielles Finlyra-Logo (Kreis-Monogramm) -- Quelle: public/logo.svg,
// hier inline als JSX eingebettet statt per <img> referenziert, damit es
// verlustfrei auf jeder Größe skaliert und keinen zusätzlichen Request
// braucht. Ersetzt das vorherige Platzhalter-"F"-in-Farbverlauf-Quadrat
// (.brand-mark) überall im gleichen 40x40-Kontext.
export default function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 800 800" style={{ borderRadius: "22%", display: "block" }} aria-label="Finlyra">
      <defs>
        <radialGradient id="finlyra-logo-bg" cx="50%" cy="38%" r="62%">
          <stop offset="0%" stopColor="#262b36" />
          <stop offset="100%" stopColor="#1b1e26" />
        </radialGradient>
      </defs>
      <rect width="800" height="800" fill="url(#finlyra-logo-bg)" />
      <circle cx="400" cy="400" r="288" fill="none" stroke="#3a3f4c" strokeWidth="1.5" />
      <g transform="translate(220,220)">
        <text x="180" y="255" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="248" fontStyle="italic" fill="#d4af6a">F</text>
        <polyline points="70,232 118,208 150,222 196,150 236,178 292,110" fill="none" stroke="#d4af6a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="292" cy="110" r="9" fill="#d4af6a" />
      </g>
    </svg>
  );
}
