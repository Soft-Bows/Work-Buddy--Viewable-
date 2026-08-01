import { useEffect, useRef, useState } from "react";
import { COUNTRY_THEMES } from "@/lib/themes";
import { useApp } from "@/lib/appContext";

// The Appreciation Corner gets its own fixed icon set regardless of the active country theme —
// clicking anything in there pops hearts instead, since the whole section is about sending
// recognition/compliments and a heart reads instantly, everywhere, no theme context needed.
const APPRECIATION_HEARTS = ["❤️", "💕", "💖", "🧡"];

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  dx: number;
  dy: number;
}

let nextParticleId = 0;

// Small icons iconic to the active country theme pop briefly around the cursor whenever the user
// clicks anything in the dashboard — purely decorative, capped in count and short-lived (900ms) so
// it never gets in the way of actually using the app or reads as distracting. No-op while the
// default (non-country) theme is active, since there's no country to represent.
export function ThemeClickBurst({ themeKey }: { themeKey: string | null }) {
  const { section } = useApp();
  const [particles, setParticles] = useState<Particle[]>([]);
  const themeKeyRef = useRef(themeKey);
  themeKeyRef.current = themeKey;
  const sectionRef = useRef(section);
  sectionRef.current = section;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const icons = sectionRef.current === "compliments"
        ? APPRECIATION_HEARTS
        : COUNTRY_THEMES.find(t => t.key === themeKeyRef.current)?.clickEmoji ?? [];
      if (icons.length === 0) return;
      const count = 2 + Math.floor(Math.random() * 2); // 2-3 miniature icons per click
      const spawned: Particle[] = Array.from({ length: count }).map((_, i) => ({
        id: nextParticleId++,
        x: e.clientX,
        y: e.clientY,
        emoji: icons[Math.floor(Math.random() * icons.length)] ?? icons[i % icons.length],
        dx: (Math.random() - 0.5) * 64,
        dy: -28 - Math.random() * 34,
      }));
      // Hard cap so rapid clicking can't pile up an unbounded number of live particles.
      setParticles(prev => [...prev, ...spawned].slice(-24));
      const ids = new Set(spawned.map(p => p.id));
      window.setTimeout(() => {
        setParticles(prev => prev.filter(p => !ids.has(p.id)));
      }, 900);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  if (particles.length === 0) return null;
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden" aria-hidden="true">
      {particles.map(p => (
        <span
          key={p.id}
          className="click-icon-pop absolute text-sm leading-none"
          style={{
            left: p.x,
            top: p.y,
            ["--pop-dx" as string]: `${p.dx}px`,
            ["--pop-dy" as string]: `${p.dy}px`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
