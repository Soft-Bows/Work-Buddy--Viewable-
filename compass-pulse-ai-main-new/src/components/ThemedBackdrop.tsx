import { COUNTRY_THEMES } from "@/lib/themes";

// ── Full "destination" scenes ───────────────────────────────────────────────────
// "Greet the user like they've arrived somewhere" — one hand-illustrated scene per country theme,
// matching the login page's ScenicWindowBackdrop in ambition (real sky gradient, sun glow, drifting
// clouds, a landmark and a small foreground accent in actual colour, not a single low-opacity
// currentColor line silhouette). Sits behind all real content (fixed, -z-10) — it only shows
// through the gaps around cards/sidebar, never over them, so richer art here never fights with
// dashboard content for attention.
//
// IMPORTANT — do not reintroduce the "solid colour, no backdrop visible" bug: this only renders at
// all because <body> no longer carries its own `background-color` (see styles.css's `html { }`
// rule and its comment). If <body> (or any other ancestor of <main>/<ThemedBackdrop> — the flex
// wrapper in DashboardShell.tsx, <main> itself) ever gains a `bg-*`/`background-color` again, it
// will silently paint over this whole layer again since a normal in-flow element's own background
// paints above a `fixed` + negative-z-index descendant. If you add a background anywhere in that
// ancestor chain, keep it non-opaque (e.g. `bg-background/80` at most) or this regresses.

// Shared sky: gradient wash + sun/moon glow + two drifting cloud clusters. Every scene starts here;
// only the gradient stops and glow colour vary per country.
function SkyLayer({ sky, glow }: { sky: string; glow: string }) {
  return (
    <>
      <div className="absolute inset-0 opacity-[0.55] dark:opacity-[0.30]" style={{ background: sky }} />
      <div className="absolute -top-10 right-[8%] size-64 rounded-full blur-3xl opacity-70 dark:opacity-40" style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)` }} />
      <div className="absolute top-[10%] left-[6%] flex items-center gap-2 opacity-60 dark:opacity-35">
        <div className="size-9 rounded-full bg-white blur-[1px]" />
        <div className="size-12 rounded-full bg-white blur-[1px] -ml-5" />
        <div className="size-7 rounded-full bg-white blur-[1px] -ml-4" />
      </div>
      <div className="absolute top-[20%] right-[20%] flex items-center gap-1.5 opacity-50 dark:opacity-30">
        <div className="size-6 rounded-full bg-white blur-[1px]" />
        <div className="size-8 rounded-full bg-white blur-[1px] -ml-3" />
      </div>
    </>
  );
}

// Shared wrapper every scene below uses — fixed full-bleed, decorative only.
function Scene({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {children}
    </div>
  );
}

const LANDMARK_OPACITY = "opacity-[0.5] dark:opacity-[0.28]";
const FOREGROUND_OPACITY = "opacity-[0.65] dark:opacity-[0.4]";

function AustraliaScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #FCD9B8 0%, #FBC79A 28%, #DCEEF6 62%, #EAF6FA 100%)" glow="#FFD9A0" />
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[42vh] min-h-[240px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 175 Q100 155 200 168 T400 158 V220 H0 Z" fill="#BFD9E8" />
        <path d="M30 150 Q200 20 370 150" fill="none" stroke="#3E6B8C" strokeWidth="10" />
        <path d="M20 155 H380" stroke="#2E5470" strokeWidth="8" />
        {[70, 110, 150, 190, 230, 270, 310, 350].map(x => (
          <line key={x} x1={x} y1="155" x2={x} y2={155 - (90 - Math.abs(x - 200) * 0.45)} stroke="#3E6B8C" strokeWidth="4" />
        ))}
        <path d="M0 195 Q120 178 240 190 T400 182 V220 H0 Z" fill="#F3E3C6" />
      </svg>
      {/* Gum leaf sprig, bottom-right */}
      <svg className={`absolute bottom-6 right-[5%] ${FOREGROUND_OPACITY}`} width="90" height="90" viewBox="0 0 90 90" fill="none">
        <path d="M45 88 Q40 50 55 10" stroke="#5C7A4A" strokeWidth="3" fill="none" strokeLinecap="round" />
        {[{ x: 40, y: 66, r: -25 }, { x: 55, y: 50, r: 20 }, { x: 38, y: 36, r: -18 }, { x: 56, y: 22, r: 22 }].map((l, i) => (
          <ellipse key={i} cx={l.x} cy={l.y} rx="6" ry="16" fill="#6E9457" transform={`rotate(${l.r} ${l.x} ${l.y})`} />
        ))}
      </svg>
    </Scene>
  );
}

function CambodiaScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #F7E3B8 0%, #F6D9A6 26%, #DCEFE0 60%, #EAF6EC 100%)" glow="#FFE7B0" />
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[42vh] min-h-[240px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 175 Q110 150 220 168 T400 158 V220 H0 Z" fill="#BFE0C6" />
        {[{ x: 200, h: 100 }, { x: 130, h: 70 }, { x: 270, h: 70 }, { x: 75, h: 50 }, { x: 325, h: 50 }].map(t => (
          <path key={t.x} d={`M${t.x - 22} 168 L${t.x - 14} ${168 - t.h * 0.55} Q${t.x} ${168 - t.h} ${t.x + 14} ${168 - t.h * 0.55} L${t.x + 22} 168 Z`} fill="#B98A55" />
        ))}
        <rect x="55" y="160" width="290" height="8" fill="#A87A47" />
        <path d="M0 195 Q120 180 240 190 T400 184 V220 H0 Z" fill="#E7D9AE" />
      </svg>
      {/* Lotus flower, bottom-left */}
      <svg className={`absolute bottom-8 left-[6%] ${FOREGROUND_OPACITY}`} width="70" height="60" viewBox="0 0 70 60" fill="none">
        {[0, 45, -45, 90, -90].map(deg => (
          <ellipse key={deg} cx="35" cy="40" rx="8" ry="20" fill="#E8A0B8" transform={`rotate(${deg} 35 40)`} />
        ))}
        <circle cx="35" cy="40" r="7" fill="#F6DD8C" />
      </svg>
    </Scene>
  );
}

function ChinaHkScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #F7C9BE 0%, #F4B3A6 26%, #F0DDBE 60%, #F8ECD6 100%)" glow="#FFD8B0" />
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[42vh] min-h-[240px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 168 Q90 130 180 155 T400 140 V220 H0 Z" fill="#D8A79A" />
        {Array.from({ length: 18 }).map((_, i) => {
          const x = 10 + i * 22;
          const y = 168 - Math.sin(i / 2) * 20;
          return <rect key={x} x={x} y={y - 12} width="9" height="12" fill="#B23A26" />;
        })}
        <rect x="182" y="108" width="20" height="40" fill="#8F2E1E" />
        <path d="M176 108 L192 84 L208 108 Z" fill="#8F2E1E" />
        <path d="M0 195 Q120 178 240 190 T400 182 V220 H0 Z" fill="#F1D9BE" />
      </svg>
      {/* Red paper lantern, bottom-right */}
      <svg className={`absolute bottom-8 right-[6%] ${FOREGROUND_OPACITY}`} width="54" height="80" viewBox="0 0 54 80" fill="none">
        <line x1="27" y1="0" x2="27" y2="10" stroke="#7A2A1C" strokeWidth="2" />
        <ellipse cx="27" cy="40" rx="22" ry="28" fill="#D8402A" />
        <rect x="10" y="14" width="34" height="4" fill="#F6C34A" />
        <rect x="10" y="62" width="34" height="4" fill="#F6C34A" />
        <line x1="27" y1="68" x2="27" y2="78" stroke="#7A2A1C" strokeWidth="2" />
      </svg>
    </Scene>
  );
}

function IndiaScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #FBD9A6 0%, #F7C08E 26%, #F5D9DE 60%, #FBEEEF 100%)" glow="#FFE0A6" />
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[42vh] min-h-[240px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 Q110 158 220 172 T400 162 V220 H0 Z" fill="#E9CFB2" />
        <path d="M175 170 V126 Q175 100 200 100 Q225 100 225 126 V170 Z" fill="#F3ECE0" />
        <path d="M182 100 Q200 72 218 100 Z" fill="#F3ECE0" />
        <circle cx="200" cy="72" r="4" fill="#D9A03F" />
        {[125, 160, 240, 275].map(x => (
          <g key={x}>
            <rect x={x - 5} y="130" width="10" height="42" fill="#EDE3D2" />
            <path d={`M${x - 7} 130 Q${x} 116 ${x + 7} 130 Z`} fill="#EDE3D2" />
          </g>
        ))}
        <rect x="105" y="168" width="190" height="6" fill="#D9A03F" />
        <path d="M0 195 Q120 180 240 190 T400 184 V220 H0 Z" fill="#F3DCC0" />
      </svg>
      {/* Diya (oil lamp) with flame, bottom-left */}
      <svg className={`absolute bottom-8 left-[6%] ${FOREGROUND_OPACITY}`} width="70" height="60" viewBox="0 0 70 60" fill="none">
        <path d="M8 40 Q35 60 62 40 Q52 48 35 48 Q18 48 8 40Z" fill="#C1502E" />
        <path d="M30 34 Q35 10 40 34 Q37 22 35 20 Q33 22 30 34Z" fill="#F6C34A" />
      </svg>
    </Scene>
  );
}

function IndonesiaScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #F6E3B0 0%, #EFDDA0 26%, #D7EBD2 60%, #EAF6E8 100%)" glow="#FFEBB0" />
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[42vh] min-h-[240px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 Q110 150 220 168 T400 156 V220 H0 Z" fill="#A9CBA3" />
        {[0, 1, 2, 3, 4].map(i => {
          const w = 220 - i * 38;
          const y = 168 - i * 15;
          return <rect key={i} x={200 - w / 2} y={y - 15} width={w} height="15" fill="#7A6547" opacity={0.7 + i * 0.06} />;
        })}
        {[170, 200, 230].map(x => <circle key={x} cx={x} cy="88" r="5" fill="#5C4B36" />)}
        <path d="M0 195 Q120 180 240 190 T400 184 V220 H0 Z" fill="#CDE7BE" />
      </svg>
      {/* Frangipani flower, bottom-right */}
      <svg className={`absolute bottom-8 right-[6%] ${FOREGROUND_OPACITY}`} width="70" height="60" viewBox="0 0 70 60" fill="none">
        {[0, 72, 144, 216, 288].map(deg => (
          <ellipse key={deg} cx="35" cy="30" rx="8" ry="18" fill="#FBEFD1" transform={`rotate(${deg} 35 30)`} />
        ))}
        <circle cx="35" cy="30" r="6" fill="#F3C05A" />
      </svg>
    </Scene>
  );
}

function MalaysiaScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #C7D3EE 0%, #A7B8E0 24%, #E7CFA0 62%, #F5E4C4 100%)" glow="#FFD98E" />
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[42vh] min-h-[240px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 Q110 158 220 170 T400 160 V220 H0 Z" fill="#B9C6E8" />
        {[168, 232].map(x => (
          <g key={x}>
            <path d={`M${x - 16} 170 L${x - 10} 66 L${x} 42 L${x + 10} 66 L${x + 16} 170 Z`} fill="#3E76B0" />
            <line x1={x} y1="42" x2={x} y2="24" stroke="#3E76B0" strokeWidth="3" />
          </g>
        ))}
        <rect x="175" y="108" width="50" height="7" fill="#2E5C8C" />
        <path d="M0 195 Q120 180 240 190 T400 184 V220 H0 Z" fill="#E8D7AE" />
      </svg>
      {/* Hibiscus flower, bottom-left */}
      <svg className={`absolute bottom-8 left-[6%] ${FOREGROUND_OPACITY}`} width="70" height="64" viewBox="0 0 70 64" fill="none">
        {[0, 72, 144, 216, 288].map(deg => (
          <ellipse key={deg} cx="35" cy="30" rx="9" ry="19" fill="#D8402A" transform={`rotate(${deg} 35 30)`} />
        ))}
        <line x1="35" y1="30" x2="35" y2="56" stroke="#B23A26" strokeWidth="2.5" />
        <circle cx="35" cy="30" r="4" fill="#F6C34A" />
      </svg>
    </Scene>
  );
}

function SingaporeScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #CBD6EF 0%, #B6A9DE 26%, #DDEDE6 62%, #EEF7F2 100%)" glow="#E8C9F5" />
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[42vh] min-h-[240px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 Q110 158 220 170 T400 160 V220 H0 Z" fill="#A9D6C9" />
        {[{ x: 130, h: 78 }, { x: 175, h: 106 }, { x: 220, h: 88 }, { x: 265, h: 116 }].map(t => (
          <g key={t.x}>
            <rect x={t.x - 4} y={170 - t.h} width="8" height={t.h} fill="#2CA097" />
            <ellipse cx={t.x} cy={170 - t.h} rx="28" ry="13" fill="#2CA097" opacity="0.75" />
          </g>
        ))}
        <path d="M0 195 Q120 180 240 190 T400 184 V220 H0 Z" fill="#CDE9DC" />
      </svg>
      {/* Vanda Miss Joaquim orchid, bottom-right */}
      <svg className={`absolute bottom-8 right-[6%] ${FOREGROUND_OPACITY}`} width="60" height="70" viewBox="0 0 60 70" fill="none">
        <path d="M30 68 Q26 40 30 18" stroke="#5C7A4A" strokeWidth="2.5" fill="none" />
        {[0, 60, 120, 180, 240, 300].map(deg => (
          <ellipse key={deg} cx="30" cy="16" rx="6" ry="14" fill="#C9639A" transform={`rotate(${deg} 30 16)`} />
        ))}
        <circle cx="30" cy="16" r="4" fill="#F3D26A" />
      </svg>
    </Scene>
  );
}

function ThailandScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #FBE3A6 0%, #F6CE8C 26%, #CDEDE8 62%, #E6F8F4 100%)" glow="#FFDD9E" />
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[42vh] min-h-[240px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 Q110 158 220 172 T400 160 V220 H0 Z" fill="#A9DCD3" />
        {[{ x: 200, h: 100, w: 34, c: "#E0A63C" }, { x: 140, h: 62, w: 22, c: "#D89638" }, { x: 260, h: 62, w: 22, c: "#D89638" }].map(t => (
          <path key={t.x} d={`M${t.x - t.w / 2} 172 L${t.x - t.w / 4} ${172 - t.h * 0.6} L${t.x} ${172 - t.h} L${t.x + t.w / 4} ${172 - t.h * 0.6} L${t.x + t.w / 2} 172 Z`} fill={t.c} />
        ))}
        <path d="M0 195 Q120 180 240 190 T400 184 V220 H0 Z" fill="#EDE0B4" />
      </svg>
      {/* Lotus offering, bottom-left */}
      <svg className={`absolute bottom-8 left-[6%] ${FOREGROUND_OPACITY}`} width="66" height="56" viewBox="0 0 66 56" fill="none">
        {[-30, -10, 10, 30].map(deg => (
          <ellipse key={deg} cx="33" cy="40" rx="7" ry="22" fill="#F0A8C4" transform={`rotate(${deg} 33 40)`} />
        ))}
        <circle cx="33" cy="40" r="6" fill="#F6DD8C" />
      </svg>
    </Scene>
  );
}

function TurkeyScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #F7CDB6 0%, #F3B79A 24%, #C9EAE7 62%, #E8F7F5 100%)" glow="#FFD9B0" />
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[42vh] min-h-[240px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 Q110 158 220 172 T400 160 V220 H0 Z" fill="#E3C7A6" />
        <path d="M170 172 V140 Q170 110 200 110 Q230 110 230 140 V172 Z" fill="#D9927A" />
        {[150, 250].map(x => <rect key={x} x={x - 4} y="80" width="8" height="92" fill="#D9927A" />)}
        <path d="M0 195 Q120 180 240 190 T400 184 V220 H0 Z" fill="#EFD9B4" />
      </svg>
      {/* Cappadocia hot-air balloons */}
      {[{ x: "12%", y: "16%", s: 1 }, { x: "24%", y: "26%", s: 0.7 }, { x: "84%", y: "20%", s: 0.85 }].map((b, i) => (
        <svg key={i} className={`absolute ${FOREGROUND_OPACITY}`} style={{ left: b.x, top: b.y, width: 40 * b.s, height: 52 * b.s }} viewBox="0 0 40 52" fill="none">
          <ellipse cx="20" cy="20" rx="18" ry="20" fill={i % 2 === 0 ? "#E30A17" : "#2F9C9E"} />
          <ellipse cx="20" cy="20" rx="18" ry="20" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4 4" />
          <rect x="14" y="42" width="12" height="8" rx="1.5" fill="#7A5C4A" />
          <line x1="10" y1="36" x2="14" y2="42" stroke="#7A5C4A" strokeWidth="1.5" />
          <line x1="30" y1="36" x2="26" y2="42" stroke="#7A5C4A" strokeWidth="1.5" />
        </svg>
      ))}
    </Scene>
  );
}

function UkScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #D7E0EE 0%, #C7D3E6 30%, #E8DDE0 65%, #F3ECE8 100%)" glow="#F6D9C4" />
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[42vh] min-h-[240px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 Q110 158 220 172 T400 160 V220 H0 Z" fill="#C3CDE0" />
        {[160, 240].map(x => (
          <rect key={x} x={x - 12} y="104" width="24" height="68" fill="#37538C" />
        ))}
        <rect x="172" y="128" width="56" height="8" fill="#2C4270" />
        <path d="M148 172 L160 158 L148 158 Z" fill="#37538C" />
        <path d="M252 172 L240 158 L252 158 Z" fill="#37538C" />
        <path d="M0 195 Q120 180 240 190 T400 184 V220 H0 Z" fill="#DCE6DA" />
      </svg>
      {/* Red telephone box, bottom-left */}
      <svg className={`absolute bottom-6 left-[6%] ${FOREGROUND_OPACITY}`} width="34" height="70" viewBox="0 0 34 70" fill="none">
        <rect x="2" y="6" width="30" height="60" rx="1.5" fill="#CF142B" />
        <rect x="5" y="2" width="24" height="6" fill="#8F0E1E" />
        <rect x="8" y="14" width="18" height="14" fill="#DCE6DA" opacity="0.85" />
        <rect x="8" y="32" width="18" height="14" fill="#DCE6DA" opacity="0.85" />
      </svg>
    </Scene>
  );
}

function UaeScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #F6DDA6 0%, #F2CB8A 30%, #E9D2A0 62%, #F3E6C6 100%)" glow="#FFE7A8" />
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[42vh] min-h-[240px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 180 Q110 162 220 174 T400 166 V220 H0 Z" fill="#E7CE9C" />
        <path d="M186 172 L192 118 L196 78 L200 34 L204 78 L208 118 L214 172 Z" fill="#D3A652" />
        <line x1="200" y1="34" x2="200" y2="16" stroke="#D3A652" strokeWidth="2.5" />
        <path d="M0 197 Q120 184 240 192 T400 188 V220 H0 Z" fill="#EDD9A6" />
      </svg>
      {/* Palm tree, bottom-right */}
      <svg className={`absolute bottom-6 right-[6%] ${FOREGROUND_OPACITY}`} width="60" height="90" viewBox="0 0 60 90" fill="none">
        <path d="M30 88 Q26 50 30 22" stroke="#8A6A3E" strokeWidth="4" fill="none" />
        {[-60, -30, 0, 30, 60].map(deg => (
          <path key={deg} d="M30 22 Q30 6 46 4" stroke="#4E9B5C" strokeWidth="4" fill="none" strokeLinecap="round" transform={`rotate(${deg} 30 22)`} />
        ))}
      </svg>
    </Scene>
  );
}

function UsaScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #F7C7A6 0%, #F2A882 26%, #B9DCE8 62%, #E4F3F8 100%)" glow="#FFCE96" />
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[42vh] min-h-[240px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 Q110 158 220 172 T400 160 V220 H0 Z" fill="#B7D4DC" />
        {[140, 260].map(x => (
          <g key={x}>
            <rect x={x - 6} y="70" width="12" height="100" fill="#C1502E" />
            <rect x={x - 14} y="70" width="28" height="7" fill="#A8432A" />
          </g>
        ))}
        <path d="M140 78 Q200 130 260 78" fill="none" stroke="#C1502E" strokeWidth="3" />
        <path d="M0 172 H400" stroke="#8FA6A0" strokeWidth="4" />
        <path d="M0 197 Q120 184 240 192 T400 188 V220 H0 Z" fill="#D9ECE6" />
      </svg>
      {/* No Statue of Liberty — a simple star burst, bottom-left, stands in for "USA" instead */}
      <svg className={`absolute bottom-8 left-[6%] ${FOREGROUND_OPACITY}`} width="54" height="54" viewBox="0 0 54 54" fill="none">
        <path d="M27 2 L32 20 L50 20 L35 31 L40 50 L27 38 L14 50 L19 31 L4 20 L22 20 Z" fill="#3C3B6E" />
      </svg>
    </Scene>
  );
}

function VietnamScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #D6E9DC 0%, #C3E3CC 28%, #E9E3C4 62%, #F5F1DC 100%)" glow="#F6E8A8" />
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[42vh] min-h-[240px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 H400 V220 H0 Z" fill="#BFE0DC" opacity="0.6" />
        {[{ x: 70, h: 56 }, { x: 130, h: 84 }, { x: 190, h: 48 }, { x: 250, h: 96 }, { x: 320, h: 62 }].map(r => (
          <path key={r.x} d={`M${r.x - 22} 178 Q${r.x - 18} ${178 - r.h} ${r.x} ${178 - r.h - 10} Q${r.x + 18} ${178 - r.h} ${r.x + 22} 178 Z`} fill="#2E9E82" opacity="0.85" />
        ))}
        <rect x="0" y="176" width="400" height="2" fill="#2E9E82" opacity="0.4" />
      </svg>
      {/* Conical hat + lantern, bottom-left */}
      <svg className={`absolute bottom-8 left-[6%] ${FOREGROUND_OPACITY}`} width="64" height="46" viewBox="0 0 64 46" fill="none">
        <path d="M4 44 Q32 4 60 44 Z" fill="#E7D9AE" />
        <ellipse cx="32" cy="44" rx="28" ry="4" fill="#D9C89A" />
      </svg>
      <svg className={`absolute bottom-14 right-[8%] ${FOREGROUND_OPACITY}`} width="40" height="58" viewBox="0 0 40 58" fill="none">
        <line x1="20" y1="0" x2="20" y2="8" stroke="#7A5C4A" strokeWidth="2" />
        <ellipse cx="20" cy="30" rx="16" ry="20" fill="#F0A83C" />
        <rect x="7" y="10" width="26" height="3" fill="#C1502E" />
        <rect x="7" y="46" width="26" height="3" fill="#C1502E" />
        <line x1="20" y1="50" x2="20" y2="58" stroke="#7A5C4A" strokeWidth="2" />
      </svg>
    </Scene>
  );
}

function JapanScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #DCEEFB 0%, #EAF3FC 22%, #FBE7EF 55%, #FCEFE0 100%)" glow="#FFE8B8" />
      {/* Mount Fuji — larger and in real colour, not a currentColor line silhouette */}
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[46vh] min-h-[260px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 170 Q90 140 180 160 T400 145 V220 H0 Z" fill="#BFE0D8" />
        <path d="M130 190 L235 40 L340 190 Z" fill="#7C93B0" />
        <path d="M197 92 L235 40 L273 92 L255 84 L235 100 L215 84 Z" fill="white" opacity="0.95" />
        <path d="M0 195 Q120 175 240 192 T400 180 V220 H0 Z" fill="#DCEEDB" />
      </svg>
      {/* Torii gate, bottom-left foreground */}
      <svg className={`absolute bottom-6 left-[4%] ${FOREGROUND_OPACITY}`} width="86" height="96" viewBox="0 0 86 96" fill="none">
        <rect x="14" y="22" width="8" height="70" fill="#C1432E" />
        <rect x="64" y="22" width="8" height="70" fill="#C1432E" />
        <rect x="4" y="10" width="78" height="10" rx="2" fill="#B23A26" />
        <rect x="10" y="24" width="66" height="7" fill="#B23A26" />
        <rect x="38" y="10" width="10" height="10" fill="#7A2A1C" />
      </svg>
      {/* Cherry blossom branch, top-left corner */}
      <svg className={`absolute top-0 left-0 ${FOREGROUND_OPACITY}`} width="180" height="150" viewBox="0 0 180 150" fill="none">
        <path d="M-10 10 Q50 5 90 45 Q120 70 100 60" stroke="#7A5C4A" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M40 25 Q60 15 75 30" stroke="#7A5C4A" strokeWidth="3" fill="none" strokeLinecap="round" />
        {[{ x: 24, y: 14 }, { x: 44, y: 8 }, { x: 62, y: 20 }, { x: 55, y: 36 }, { x: 78, y: 30 }, { x: 34, y: 32 }, { x: 68, y: 12 }, { x: 90, y: 45 }].map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y})`}>
            {[0, 72, 144, 216, 288].map(deg => (
              <ellipse key={deg} cx="0" cy="0" rx="3.2" ry="5.5" fill="#F4B8CC" transform={`rotate(${deg}) translate(0 -4)`} />
            ))}
            <circle r="1.6" fill="#F9DDE7" />
          </g>
        ))}
      </svg>
    </Scene>
  );
}

const DESTINATION_SCENES: Record<string, React.ComponentType> = {
  australia: AustraliaScene,
  cambodia: CambodiaScene,
  "china-hk": ChinaHkScene,
  india: IndiaScene,
  indonesia: IndonesiaScene,
  japan: JapanScene,
  malaysia: MalaysiaScene,
  singapore: SingaporeScene,
  thailand: ThailandScene,
  turkey: TurkeyScene,
  uk: UkScene,
  uae: UaeScene,
  usa: UsaScene,
  vietnam: VietnamScene,
};

// A handful of slowly falling/drifting ambient icons layered on top of the scene — cycles through
// the theme's `ambientEmoji` set across a spread of lanes, each with its own randomised horizontal
// start/drift/duration/delay so the fall never looks mechanically uniform.
const DRIFT_LANES = [
  { left: "6%", duration: 9, delay: 0, drift: 30, size: 20 },
  { left: "18%", duration: 12, delay: 2, drift: -25, size: 16 },
  { left: "32%", duration: 10, delay: 4, drift: 35, size: 18 },
  { left: "47%", duration: 14, delay: 1, drift: -20, size: 15 },
  { left: "61%", duration: 11, delay: 5, drift: 28, size: 20 },
  { left: "74%", duration: 13, delay: 3, drift: -30, size: 16 },
  { left: "88%", duration: 10, delay: 6, drift: 22, size: 18 },
];

function AmbientDrift({ emojis }: { emojis: string[] }) {
  if (emojis.length === 0) return null;
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {DRIFT_LANES.map((lane, i) => (
        <span
          key={i}
          className="petal-fall absolute top-0 leading-none opacity-80"
          style={{
            left: lane.left,
            fontSize: lane.size,
            animationDuration: `${lane.duration}s`,
            animationDelay: `${lane.delay}s`,
            ["--petal-drift" as string]: `${lane.drift}px`,
          }}
        >
          {emojis[i % emojis.length]}
        </span>
      ))}
    </div>
  );
}

export function ThemedBackdrop({ themeKey }: { themeKey: string | null }) {
  const theme = COUNTRY_THEMES.find(t => t.key === themeKey);
  if (!theme) return null;
  const SceneComponent = DESTINATION_SCENES[theme.key];
  return (
    <>
      {SceneComponent && <SceneComponent />}
      <AmbientDrift emojis={theme.ambientEmoji} />
    </>
  );
}
