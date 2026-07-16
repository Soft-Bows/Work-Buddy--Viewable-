import { useState, useEffect } from "react";
import { Card, SectionTitle } from "@/components/ui-bits";
import { useApp } from "@/lib/appContext";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Sparkles, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function CoffeeMugSVG() {
  return (
    <svg width="34" height="34" viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 8 Q13.5 4 12 1" stroke="#22D3EE" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M19 6 Q20.5 2 19 0" stroke="#22D3EE" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <rect x="4" y="10" width="22" height="26" rx="4" fill="#3B82F6"/>
      <path d="M26 16 Q36 16 36 23 Q36 30 26 30" stroke="#93C5FD" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <rect x="7" y="13" width="7" height="6" rx="3" fill="white" fillOpacity="0.25"/>
      <circle cx="13" cy="24" r="1.5" fill="white"/>
      <circle cx="20" cy="24" r="1.5" fill="white"/>
      <path d="M11.5 28.5 Q16.5 32 22.5 28.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

// 6 months (in days) from the date an action plan item was posted to the dashboard
const LAPSE_WINDOW_DAYS = 182;

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  const posted = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24));
}

export function SurveySection() {
  const { surveyData, actionPlanItems: initialItems, toggleActionPlanItem } = useApp();
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState("All job functions");

  useEffect(() => { setItems(initialItems); }, [initialItems]);

  const toggle = (id: string) => {
    const next = !(items.find(i => i.id === id)?.done ?? false);
    setItems(s => s.map(i => i.id !== id ? i : { ...i, done: next }));
    if (next) toast.success(`Action completed`);
    void toggleActionPlanItem(id, next);
  };
  const belowBench = surveyData.find((s) => s.you < s.benchmark);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div className="mb-5">
          <div className="flex items-center gap-3">
            <CoffeeMugSVG />
            <h2 className="font-display text-2xl">Survey Insights</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Your manager competency ratings vs the 2026 company benchmark.</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm rounded-md border border-input bg-background px-3 py-2"
        >
          <option>All job functions</option>
          <option>People & Culture</option>
          <option>Engineering</option>
          <option>Finance</option>
        </select>
      </div>

      <Card>
        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={surveyData}>
              <PolarGrid stroke="oklch(0.916 0.022 248)" />
              <PolarAngleAxis dataKey="competency" tick={{ fontSize: 12, fill: "oklch(0.40 0.07 258)" }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="2026 Benchmark" dataKey="benchmark" stroke="oklch(0.74 0.20 190)" fill="oklch(0.74 0.20 190)" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="You" dataKey="you" stroke="oklch(0.56 0.24 255)" fill="oklch(0.56 0.24 255)" fillOpacity={0.30} strokeWidth={2} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {belowBench && (
        <Card className="border-amber/40 bg-amber/5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="size-4 text-amber-foreground" />
            <div className="text-xs uppercase tracking-widest text-amber-foreground">AI-curated action plan</div>
          </div>
          <SectionTitle sub={`You scored below benchmark in ${belowBench.competency}. Mark each item complete, or let it lapse — items not completed within 6 months of being posted incur a 10 pt deduction.`}>
            Your Action Plan: {belowBench.competency}
          </SectionTitle>

          <div className="space-y-2 mt-4">
            {items.map((it) => {
              const elapsed = daysSince(it.postedDate);
              const daysLeft = LAPSE_WINDOW_DAYS - elapsed;
              const lapsed = !it.done && daysLeft <= 0;
              return (
                <div key={it.id} className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  it.done ? "bg-rag-green/5 border-rag-green/30" : lapsed ? "bg-rag-red/5 border-rag-red/30" : "bg-background border-border"
                )}>
                  <button onClick={() => toggle(it.id)}>
                    {it.done ? <CheckCircle2 className="size-5 text-rag-green" /> : <Circle className="size-5 text-muted-foreground" />}
                  </button>
                  <div className="flex-1">
                    <div className={cn("text-sm font-medium", it.done && "line-through text-muted-foreground")}>{it.title}</div>
                    <div className="text-xs text-muted-foreground">{it.desc}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Due {it.deadline}</div>
                  <ActionStatusBadge done={it.done} lapsed={lapsed} daysLeft={daysLeft} />
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function ActionStatusBadge({ done, lapsed, daysLeft }: { done: boolean; lapsed: boolean; daysLeft: number }) {
  if (done) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-rag-green/10 text-rag-green border border-rag-green/30 shrink-0">
        <CheckCircle2 className="size-3" /> Completed
      </span>
    );
  }
  if (lapsed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-rag-red/10 text-rag-red border border-rag-red/30 shrink-0">
        Lapsed · −10 pts
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border shrink-0">
      {daysLeft}d left
    </span>
  );
}
