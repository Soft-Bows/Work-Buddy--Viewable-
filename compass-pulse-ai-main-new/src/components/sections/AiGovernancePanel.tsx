import { useState } from "react";
import { useApp } from "@/lib/appContext";
import { AI_ACTIVITY_KIND_LABEL, type AiActivityKind } from "@/lib/aiActivity";
import { complianceDepartmentGoals, COMPLIANCE_DEPT_NAME } from "@/lib/complianceData";
import { HCWM_DEPT_NAME, CREDIT_RISK_DEPT_NAME } from "@/lib/insights";
import { ChevronDown, ChevronUp, ShieldCheck, Scale, Sparkles, Bell, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<AiActivityKind, typeof Bell> = {
  nudge: Bell,
  prep_agent: Sparkles,
  ai_minutes: FileText,
  calibration_flag: AlertTriangle,
};

// A visible audit trail of every automated action this app takes, plus a simple quarterly-score
// calibration check — grounded in Workday's Agent System of Record and DBS's own PURE framework
// (Purposeful, Unsurprising, Respectful, Explainable) for AI at a regulated financial institution:
// nothing here should act invisibly. Collapsed by default, tucked into Admin (the appropriate
// oversight-only surface) rather than the main dashboards everyone sees daily.
export function AiGovernancePanel() {
  const { aiActivityLog, hcwmDepartmentGoals, opsDepartmentGoals } = useApp();
  const [expanded, setExpanded] = useState(false);

  const deptGoalLists: Record<string, typeof hcwmDepartmentGoals> = {
    [HCWM_DEPT_NAME]: hcwmDepartmentGoals,
    [CREDIT_RISK_DEPT_NAME]: opsDepartmentGoals,
    [COMPLIANCE_DEPT_NAME]: complianceDepartmentGoals,
  };
  const deptAverages = Object.entries(deptGoalLists)
    .map(([dept, goals]) => {
      const scores = goals.flatMap(g => (g.keyResults ?? []).map(k => k.score).filter((s): s is number => s !== undefined));
      return { dept, avg: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null, n: scores.length };
    })
    .filter(d => d.avg !== null) as { dept: string; avg: number; n: number }[];
  const overallAvg = deptAverages.length > 0 ? deptAverages.reduce((a, d) => a + d.avg, 0) / deptAverages.length : 0;
  // A department scoring 0.12+ away from the cross-department average is flagged — not proof of
  // bias, just worth a look, same framing SAP's Calibration Agent uses ("flags potential bias to
  // support fair ratings," not an automatic verdict).
  const CALIBRATION_THRESHOLD = 0.12;
  const calibrationFlags = deptAverages
    .map(d => ({ ...d, deviation: d.avg - overallAvg }))
    .filter(d => Math.abs(d.deviation) >= CALIBRATION_THRESHOLD && d.n >= 3);

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between gap-2 px-4 py-3.5 text-left">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-indigo-500 shrink-0" />
          <span className="text-sm font-semibold">AI Governance &amp; Calibration</span>
          <span className="text-[10px] text-muted-foreground">{aiActivityLog.length} logged action{aiActivityLog.length === 1 ? "" : "s"}</span>
        </div>
        {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-5">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Scale className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quarterly Score Calibration</span>
            </div>
            {calibrationFlags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No department's average quarterly score deviates meaningfully from the cross-department average right now.</p>
            ) : (
              <ul className="space-y-1.5">
                {calibrationFlags.map(f => (
                  <li key={f.dept} className="flex items-center justify-between gap-2 text-xs rounded-md border border-amber-300/50 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-700/30 px-2.5 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="size-3 text-amber-700 dark:text-amber-400 shrink-0" />
                      {f.dept}
                    </span>
                    <span className="text-muted-foreground">
                      avg {f.avg.toFixed(2)} vs. {overallAvg.toFixed(2)} overall ({f.deviation > 0 ? "+" : ""}{f.deviation.toFixed(2)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Recent AI Activity</div>
            {aiActivityLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No AI-assisted actions logged yet.</p>
            ) : (
              <ul className="space-y-1.5 max-h-72 overflow-y-auto">
                {aiActivityLog.slice(0, 25).map(entry => {
                  const Icon = KIND_ICON[entry.kind];
                  return (
                    <li key={entry.id} className="flex items-start gap-2 text-xs border-b border-border/40 last:border-0 pb-1.5 last:pb-0">
                      <Icon className={cn("size-3.5 shrink-0 mt-0.5", entry.kind === "calibration_flag" ? "text-amber-600" : "text-primary")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium">{AI_ACTIVITY_KIND_LABEL[entry.kind]}</span>
                          <span className="text-[10px] text-muted-foreground">{entry.date}</span>
                        </div>
                        <div className="text-muted-foreground">{entry.summary}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
