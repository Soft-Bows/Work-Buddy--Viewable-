import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/appContext";
import { getAiProvider } from "@/lib/aiService";
import {
  PULSE_QUESTIONS, averagePulseScores, MIN_RESPONSES_FOR_AGGREGATE,
  currentQuarterLabel, previousQuarterLabel, isPulseWindowOpen, isNewInsightsBadgeActive, aggregateFirstShownDate,
  ytdResponses,
} from "@/lib/pulseSurvey";
import {
  MANAGER_BEHAVIORS, LEADERSHIP_AREAS, MANAGER_SURVEY_TEXT_QUESTIONS,
  averageManagerScores, averageManagerScoresByArea, collectTextResponses, MIN_RATERS_FOR_AGGREGATE,
  isManagerSurveyWindowOpen, hasManagerSurveyWindowClosedThisYear, currentManagerSurveyCycleYear, peerP75,
} from "@/lib/managerEffectiveness";
import { resolveOwnScopeChallenges, computeChallengeThemes, computeCompetencyGapRow, HCWM_DEPT_NAME, CREDIT_RISK_DEPT_NAME } from "@/lib/insights";
import { MARKETING_DEPT_NAME, marketingTeamMembers, marketingDepartmentGoals } from "@/lib/marketingData";
import { hasMinimumTenure, cn } from "@/lib/utils";
import { pointsToast } from "@/lib/pointsToast";
import { COUNTRY_THEMES, COUNTRY_THEME_STORAGE_KEY } from "@/lib/themes";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { HeartPulse, Star, Sparkles, Lock, Users, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Check, RefreshCw, MessageSquareText } from "lucide-react";
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

// A compact +/- tag for a single delta — used inline in MetricRow's caption line rather than a
// full TrendBadge sentence each time, since a category/question list showing 4 metrics per row
// already has plenty to read; a one-glyph +/-0.3 reads faster than "0.3 above company average."
function DeltaTag({ label, delta }: { label: string; delta: number }) {
  if (Math.abs(delta) < 0.05) return <span className="text-muted-foreground">{label} flat</span>;
  const up = delta > 0;
  return (
    <span className={cn("font-medium", up ? "text-rag-green" : "text-rag-red")}>
      {label} {up ? "+" : ""}{delta.toFixed(1)}
    </span>
  );
}

// The Manager Survey's per-category and per-question benchmarking row — one score, a bar with two
// reference ticks (company average, top-quartile), and a compact caption line with up to 3 deltas.
// Deliberately not a wall of numbers: progressive disclosure (category summary first, click through
// for the same shape of detail per question) is the dashboard-design pattern this follows.
function MetricRow({
  label, score, companyAvg, lastYear, p75, bold,
}: { label: string; score: number; companyAvg?: number; lastYear?: number; p75?: number; bold?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-xs", bold ? "font-semibold" : "text-foreground/80")}>{label}</span>
        <span className={cn("font-bold", bold ? "text-sm" : "text-xs")}>{score.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden relative">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(score / 5) * 100}%` }} />
        {companyAvg !== undefined && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/40" style={{ left: `${(companyAvg / 5) * 100}%` }} title={`Company average ${companyAvg.toFixed(1)}`} />
        )}
        {p75 !== undefined && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-amber-500" style={{ left: `${(p75 / 5) * 100}%` }} title={`Top quartile ${p75.toFixed(1)}`} />
        )}
      </div>
      <div className="flex items-center gap-2.5 flex-wrap text-[10px]">
        {companyAvg !== undefined && <DeltaTag label="vs company avg" delta={score - companyAvg} />}
        {lastYear !== undefined && <DeltaTag label="vs last year" delta={score - lastYear} />}
        {p75 !== undefined && <span className="text-muted-foreground">Top 25%: {p75.toFixed(1)}</span>}
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
  const { pulseResponses, submitPulseResponse, addPoints, staffList } = useApp();
  const [expanded, setExpanded] = useState(true);
  const [byJobFamilyOpen, setByJobFamilyOpen] = useState(false);
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

  // Job-family breakdown — grouped from users.csv's job_family column via staffList. Each subgroup
  // is gated by the exact same MIN_RESPONSES_FOR_AGGREGATE threshold as the department-wide figure,
  // so a thin job family (e.g. 1-2 people) never surfaces a de-anonymising near-individual average.
  const jobFamilyGroups = (() => {
    const byFamily = new Map<string, typeof deptResponses>();
    for (const r of deptResponses) {
      const family = staffList.find(s => s.name === r.respondentName)?.jobFamily ?? "Other";
      if (!byFamily.has(family)) byFamily.set(family, []);
      byFamily.get(family)!.push(r);
    }
    return [...byFamily.entries()]
      .map(([family, responses]) => ({ family, responses, avgs: averagePulseScores(responses) }))
      .sort((a, b) => b.responses.length - a.responses.length);
  })();

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
                  {jobFamilyGroups.length > 1 && (
                    <div className="pt-1">
                      <button onClick={() => setByJobFamilyOpen(v => !v)} className="text-[10px] font-medium text-primary hover:underline">
                        {byJobFamilyOpen ? "Hide" : "See"} breakdown by job family
                      </button>
                      {byJobFamilyOpen && (
                        <div className="mt-1.5 space-y-1">
                          {jobFamilyGroups.map(g => (
                            <div key={g.family} className="flex items-center justify-between text-[11px] bg-background rounded-md border border-border px-2 py-1">
                              <span className="text-foreground/80">{g.family}</span>
                              {g.avgs ? (
                                <span className="font-medium">{overallAverage(g.avgs)?.toFixed(1)} <span className="text-muted-foreground font-normal">({g.responses.length} responses)</span></span>
                              ) : (
                                <span className="text-muted-foreground">Not enough responses yet ({g.responses.length})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
  const windowClosedThisYear = hasManagerSurveyWindowClosedThisYear();
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
  const lastYearAreaAvgs = averageManagerScoresByArea(lastYearAvgs);
  // Top-quartile benchmark across every manager who clears the anonymity threshold this cycle —
  // see peerP75's own comment on why a small pool is an honest artefact of this roster, not hidden.
  const { itemP75, areaP75 } = peerP75(managerEffectivenessRatings, cycleYear);

  const radarData = LEADERSHIP_AREAS.map(area => ({
    area: area.length > 20 ? `${area.slice(0, 20)}…` : area,
    you: myAreaAvgs?.[area] ?? 0,
    "company avg": companyAreaAvgs?.[area] ?? 0,
  }));

  // Qualitative sentiment on the 2 free-text questions, this cycle vs last cycle for the same
  // manager — via the same aiService seam every other "AI" feature in this app goes through.
  const [sentiment, setSentiment] = useState<{ positive: number; neutral: number; negative: number; summary: string } | null>(null);
  const [lastYearSentiment, setLastYearSentiment] = useState<typeof sentiment>(null);
  useEffect(() => {
    const texts = [...collectTextResponses(myRatings, "t1"), ...collectTextResponses(myRatings, "t2")];
    if (texts.length === 0) { setSentiment(null); return; }
    getAiProvider().analyzeSentiment(texts).then(setSentiment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerEffectivenessRatings, viewerName, cycleYear]);
  useEffect(() => {
    const texts = [...collectTextResponses(lastYearRatings, "t1"), ...collectTextResponses(lastYearRatings, "t2")];
    if (texts.length === 0) { setLastYearSentiment(null); return; }
    getAiProvider().analyzeSentiment(texts).then(setLastYearSentiment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerEffectivenessRatings, viewerName, cycleYear]);

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
                How's {mySupervisorName.split(" ")[0]} doing as your manager? {!windowOpen && (
                  <span className="text-rag-amber">{windowClosedThisYear ? `(closed for ${cycleYear})` : "(opens Jun 1)"}</span>
                )}
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
              ) : windowClosedThisYear ? (
                <p className="text-xs text-muted-foreground">The {cycleYear} cycle has closed — thanks to everyone who responded. It reopens Jun 1, {cycleYear + 1}.</p>
              ) : (
                <p className="text-xs text-muted-foreground">Runs annually, Jun 1 – Jul 31. Check back then.</p>
              )}
            </div>
          )}

          {canViewAggregate && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">How your team sees you</div>
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
                  <p className="text-[10px] text-muted-foreground mb-3">Based on {myRatings.length} anonymous ratings this cycle.</p>

                  {/* Per-category benchmarking — 3 numbers per row (your avg, vs company avg, vs
                      last year) plus a P75 tick on the bar; click through for the same 4 metrics
                      per individual question. Progressive disclosure, not a wall of numbers. */}
                  <div className="space-y-1.5">
                    {LEADERSHIP_AREAS.map(area => (
                      <div key={area} className="rounded-lg border border-border/60 bg-background/70 px-3 py-2.5">
                        <button onClick={() => toggleArea(area)} className="w-full flex items-center gap-2 text-left">
                          <div className="flex-1">
                            <MetricRow
                              label={area}
                              score={myAreaAvgs[area] ?? 0}
                              companyAvg={companyAreaAvgs?.[area]}
                              lastYear={lastYearAreaAvgs?.[area]}
                              p75={areaP75[area]}
                              bold
                            />
                          </div>
                          {expandedAreas.has(area) ? <ChevronUp className="size-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />}
                        </button>
                        {expandedAreas.has(area) && (
                          <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                            {MANAGER_BEHAVIORS.filter(b => b.leadershipArea === area).map(b => (
                              <MetricRow
                                key={b.id}
                                label={b.text}
                                score={myAvgs[b.id] ?? 0}
                                companyAvg={companyAvgs?.[b.id]}
                                lastYear={lastYearAvgs?.[b.id]}
                                p75={itemP75[b.id]}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Qualitative sentiment on the 2 free-text questions, this cycle vs last cycle */}
                  <div className="mt-3 rounded-lg border border-border/60 bg-background/70 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                      <MessageSquareText className="size-3" /> Qualitative sentiment
                    </div>
                    {sentiment ? (
                      <>
                        <div className="flex h-2 rounded-full overflow-hidden">
                          {sentiment.positive > 0 && <div className="bg-rag-green" style={{ width: `${(sentiment.positive / (sentiment.positive + sentiment.neutral + sentiment.negative)) * 100}%` }} />}
                          {sentiment.neutral > 0 && <div className="bg-muted-foreground/40" style={{ width: `${(sentiment.neutral / (sentiment.positive + sentiment.neutral + sentiment.negative)) * 100}%` }} />}
                          {sentiment.negative > 0 && <div className="bg-rag-red" style={{ width: `${(sentiment.negative / (sentiment.positive + sentiment.neutral + sentiment.negative)) * 100}%` }} />}
                        </div>
                        <p className="text-[11px] text-foreground/80 mt-1.5">{sentiment.summary}</p>
                        {lastYearSentiment && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Last year: {lastYearSentiment.positive} positive · {lastYearSentiment.neutral} neutral · {lastYearSentiment.negative} negative —{" "}
                            {sentiment.positive - sentiment.negative > lastYearSentiment.positive - lastYearSentiment.negative
                              ? "more positive than last year."
                              : sentiment.positive - sentiment.negative < lastYearSentiment.positive - lastYearSentiment.negative
                              ? "less positive than last year."
                              : "about the same as last year."}
                          </p>
                        )}
                        {!lastYearSentiment && <p className="text-[10px] text-muted-foreground mt-1">No comparable free-text from last cycle to compare against.</p>}
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">No free-text responses yet this cycle.</p>
                    )}
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

// ── Year-to-date stacked insight ────────────────────────────────────────────────
//
// "Stacked" per the user's own framing: Team Pulse across every quarter submitted so far this
// year, combined with this year's (already concluded) Manager Survey cycle, into one running view
// — rather than only ever looking at the current quarter in isolation. A real agentic pipeline
// would re-run this automatically at each quarter-end and at year-end, and flag major
// discrepancies in between on its own; this client-only app has no server-side scheduler to do
// that, so the honest equivalent here is a visible "last computed" / "scheduled to finalize"
// marker plus a manual recompute — communicating *when this becomes final*, not a technical cache
// refresh (there's no stale cache; everything already derives from live state on every render).

function YtdStackedCard({
  viewerName, viewerDept, canViewAggregate,
}: { viewerName: string; viewerDept: string; canViewAggregate: boolean }) {
  const { pulseResponses, managerEffectivenessRatings } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [lastComputedAt, setLastComputedAt] = useState(() => new Date());
  const [items, setItems] = useState<{ title: string; desc: string; source: "Team Pulse" | "Manager Survey"; trigger: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const year = new Date().getFullYear();
  const cycleYear = currentManagerSurveyCycleYear();

  const ytdPulse = ytdResponses(pulseResponses, viewerDept, year);
  const ytdPulseAvgs = averagePulseScores(ytdPulse);
  const managerRatings = managerEffectivenessRatings.filter(r => r.managerName === viewerName && r.cycleYear === cycleYear);
  const managerAvgs = averageManagerScores(managerRatings);

  useEffect(() => {
    if (!ytdPulseAvgs && !managerAvgs) { setItems(null); return; }
    setLoading(true);
    getAiProvider().synthesizeActionPlan({ pulseAvgs: ytdPulseAvgs ?? undefined, managerAvgs: managerAvgs ?? undefined, department: viewerDept })
      .then(result => { setItems(result); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulseResponses, managerEffectivenessRatings, viewerDept]);

  if (!canViewAggregate || (!ytdPulseAvgs && !managerAvgs)) return null;

  return (
    <div className="rounded-xl border border-indigo-300/50 dark:border-indigo-700/40 bg-indigo-50/40 dark:bg-indigo-950/10 overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-4 text-indigo-500 shrink-0" />
          <span className="text-sm font-semibold">Year-to-date: Pulse + Manager Survey</span>
          <span className="text-[10px] text-muted-foreground">{year}</span>
        </div>
        {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Every quarter's Team Pulse submitted so far in {year}, stacked alongside this year's Manager Survey cycle — a running view of the year, not just the current quarter in isolation.
          </p>
          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span>Last computed {lastComputedAt.toLocaleTimeString("en-SG")} · scheduled to finalize on the first working day of {year + 1}</span>
            <button onClick={() => setLastComputedAt(new Date())} className="flex items-center gap-1 text-primary font-medium hover:underline shrink-0">
              <RefreshCw className="size-3" /> Recompute now
            </button>
          </div>
          {loading && <p className="text-xs text-muted-foreground">Thinking…</p>}
          {!loading && items && items.length === 0 && <p className="text-xs text-muted-foreground">No areas below the attention threshold across the year so far.</p>}
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
    [MARKETING_DEPT_NAME]: marketingTeamMembers,
  };
  const goalsByDept: Record<string, DeptGoal[]> = {
    [HCWM_DEPT_NAME]: hcwmDepartmentGoals, [CREDIT_RISK_DEPT_NAME]: opsDepartmentGoals,
    [MARKETING_DEPT_NAME]: marketingDepartmentGoals,
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

function ActionPlanCard({
  pulseAvgs, managerAvgs, managerCompanyAvgs, managerLastYearAvgs, department, openChallengeCount, competencyGapPct,
}: {
  pulseAvgs?: Record<string, number> | null; managerAvgs?: Record<string, number> | null;
  managerCompanyAvgs?: Record<string, number> | null; managerLastYearAvgs?: Record<string, number> | null;
  department: string; openChallengeCount: number; competencyGapPct: number | null;
}) {
  const [items, setItems] = useState<{ title: string; desc: string; source: "Team Pulse" | "Manager Survey"; trigger: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  // Closing-the-loop tracking — a plan item is only worth generating if someone can mark it done and
  // see that reflected; kept as page-local state (not yet persisted server-side) rather than a
  // silent read-only list.
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());
  const toggleDone = (key: string) => setDoneKeys(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  // Recomputes any time the underlying aggregates actually change value (submissions arrive live via
  // app-context state, which re-renders this component with fresh pulseAvgs/managerAvgs on every
  // relevant change) — this is what "real-time synchronised, not a static view" means in practice:
  // there's no cached/stale snapshot anywhere, every render derives the plan fresh from current data.
  useEffect(() => {
    if (!pulseAvgs && !managerAvgs) { setItems(null); return; }
    setLoading(true);
    getAiProvider().synthesizeActionPlan({
      pulseAvgs: pulseAvgs ?? undefined, managerAvgs: managerAvgs ?? undefined,
      managerCompanyAvgs: managerCompanyAvgs ?? undefined, managerLastYearAvgs: managerLastYearAvgs ?? undefined, department,
    }).then(result => { setItems(result); setLoading(false); });
  }, [pulseAvgs, managerAvgs, managerCompanyAvgs, managerLastYearAvgs, department]);

  if (!pulseAvgs && !managerAvgs) return null;

  // Disclaimer reflects exactly which data actually fed this plan — a generic "reads both" line
  // regardless of what's really available is exactly what caused the earlier contradiction (an
  // action plan implying it used Team Pulse data while that panel was still showing "not enough
  // responses yet").
  const sourcesUsed = [pulseAvgs && "Team Pulse", managerAvgs && "Manager Survey"].filter(Boolean).join(" and ");

  return (
    <div className="rounded-xl border border-amber/40 bg-amber/5 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="size-4 text-amber-foreground" />
        <div className="text-xs uppercase tracking-widest text-amber-foreground">AI-curated action plan</div>
      </div>
      <p className="text-[11px] text-muted-foreground mb-1">
        Based on this {department}'s {sourcesUsed} data{pulseAvgs && managerAvgs ? " together" : ""} — each item stays labelled with its source, never blended into one score.
        {!pulseAvgs && " Team Pulse isn't included yet (not enough responses this quarter)."}
        {!managerAvgs && " Manager Survey isn't included yet (not enough ratings this cycle)."}
      </p>
      <p className="text-[11px] text-muted-foreground mb-3">Visible here to you; for anything systemic rather than team-specific, raise it with your own supervisor or director so it gets the visibility it needs.</p>
      {loading && <p className="text-xs text-muted-foreground">Thinking…</p>}
      {!loading && items && items.length === 0 && <p className="text-xs text-muted-foreground">No areas below the attention threshold right now — nice work.</p>}
      {!loading && items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it, i) => {
            const key = `${it.source}:${it.title}`;
            const done = doneKeys.has(key);
            return (
              <li key={i} className={cn("text-xs bg-background rounded-lg border p-2.5 flex items-start gap-2", done ? "border-rag-green/40 bg-rag-green/5" : "border-border")}>
                <button onClick={() => toggleDone(key)} className={cn("size-4 rounded border shrink-0 grid place-items-center mt-0.5", done ? "bg-rag-green border-rag-green text-white" : "border-border")}>
                  {done && <Check className="size-2.5" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className={cn("text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full", it.source === "Team Pulse" ? "bg-rose-500/15 text-rose-600" : "bg-violet-500/15 text-violet-600")}>{it.source}</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest">{it.trigger}</span>
                  </div>
                  <span className={cn("font-medium", done && "line-through text-muted-foreground")}>{it.title}</span>
                  <p className="text-muted-foreground">{it.desc}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {(openChallengeCount > 0 || competencyGapPct !== null) && (
        <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-amber/20">
          {openChallengeCount > 0 && `${department} also has ${openChallengeCount} open Key Staff Challenge theme${openChallengeCount === 1 ? "" : "s"}`}
          {openChallengeCount > 0 && competencyGapPct !== null && " and "}
          {competencyGapPct !== null && `a ${competencyGapPct}% competency gap`}
          {" — shown separately above / in Skills Profile, not folded into this score."}
        </p>
      )}
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────────

export function FeedbackCornerSection() {
  const {
    tier, currentUser, teamMembers, opsTeamMembersAll, staffList,
    directorMeta, opsMeta, staffMemberId, adminMemberId, pulseResponses, managerEffectivenessRatings,
    hcwmTeamMembers, hcwmDepartmentGoals, opsDepartmentGoals, departmentGoals, deptGoalSkills, allTeamMemberSkills,
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
  const ALL_KNOWN_MEMBERS = [...teamMembers, ...opsTeamMembersAll, ...marketingTeamMembers];
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
  const myRatingsForPlan = managerEffectivenessRatings.filter(r => r.managerName === viewerName && r.cycleYear === cycleYear);
  const myManagerAvgs = canViewManagerAggregate ? averageManagerScores(myRatingsForPlan) : null;
  const companyManagerAvgs = canViewManagerAggregate
    ? averageManagerScores(managerEffectivenessRatings.filter(r => r.cycleYear === cycleYear))
    : null;
  const lastYearManagerAvgs = canViewManagerAggregate
    ? averageManagerScores(managerEffectivenessRatings.filter(r => r.managerName === viewerName && r.cycleYear === cycleYear - 1))
    : null;

  // Key Staff Challenges / Departmental Competency Gaps — a light cross-reference, not blended into
  // the pulse/manager-survey action plan's own scoring, per the "combine on the backend, layer by
  // stakeholder on the front end" pattern research supports. Own-department scope only, reusing the
  // exact same resolver KeyStaffChallengesCard uses so the counts always agree with what's shown
  // there.
  const canonicalOwnDept = staffList.find(s => s.name === viewerName)?.dept ?? viewerDept;
  const membersByDeptForChallenges: Record<string, TeamMember[]> = {
    [HCWM_DEPT_NAME]: hcwmTeamMembers, [CREDIT_RISK_DEPT_NAME]: opsTeamMembersAll,
    [MARKETING_DEPT_NAME]: marketingTeamMembers,
  };
  const goalsByDeptForChallenges: Record<string, DeptGoal[]> = {
    [HCWM_DEPT_NAME]: hcwmDepartmentGoals, [CREDIT_RISK_DEPT_NAME]: opsDepartmentGoals,
    [MARKETING_DEPT_NAME]: marketingDepartmentGoals,
  };
  const challengeSummary = canViewManagerAggregate
    ? resolveOwnScopeChallenges({
        viewerName, isHod, hasDirectorMeta: !!directorMeta, isTeamLead, canonicalOwnDept, staffList,
        membersByDept: membersByDeptForChallenges, goalsByDept: goalsByDeptForChallenges, visibleMembers: teamMembers, ownDeptGoals: departmentGoals,
      })
    : null;
  const openChallengeCount = challengeSummary?.themes.reduce((n, t) => n + t.count, 0) ?? 0;
  const competencyGap = canViewManagerAggregate
    ? computeCompetencyGapRow(viewerDept, staffList.filter(s => s.dept === viewerDept), goalsByDeptForChallenges, deptGoalSkills, allTeamMemberSkills)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">Team Pulse, the Manager Self-Improvement Survey, and Key Staff Challenges — all in one place.</p>
      </div>

      <TeamPulseCard viewerName={viewerName} viewerDept={viewerDept} isHod={isHod} canViewAggregate={canViewManagerAggregate} />
      <ManagerSurveyCard viewerName={viewerName} mySupervisorName={mySupervisorName} canViewAggregate={canViewManagerAggregate} tenureOk={tenureOk} />
      {canViewManagerAggregate && <YtdStackedCard viewerName={viewerName} viewerDept={viewerDept} canViewAggregate={canViewManagerAggregate} />}
      <KeyStaffChallengesCard viewerName={viewerName} isHod={isHod} hasDirectorMeta={!!directorMeta} isTeamLead={isTeamLead} isDirectorDesignation={isDirectorDesignation} />
      {canViewManagerAggregate && (
        <ActionPlanCard
          pulseAvgs={deptPulseAvgs} managerAvgs={myManagerAvgs}
          managerCompanyAvgs={companyManagerAvgs} managerLastYearAvgs={lastYearManagerAvgs}
          department={viewerDept} openChallengeCount={openChallengeCount} competencyGapPct={competencyGap?.gapPct ?? null}
        />
      )}
    </div>
  );
}
