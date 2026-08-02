import { useEffect, useState, type ReactNode } from "react";
import { COUNTRY_THEMES, COUNTRY_THEME_STORAGE_KEY } from "@/lib/themes";
import { cn } from "@/lib/utils";

// Reads the active country theme's own accent colour straight from localStorage — same source
// FeedbackCornerSection.tsx's useActiveThemeEmoji already reads from, just the hex swatch instead
// of the ambient emoji. No app-context state for it; it's a page-local decorative read.
function useActiveThemeSwatch(): string {
  const [swatch, setSwatch] = useState("#D97706"); // amber-600 fallback, matches the app's default accent
  useEffect(() => {
    const key = window.localStorage.getItem(COUNTRY_THEME_STORAGE_KEY);
    const theme = COUNTRY_THEMES.find(t => t.key === key);
    if (theme?.swatch) setSwatch(theme.swatch);
  }, []);
  return swatch;
}

// The "recently updated" flourish — a small burst of short radiating lines around a corner dot,
// in the active theme's own accent colour, echoing how the sun is drawn in the theme backdrops
// (a circle surrounded by short rays). Deliberately a corner decoration, not a border treatment,
// so it reads as visually distinct from the solid red/amber "needs attention" ring at a glance.
function UpdatedBurst({ color }: { color: string }) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg className="absolute -top-2.5 -right-2.5 size-6 pointer-events-none drop-shadow-sm" viewBox="0 0 24 24" aria-hidden="true">
      {rays.map(deg => (
        <line
          key={deg} x1="12" y1="7.5" x2="12" y2="2.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="4.5" fill={color} />
    </svg>
  );
}

// The shared, consistent two-style highlight wrapper used everywhere an Objective/Key Result card
// renders (Team OKRs, Philly Group OKRs, the director Home page's flagged list): a solid red/amber
// ring for "needs attention" (a status signal — this item's confidence or score is red/amber right
// now) and a distinct corner burst for "recently updated" (an activity signal — this item's score,
// owner, description, or due date changed recently) — the two are visually different enough to tell
// apart in the same glance, and never rendered as the same treatment.
export function AttentionHighlight({
  needsAttention, rag, recentlyUpdated, children, className,
}: {
  needsAttention?: boolean;
  rag?: "red" | "amber";
  recentlyUpdated?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const swatch = useActiveThemeSwatch();
  return (
    <div
      className={cn(
        "relative",
        needsAttention && "rounded-xl ring-2 ring-offset-1 ring-offset-background",
        needsAttention && rag === "red" && "ring-rag-red",
        needsAttention && rag === "amber" && "ring-amber-400",
        className,
      )}
    >
      {children}
      {recentlyUpdated && <UpdatedBurst color={swatch} />}
    </div>
  );
}
