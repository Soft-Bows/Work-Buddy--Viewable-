import { useEffect, useRef } from "react";
import { X, Globe2 } from "lucide-react";
import { cn, isRecentlyUpdated } from "@/lib/utils";
import { useApp } from "@/lib/appContext";
import { marketingDepartmentGoals, MARKETING_DEPT_NAME } from "@/lib/marketingData";
import { HCWM_DEPT_NAME, CREDIT_RISK_DEPT_NAME } from "@/lib/insights";
import { RagPill } from "./ui-bits";
import { AttentionHighlight } from "./AttentionHighlight";

// The 2026 Philly Group OKRs viewer — the group-level layer above every department's own Objectives
// (see src/lib/phillyGroupOkrs.ts for why this exists and the research behind it). Openable from any
// user's Team OKRs page, and from a "Linked to Philly Group OKR" chip on any department Objective
// that has opted to link up — either way this always shows the FULL live picture (every group
// Objective/Key Result, its owner, and every department Objective currently linked to it), not just
// the one entry that was clicked, so a viewer always has the complete group context.
export function PhillyGroupOkrsDialog({
  onClose, highlightGoalId, highlightKrId,
}: {
  onClose: () => void;
  highlightGoalId?: string;
  highlightKrId?: string;
}) {
  const { hcwmDepartmentGoals, opsDepartmentGoals, phillyGroupGoals } = useApp();
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Live dept-goal lists, each tagged with the real department name it belongs to (DeptGoal itself
  // carries no dept field) — this is the only place that needs "which department is this Objective
  // from," so it's built here rather than adding a dept field to the shared DeptGoal type.
  const deptGoalsWithDeptName: { dept: string; goals: typeof hcwmDepartmentGoals }[] = [
    { dept: HCWM_DEPT_NAME, goals: hcwmDepartmentGoals },
    { dept: CREDIT_RISK_DEPT_NAME, goals: opsDepartmentGoals },
    { dept: MARKETING_DEPT_NAME, goals: marketingDepartmentGoals },
  ];

  const linkedDeptGoalsFor = (goalId: string, krId: string) =>
    deptGoalsWithDeptName.flatMap(({ dept, goals }) =>
      goals.filter(g => g.linkedPhillyGoalId === goalId && g.linkedPhillyKrId === krId).map(g => ({ dept, goal: g })));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-2">
            <Globe2 className="size-5 text-primary" />
            <div>
              <div className="font-semibold text-sm">2026 Philly Group OKRs</div>
              <div className="text-[11px] text-muted-foreground">The group-level layer every department's OKRs can ladder up to</div>
            </div>
          </div>
          <button onClick={onClose} className="size-7 rounded-md grid place-items-center text-muted-foreground hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {phillyGroupGoals.map(pg => (
            <div key={pg.id} className="rounded-xl border border-border overflow-hidden">
              <div className="bg-gradient-to-r from-amber-100/60 to-transparent dark:from-amber-900/15 px-4 py-3 border-b border-border">
                <div className="font-semibold text-sm">{pg.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{pg.description}</div>
                <div className="text-[10px] text-muted-foreground mt-1">Executive sponsor: <span className="font-medium text-foreground">{pg.owner}</span></div>
              </div>
              <div className="divide-y divide-border/60">
                {pg.keyResults.map(kr => {
                  const linked = linkedDeptGoalsFor(pg.id, kr.id);
                  const isHighlighted = highlightGoalId === pg.id && highlightKrId === kr.id;
                  const needsAttention = kr.ragConfidence === "red" || kr.ragConfidence === "amber";
                  return (
                    <div key={kr.id} ref={isHighlighted ? highlightRef : undefined} className={cn(isHighlighted && "bg-amber-50 dark:bg-amber-900/10")}>
                      <AttentionHighlight needsAttention={needsAttention} rag={kr.ragConfidence === "red" ? "red" : "amber"} recentlyUpdated={isRecentlyUpdated(kr)} className="mx-2 my-1">
                        <div className={cn("px-2 py-2", isHighlighted && "ring-1 ring-inset ring-amber-300/60 rounded-lg")}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-xs font-medium min-w-0">{kr.title}</div>
                            <RagPill rag={kr.ragConfidence} />
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">Owner: <span className="font-medium text-foreground">{kr.owner}</span></div>
                          {linked.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {linked.map(({ dept, goal }) => (
                                <span key={goal.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-foreground border border-border">
                                  {dept}: {goal.title}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-1.5 text-[10px] text-muted-foreground/70 italic">No department Objective linked to this yet</div>
                          )}
                        </div>
                      </AttentionHighlight>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
