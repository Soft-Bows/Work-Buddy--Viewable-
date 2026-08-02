import { useApp } from "@/lib/appContext";
import { currentQuarterLabel, isPulseWindowOpen } from "@/lib/pulseSurvey";
import { isManagerSurveyWindowOpen } from "@/lib/managerEffectiveness";
import { HeartPulse, ChevronRight } from "lucide-react";

// A slim Home-page entry point into Feedback Corner — the full submission forms and aggregate
// insights (Team Pulse, Manager Self-Improvement Survey, Key Staff Challenges, the AI action plan)
// all live on that one consolidated page now, so this card doesn't duplicate any of that UI; it's
// just a status line + a way in.
export function TeamHealthWidget({ viewerName }: { viewerName: string }) {
  const { pulseResponses, setSection } = useApp();
  const quarter = currentQuarterLabel();
  const alreadySubmittedPulse = pulseResponses.some(r => r.respondentName === viewerName && r.quarter === quarter);
  const pulseOpen = isPulseWindowOpen();
  const managerSurveyOpen = isManagerSurveyWindowOpen();

  const statusLine = alreadySubmittedPulse
    ? `Team Pulse done for ${quarter}`
    : pulseOpen
    ? "Team Pulse open — takes 2 min"
    : "Team Pulse closed until next quarter";

  return (
    <button
      onClick={() => setSection("survey")}
      className="w-full rounded-xl border border-border/70 bg-card overflow-hidden flex items-center justify-between gap-2 px-4 py-3 text-left hover:border-primary/40 transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <HeartPulse className="size-4 text-rose-500 shrink-0" />
        <div>
          <div className="text-sm font-semibold">Feedback Corner</div>
          <div className="text-[11px] text-muted-foreground">
            {statusLine}
            {managerSurveyOpen && " · Manager survey open"}
          </div>
        </div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
    </button>
  );
}
