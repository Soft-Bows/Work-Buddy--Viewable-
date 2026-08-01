// Network-office country themes — see the matching .theme-{key} blocks in styles.css for the actual
// colour overrides. `swatch` is a plain hex approximation of each theme's primary accent, used for
// the sidebar's theme picker and to tint the mouse cursor. Each theme also carries three small emoji
// sets used purely for lightweight decorative flourishes elsewhere in the dashboard:
//   - `ambientEmoji`: 1-2 icons that drift gently in the ThemedBackdrop, always visible while the
//     theme is active (Japan's falling sakura petals, generalized to every theme).
//   - `clickEmoji`: 2-3 miniature, non-food icons iconic to the country that pop briefly around the
//     cursor whenever the user clicks something. Kept to bold, single-subject silhouettes (a lion,
//     an umbrella, a crown) rather than busy multi-object "scene" glyphs (a moon-viewing table full
//     of tiny props, a leafy twig) — at the ~14px size these render at, a scene reads as a blur while
//     a single bold shape stays instantly recognisable.
//   - `pointFoods`: 3-4 food emoji specific to the country that burst around a "points earned" toast.
// Every pick is unique across the whole list so no two themes' flourishes are confusable.
//   - `greetings`: that country's own language for "Good morning/afternoon/evening" — shown once per
//     session on load (see greetingToast.tsx), time-of-day-appropriate, always followed by an
//     English "Welcome back, let's get started shall we?" line. Countries whose working language is
//     English (Australia, Singapore, UK, USA) intentionally reuse the English phrase for both lines.
export interface CountryTheme {
  key: string;
  label: string;
  flag: string;
  landmark: string;
  swatch: string;
  ambientEmoji: string[];
  clickEmoji: string[];
  pointFoods: string[];
  greetings: { morning: string; afternoon: string; evening: string };
}

export const COUNTRY_THEMES: CountryTheme[] = [
  { key: "australia", label: "Australia", flag: "🇦🇺", landmark: "Sydney Harbour Bridge", swatch: "#DD6B3E",
    ambientEmoji: ["🍃"], clickEmoji: ["🦘", "🏄"], pointFoods: ["🍤", "🥧", "🍯"],
    greetings: { morning: "Good morning!", afternoon: "Good afternoon!", evening: "Good evening!" } },
  { key: "cambodia", label: "Cambodia", flag: "🇰🇭", landmark: "Angkor Wat", swatch: "#C68A3E",
    ambientEmoji: ["🪷"], clickEmoji: ["🛕", "🌾"], pointFoods: ["🥘", "🍚", "🥭"],
    greetings: { morning: "អរុណសួស្តី!", afternoon: "ទិវាសួស្តី!", evening: "សាយណ្ហសួស្តី!" } },
  { key: "china-hk", label: "China & Hong Kong SAR", flag: "🇭🇰", landmark: "The Great Wall", swatch: "#B8382A",
    ambientEmoji: ["🏮"], clickEmoji: ["🏮", "🐉"], pointFoods: ["🥟", "🍜", "🧧"],
    greetings: { morning: "早上好！", afternoon: "下午好！", evening: "晚上好！" } },
  { key: "india", label: "India", flag: "🇮🇳", landmark: "Taj Mahal", swatch: "#D9A03F",
    ambientEmoji: ["🌼"], clickEmoji: ["🪔", "🦚"], pointFoods: ["🍛", "🫓", "🥭"],
    greetings: { morning: "सुप्रभात!", afternoon: "शुभ दोपहर!", evening: "शुभ संध्या!" } },
  { key: "indonesia", label: "Indonesia", flag: "🇮🇩", landmark: "Borobudur & Rice Terraces", swatch: "#4E9B5C",
    ambientEmoji: ["🌺"], clickEmoji: ["🌋", "🦧"], pointFoods: ["🍢", "🍚", "🥥"],
    greetings: { morning: "Selamat pagi!", afternoon: "Selamat siang!", evening: "Selamat malam!" } },
  { key: "japan", label: "Japan", flag: "🇯🇵", landmark: "Mount Fuji & Cherry Blossoms", swatch: "#E895AC",
    ambientEmoji: ["🌸"], clickEmoji: ["🌸", "⛩️"], pointFoods: ["🍣", "🍵", "🍶"],
    greetings: { morning: "おはようございます！", afternoon: "こんにちは！", evening: "こんばんは！" } },
  { key: "malaysia", label: "Malaysia", flag: "🇲🇾", landmark: "Petronas Towers", swatch: "#3E76B0",
    ambientEmoji: ["🌺"], clickEmoji: ["🦋", "🏙️"], pointFoods: ["🍜", "🍢", "🥭"],
    greetings: { morning: "Selamat pagi!", afternoon: "Selamat tengah hari!", evening: "Selamat petang!" } },
  { key: "singapore", label: "Singapore", flag: "🇸🇬", landmark: "Gardens by the Bay", swatch: "#2CA097",
    ambientEmoji: ["🌿"], clickEmoji: ["🦁", "🌳"], pointFoods: ["🦀", "🍡", "🧋"],
    greetings: { morning: "Good morning!", afternoon: "Good afternoon!", evening: "Good evening!" } },
  { key: "thailand", label: "Thailand", flag: "🇹🇭", landmark: "Wat Arun", swatch: "#E0A63C",
    ambientEmoji: ["🪷"], clickEmoji: ["🐘", "🛕"], pointFoods: ["🍜", "🥭", "🍡"],
    greetings: { morning: "สวัสดีตอนเช้า!", afternoon: "สวัสดีตอนบ่าย!", evening: "สวัสดีตอนเย็น!" } },
  { key: "turkey", label: "Turkey", flag: "🇹🇷", landmark: "Hagia Sophia & Cappadocia", swatch: "#2F9C9E",
    ambientEmoji: ["🎈"], clickEmoji: ["🎈", "🕌"], pointFoods: ["🥙", "🍢", "🍯"],
    greetings: { morning: "Günaydın!", afternoon: "Tünaydın!", evening: "İyi akşamlar!" } },
  { key: "uk", label: "UK", flag: "🇬🇧", landmark: "Tower Bridge", swatch: "#37538C",
    ambientEmoji: ["☂️"], clickEmoji: ["☂️", "👑"], pointFoods: ["🍟", "🫖", "🥧"],
    greetings: { morning: "Good morning!", afternoon: "Good afternoon!", evening: "Good evening!" } },
  { key: "uae", label: "UAE", flag: "🇦🇪", landmark: "Burj Khalifa", swatch: "#D3A652",
    ambientEmoji: ["✨"], clickEmoji: ["🐪", "🕌"], pointFoods: ["🫓", "☕", "🍯"],
    greetings: { morning: "صباح الخير!", afternoon: "مساء الخير!", evening: "مساء الخير!" } },
  { key: "usa", label: "USA", flag: "🇺🇸", landmark: "Golden Gate Bridge", swatch: "#C1502E",
    // Deliberately no Statue of Liberty anywhere in this theme's icon set.
    ambientEmoji: ["⭐"], clickEmoji: ["🦅", "🎆"], pointFoods: ["🍔", "🍕", "🍩"],
    greetings: { morning: "Good morning!", afternoon: "Good afternoon!", evening: "Good evening!" } },
  { key: "vietnam", label: "Vietnam", flag: "🇻🇳", landmark: "Ha Long Bay", swatch: "#2E9E82",
    ambientEmoji: ["🪷"], clickEmoji: ["⛵", "👒"], pointFoods: ["🍲", "🥖", "☕"],
    greetings: { morning: "Chào buổi sáng!", afternoon: "Chào buổi chiều!", evening: "Chào buổi tối!" } },
];

// Default (no country theme selected) greeting — plain English, same three time bands.
export const DEFAULT_GREETINGS = { morning: "Good morning!", afternoon: "Good afternoon!", evening: "Good evening!" };

export const COUNTRY_THEME_STORAGE_KEY = "workbuddy-country-theme";

export function themeClassName(key: string | null): string | null {
  return key ? `theme-${key}` : null;
}

// Builds a `cursor` property value showing a normal arrow-shaped pointer tinted with the theme's
// accent colour. Only ever wins over the browser's default arrow on plain, non-interactive content
// — any element with its own explicit cursor (buttons, links, anything using cursor-pointer) keeps
// its normal cursor, since a more specific declaration always overrides this element-level default.
//
// Shaped like the classic OS arrow pointer (not a sticker/emoji) so it still reads instantly as "a
// cursor" — the hotspot sits at the arrow's tip, top-left, the same "point is where you click"
// convention as the default arrow. A thin white outline keeps it legible over any theme colour.
export function buildCursorStyle(color: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26'><path d='M2 1 L2 20 L7 15.8 L10.3 22.8 L13.5 21.3 L10.2 14.3 L16.5 14.1 Z' fill='${color}' stroke='white' stroke-width='1.4' stroke-linejoin='round'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 2 1, auto`;
}

// Lightens a "#rrggbb" hex colour by mixing it toward white — used to build the second stop of the
// ombre hover cursor below without needing a second hand-picked colour per theme.
function lightenHex(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `rgb(${r}, ${g}, ${b})`;
}

// Same arrow shape as buildCursorStyle, but filled with an ombre (gradient) between the theme's
// accent colour and a lightened version of it, and using the `pointer` cursor keyword as the CSS
// fallback instead of `auto` — this is the cursor shown while hovering anything actually clickable,
// so the gradient itself becomes the "this is clickable" signal instead of silently falling back to
// the browser's plain black system pointer the moment the mouse crosses a button or link.
export function buildOmbreCursorStyle(color: string): string {
  const light = lightenHex(color, 0.55);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${color}'/><stop offset='100%' stop-color='${light}'/></linearGradient></defs><path d='M2 1 L2 20 L7 15.8 L10.3 22.8 L13.5 21.3 L10.2 14.3 L16.5 14.1 Z' fill='url(#g)' stroke='white' stroke-width='1.4' stroke-linejoin='round'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 2 1, pointer`;
}
