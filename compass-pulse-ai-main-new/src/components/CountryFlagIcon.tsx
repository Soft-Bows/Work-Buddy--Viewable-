// Small, simplified flag renders for the sidebar's theme picker. Deliberately NOT the Unicode flag
// emoji (COUNTRY_THEMES.flag) — Windows' emoji font doesn't render most regional-indicator flag
// glyphs as actual flags (many Windows/Chromium combinations fall back to blank tofu or the plain
// two-letter code), which is exactly why the picker was showing empty white circles instead of
// flags. A hand-drawn SVG renders identically everywhere, same approach as the mascot/skyline SVGs
// used throughout the rest of the app. These are simplified colour-block approximations, not
// pixel-accurate flags — enough to read as "that country's flag" at ~28px, paired with the country
// name in the button's title/label anyway.
const FLAGS: Record<string, React.ReactNode> = {
  australia: (
    <g>
      <rect width="32" height="32" fill="#00247D" />
      {[[6, 7], [10, 5], [9, 11], [14, 8], [24, 22]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 4 ? 1.6 : 1.1} fill="white" />
      ))}
    </g>
  ),
  cambodia: (
    <g>
      <rect width="32" height="32" fill="#032EA1" />
      <rect y="9" width="32" height="14" fill="#E00025" />
      <rect x="11" y="12" width="10" height="8" fill="white" opacity="0.9" />
    </g>
  ),
  "china-hk": (
    <g>
      <rect width="32" height="32" fill="#DE2910" />
      {[0, 72, 144, 216, 288].map(deg => (
        <ellipse key={deg} cx="16" cy="16" rx="3.4" ry="7.5" fill="white" opacity="0.92"
          transform={`rotate(${deg} 16 16) translate(0 -6.5)`} />
      ))}
      <circle cx="16" cy="16" r="1.6" fill="#DE2910" />
    </g>
  ),
  india: (
    <g>
      <rect width="32" height="10.7" fill="#FF9933" />
      <rect y="10.7" width="32" height="10.7" fill="white" />
      <rect y="21.3" width="32" height="10.7" fill="#138808" />
      <circle cx="16" cy="16" r="2.6" fill="none" stroke="#000088" strokeWidth="0.8" />
    </g>
  ),
  indonesia: (
    <g>
      <rect width="32" height="16" fill="#CE1126" />
      <rect y="16" width="32" height="16" fill="white" />
    </g>
  ),
  japan: (
    <g>
      <rect width="32" height="32" fill="white" />
      <circle cx="16" cy="16" r="7.5" fill="#BC002D" />
    </g>
  ),
  malaysia: (
    <g>
      <rect width="32" height="32" fill="white" />
      {[0, 2, 4, 6].map(i => <rect key={i} y={i * 4} width="32" height="4" fill="#CC0001" />)}
      <rect width="16" height="16" fill="#010066" />
      <circle cx="9" cy="8" r="4" fill="#FFCC00" />
      <circle cx="10.6" cy="8" r="3.4" fill="#010066" />
      <path d="M14 8 L16.5 6.6 L15.5 8 L16.5 9.4 Z" fill="#FFCC00" />
    </g>
  ),
  singapore: (
    <g>
      <rect width="32" height="16" fill="#EE2536" />
      <rect y="16" width="32" height="16" fill="white" />
      <circle cx="9" cy="8" r="3.6" fill="white" />
      <circle cx="10.6" cy="8" r="3" fill="#EE2536" />
      {[0, 1, 2, 3, 4].map(i => (
        <circle key={i} cx={13.5 + Math.cos((i / 5) * 2 * Math.PI - Math.PI / 2) * 3.2} cy={8 + Math.sin((i / 5) * 2 * Math.PI - Math.PI / 2) * 3.2} r="0.7" fill="white" />
      ))}
    </g>
  ),
  thailand: (
    <g>
      {[["#A51931", 0, 5.3], ["white", 5.3, 5.3], ["#2D2A4A", 10.7, 10.7], ["white", 21.3, 5.3], ["#A51931", 26.7, 5.3]].map(([fill, y, h], i) => (
        <rect key={i} y={y as number} width="32" height={h as number} fill={fill as string} />
      ))}
    </g>
  ),
  turkey: (
    <g>
      <rect width="32" height="32" fill="#E30A17" />
      <circle cx="14" cy="16" r="6" fill="white" />
      <circle cx="15.8" cy="16" r="5" fill="#E30A17" />
      <path d="M21 13 L22 15.4 L24.6 15.7 L22.7 17.4 L23.3 20 L21 18.6 L18.7 20 L19.3 17.4 L17.4 15.7 L20 15.4 Z" fill="white" />
    </g>
  ),
  uk: (
    <g>
      <rect width="32" height="32" fill="#00247D" />
      <rect x="13.5" width="5" height="32" fill="white" />
      <rect y="13.5" width="32" height="5" fill="white" />
      <rect x="14.5" width="3" height="32" fill="#CF142B" />
      <rect y="14.5" width="32" height="3" fill="#CF142B" />
    </g>
  ),
  uae: (
    <g>
      <rect width="32" height="10.7" fill="#00732F" />
      <rect y="10.7" width="32" height="10.7" fill="white" />
      <rect y="21.3" width="32" height="10.7" fill="black" />
      <rect width="9" height="32" fill="#FF0000" />
    </g>
  ),
  usa: (
    <g>
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={i} y={i * (32 / 13)} width="32" height={32 / 13} fill={i % 2 === 0 ? "#B22234" : "white"} />
      ))}
      <rect y={32 / 13} width="32" height={32 / 13} fill="white" />
      <rect width="17" height="17.2" fill="#3C3B6E" />
      {[[4, 4], [9, 4], [14, 4], [6.5, 8], [11.5, 8], [4, 12], [9, 12], [14, 12]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.8" fill="white" />
      ))}
    </g>
  ),
  vietnam: (
    <g>
      <rect width="32" height="32" fill="#DA251D" />
      <path d="M16 9 L18 15 L24.5 15 L19.2 18.7 L21.2 25 L16 21.2 L10.8 25 L12.8 18.7 L7.5 15 L14 15 Z" fill="#FFFF00" />
    </g>
  ),
};

export function CountryFlagIcon({ countryKey, size = 32, className }: { countryKey: string; size?: number; className?: string }) {
  const flag = FLAGS[countryKey];
  if (!flag) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      {flag}
    </svg>
  );
}
