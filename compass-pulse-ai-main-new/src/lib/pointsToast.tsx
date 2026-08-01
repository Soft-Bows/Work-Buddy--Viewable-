import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { COUNTRY_THEMES, COUNTRY_THEME_STORAGE_KEY } from "@/lib/themes";

// Slot positions for the food-icon burst around a points toast — fixed rather than randomised so
// the layout stays legible (icons never overlap the message text) while still reading as a
// scattered little celebration rather than a neat row.
const BURST_SLOTS = [
  { top: "-10px", left: "-8px" },
  { top: "-14px", right: "10px" },
  { bottom: "-10px", left: "18px" },
  { bottom: "-12px", right: "-6px" },
];

function currentThemeFoods(): string[] {
  if (typeof window === "undefined") return [];
  const key = window.localStorage.getItem(COUNTRY_THEME_STORAGE_KEY);
  return COUNTRY_THEMES.find(t => t.key === key)?.pointFoods ?? [];
}

// Drop-in replacement for `toast.success(message)` at every "the user just earned points" moment.
// When a country theme is active, a small scatter of that country's food icons pops briefly around
// the toast; with no theme selected it's just a normal success toast (still cheery, just plain).
export function pointsToast(message: string) {
  const foods = currentThemeFoods();
  if (foods.length === 0) {
    toast.success(message);
    return;
  }
  toast.custom(() => (
    <div className="relative bg-background text-foreground border border-border rounded-lg shadow-lg px-4 py-3 pr-5 text-sm flex items-start gap-2 min-w-[280px] max-w-[356px]">
      {foods.slice(0, 4).map((emoji, i) => {
        const slot = BURST_SLOTS[i % BURST_SLOTS.length];
        return (
          <span
            key={i}
            className="points-food-pop absolute text-base select-none"
            style={{ ...slot, animationDelay: `${i * 90}ms` }}
            aria-hidden="true"
          >
            {emoji}
          </span>
        );
      })}
      <CheckCircle2 className="size-4 text-rag-green shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
    </div>
  ));
}
