import { toast } from "sonner";
import { COUNTRY_THEMES, COUNTRY_THEME_STORAGE_KEY, DEFAULT_GREETINGS } from "@/lib/themes";
import { CountryFlagIcon } from "@/components/CountryFlagIcon";

function timeOfDayGreeting(greetings: { morning: string; afternoon: string; evening: string }): string {
  const hour = new Date().getHours();
  if (hour < 12) return greetings.morning;
  if (hour < 18) return greetings.afternoon;
  return greetings.evening;
}

// Shown once per app load — "greeted like an iOS device on restart" — in the language of whichever
// country theme is currently selected (time-of-day-appropriate: morning/afternoon/evening), always
// followed by the same English line regardless of theme. No theme selected → plain English both lines.
export function showGreetingToast() {
  if (typeof window === "undefined") return;
  const key = window.localStorage.getItem(COUNTRY_THEME_STORAGE_KEY);
  const theme = COUNTRY_THEMES.find(t => t.key === key);
  const localGreeting = timeOfDayGreeting(theme?.greetings ?? DEFAULT_GREETINGS);

  toast.custom(() => (
    <div className="bg-background text-foreground border border-border rounded-lg shadow-lg px-4 py-3 text-sm min-w-[280px] max-w-[356px]">
      <div className="flex items-center gap-2">
        {/* CountryFlagIcon, not the Unicode flag emoji — Windows doesn't reliably render regional-
            indicator flag glyphs (see CountryFlagIcon.tsx's own comment for the full story). */}
        {theme && <CountryFlagIcon countryKey={theme.key} size={20} className="rounded-sm shrink-0" />}
        <span className="font-display text-base">{localGreeting}</span>
      </div>
      <div className="text-muted-foreground mt-0.5">Welcome back, let's get started shall we?</div>
    </div>
  ), { duration: 5000 });
}
