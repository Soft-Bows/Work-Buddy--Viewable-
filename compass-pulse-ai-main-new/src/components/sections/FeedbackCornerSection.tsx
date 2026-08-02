import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/appContext";
import { getAiProvider } from "@/lib/aiService";
import {
  PULSE_QUESTIONS, averagePulseScores, MIN_RESPONSES_FOR_AGGREGATE,
  currentQuarterLabel, previousQuarterLabel, isPulseWindowOpen, isNewInsightsBadgeActive, aggregateFirstShownDate,
} from "@/lib/pulseSurvey";
import {
  MANAGER_BEHAVIORS, LEADERSHIP_AREAS, MANAGER_SURVEY_TEXT_QUESTIONS,
  averageManagerScores, averageManagerScoresByArea, collectTextResponses, MIN_RATERS_FOR_AGGREGATE,
  isManagerSurveyWindowOpen, currentManagerSurveyCycleYear,
} from "@/lib/managerEffectiveness";
import { resolveOwnScopeChallenges, computeChallengeThemes, HCWM_DEPT_NAME, CREDIT_RISK_DEPT_NAME } from "@/lib/insights";
import { COMPLIANCE_DEPT_NAME, complianceTeamMembers, complianceDepartmentGoals } from "@/lib/complianceData";
import { MARKETING_DEPT_NAME, marketingTeamMembers, marketingDepartmentGoals } from "@/lib/marketingData";
import { hasMinimumTenure, cn } from "@/lib/utils";
import { pointsToast } from "@/lib/pointsToast";
import { COUNTRY_THEMES, COUNTRY_THEME_STORAGE_KEY } from "@/lib/themes";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { HeartPulse, Star, Sparkles, Lock, Users, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from "lucide-react";
import type { TeamMember, DeptGoal } from "@/lib/mockData";

// ── Small shared bits ────────────────────────────────────────────────────────────

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

function AverageBar({ label, value, benchmark }: { label: string; value: number; benchmark?: number }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground/80">{label}</span>
        <span className="font-semibold">
          {value.toFixed(1)}
          {benchmark !== undefined && <span className="text-muted-foreground font-normal ml-1">(co. avg {benchmark.toFixed(1)})</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden relative">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(value / 5) * 100}%` }} />
        {benchmark !== undefined && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/40" style={{ left: `${(benchmark / 5) * 100}%` }} />
        )}
      </div>
    </div>
  );
}

function TrendBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.05) return <span className="text-[10px] text-muted-foreground">flat vs prior period</span>;
  const up = delta > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium", up ? "text-rag-green" : "text-rag-red")}>
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? "+" : ""}{delta.toFixed(1)} vs prior period
    </span>
  );
}

function overallAverage(avgs: Record<string, number> | null): number | null {
  if (!avgs) return null;
  const vals = Object.values(avgs);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

// Reads the active country theme's ambient icon straight from localStorage, same source
// DashboardShell.tsx uses — there's no app-context state for it, it's a page-local decorative touch.
function useActiveThemeEmoji(): string {
  const [emoji, setEmoji] = useState("✨");
  useEffect(() => {
    const key = window.localStorage.getItem(COUNTRY_THEME_STORAGE_KEY);
    const theme = COUNTRY_THEMES.find(t => t.key === key);
    if (theme?.ambientEmoji[0]) setEmoji(theme.ambientEmoji[0]);
  }, []);
  return emoji;
}

function NewInsightsBadge() {
  const emoji = useActiveThemeEmoji();
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber/20 text-amber-foreground border border-amber/40">
      <span>{emoji}</span> New Insights
    </span>
  );
}

// ── Team Pulse ───────────────────────────────────────────────────────────────────

function TeamPulseCard({
  viewerName, viewerDept, isHod, canViewAggregate,
}: { viewerName: string; viewerDept: string; isHod: boolean; canViewAggregate: boolean }) {
  const { pulseResponses, submitPulseResponse, addPoints } = useApp();
  const [expanded, setExpanded] = useState(true);
  const quarter = currentQuarterLabel();
  const prevQuarter = previousQuarterLabel();
  const windowOpen = isPulseWindowOpen();
  const [ratings, setRatings] = useState<Record<string, number>>(() => Object.fromEntries(PULSE_QUESTIONS.map(q => [q.id, 3])));

  const alreadySubmitted = pulseResponses.some(r => r.respondentName === viewerName && r.quarter === quarter);

  const submit = () => {
    submitPulseResponse({ respondentName: viewerName, department: viewerDept, quarter, submittedAt: new Date().toISOString(), ratings });
    addPoints(5);
    pointsToast("Thanks for sharing — +5 pts. Your answers are anonymous and only ever shown as part of a team-wide average.");
  };

  const deptResponses = pulseResponses.filter(r => r.department === viewerDept && r.quarter === quarter);
  const deptAvgs = averagePulseScores(deptResponses);
  const companyResponses = pulseResponses.filter(r => r.quarter === quarter);
  const companyAvgs = averagePulseScores(companyResponses);
  const prevDeptAvgs = averagePulseScores(pulseResponses.filter(r => r.department === viewerDept && r.quarter === prevQuarter));
  const currentOverall = overallAverage(deptAvgs);
  const prevOverall = overallAverage(prevDeptAvgs);
  const firstShown = aggregateFirstShownDate(deptResponses);
  const isNew = isNewInsightsBadgeActive(firstShown);

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <HeartPulse className="size-4 text-rose-500 shrink-0" />
          <span className="text-sm font-semibold">Team Pulse</span>
          <span className="text-[10px] text-muted-foreground">{quarter}</span>
          {isNew && canViewAggregate && <NewInsightsBadge />}
        </div>
        {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {!isHod && (
            <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-2.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                How's this quarter going? {!windowOpen && <span className="text-rag-amber">(window closed)</span>}
              </div>
              {alreadySubmitted ? (
                <p className="text-xs text-rag-green font-medium">✓ Submitted for {quarter} — thanks!</p>
              ) : windowOpen ? (
                <>
                  <div className="space-y-2">
                    {PULSE_QUESTIONS.map(q => (
                      <RatingRow key={q.id} label={q.text} value={ratings[q.id]} onChange={v => setRatings(prev => ({ ...prev, [q.id]: v }))} />
                    ))}
                  </div>
                  <button onClick={submit} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                    Submit anonymously · +5 pts (optional)
                  </button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Team Pulse is open from the first to the last working day of each quarter — check back next quarter.</p>
              )}
            </div>
          )}

          {canViewAggregate && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{viewerDept} — {quarter} insights</div>
              {deptAvgs ? (
                <div className="space-y-1.5">
                  {PULSE_QUESTIONS.map(q => <AverageBar key={q.id} label={q.text} value={deptAvgs[q.id] ?? 0} benchmark={companyAvgs?.[q.id]} />)}
                  <div className="flex items-center justify-between pt-0.5">
                    <p className="text-[10px] text-muted-foreground">Based on {deptResponses.length} anonymous responses this quarter.</p>
                    {currentOverall !== null && prevOverall !== null && <TrendBadge delta={currentOverall - prevOverall} />}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Not enough responses yet this quarter (need {MIN_RESPONSES_FOR_AGGREGATE}+ to protect anonymity) — {deptResponses.length} so far.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Manager Self-Improvement Survey ─────────────────────────────────────────────

function ManagerSurveyCard({
  viewerName, mySupervisorName, canViewAggregate, tenureOk,
}: { viewerName: string; mySupervisorName: string | null; canViewAggregate: boolean; tenureOk: boolean }) {
  const { managerEffectivenessRatings, submitManagerEffectivenessRating } = useApp();
  const [expanded, setExpanded] = useState(true);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const toggleArea = (a: string) => setExpandedAreas(prev => {
    const next = new Set(prev);
    if (next.has(a)) next.delete(a); else next.add(a);
    return next;
  });
  const cycleYear = currentManagerSurveyCycleYear();
  const windowOpen = isManagerSurveyWindowOpen();
  const [ratings, setRatings] = useState<Record<string, number>>(() => Object.fromEntries(MANAGER_BEHAVIORS.map(b => [b.id, 3])));
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>(() => Object.fromEntries(MANAGER_SURVEY_TEXT_QUESTIONS.map(q => [q.id, ""])));

  const alreadySubmitted = mySupervisorName
    ? managerEffectivenessRatings.some(r => r.raterName === viewerName && r.managerName === mySupervisorName && r.cycleYear === cycleYear)
    : false;

  const submit = () => {
    if (!mySupervisorName) return;
    const textResponses = Object.fromEntries(Object.entries(textAnswers).filter(([, v]) => v.trim()));
    submitManagerEffectivenessRating({
      managerName: mySupervisorName, raterName: viewerName, cycleYear, submittedAt: new Date().toISOString(),
      ratings, textResponses: Object.keys(textResponses).length ? textResponses : undefined,
    });
    toast.success("Thanks — your feedback is anonymous and helps shape support this cycle.");
  };

  const myRatings = managerEffectivenessRatings.filter(r => r.managerName === viewerName && r.cycleYear === cycleYear);
  const myAvgs = averageManagerScores(myRatings);
  const myAreaAvgs = averageManagerScoresByArea(myAvgs);
  const companyRatings = managerEffectivenessRatings.filter(r => r.cycleYear === cycleYear);
  const companyAvgs = averageManagerScores(companyRatings);
  const companyAreaAvgs = averageManagerScoresByArea(companyAvgs);
  const lastYearRatings = managerEffectivenessRatings.filter(r => r.managerName === viewerName && r.cycleYear === cycleYear - 1);
  const lastYearAvgs = averageManagerScores(lastYearRatings);
  const myOverall = overallAverage(myAvgs);
  const lastYearOverall = overallAverage(lastYearAvgs);

  const radarData = LEADERSHIP_AREAS.map(area => ({
    area: area.length > 20 ? `${area.slice(0, 20)}…` : area,
    you: myAreaAvgs?.[area] ?? 0,
    "company avg": companyAreaAvgs?.[area] ?? 0,
  }));

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-violet-500 shrink-0" />
          <span className="text-sm font-semibold">Manager Self-Improvement Survey</span>
          <span className="text-[10px] text-muted-foreground">{cycleYear} cycle</span>
        </div>
        {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {tenureOk && mySupervisorName && (
            <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                How's {mySupervisorName.split(" ")[0]} doing as your manager? {!windowOpen && <span className="text-rag-amber">(opens Aug 1)</span>}
              </div>
              {alreadySubmitted ? (
                <p className="text-xs text-rag-green font-medium">✓ Submitted for the {cycleYear} cycle — thanks!</p>
              ) : windowOpen ? (
                <>
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {LEADERSHIP_AREAS.map(area => (
                      <div key={area}>
                        <div className="text-[11px] font-semibold text-primary mb-1.5">{area}</div>
                        <div className="space-y-1.5">
                          {MANAGER_BEHAVIORS.filter(b => b.leadershipArea === area).map(b => (
                            <RatingRow key={b.id} label={b.text} value={ratings[b.id]} onChange={v => setRatings(prev => ({ ...prev, [b.id]: v }))} />
                          ))}
                        </div>
                      </div>
                    ))}
                    <div>
                      <div className="text-[11px] font-semibold text-primary mb-1.5">General</div>
                      <div className="space-y-2">
                        {MANAGER_SURVEY_TEXT_QUESTIONS.map(q => (
                          <div key={q.id}>
                            <label className="text-[10px] text-muted-foreground">{q.text}</label>
                            <textarea
                              value={textAnswers[q.id]} onChange={e => setTextAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} rows={2}
                              className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 mt-0.5"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={submit} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">Submit anonymously</button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Runs annually, Aug 1 – Sep 30. Check back then.</p>
              )}
            </div>
          )}

          {canViewAggregate && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">How your team sees you</div>
                {myOverall !== null && lastYearOverall !== null && <TrendBadge delta={myOverall - lastYearOverall} />}
              </div>
              {myAvgs && myAreaAvgs ? (
                <>
                  <div className="h-[260px] -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="oklch(0.916 0.022 248)" />
                        <PolarAngleAxis dataKey="area" tick={{ fontSize: 10, fill: "oklch(0.40 0.07 258)" }} />
                        <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                        <Radar name="Company avg" dataKey="company avg" stroke="oklch(0.74 0.20 190)" fill="oklch(0.74 0.20 190)" fillOpacity={0.15} strokeWidth={2} />
                        <Radar name="You" dataKey="you" stroke="oklch(0.56 0.24 255)" fill="oklch(0.56 0.24 255)" fillOpacity={0.30} strokeWidth={2} />
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">Based on {myRatings.length} anonymous ratings this cycle.</p>

                  {/* Drill-down: every individual item's score within each leadership area */}
                  <div className="space-y-1.5">
                    {LEADERSHIP_AREAS.map(area => (
                      <div key={area} className="rounded-lg border border-border/60 bg-background/70">
                        <button onClick={() => toggleArea(area)} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left">
                          <span className="text-xs font-medium">{area}</span>
                          <span className="text-[10px] text-muted-foreground">{(myAreaAvgs[area] ?? 0).toFixed(1)}</span>
                        </button>
                        {expandedAreas.has(area) && (
                          <div className="px-3 pb-2.5 space-y-1.5">
                            {MANAGER_BEHAVIORS.filter(b => b.leadershipArea === area).map(b => (
                              <AverageBar key={b.id} label={b.text} value={myAvgs[b.id] ?? 0} benchmark={companyAvgs?.[b.id]} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Free-text answers, listed anonymously — nothing to average about open-ended comments */}
                  {MANAGER_SURVEY_TEXT_QUESTIONS.map(q => {
                    const answers = collectTextResponses(myRatings, q.id);
                    if (answers.length === 0) return null;
                    return (
                      <div key={q.id} className="mt-3">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{q.text}</div>
                        <ul className="space-y-1">
                          {answers.map((a, i) => (
                            <li key={i} className="text-xs text-foreground/80 bg-background rounded-md border border-border p-2">&ldquo;{a}&rdquo;</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Not enough ratings yet this cycle (need {MIN_RATERS_FOR_AGGREGATE}+ to protect anonymity) — {myRatings.length} so far.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Key Staff Challenges (consolidated) ─────────────────────────────────────────

function KeyStaffChallengesCard({
  viewerName, isHod, hasDirectorMeta, isTeamLead, isDirectorDesignation,
}: { viewerName: string; isHod: boolean; hasDirectorMeta: boolean; isTeamLead: boolean; isDirectorDesignation: boolean }) {
  const { teamMembers, opsTeamMembersAll, hcwmTeamMembers, hcwmDepartmentGoals, opsDepartmentGoals, departmentGoals, staffList } = useApp();
  const [expanded, setExpanded] = useState(true);
  const [orgWide, setOrgWide] = useState(false);
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const toggleTheme = (t: string) => setExpandedThemes(prev => {
    const next = new Set(prev);
    if (next.has(t)) next.delete(t); else next.add(t);
    return next;
  });

  const canonicalOwnDept = staffList.find(s => s.name === viewerName)?.dept ?? "";
  const membersByDept: Record<string, TeamMember[]> = {
    [HCWM_DEPT_NAME]: hcwmTeamMembers, [CREDIT_RISK_DEPT_NAME]: opsTeamMembersAll,
    [COMPLIANCE_DEPT_NAME]: complianceTeamMembers, [MARKETING_DEPT_NAME]: marketingTeamMembers,
  };
  const goalsByDept: Record<string, DeptGoal[]> = {
    [HCWM_DEPT_NAME]: hcwmDepartmentGoals, [CREDIT_RISK_DEPT_NAME]: opsDepartmentGoals,
    [COMPLIANCE_DEPT_NAME]: complianceDepartmentGoals, [MARKETING_DEPT_NAME]: marketingDepartmentGoals,
  };

  const own = resolveOwnScopeChallenges({
    viewerName, isHod, hasDirectorMeta, isTeamLead, canonicalOwnDept, staffList,
    membersByDept, goalsByDept, visibleMembers: teamMembers, ownDeptGoals: departmentGoals,
  });
  const orgThemes = isDirectorDesignation ? computeChallengeThemes(Object.values(membersByDept).flat(), goalsByDept) : [];

  if (!own.canView && !isDirectorDesignation) return null;
  const activeThemes = orgWide ? orgThemes : own.themes;

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-sky-500 shrink-0" />
          <span className="text-sm font-semibold">Key Staff Challenges</span>
          <span className="text-[10px] text-muted-foreground">{activeThemes.reduce((n, t) => n + t.count, 0)} open</span>
        </div>
        {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {isDirectorDesignation && own.canView && (
            <div className="flex gap-1.5 text-[11px]">
              <button onClick={() => setOrgWide(false)} className={cn("px-2.5 py-1 rounded-full border", !orgWide ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}>
                {own.isDirector ? "Departments I oversee" : "My department"}
              </button>
              <button onClick={() => setOrgWide(true)} className={cn("px-2.5 py-1 rounded-full border", orgWide ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}>
                Org-wide
              </button>
            </div>
          )}
          {activeThemes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No open challenges flagged right now.</p>
          ) : (
            <div className="space-y-1.5">
              {activeThemes.map(t => (
                <div key={t.theme} className="rounded-lg border border-border/60 bg-background/70">
                  <button onClick={() => toggleTheme(t.theme)} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left">
                    <span className="text-xs font-medium">{t.theme}</span>
                    <span className="text-[10px] text-muted-foreground">{t.count}</span>
                  </button>
                  {expandedThemes.has(t.theme) && (
                    <ul className="px-3 pb-2.5 space-y-1.5">
                      {t.entries.map((e, i) => (
                        <li key={i} className="text-[11px] text-foreground/80">
                          <span className="font-medium">{e.memberName}</span> — {e.remarkText}
                          <span className="text-muted-foreground"> ({e.linkedDeptTitle})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI-curated action plan ──────────────────────────────────────────────────────

function ActionPlanCard({ pulseAvgs, managerAvgs, department }: { pulseAvgs?: Record<string, number> | null; managerAvgs?: Record<string, number> | null; department: string }) {
  const [items, setItems] = useState<{ title: string; desc: string; source: "Team Pulse" | "Manager Survey" }[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pulseAvgs && !managerAvgs) { setItems(null); return; }
    setLoading(true);
    getAiProvider().synthesizeActionPlan({ pulseAvgs: pulseAvgs ?? undefined, managerAvgs: managerAvgs ?? undefined, department })
      .then(result => { setItems(result); setLoading(false); });
  }, [pulseAvgs, managerAvgs, department]);

  if (!pulseAvgs && !managerAvgs) return null;
  return (
    <div className="rounded-xl border border-amber/40 bg-amber/5 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="size-4 text-amber-foreground" />
        <div className="text-xs uppercase tracking-widest text-amber-foreground">AI-curated action plan</div>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">Reads this quarter's Team Pulse and this cycle's Manager Survey together for context — each item stays labelled with its source, never blended into one score.</p>
      {loading && <p className="text-xs text-muted-foreground">Thinking…</p>}
      {!loading && items && items.length === 0 && <p className="text-xs text-muted-foreground">No areas below the attention threshold right now — nice work.</p>}
      {!loading && items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="text-xs bg-background rounded-lg border border-border p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={cn("text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full", it.source === "Team Pulse" ? "bg-rose-500/15 text-rose-600" : "bg-violet-500/15 text-violet-600")}>{it.source}</span>
                <span className="font-medium">{it.title}</span>
              </div>
              <p className="text-muted-foreground">{it.desc}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────────

export function FeedbackCornerSection() {
  const {
    tier, currentUser, teamMembers, opsTeamMembersAll, staffList,
    directorMeta, opsMeta, staffMemberId, adminMemberId, pulseResponses, managerEffectivenessRatings,
  } = useApp();

  const isHod = (tier === "manager" && currentUser.hod) || tier === "ops_hod";
  const isDirectorTier = tier === "director1" || tier === "director2";
  const isDirectorDesignation = isDirectorTier && !!directorMeta?.designation.toLowerCase().includes("director");

  const viewerName = directorMeta
    ? directorMeta.name
    : opsMeta
    ? opsMeta.user.name
    : tier === "staff" || tier === "admin"
    ? (teamMembers.find(m => m.id === (tier === "admin" ? adminMemberId : staffMemberId))?.name ?? currentUser.name)
    : currentUser.name;

  const viewerDept = staffList.find(s => s.name === viewerName)?.dept
    ?? (opsMeta ? opsMeta.user.department : directorMeta ? directorMeta.department : currentUser.department);

  const isTeamLead = staffList.some(s => s.supervisor === viewerName);
  const canViewManagerAggregate = isHod || isTeamLead || isDirectorTier;
  const mySupervisorName = (() => {
    const sup = staffList.find(s => s.name === viewerName)?.supervisor;
    return sup && sup !== "—" ? sup : null;
  })();

  // Tenure gate — resolve the real ISO joinDate for whichever persona is active. Directors don't
  // carry a joinDate in this data model at all (no leaver/joiner concept exists for them), so
  // they're treated as already-tenured rather than locked out of a page they clearly should see.
  const ALL_KNOWN_MEMBERS = [...teamMembers, ...opsTeamMembersAll, ...complianceTeamMembers, ...marketingTeamMembers];
  const viewerJoinDate = opsMeta
    ? opsMeta.user.joinDate
    : tier === "staff" || tier === "admin"
    ? ALL_KNOWN_MEMBERS.find(m => m.id === (tier === "admin" ? adminMemberId : staffMemberId))?.joinDate
    : currentUser.joinDate;
  const tenureOk = directorMeta ? true : hasMinimumTenure(viewerJoinDate);

  const title = isHod || isTeamLead || isDirectorTier ? "Feedback Corner & Insights" : "Feedback Corner";

  if (!tenureOk) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-2xl">{title}</h2>
        <div className="rounded-xl border border-border/70 bg-card p-8 text-center space-y-2">
          <Lock className="size-6 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">Feedback Corner unlocks after 3 months</p>
          <p className="text-xs text-muted-foreground">Team Pulse and the Manager Self-Improvement Survey open up once you've been with us a little longer — check back soon.</p>
        </div>
      </div>
    );
  }

  const quarter = currentQuarterLabel();
  const cycleYear = currentManagerSurveyCycleYear();
  const deptPulseAvgs = averagePulseScores(pulseResponses.filter(r => r.department === viewerDept && r.quarter === quarter));
  const myManagerAvgs = canViewManagerAggregate
    ? averageManagerScores(managerEffectivenessRatings.filter(r => r.managerName === viewerName && r.cycleYear === cycleYear))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">Team Pulse, the Manager Self-Improvement Survey, and Key Staff Challenges — all in one place.</p>
      </div>

      <TeamPulseCard viewerName={viewerName} viewerDept={viewerDept} isHod={isHod} canViewAggregate={canViewManagerAggregate} />
      <ManagerSurveyCard viewerName={viewerName} mySupervisorName={mySupervisorName} canViewAggregate={canViewManagerAggregate} tenureOk={tenureOk} />
      <KeyStaffChallengesCard viewerName={viewerName} isHod={isHod} hasDirectorMeta={!!directorMeta} isTeamLead={isTeamLead} isDirectorDesignation={isDirectorDesignation} />
      {canViewManagerAggregate && <ActionPlanCard pulseAvgs={deptPulseAvgs} managerAvgs={myManagerAvgs} department={viewerDept} />}
    </div>
  );
}
