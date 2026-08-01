import { useState } from "react";
import { useApp } from "@/lib/appContext";
import { Card, MascotFlourish } from "@/components/ui-bits";
import { ChevronDown, ChevronUp, Building2, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeChallengeThemes, computeCompetencyGapRow, getRelevantDeptsForViewer,
  HCWM_DEPT_NAME, CREDIT_RISK_DEPT_NAME, type ChallengeThemeGroup, type CompetencyGapRow,
} from "@/lib/insights";
import { COMPLIANCE_DEPT_NAME, complianceDepartmentGoals, complianceTeamMembers, complianceAllMemberSkills } from "@/lib/complianceData";
import { DIRECTOR_PERSONAS } from "@/lib/directorData";
import { CountryFlagIcon } from "@/components/CountryFlagIcon";
import { COUNTRY_THEMES, COUNTRY_THEME_STORAGE_KEY } from "@/lib/themes";
import type { DeptGoal, TeamMember } from "@/lib/mockData";

// A small, distinct-but-cohesive colour per department card — cycling the same brand hues used
// everywhere else in the app (sky = ownership, teal = skills, violet/indigo = confidence/score),
// not an arbitrary rainbow. When a country theme is active, each card also picks up a small flag +
// swatch-tinted accent dot so the section visually belongs to "wherever the user is right now"
// without losing the department-to-department distinction the cycling palette provides.
const DEPT_PALETTE = [
  { badge: "bg-sky-500", border: "border-sky-300/70 dark:border-sky-600/40", wash: "from-sky-500/[0.08] via-sky-500/[0.03]", text: "text-sky-700 dark:text-sky-300" },
  { badge: "bg-teal-500", border: "border-teal-300/70 dark:border-teal-600/40", wash: "from-teal-500/[0.08] via-teal-500/[0.03]", text: "text-teal-700 dark:text-teal-300" },
  { badge: "bg-violet-500", border: "border-violet-300/70 dark:border-violet-600/40", wash: "from-violet-500/[0.08] via-violet-500/[0.03]", text: "text-violet-700 dark:text-violet-300" },
  { badge: "bg-indigo-500", border: "border-indigo-300/70 dark:border-indigo-600/40", wash: "from-indigo-500/[0.08] via-indigo-500/[0.03]", text: "text-indigo-700 dark:text-indigo-300" },
];

function readActiveCountryTheme() {
  if (typeof window === "undefined") return null;
  const key = window.localStorage.getItem(COUNTRY_THEME_STORAGE_KEY);
  return COUNTRY_THEMES.find(t => t.key === key) ?? null;
}

// Every department a Director could ever be asked to aggregate — the 2 CSV/live-state-backed ones
// plus Compliance's lightweight static bundle (see complianceData.ts's own comment for why it's
// so much thinner than opsData.ts). Extend this map (and complianceData.ts's pattern) if a future
// department gets its own wired OKR content.
function useDeptDataMap() {
  const { hcwmTeamMembers, hcwmDepartmentGoals, hcwmAllTeamMemberSkills, opsTeamMembersAll, opsDepartmentGoals, opsAllTeamMemberSkills } = useApp();
  const MEMBERS_BY_DEPT: Record<string, TeamMember[]> = {
    [HCWM_DEPT_NAME]: hcwmTeamMembers,
    [CREDIT_RISK_DEPT_NAME]: opsTeamMembersAll,
    [COMPLIANCE_DEPT_NAME]: complianceTeamMembers,
  };
  const GOALS_BY_DEPT: Record<string, DeptGoal[]> = {
    [HCWM_DEPT_NAME]: hcwmDepartmentGoals,
    [CREDIT_RISK_DEPT_NAME]: opsDepartmentGoals,
    [COMPLIANCE_DEPT_NAME]: complianceDepartmentGoals,
  };
  const SKILLS_BY_DEPT: Record<string, { memberId: string; verified: string[] }[]> = {
    [HCWM_DEPT_NAME]: hcwmAllTeamMemberSkills,
    [CREDIT_RISK_DEPT_NAME]: opsAllTeamMemberSkills,
    [COMPLIANCE_DEPT_NAME]: complianceAllMemberSkills,
  };
  return { MEMBERS_BY_DEPT, GOALS_BY_DEPT, SKILLS_BY_DEPT };
}

// One department's insights, collapsed behind a single click — a dropdown revealing Key Staff
// Challenges + Departmental Competency Gap together, rather than rendering every category's full
// visualisation for every department at once (which reads as one very long, undifferentiated page
// once a Director supervises more than one or two departments).
function DepartmentInsightCard({
  deptName, palette, challenges, gap, countryTheme,
}: {
  deptName: string;
  palette: typeof DEPT_PALETTE[number];
  challenges: ChallengeThemeGroup[];
  gap: CompetencyGapRow;
  countryTheme: ReturnType<typeof readActiveCountryTheme>;
}) {
  const [open, setOpen] = useState(false);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);
  const totalMentions = challenges.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className={cn("rounded-2xl border-2 overflow-hidden shadow-sm bg-gradient-to-br to-transparent transition-shadow", palette.border, palette.wash)}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn("size-7 rounded-full grid place-items-center shrink-0 text-white", palette.badge)}>
            <Building2 className="size-3.5" />
          </span>
          <span className={cn("font-display text-base truncate", palette.text)}>{deptName}</span>
          {countryTheme && <CountryFlagIcon countryKey={countryTheme.key} size={16} className="rounded-full shrink-0" />}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {totalMentions} challenge{totalMentions === 1 ? "" : "s"} · {gap.gapPct ?? "—"}% gap
          </span>
          {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="bg-card/90 border-t border-border/50 px-4 py-4 space-y-5">
          {/* Key Staff Challenges */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Key Staff Challenges</span>
            </div>
            {challenges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No staff challenges reported yet.</p>
            ) : (
              <div className="space-y-1">
                {challenges.map(t => (
                  <div key={t.theme} className="border-b border-border/50 last:border-0">
                    <button
                      onClick={() => setExpandedTheme(v => (v === t.theme ? null : t.theme))}
                      className="w-full flex items-center justify-between py-2 text-left gap-2"
                    >
                      <span className="text-sm flex items-center gap-1.5 min-w-0">
                        {expandedTheme === t.theme ? <ChevronUp className="size-3 text-muted-foreground shrink-0" /> : <ChevronDown className="size-3 text-muted-foreground shrink-0" />}
                        <span className="truncate">{t.theme}</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">{t.count} mention{t.count !== 1 ? "s" : ""}</span>
                    </button>
                    {expandedTheme === t.theme && (
                      <div className="pb-2.5 pl-4 space-y-1.5">
                        {t.entries.map((e, i) => (
                          <div key={i} className="rounded-lg border border-border/60 bg-muted/20 p-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold">{e.memberName}</span>
                              {e.date && <span className="text-[10px] text-muted-foreground truncate">{e.date}</span>}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">{e.goalTitle}</div>
                            <p className="text-[11px] text-foreground/80 mt-1 leading-relaxed">&ldquo;{e.remarkText}&rdquo;</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Departmental Competency Gap */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Departmental Competency Gap</span>
            </div>
            {gap.requiredSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills have been tagged as needed on this department's OKRs yet.</p>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="font-display text-2xl">{gap.gapPct}%</div>
                  <div className="text-xs text-muted-foreground">gap — {gap.missing.length} of {gap.requiredSkills.length} required skills not yet verified</div>
                </div>
                {gap.missing.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {gap.missing.map(skill => (
                      <span key={skill} className="text-[11px] px-2 py-0.5 rounded-full bg-rag-red/10 text-rag-red border border-rag-red/25">{skill}</span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DirectorInsightsSection() {
  const { tier, staffList, deptGoalSkills } = useApp();
  const persona = DIRECTOR_PERSONAS.find(p => p.tier === tier);
  const { MEMBERS_BY_DEPT, GOALS_BY_DEPT, SKILLS_BY_DEPT } = useDeptDataMap();
  const countryTheme = readActiveCountryTheme();

  if (!persona) return null;

  const { depts: relevantDepts, isDirector } = getRelevantDeptsForViewer(persona.name, "", staffList);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl overflow-hidden">
        <div
          className="px-6 py-5 flex items-center justify-between gap-4"
          style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #6366F1 55%, #8B5CF6 100%)" }}
        >
          <div className="flex items-center gap-3">
            <MascotFlourish src="/mascot/confident-smile.png" className="h-11 w-auto shrink-0" />
            <div>
              <h2 className="font-display text-2xl text-white">Director Insights</h2>
              <p className="text-xs text-white/80 mt-0.5">
                {isDirector
                  ? `Aggregated across ${relevantDepts.length} department${relevantDepts.length === 1 ? "" : "s"} you supervise`
                  : "No HOD-flagged direct reports found yet"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {relevantDepts.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground text-center py-6">
            {persona.name} has no HOD-flagged direct reports in the current roster yet — once a department's HOD reports to {persona.name.split(" ")[0]}, that department's Key Staff Challenges and Competency Gap will appear here automatically.
          </p>
        </Card>
      ) : (
        <>
          {(() => {
            // Cross-department pattern detection — the highest-value thing a Director's view adds
            // over a single HOD's own view (per the platform research: "3 teams independently
            // raised the same tooling gap" is worth surfacing on its own, not buried inside 3
            // separate per-department card clicks). Same theme classifier as each card below, just
            // cross-referenced by name across every relevant department at once.
            const byDept = relevantDepts.map(dept => ({
              dept,
              challenges: computeChallengeThemes(MEMBERS_BY_DEPT[dept] ?? [], [GOALS_BY_DEPT[dept] ?? []]),
            }));
            const deptsByTheme = new Map<string, Set<string>>();
            for (const { dept, challenges } of byDept) {
              for (const c of challenges) {
                if (!deptsByTheme.has(c.theme)) deptsByTheme.set(c.theme, new Set());
                deptsByTheme.get(c.theme)!.add(dept);
              }
            }
            const crossDeptThemes = [...deptsByTheme.entries()].filter(([, depts]) => depts.size > 1);
            if (crossDeptThemes.length === 0) return null;
            return (
              <div className="rounded-xl border-2 border-amber-300/60 dark:border-amber-700/40 bg-amber-50/50 dark:bg-amber-900/10 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300 mb-1.5">Cross-Department Pattern{crossDeptThemes.length === 1 ? "" : "s"}</div>
                <ul className="space-y-1">
                  {crossDeptThemes.map(([theme, depts]) => (
                    <li key={theme} className="text-sm text-amber-900 dark:text-amber-200">
                      <strong>{theme}</strong> — independently raised in {depts.size} of {relevantDepts.length} departments
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
          <div className="space-y-3">
            {relevantDepts.map((dept, i) => {
              const members = MEMBERS_BY_DEPT[dept] ?? [];
              const goals = GOALS_BY_DEPT[dept] ?? [];
              const skills = SKILLS_BY_DEPT[dept] ?? [];
              const challenges = computeChallengeThemes(members, [goals]);
              const deptStaff = staffList.filter(s => s.dept === dept);
              const gap = computeCompetencyGapRow(dept, deptStaff, { [dept]: goals }, deptGoalSkills, skills);
              return (
                <DepartmentInsightCard
                  key={dept}
                  deptName={dept}
                  palette={DEPT_PALETTE[i % DEPT_PALETTE.length]}
                  challenges={challenges}
                  gap={gap}
                  countryTheme={countryTheme}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
