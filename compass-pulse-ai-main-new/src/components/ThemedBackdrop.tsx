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
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[44vh] min-h-[250px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 Q100 160 200 172 T400 162 V220 H0 Z" fill="#BFD9E8" />
        {/* Sydney Harbour Bridge — steel arch with pylons and hanger cables */}
        <path d="M40 148 Q200 26 360 148" fill="none" stroke="#3E6B8C" strokeWidth="11" />
        <path d="M40 148 Q200 40 360 148" fill="none" stroke="#2E5470" strokeWidth="4" />
        <rect x="28" y="112" width="16" height="42" fill="#2E5470" />
        <rect x="356" y="112" width="16" height="42" fill="#2E5470" />
        <path d="M24 154 H376" stroke="#2E5470" strokeWidth="9" />
        {[80, 120, 160, 200, 240, 280, 320].map(x => (
          <line key={x} x1={x} y1="150" x2={x} y2={150 - (108 - Math.abs(x - 200) * 0.58)} stroke="#3E6B8C" strokeWidth="3.5" />
        ))}
        {/* Sydney Opera House — overlapping shell sails on a podium, at the bridge's foot */}
        <rect x="56" y="156" width="76" height="14" rx="2" fill="#E3D6C4" />
        <path d="M62 156 Q68 108 82 156 Z" fill="#F5EFE6" />
        <path d="M78 156 Q88 92 100 156 Z" fill="#FBF7F0" />
        <path d="M96 156 Q106 104 116 156 Z" fill="#F5EFE6" />
        <path d="M112 156 Q120 118 128 156 Z" fill="#EDE4D6" />
        <path d="M0 195 Q120 178 240 190 T400 182 V220 H0 Z" fill="#F3E3C6" />
      </svg>
      {/* Hopping kangaroo silhouette, bottom-right — swapped from generic gum leaves for a distinctly Australian foreground */}
      <svg className={`absolute bottom-6 right-[6%] ${FOREGROUND_OPACITY}`} width="72" height="86" viewBox="0 0 72 86" fill="none">
        <path d="M52 84 Q46 68 52 56 Q40 52 34 42 Q37 32 33 22 L27 8 Q33 4 39 10 L44 24 Q54 28 58 40 Q68 46 64 58 Q70 68 62 84 Z" fill="#8A6A3E" />
        <circle cx="30" cy="14" r="7" fill="#8A6A3E" />
        <path d="M25 8 L21 0 L29 4 Z" fill="#8A6A3E" />
        <path d="M14 84 Q10 66 22 56 Q16 70 24 84 Z" fill="#8A6A3E" />
        <ellipse cx="59" cy="84" rx="14" ry="3" fill="#8A6A3E" opacity="0.35" />
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
        {/* Angkor Wat — five corncob-tiered prasat towers behind the moat causeway */}
        {[{ x: 200, h: 108 }, { x: 138, h: 76 }, { x: 262, h: 76 }, { x: 84, h: 54 }, { x: 316, h: 54 }].map(t => (
          <g key={t.x}>
            <path d={`M${t.x - 20} 168 L${t.x - 13} ${168 - t.h * 0.5} Q${t.x} ${168 - t.h} ${t.x + 13} ${168 - t.h * 0.5} L${t.x + 20} 168 Z`} fill="#B98A55" />
            {[0.28, 0.5, 0.7].map(f => (
              <ellipse key={f} cx={t.x} cy={168 - t.h * f} rx={20 - f * 12} ry="3.5" fill="#A87A47" />
            ))}
            <circle cx={t.x} cy={168 - t.h - 4} r="3" fill="#8F6A3E" />
          </g>
        ))}
        <rect x="55" y="160" width="290" height="8" fill="#A87A47" />
        <path d="M0 180 H400 V186 H0 Z" fill="#8FC2D4" opacity="0.5" />
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
        {/* Victoria Peak silhouette behind the harbour skyline */}
        <path d="M60 150 Q150 70 260 110 Q320 90 380 150 Z" fill="#C99A88" opacity="0.7" />
        <path d="M0 168 Q90 140 180 158 T400 148 V220 H0 Z" fill="#D8A79A" />
        {/* Victoria Harbour skyline — varied city blocks */}
        {[{ x: 40, w: 16, h: 46 }, { x: 62, w: 14, h: 60 }, { x: 84, w: 16, h: 40 }, { x: 108, w: 14, h: 70 }, { x: 300, w: 16, h: 44 }, { x: 324, w: 14, h: 66 }, { x: 348, w: 16, h: 38 }].map(b => (
          <rect key={b.x} x={b.x} y={158 - b.h} width={b.w} height={b.h} fill="#B23A26" opacity="0.85" />
        ))}
        {/* IFC2 tower — the harbour's tallest, tapered pinnacle top */}
        <path d="M182 158 L182 90 Q182 78 192 74 Q202 78 202 90 L202 158 Z" fill="#8F2E1E" />
        <path d="M188 74 L192 58 L196 74 Z" fill="#8F2E1E" />
        <rect x="150" y="158" width="24" height="52" fill="#A6402B" />
        <rect x="210" y="158" width="20" height="60" fill="#A6402B" />
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
        {/* Taj Mahal — central onion dome with finial, four corner minarets, reflecting pool */}
        <path d="M175 170 V126 Q175 100 200 100 Q225 100 225 126 V170 Z" fill="#F3ECE0" />
        <path d="M182 100 Q200 68 218 100 Z" fill="#F3ECE0" />
        <line x1="200" y1="68" x2="200" y2="56" stroke="#D9A03F" strokeWidth="2" />
        <circle cx="200" cy="72" r="4" fill="#D9A03F" />
        <path d="M186 170 V150 Q186 142 200 142 Q214 142 214 150 V170 Z" fill="#E7DCC8" />
        {[125, 160, 240, 275].map(x => (
          <g key={x}>
            <rect x={x - 5} y="122" width="10" height="50" fill="#EDE3D2" />
            <rect x={x - 7} y="118" width="14" height="5" fill="#D9CDB4" />
            <path d={`M${x - 7} 118 Q${x} 104 ${x + 7} 118 Z`} fill="#EDE3D2" />
            <circle cx={x} cy="102" r="2.5" fill="#D9A03F" />
          </g>
        ))}
        <rect x="105" y="168" width="190" height="6" fill="#D9A03F" />
        <rect x="180" y="176" width="40" height="10" fill="#B9D6D0" opacity="0.6" />
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
        {/* Borobudur — stepped terraces narrowing to a central stupa dome, ringed with bell stupas */}
        {[0, 1, 2, 3, 4].map(i => {
          const w = 230 - i * 38;
          const y = 168 - i * 16;
          return <rect key={i} x={200 - w / 2} y={y - 16} width={w} height="16" fill="#7A6547" opacity={0.72 + i * 0.05} />;
        })}
        <path d="M186 88 Q186 68 200 62 Q214 68 214 88 Z" fill="#5C4B36" />
        <circle cx="200" cy="60" r="3" fill="#3E3226" />
        {[152, 176, 224, 248].map(x => (
          <path key={x} d={`M${x - 7} 104 Q${x - 7} 90 ${x} 86 Q${x + 7} 90 ${x + 7} 104 Z`} fill="#5C4B36" />
        ))}
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
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[44vh] min-h-[250px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 Q110 158 220 170 T400 160 V220 H0 Z" fill="#B9C6E8" />
        {/* Petronas Twin Towers — stepped setbacks tapering to twin spires, joined by a skybridge */}
        {[168, 232].map(x => (
          <g key={x}>
            <rect x={x - 19} y="152" width="38" height="18" fill="#3E76B0" />
            <rect x={x - 16} y="132" width="32" height="20" fill="#3E76B0" />
            <rect x={x - 13} y="112" width="26" height="20" fill="#3E76B0" />
            <rect x={x - 9} y="92" width="18" height="20" fill="#3E76B0" />
            <rect x={x - 5} y="70" width="10" height="22" fill="#3E76B0" />
            <line x1={x} y1="70" x2={x} y2="38" stroke="#3E76B0" strokeWidth="3" />
            <circle cx={x} cy="36" r="2" fill="#F3D26A" />
          </g>
        ))}
        <rect x="181" y="120" width="38" height="8" fill="#2E5C8C" />
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
      {/* Marina Bay Sands, redrawn big and bold rather than as three thin sticks — the towers now
          take up a third of the canvas width and nearly the full landmark height, and the SkyPark
          is one continuous, unmistakably boat-hulled deck (flat middle, both ends sweeping sharply
          upward) instead of a shallow wave, so it reads at a glance instead of needing a caption. */}
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[48vh] min-h-[270px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 Q110 158 220 170 T400 160 V220 H0 Z" fill="#A9D6C9" />
        {/* Three towers, each markedly wider, fanning outward from vertical at the base */}
        <polygon points="146,172 180,172 158,46 128,46" fill="#3E4C63" />
        <polygon points="184,172 218,172 214,34 188,34" fill="#3E4C63" />
        <polygon points="222,172 256,172 272,46 242,46" fill="#3E4C63" />
        {/* Window banding for scale/texture */}
        {[70, 90, 110, 130, 150].map(y => (
          <rect key={y} x="126" y={y} width="150" height="2.5" fill="#2C374A" opacity="0.35" />
        ))}
        {/* The SkyPark — one continuous hull-shaped deck resting across all three towers */}
        <path d="M118 50 Q118 30 145 24 L279 24 Q306 30 306 50 L296 50 Q296 36 275 33 L149 33 Q128 36 128 50 Z" fill="#F3D26A" />
        <path d="M128 50 L296 50 L296 40 L128 40 Z" fill="#2CA097" />
        <ellipse cx="212" cy="51" rx="95" ry="6" fill="#237E76" opacity="0.55" />
        {/* Reflection in the bay, faint */}
        <g opacity="0.18" transform="translate(0,344) scale(1,-1)">
          <polygon points="146,172 180,172 158,46 128,46" fill="#3E4C63" />
          <polygon points="184,172 218,172 214,34 188,34" fill="#3E4C63" />
          <polygon points="222,172 256,172 272,46 242,46" fill="#3E4C63" />
        </g>
        <path d="M0 195 Q120 180 240 190 T400 184 V220 H0 Z" fill="#CDE9DC" />
      </svg>
      {/* Vanda Miss Joaquim orchid, Singapore's national flower — bottom-right */}
      <svg className={`absolute bottom-8 right-[6%] ${FOREGROUND_OPACITY}`} width="64" height="76" viewBox="0 0 60 70" fill="none">
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
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[44vh] min-h-[250px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 Q110 158 220 172 T400 160 V220 H0 Z" fill="#A9DCD3" />
        {/* Wat Arun — a tiered central prang flanked by two smaller corn-cob spires along the river */}
        {[{ x: 200, h: 118, w: 40, c: "#E0A63C" }, { x: 132, h: 66, w: 24, c: "#D89638" }, { x: 268, h: 66, w: 24, c: "#D89638" }].map(t => (
          <g key={t.x}>
            <path d={`M${t.x - t.w / 2} 172 L${t.x - t.w / 4} ${172 - t.h * 0.55} L${t.x} ${172 - t.h} L${t.x + t.w / 4} ${172 - t.h * 0.55} L${t.x + t.w / 2} 172 Z`} fill={t.c} />
            {[0.32, 0.55, 0.75].map(f => (
              <ellipse key={f} cx={t.x} cy={172 - t.h * f} rx={t.w * 0.5 - f * t.w * 0.3} ry="3" fill="#C1502E" opacity="0.65" />
            ))}
          </g>
        ))}
        <path d="M0 178 H400 V184 H0 Z" fill="#7FC4C2" opacity="0.5" />
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
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[46vh] min-h-[260px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        {/* Cappadocia — a panoramic valley of jagged fairy-chimney rock cones */}
        <path d="M0 182 Q110 160 220 176 T400 164 V220 H0 Z" fill="#E3C7A6" />
        {[{ x: 40, h: 46 }, { x: 90, h: 68 }, { x: 140, h: 40 }, { x: 190, h: 82 }, { x: 235, h: 52 }, { x: 285, h: 74 }, { x: 330, h: 44 }, { x: 370, h: 58 }].map(c => (
          <g key={c.x}>
            <path d={`M${c.x - 15} 178 L${c.x - 6} ${178 - c.h} Q${c.x} ${178 - c.h - 12} ${c.x + 6} ${178 - c.h} L${c.x + 15} 178 Z`} fill="#D9927A" />
            <path d={`M${c.x - 8} ${178 - c.h + 6} Q${c.x} ${178 - c.h - 4} ${c.x + 8} ${178 - c.h + 6} Z`} fill="#C77B5F" />
          </g>
        ))}
        <path d="M0 195 Q120 180 240 190 T400 184 V220 H0 Z" fill="#EFD9B4" />
      </svg>
      {/* Three big, unmistakable hot-air balloons instead of six small scattered ones — this is the
          scene's one job, the same way Fuji is a single large triangle rather than several smaller
          peaks. Each balloon gets a real onion/teardrop silhouette (a distinct shoulder above the
          widest point, tapering to the burner), a bold candy-stripe panel pattern, and a clearly
          drawn basket + criss-crossing rigging, not a flat dashed-outline circle. */}
      {[
        { x: "8%", y: "6%", s: 1.5, c: "#E30A17", c2: "#F6C9CC" },
        { x: "58%", y: "0%", s: 1.85, c: "#2F9C9E", c2: "#CDEFEC" },
        { x: "78%", y: "16%", s: 1.15, c: "#F0A83C", c2: "#FCE3B8" },
      ].map((b, i) => (
        <svg key={i} className={`absolute ${FOREGROUND_OPACITY}`} style={{ left: b.x, top: b.y, width: 70 * b.s, height: 96 * b.s }} viewBox="0 0 70 96" fill="none">
          <path d="M35 4 C14 4 6 30 6 46 C6 62 18 72 22 76 L48 76 C52 72 64 62 64 46 C64 30 56 4 35 4 Z" fill={b.c} />
          {[1, 2, 3, 4].map(n => (
            <path key={n} d={`M${8 + n * 12.5} 8 C${2 + n * 12.5} 26 ${2 + n * 12.5} 56 ${14 + n * 12.5} 75`} stroke={b.c2} strokeWidth="5" fill="none" opacity="0.85" />
          ))}
          <path d="M35 4 C14 4 6 30 6 46 C6 62 18 72 22 76 L48 76 C52 72 64 62 64 46 C64 30 56 4 35 4 Z" fill="none" stroke="#7A2A1C" strokeWidth="1.5" opacity="0.5" />
          <path d="M22 76 L16 88 M48 76 L54 88 M35 78 L35 90" stroke="#5C4530" strokeWidth="2" strokeLinecap="round" />
          <rect x="20" y="86" width="30" height="10" rx="2" fill="#7A5C4A" />
        </svg>
      ))}
    </Scene>
  );
}

function UkScene() {
  return (
    <Scene>
      <SkyLayer sky="linear-gradient(180deg, #D7E0EE 0%, #C7D3E6 30%, #E8DDE0 65%, #F3ECE8 100%)" glow="#F6D9C4" />
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[46vh] min-h-[260px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 Q110 158 220 172 T400 160 V220 H0 Z" fill="#C3CDE0" />
        {/* Big Ben — the Elizabeth Tower, clock faces and a pointed spire roof */}
        <rect x="182" y="90" width="36" height="82" fill="#37538C" />
        <rect x="178" y="82" width="44" height="10" fill="#2C4270" />
        <circle cx="200" cy="66" r="15" fill="#EDE3D2" stroke="#2C4270" strokeWidth="3" />
        <line x1="200" y1="66" x2="200" y2="56" stroke="#2C4270" strokeWidth="2" />
        <line x1="200" y1="66" x2="208" y2="66" stroke="#2C4270" strokeWidth="2" />
        <path d="M182 82 L200 30 L218 82 Z" fill="#2C4270" />
        <line x1="200" y1="30" x2="200" y2="16" stroke="#2C4270" strokeWidth="2.5" />
        <rect x="186" y="172" width="28" height="10" fill="#2C4270" />
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
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[46vh] min-h-[260px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 180 Q110 162 220 174 T400 166 V220 H0 Z" fill="#E7CE9C" />
        {/* Burj Khalifa — tiered Y-shaped setbacks tapering to a needle spire, the world's tallest building */}
        <path d="M170 172 L188 130 L184 130 L196 100 L193 100 L200 60 L207 100 L204 100 L216 130 L212 130 L230 172 Z" fill="#D3A652" />
        <line x1="200" y1="60" x2="200" y2="20" stroke="#D3A652" strokeWidth="2.5" />
        <circle cx="200" cy="18" r="1.8" fill="#B98A3E" />
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
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[46vh] min-h-[260px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        <path d="M0 178 Q110 158 220 172 T400 160 V220 H0 Z" fill="#B7D4DC" />
        {/* Golden Gate Bridge — twin Art Deco towers, a draped main cable, and hanging suspenders */}
        {[140, 260].map(x => (
          <g key={x}>
            <rect x={x - 7} y="66" width="14" height="106" fill="#C1502E" />
            <rect x={x - 15} y="66" width="30" height="8" fill="#A8432A" />
            <rect x={x - 15} y="94" width="30" height="8" fill="#A8432A" />
            <rect x={x - 15} y="122" width="30" height="8" fill="#A8432A" />
          </g>
        ))}
        <path d="M140 74 Q200 132 260 74" fill="none" stroke="#C1502E" strokeWidth="3.5" />
        <path d="M140 74 Q200 20 260 74" fill="none" stroke="#C1502E" strokeWidth="3.5" />
        {[160, 180, 200, 220, 240].map(x => (
          <line key={x} x1={x} y1={74 + Math.abs(x - 200) * 0.02 + (200 - Math.abs(x - 200)) * 0.29} x2={x} y2="172" stroke="#A8432A" strokeWidth="1.5" />
        ))}
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
      <svg className={`absolute bottom-0 inset-x-0 w-full h-[44vh] min-h-[250px] ${LANDMARK_OPACITY}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
        {/* Ha Long Bay — jagged limestone karst islands rising straight out of the water, a junk boat drifting between them */}
        <path d="M0 178 H400 V220 H0 Z" fill="#BFE0DC" opacity="0.6" />
        {[{ x: 55, h: 62 }, { x: 105, h: 96 }, { x: 155, h: 50 }, { x: 205, h: 108 }, { x: 255, h: 70 }, { x: 305, h: 92 }, { x: 355, h: 54 }].map(r => (
          <path key={r.x} d={`M${r.x - 16} 178 L${r.x - 12} ${178 - r.h * 0.55} L${r.x - 4} ${178 - r.h * 0.8} L${r.x} ${178 - r.h} L${r.x + 5} ${178 - r.h * 0.78} L${r.x + 13} ${178 - r.h * 0.5} L${r.x + 17} 178 Z`} fill="#2E9E82" opacity="0.85" />
        ))}
        <rect x="0" y="176" width="400" height="2" fill="#2E9E82" opacity="0.4" />
        <path d="M170 182 Q200 172 232 182 L226 190 Q200 184 176 190 Z" fill="#7A5C4A" opacity="0.8" />
        <path d="M196 182 L196 168 L212 178 Z" fill="#E7D9AE" opacity="0.9" />
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
