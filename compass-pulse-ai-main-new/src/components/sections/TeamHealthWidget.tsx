import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/appContext";
import { PULSE_QUESTIONS, averagePulseScores, MIN_RESPONSES_FOR_AGGREGATE } from "@/lib/pulseSurvey";
import { MANAGER_BEHAVIORS, averageManagerScores, MIN_RATERS_FOR_AGGREGATE } from "@/lib/managerEffectiveness";
import { ChevronDown, ChevronUp, HeartPulse, Star } from "lucide-react";
import { cn } from "@/lib/utils";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-foreground/80 flex-1">{label}</span>
      <div className="flex items-center gap-0.5 shrink-0">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => onChange(n)} className="p-0.5">
            <Star className={cn("size-4", n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
    </div>
  );
}

function AverageBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground/80">{label}</span>
        <span className="font-semibold">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
    </div>
  );
}

// A single collapsed-by-default "Team Health" widget — combines the missing team-pulse listening
// instrument (Viva Glint/Culture Amp pattern) with upward manager-effectiveness feedback (Google
// re:Work's Project Oxygen behaviours) into ONE card rather than two, since both are short, related,
// monthly, and this page is dense enough already. Manager/HOD viewers see the aggregate (never a
// single rater's answer — same anonymity threshold Glint documents); staff viewers get a short form.
export function TeamHealthWidget({
  mode, viewerName, viewerDept, managerName,
}: {
  mode: "manager" | "staff";
  viewerName: string;
  viewerDept: string;
  managerName?: string;
}) {
  const { pulseResponses, submitPulseResponse, managerEffectivenessRatings, submitManagerEffectivenessRating } = useApp();
  const [expanded, setExpanded] = useState(false);
  const month = currentMonth();
  // Both branches' hooks declared unconditionally, before either return — the early return for
  // "manager" mode below used to sit ahead of the staff-mode useState calls, which broke Rules of
  // Hooks (a hook can never be called conditionally/skipped on some renders).
  const [pulseRatings, setPulseRatings] = useState<Record<string, number>>(() => Object.fromEntries(PULSE_QUESTIONS.map(q => [q.id, 3])));
  const [managerRatings, setManagerRatings] = useState<Record<string, number>>(() => Object.fromEntries(MANAGER_BEHAVIORS.map(b => [b.id, 3])));

  if (mode === "manager") {
    const deptResponses = pulseResponses.filter(r => r.department === viewerDept && r.month === month);
    const pulseAvgs = averagePulseScores(deptResponses);
    const myRatings = managerEffectivenessRatings.filter(r => r.managerName === viewerName && r.month === month);
    const managerAvgs = averageManagerScores(myRatings);

    return (
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
        <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left">
          <div className="flex items-center gap-2">
            <HeartPulse className="size-4 text-rose-500 shrink-0" />
            <span className="text-sm font-semibold">Team Health</span>
            <span className="text-[10px] text-muted-foreground">This month</span>
          </div>
          {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </button>
        {expanded && (
          <div className="px-3.5 pb-3.5 space-y-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Team Pulse</div>
              {pulseAvgs ? (
                <div className="space-y-1.5">
                  {PULSE_QUESTIONS.map(q => <AverageBar key={q.id} label={q.text} value={pulseAvgs[q.id] ?? 0} />)}
                  <p className="text-[10px] text-muted-foreground pt-0.5">Based on {deptResponses.length} anonymous responses this month.</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Not enough responses yet this month (need {MIN_RESPONSES_FOR_AGGREGATE}+ to protect anonymity) — {deptResponses.length} so far.</p>
              )}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">How Your Team Sees You</div>
              {managerAvgs ? (
                <div className="space-y-1.5">
                  {MANAGER_BEHAVIORS.map(b => <AverageBar key={b.id} label={b.text} value={managerAvgs[b.id] ?? 0} />)}
                  <p className="text-[10px] text-muted-foreground pt-0.5">Based on {myRatings.length} anonymous ratings this month.</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Not enough ratings yet this month (need {MIN_RATERS_FOR_AGGREGATE}+ to protect anonymity) — {myRatings.length} so far.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Staff mode — a short give-feedback form, once per month.
  const alreadySubmittedPulse = pulseResponses.some(r => r.respondentName === viewerName && r.month === month);
  const alreadySubmittedRating = managerName && managerEffectivenessRatings.some(r => r.raterName === viewerName && r.managerName === managerName && r.month === month);

  const submit = () => {
    if (!alreadySubmittedPulse) submitPulseResponse({ respondentName: viewerName, department: viewerDept, month, ratings: pulseRatings });
    if (managerName && !alreadySubmittedRating) submitManagerEffectivenessRating({ managerName, raterName: viewerName, month, ratings: managerRatings });
    toast.success("Thanks — your feedback is anonymous and helps shape team support this month.");
  };

  const bothDone = alreadySubmittedPulse && (!managerName || alreadySubmittedRating);

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left">
        <div className="flex items-center gap-2">
          <HeartPulse className="size-4 text-rose-500 shrink-0" />
          <span className="text-sm font-semibold">Team Health check-in</span>
          {bothDone ? (
            <span className="text-[10px] text-rag-green font-medium">✓ Done this month</span>
          ) : (
            // A "collapsed by default" widget nobody notices needs input never gets filled in —
            // this is the same amber not-yet-done signal every other pending action in the app
            // uses, so this reads as "something to do" at a glance instead of easy to forget.
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-rag-amber/15 text-amber-foreground border border-rag-amber/30">
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" /> 2 min · takes just a moment
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {expanded && (
        bothDone ? (
          <p className="px-3.5 pb-3.5 text-xs text-muted-foreground">Thanks for sharing — your answers are anonymous and only ever shown as part of a team-wide average.</p>
        ) : (
          <div className="px-3.5 pb-3.5 space-y-4">
            {!alreadySubmittedPulse && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">How's it going this month?</div>
                <div className="space-y-2">
                  {PULSE_QUESTIONS.map(q => (
                    <RatingRow key={q.id} label={q.text} value={pulseRatings[q.id]} onChange={v => setPulseRatings(prev => ({ ...prev, [q.id]: v }))} />
                  ))}
                </div>
              </div>
            )}
            {managerName && !alreadySubmittedRating && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">How's {managerName.split(" ")[0]} doing as your manager?</div>
                <div className="space-y-2">
                  {MANAGER_BEHAVIORS.map(b => (
                    <RatingRow key={b.id} label={b.text} value={managerRatings[b.id]} onChange={v => setManagerRatings(prev => ({ ...prev, [b.id]: v }))} />
                  ))}
                </div>
              </div>
            )}
            <button onClick={submit} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">Submit anonymously</button>
          </div>
        )
      )}
    </div>
  );
}
