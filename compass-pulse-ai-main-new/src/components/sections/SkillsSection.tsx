import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, SectionTitle, SkillAttachmentModal } from "@/components/ui-bits";
import { useApp } from "@/lib/appContext";
import type { SkillAttachment } from "@/lib/mockData";
import { pointsToast } from "@/lib/pointsToast";
import { Check, Clock, Plus, Award, ArrowLeftRight, ExternalLink, CheckCircle2, XCircle, Search, Loader2, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn, formatJobGrade } from "@/lib/utils";
import { fetchPhillipJobsFn } from "@/lib/api/data.functions";
import { SKILLS_BY_CATEGORY, getDefaultSkillsForRole, getRegulatorExamsForRole, getSkillCategoriesForRole, classifySkill, getIBFJobFunctionUrl, IHRP_SKILLS_CATALOG, isHCWMDept, getIHRPBadgesForRole, classifyIHRPBadge } from "@/lib/skillsCatalog";
import { computeCompetencyGapRow, getRelevantDeptsForViewer, HCWM_DEPT_NAME, CREDIT_RISK_DEPT_NAME } from "@/lib/insights";

// ── Job function picker data ───────────────────────────────────────────────────

const CAREERS_PAGE = "https://www.phillip.com.sg/sg/job-opportunities/";

// Actual PhillipCapital job categories from /sg/job-opportunities/.
// Keys (lowercased) map exactly to PC_CATEGORY_URL in phillipCareers.server.ts.
const JOB_FUNCTIONS = [
  "Client Services",
  "Compliance",
  "Dealing",
  "Digital Innovation",
  "Finance",
  "Fund Management & Research",
  "Information Technology",
  "Marketing",
  "Operations",
  "Others",
  "Risk / Business Process",
  "Wealth Management & Business Development",
] as const;

// Returns true if jobTitle is essentially the user's current designation
// (handles different word orderings like "Executive, Human Capital" vs "Human Capital Executive").
function isSameRole(jobTitle: string, currentDesignation: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const jn = norm(jobTitle);
  const dn = norm(currentDesignation);
  if (jn === dn) return true;
  const stopWords = new Set(["the", "and", "for", "with", "of", "in", "at", "to", "a", "an"]);
  const kw = (s: string) => s.split(" ").filter(w => w.length > 2 && !stopWords.has(w));
  const jKw = kw(jn);
  const dKw = kw(dn);
  if (jKw.length === 0 || dKw.length === 0) return false;
  const overlap = jKw.filter(w => dKw.includes(w));
  return overlap.length / Math.max(jKw.length, dKw.length) >= 0.75;
}

function BookSparkSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
      <path d="M5 8 Q5 5 8 5 L20 5 L20 34 Q12 32 8 34 Q5 33 5 30Z" fill="#93C5FD"/>
      <path d="M20 5 L32 5 Q35 5 35 8 L35 30 Q35 33 32 34 Q28 32 20 34Z" fill="#3B82F6"/>
      <rect x="19" y="5" width="2" height="29" fill="#1D4ED8"/>
      <line x1="8" y1="14" x2="18" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="8" y1="19" x2="18" y2="19" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="8" y1="24" x2="16" y2="24" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M28 12 L29 9 L30 12 L33 13 L30 14 L29 17 L28 14 L25 13Z" fill="#FCD34D" opacity="0.95"/>
      <circle cx="23" cy="20" r="1" fill="#FDE68A"/>
      <circle cx="32" cy="22" r="0.8" fill="#A5F3FC"/>
    </svg>
  );
}

function BriefcaseSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
      <rect x="5" y="16" width="30" height="19" rx="3" fill="#93C5FD"/>
      <rect x="5" y="16" width="30" height="19" rx="3" fill="#3B82F6" opacity="0.6"/>
      <rect x="14" y="11" width="12" height="8" rx="2" stroke="#1D4ED8" strokeWidth="2" fill="white" fillOpacity="0.3"/>
      <rect x="5" y="16" width="30" height="5" rx="2" fill="#1D4ED8" opacity="0.35"/>
      <line x1="20" y1="21" x2="20" y2="35" stroke="white" strokeWidth="1.5" strokeOpacity="0.4"/>
      <path d="M16 28 L18.5 30.5 L24 25" stroke="#FCD34D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="31" cy="12" r="1.5" fill="#FDE68A"/>
      <circle cx="9" cy="30" r="0.8" fill="#A5F3FC" opacity="0.7"/>
    </svg>
  );
}

function GraduationCapSVG() {
  return (
    <svg width="28" height="28" viewBox="0 0 36 32" fill="none">
      <path d="M4 14 L18 8 L32 14 L18 20Z" fill="#3B82F6"/>
      <path d="M18 20 L28 16 L28 24 Q24 28 18 28 Q12 28 8 24 L8 16Z" fill="#93C5FD"/>
      <rect x="30" y="14" width="2" height="10" rx="1" fill="#22D3EE"/>
      <circle cx="31" cy="26" r="2.5" fill="#FCD34D"/>
      <circle cx="18" cy="10" r="2" fill="white" fillOpacity="0.4"/>
    </svg>
  );
}

// ── Team member endorsement card ───────────────────────────────────────────────

function TeamMemberSkillCard({
  memberId,
  memberName,
  pending,
  verified,
  highlighted,
}: {
  memberId: string;
  memberName: string;
  pending: string[];
  verified: string[];
  highlighted: boolean;
}) {
  const { endorseTeamMemberSkill, rejectTeamMemberSkill, skillAttachments, markAttachmentViewed } = useApp();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted]);

  const handleEndorse = async (skill: string) => {
    await endorseTeamMemberSkill(memberId, skill);
    pointsToast(`Endorsed "${skill}" for ${memberName} (+5 pts)`);
  };

  const handleReject = async (skill: string) => {
    await rejectTeamMemberSkill(memberId, skill);
    toast(`Rejected "${skill}" for ${memberName}`);
  };

  const initials = memberName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div
      ref={cardRef}
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors",
        highlighted ? "bg-primary/5" : "hover:bg-muted/20",
      )}
    >
      {/* Avatar */}
      <div className="size-8 rounded-full bg-gradient-to-br from-amber/40 to-amber/10 text-amber-foreground grid place-items-center font-semibold text-[11px] shrink-0 mt-0.5 border border-amber/30">
        {initials}
      </div>

      {/* Name + skill chips */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold leading-none">{memberName}</span>
          <span className="text-[10px] text-muted-foreground">{pending.length} pending</span>
          {highlighted && (
            <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">
              Action needed
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {pending.map(skill => {
            const attachment = skillAttachments[`${memberId}:${skill}`];
            const mustViewFirst = !!attachment && !attachment.viewed;
            return (
              <span
                key={skill}
                className="inline-flex items-center gap-0.5 pl-2.5 pr-0.5 py-0.5 rounded-full bg-gradient-to-r from-amber/15 to-amber/5 border border-amber/30 text-[10px] font-medium text-amber-foreground shadow-sm"
              >
                {skill}
                {attachment && (
                  <a
                    href={attachment.objectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markAttachmentViewed(memberId, skill)}
                    title={attachment.fileName}
                    className="ml-1 flex items-center gap-0.5 px-1 py-0.5 rounded-full text-primary hover:bg-primary/15 transition-colors underline underline-offset-2"
                  >
                    <FileText className="size-3" /> View Certificate
                  </a>
                )}
                <button
                  onClick={() => handleEndorse(skill)}
                  disabled={mustViewFirst}
                  title={mustViewFirst ? "View the attached certificate first" : "Approve"}
                  className="ml-1 p-0.5 rounded-full text-rag-green hover:bg-rag-green/25 hover:scale-110 transition-all disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="size-3" />
                </button>
                <button
                  onClick={() => handleReject(skill)}
                  disabled={mustViewFirst}
                  title={mustViewFirst ? "View the attached certificate first" : "Reject"}
                  className="p-0.5 rounded-full text-destructive/60 hover:text-destructive hover:bg-destructive/15 hover:scale-110 transition-all disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  <XCircle className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main section ───────────────────────────────────────────────────────────────

export function SkillsSection() {
  const {
    skills, currentUser, addPendingSkill,
    tier, teamMembers, focusedSkillsMemberId, setFocusedSkillsMemberId,
    staffMemberId, adminMemberId, allTeamMemberSkills, staffList, opsMeta,
    opsAllTeamMemberSkills, hcwmDepartmentGoals, opsDepartmentGoals, deptGoalSkills,
    managerDevGoals, staffDevGoals, adminDevGoals,
  } = useApp();
  const [pending, setPending] = useState(skills.pending);
  const [optimisticPending, setOptimisticPending] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [interestQuery, setInterestQuery] = useState("");
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Skill awaiting a supporting document before it can be submitted for manager approval — same
  // certificate-or-result-slip requirement as completing a development goal (see DevGoalCard).
  const [attachModalSkill, setAttachModalSkill] = useState<string | null>(null);
  const isOpsTier = tier === "ops_hod" || tier === "ops_mgr1" || tier === "ops_mgr2";

  const isManager = tier === "manager" || tier === "ops_hod";

  // In staff/admin tier show the viewed member's skills; manager tier shows the manager's own skills
  const viewedMemberId = tier === "admin" ? adminMemberId : tier === "staff" ? staffMemberId : null;
  const viewedMemberSkills = isOpsTier
    ? (opsMeta?.skills ?? null)
    : (viewedMemberId ? allTeamMemberSkills.find(m => m.memberId === viewedMemberId) : null);
  const displayVerified = viewedMemberSkills ? viewedMemberSkills.verified : skills.verified;
  const displayPending = viewedMemberSkills ? viewedMemberSkills.pending : pending;

  const viewedMember = viewedMemberId ? teamMembers.find(m => m.id === viewedMemberId) : null;

  // Endorsable skills: any direct report — across manager, HOD, staff-with-team, or ops_mgr
  // tiers — who has pending skills awaiting endorsement. Resolved generically from each
  // member's directManager link against the current viewer's effective name (opsMeta for any
  // ops persona, otherwise the viewed staff/admin member, otherwise the manager) and joined
  // against allTeamMemberSkills (already correctly populated for both HCWM and ops personas).
  // This intentionally does NOT hardcode tier checks, so any future persona — whether a new
  // HOD, manager, or staff member with their own reports — picks this up automatically.
  const effectiveViewerName = opsMeta
    ? opsMeta.user.name
    : isManager
    ? currentUser.name
    : (viewedMember?.name ?? currentUser.name);
  const viewerDirectReportIds = new Set(
    teamMembers.filter(m => m.directManager === effectiveViewerName).map(m => m.id)
  );
  const activeEndorsableSkills = allTeamMemberSkills.filter(
    m => viewerDirectReportIds.has(m.memberId) && m.pending.length > 0
  );

  // ── Departmental Competency Gap — HOD sees their own department; a "Director" (an HOD with
  // other HODs reporting to them, per real users.csv supervisor/hod data) sees an aggregate across
  // every department those HOD reports themselves head. Same computation as the admin console's
  // org-wide "Organisational Competency Gaps" (src/lib/insights.ts), just scoped to fewer people.
  const isHodViewer = (tier === "manager" && currentUser.hod) || tier === "ops_hod";
  const GOALS_BY_DEPT: Record<string, { id: string }[]> = { [HCWM_DEPT_NAME]: hcwmDepartmentGoals, [CREDIT_RISK_DEPT_NAME]: opsDepartmentGoals };
  const allMemberSkillsForGap = [...allTeamMemberSkills, ...opsAllTeamMemberSkills];
  const canonicalOwnDept = staffList.find(s => s.name === effectiveViewerName)?.dept ?? (opsMeta ? opsMeta.user.department : currentUser.department);
  const { depts: relevantDeptsForGap, isDirector: isDirectorGapView } = isHodViewer
    ? getRelevantDeptsForViewer(effectiveViewerName, canonicalOwnDept, staffList)
    : { depts: [] as string[], isDirector: false };
  const departmentalCompetencyGap = isHodViewer
    ? computeCompetencyGapRow(
        isDirectorGapView ? `${relevantDeptsForGap.length} departments` : relevantDeptsForGap[0],
        staffList.filter(s => relevantDeptsForGap.includes(s.dept)),
        GOALS_BY_DEPT, deptGoalSkills, allMemberSkillsForGap,
      )
    : null;

  // Experience profile data — sourced from opsMeta for ops tiers, currentUser for manager, staffList for staff/admin
  const staffEntry = !isManager ? staffList.find(s => s.name === viewedMember?.name) : null;
  const experienceProfile = isOpsTier && opsMeta
    ? { designation: opsMeta.user.designation, dept: opsMeta.user.department, grade: opsMeta.user.grade, tenure: `${opsMeta.user.tenureYears} yr${opsMeta.user.tenureYears !== 1 ? "s" : ""}`, reportsTo: null }
    : isManager
    ? { designation: currentUser.designation, dept: currentUser.department, grade: currentUser.grade, tenure: `${currentUser.tenureYears} yr${currentUser.tenureYears !== 1 ? "s" : ""}`, reportsTo: null }
    : staffEntry
    ? { designation: staffEntry.role, dept: staffEntry.dept, grade: staffEntry.grade, tenure: staffEntry.join.replace(" ago", ""), reportsTo: staffEntry.supervisor !== "—" ? staffEntry.supervisor : null }
    : null;


  useEffect(() => { setPending(skills.pending); }, [skills.pending]);
  // Reset optimistic additions and area of interest search whenever the viewed user changes
  useEffect(() => {
    setOptimisticPending([]);
    setSelectedFunction(null);
    setInterestQuery("");
    setShowDropdown(false);
  }, [tier]);
  // Close area of interest dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Clear the focus highlight after a short delay so it doesn't persist forever
  useEffect(() => {
    if (!focusedSkillsMemberId) return;
    const t = setTimeout(() => setFocusedSkillsMemberId(null), 4000);
    return () => clearTimeout(t);
  }, [focusedSkillsMemberId]);

  // Determine the viewed user's role for default skill filtering
  const viewedDesignation = isOpsTier && opsMeta ? opsMeta.user.designation : (viewedMember?.role ?? currentUser.designation);
  const viewedDept = isOpsTier && opsMeta ? opsMeta.user.department : (viewedMember?.dept ?? currentUser.department);

  // HCWM staff use IHRP Skills Badges; all others use the IBF Skills Framework.
  const isHCWM = isHCWMDept(viewedDept);
  const ihrpBadges = isHCWM ? getIHRPBadgesForRole(viewedDesignation, experienceProfile?.grade ?? 3) : null;

  const roleSkills = isHCWM
    ? [...(ihrpBadges?.functional ?? []), ...(ihrpBadges?.behavioural ?? [])]
    : getDefaultSkillsForRole(viewedDesignation, viewedDept, experienceProfile?.grade ?? 4);
  const regulatoryExams = isHCWM
    ? (ihrpBadges?.certifications ?? [])
    : getRegulatorExamsForRole(viewedDesignation, viewedDept);
  const { url: ibfUrl, track: ibfTrack } = isHCWM
    ? { url: "https://ihrp.sg/skill-badges-overview/", track: "HR Professionals" }
    : getIBFJobFunctionUrl(viewedDesignation, viewedDept);
  const jobFamilySkills = isHCWM
    ? IHRP_SKILLS_CATALOG
    : [...new Set(getSkillCategoriesForRole(viewedDesignation, viewedDept).flatMap(cat => SKILLS_BY_CATEGORY[cat] ?? []))];
  const skillPool = query === "" ? roleSkills : jobFamilySkills;
  const available = skillPool.filter(s =>
    !displayVerified.includes(s) &&
    !displayPending.includes(s) &&
    !optimisticPending.includes(s) &&
    (query === "" || s.toLowerCase().includes(query.toLowerCase()))
  );
  const availableExams = query === ""
    ? regulatoryExams.filter(e => !displayVerified.includes(e) && !displayPending.includes(e) && !optimisticPending.includes(e))
    : [];

  const add = (s: string) => setAttachModalSkill(s);

  const handleAttachmentSubmit = (attachment: SkillAttachment) => {
    const s = attachModalSkill;
    if (!s) return;
    if (isManager) {
      setPending(p => [...p, s]); // optimistic update via local state (manager only)
    } else {
      setOptimisticPending(p => [...p, s]); // optimistic until server refetch
    }
    toast.success(`${s} added — pending approval · your certificate is attached`);
    void addPendingSkill(s, attachment);
    setAttachModalSkill(null);
  };

  // Show job matches for everyone; manager's condition still respects tenure
  const effectiveTenureYears = isOpsTier && opsMeta ? opsMeta.user.tenureYears : currentUser.tenureYears;
  const showJobs = isManager ? effectiveTenureYears * 12 >= 18 : true;

  const userGrade = experienceProfile?.grade ?? 4;

  // This viewed persona's own development goals — SkillsSection only ever shows "My Profile &
  // Opportunities" for whichever persona is currently active (never someone else's, unlike the
  // Team OKRs member drawer), so this is a straightforward per-tier lookup, not an id join.
  const viewedMemberDevGoals = isOpsTier && opsMeta
    ? opsMeta.devGoals
    : tier === "admin"
    ? adminDevGoals
    : tier === "staff"
    ? staffDevGoals
    : managerDevGoals;
  // Only active (not yet completed) goals describe where the person is still growing — a
  // completed goal is a skill they've already gained, not a forward-looking signal.
  const devGoalKeywords = viewedMemberDevGoals
    .filter(g => !g.completed)
    .map(g => `${g.title}. ${g.description}`);

  // Fetch live cross-functional rotation opportunities: keyword "" tells the scraper to sample
  // all 58 live jobs via sitemap, and score that same pool twice — once against this user's
  // current verified skills/exams, once against their active development-goal keywords — each
  // filtered to ≥70% match. The userDesignation is included so the server can also filter out
  // same-role listings and incorporate it into skill gap analysis. Certifications/regulatory
  // exams are included alongside verified skills since job postings frequently ask for them by
  // name (e.g. "IHRP certification preferred", "CFA"). Both signals are in the query key, so a
  // newly verified skill or a newly added/completed development goal produces a distinct key and
  // triggers an immediate refetch rather than serving a stale cached match list.
  const rotationUserSkills = [...displayVerified, ...regulatoryExams];
  const { data: rotationData, isLoading: rotationLoading } = useQuery({
    queryKey: ["phillipJobRotation", userGrade, rotationUserSkills, viewedDesignation, devGoalKeywords],
    queryFn: () =>
      fetchPhillipJobsFn({ data: { keyword: "", userGrade, userSkills: rotationUserSkills, userDesignation: viewedDesignation, devGoalKeywords } }),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    enabled: showJobs,
  });
  // Exclude any live result that matches the user's own current designation
  const filteredRotationJobs = (rotationData?.jobs ?? []).filter(
    j => !isSameRole(j.title, viewedDesignation)
  );
  const filteredDevGoalJobs = (rotationData?.devGoalJobs ?? []).filter(
    j => !isSameRole(j.title, viewedDesignation)
  );

  // Area of interest picker — filter displayed dropdown options
  const filteredFunctions = JOB_FUNCTIONS.filter(fn =>
    interestQuery === "" || fn.toLowerCase().includes(interestQuery.toLowerCase())
  );

  // Explore: fetch all live listings in the selected category — no scoring, no filtering.
  const { data: phillipData, isLoading: phillipLoading, error: phillipFetchError } = useQuery({
    queryKey: ["phillipJobs", selectedFunction],
    queryFn: () =>
      fetchPhillipJobsFn({ data: { keyword: selectedFunction ?? "", userGrade, userSkills: [], scoreEnabled: false } }),
    enabled: !!selectedFunction,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return (
    <div className="space-y-6 relative">
      {/* Profile & Opportunities — gradient banner matching My Goals format */}
      <div className="rounded-2xl overflow-hidden">
        <div
          className="px-6 py-5 flex items-start justify-between gap-4"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #6366F1 55%, #8B5CF6 100%)" }}
        >
          <div className="flex items-center gap-3">
            <BookSparkSVG />
            <div>
              <h2 className="font-display text-2xl text-white">My Profile &amp; Opportunities</h2>
            </div>
          </div>
        </div>
      </div>

      {/* ── HOD/Director: Departmental Competency Gap, with Team Skills Pending Your Review merged
          in as its own clearly-labelled subsection at the bottom — one section, two differentiated
          parts, rather than two disconnected boxes. ── */}
      {isHodViewer && departmentalCompetencyGap && (
        <div className="rounded-2xl border border-primary/25 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20 flex-wrap gap-1.5">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-primary/20 grid place-items-center shrink-0">
                <AlertTriangle className="size-3 text-primary" />
              </div>
              <span className="text-base font-display">Departmental Competency Gap</span>
            </div>
            {isDirectorGapView && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                Aggregated across {relevantDeptsForGap.length} departments
              </span>
            )}
          </div>

          {/* Subsection: the skills gap itself */}
          <div className="bg-card p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Skills tagged as needed vs. verified in your team</div>
            {departmentalCompetencyGap.requiredSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills have been tagged as needed on your department's OKRs yet — tag them from the Team OKRs page.</p>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="font-display text-3xl">{departmentalCompetencyGap.gapPct}%</div>
                  <div className="text-xs text-muted-foreground">gap — {departmentalCompetencyGap.missing.length} of {departmentalCompetencyGap.requiredSkills.length} required skills not yet verified</div>
                </div>
                {departmentalCompetencyGap.missing.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {departmentalCompetencyGap.missing.map(skill => (
                      <span key={skill} className="text-[11px] px-2 py-0.5 rounded-full bg-rag-red/10 text-rag-red border border-rag-red/25">{skill}</span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-4"><div className="border-t border-dashed border-border/60" /></div>

          {/* Subsection: team skills pending endorsement */}
          <div className="bg-card">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-amber-foreground" />
                <span className="text-sm font-semibold">Team Skills Pending Your Review</span>
              </div>
              {activeEndorsableSkills.length > 0 && (
                <span className="text-[10px] font-bold bg-amber/20 text-amber-foreground border border-amber/35 px-2.5 py-0.5 rounded-full">
                  {activeEndorsableSkills.reduce((acc, m) => acc + m.pending.length, 0)} pending
                </span>
              )}
            </div>
            {activeEndorsableSkills.length > 0 ? (
              <div className="divide-y divide-border/40">
                {activeEndorsableSkills.map(m => (
                  <TeamMemberSkillCard
                    key={m.memberId}
                    memberId={m.memberId}
                    memberName={m.memberName}
                    pending={m.pending}
                    verified={m.verified}
                    highlighted={focusedSkillsMemberId === m.memberId}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No team skills awaiting your review.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Team skills pending endorsement (manager or staff-with-team, non-HOD — HOD/Director's
          version above already includes this, merged with their Competency Gap) ── */}
      {!isHodViewer && activeEndorsableSkills.length > 0 && (
        <div className="rounded-2xl border border-amber/25 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber/12 via-amber/6 to-transparent border-b border-amber/20">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded-full bg-amber/25 grid place-items-center">
                <Clock className="size-2.5 text-amber-foreground" />
              </div>
              <span className="text-sm font-semibold">Team Skills Pending Your Review</span>
            </div>
            <span className="text-[10px] font-bold bg-amber/20 text-amber-foreground border border-amber/35 px-2.5 py-0.5 rounded-full">
              {activeEndorsableSkills.reduce((acc, m) => acc + m.pending.length, 0)} pending
            </span>
          </div>
          {/* Member rows */}
          <div className="bg-card divide-y divide-border/40">
            {activeEndorsableSkills.map(m => (
              <TeamMemberSkillCard
                key={m.memberId}
                memberId={m.memberId}
                memberName={m.memberName}
                pending={m.pending}
                verified={m.verified}
                highlighted={focusedSkillsMemberId === m.memberId}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── My Skills Profile + Skills Catalog — integrated section ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="size-8 rounded-full bg-primary/15 grid place-items-center shrink-0">
            <Award className="size-4 text-primary" />
          </div>
          <h2 className="font-display text-2xl">My Skills Profile</h2>
        </div>
        <div className="rounded-2xl border border-border/60 overflow-hidden shadow-sm">

        {/* Verified + Pending grid */}
        <div className="bg-card grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-border/50">
          <div className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Check className="size-3.5 text-rag-green" />
              <span className="text-sm font-semibold">Verified ({displayVerified.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {displayVerified.length === 0
                ? <span className="text-xs text-muted-foreground">No verified skills yet.</span>
                : displayVerified.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rag-green/10 text-rag-green text-xs border border-rag-green/25 font-medium">
                    <Check className="size-2.5" /> {s}
                  </span>
                ))
              }
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Clock className="size-3.5 text-amber-foreground" />
              <span className="text-sm font-semibold">Pending Approval ({displayPending.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {displayPending.length === 0
                ? <span className="text-xs text-muted-foreground">No skills pending approval.</span>
                : displayPending.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber/10 text-amber-foreground text-xs border border-amber/30 font-medium">
                    <Clock className="size-2.5" /> {s}
                  </span>
                ))
              }
            </div>
          </div>
        </div>

        {/* Skills Catalog */}
        <div className="border-t border-border/60 bg-card/60 px-4 pt-3 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Skills Catalog</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type to search all skills"
              className="text-sm px-3 py-1.5 rounded-md border border-input bg-background w-60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {query !== "" ? (
            /* Search mode — flat list */
            <div className="flex flex-wrap gap-2">
              {available.map(s => (
                <button key={s} onClick={() => add(s)} className="px-2.5 py-1 rounded-full text-xs border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <Plus className="size-2.5" /> {s}
                </button>
              ))}
              {available.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  {isHCWM ? "No matching IHRP Skills Badges found." : "No matching skills found in your IBF job family."}
                </span>
              )}
            </div>
          ) : (
            /* Default mode — grouped by category */
            <div className="space-y-4">
              {(() => {
                const groups: [string, string[], string][] = [];
                if (isHCWM) {
                  const functional = available.filter(s => classifyIHRPBadge(s) === "IHRP Functional Competency");
                  const behavioural = available.filter(s => classifyIHRPBadge(s) === "IHRP Mindsets & Behaviours");
                  if (functional.length > 0) groups.push(["IHRP Functional Competency", functional, "bg-blue-400"]);
                  if (behavioural.length > 0) groups.push(["IHRP Mindsets & Behaviours", behavioural, "bg-violet-400"]);
                  if (availableExams.length > 0) groups.push(["IHRP Certification", availableExams, "bg-orange-400"]);
                } else {
                  const tsc = available.filter(s => classifySkill(s) === "Technical Skills & Competencies");
                  const ccs = available.filter(s => classifySkill(s) === "Critical Core Skills");
                  if (tsc.length > 0) groups.push(["Technical Skills & Competencies", tsc, "bg-blue-400"]);
                  if (ccs.length > 0) groups.push(["Critical Core Skills", ccs, "bg-violet-400"]);
                  if (availableExams.length > 0) groups.push(["Regulatory Examinations", availableExams, "bg-orange-400"]);
                }
                if (groups.length === 0) {
                  return (
                    <span className="text-xs text-muted-foreground">
                      {isHCWM
                        ? "All recommended IHRP Skills Badges for your role are in your profile. Type to browse more."
                        : "All recommended skills for your role are already in your profile. Type to browse more skills from your IBF job family."
                      }
                    </span>
                  );
                }
                return groups.map(([cat, items, dot]) => (
                  <div key={cat}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className={cn("size-1.5 rounded-full shrink-0", dot)} />
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{cat}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map(s => (
                        <button key={s} onClick={() => add(s)} className="px-2.5 py-1 rounded-full text-xs border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-1 text-muted-foreground hover:text-foreground">
                          <Plus className="size-2.5" /> {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ));
              })()}
              <p className="text-[10px] text-muted-foreground mt-1">
                Showing up to 15 recommended skills &amp; certifications for your role.{" "}
                <a href={ibfUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-primary transition-colors">
                  {isHCWM
                    ? "View IHRP Skills Badges for Human Capital Professionals"
                    : `View the full IBF Skills Framework for ${ibfTrack}`
                  }
                </a>
              </p>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* ── My Experience Profile ── */}
      {experienceProfile && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <BriefcaseSVG />
            <h2 className="font-display text-2xl">My Experience Profile</h2>
          </div>
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="font-medium">{experienceProfile.designation}</div>
                <div className="text-sm text-muted-foreground">{experienceProfile.dept}</div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                  <span>{experienceProfile.tenure} tenure</span>
                  {experienceProfile.reportsTo && (
                    <>
                      <span className="opacity-40">·</span>
                      <span>Reports to <span className="text-foreground font-medium">{experienceProfile.reportsTo}</span></span>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal/10 text-teal border border-teal/30 whitespace-nowrap">
                  {formatJobGrade(experienceProfile.grade)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Job Rotation Opportunities ── */}
      {showJobs && (
        <Card className="bg-gradient-to-br from-amber/10 to-teal/10 border-amber/30 glow-amber">
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <GraduationCapSVG />
              <h2 className="font-display text-2xl">Job Rotation Opportunities</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Opportunities to apply transferable skills, enhance your capabilities, and broaden your experience across PhillipCapital's business functions. Only roles matched at 70% or higher are shown below — a lower match isn't hidden noise, it just isn't a real fit yet.
            </p>
          </div>

          {/* ── Set 1: Based on Your Current Skills & Experience ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-teal/15 text-teal border border-teal/30 shrink-0">Set 1</span>
              <span className="text-sm font-semibold">Based on Your Current Skills &amp; Experience</span>
            </div>
            {rotationLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                <Loader2 className="size-4 animate-spin" />
                Fetching live listings from PhillipCapital…
              </div>
            ) : rotationData && !rotationData.error && filteredRotationJobs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredRotationJobs.map(j => (
                  <div key={j.url} className="bg-card rounded-lg p-4 border border-border flex flex-col gap-2">
                    {/* Title + match badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm leading-snug flex-1 min-w-0">{j.title}</div>
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal/15 text-teal border border-teal/30 whitespace-nowrap">
                        {j.matchScore}% match
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{j.dept}</div>
                    {j.experienceYears !== null && (
                      <div className="text-[10px] text-muted-foreground/70">{j.experienceYears}+ yrs experience required</div>
                    )}
                    {/* Transferable skills from user's existing profile */}
                    {j.transferableSkills.length > 0 && (
                      <div className="mt-1 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1 mb-1.5">
                          <ArrowLeftRight className="size-3 text-teal" />
                          <span className="text-[10px] font-semibold text-teal uppercase tracking-widest">Your Transferable Skills</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {j.transferableSkills.map((s, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/25 font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <a
                      href={j.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto text-sm flex items-center gap-1 text-primary hover:underline"
                    >
                      View listing <ExternalLink className="size-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-card border border-border p-4 text-sm text-muted-foreground space-y-2">
                <div>No roles currently match your skills &amp; experience profile at 70% or higher.</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Search for job listings by <span className="text-foreground font-medium">exploring an area of interest below</span></li>
                  <li>Beef up your skills inventory above to unlock a wider plethora of relevant roles at PhillipCapital</li>
                </ul>
                <a href={CAREERS_PAGE} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Browse open roles on PhillipCapital <ExternalLink className="size-3" />
                </a>
              </div>
            )}
          </div>

          {/* ── Set 2: Based on Your Development Goals ── */}
          <div className="mt-5 pt-5 border-t border-border/60">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 shrink-0">Set 2</span>
              <span className="text-sm font-semibold">Based on Your Development Goals</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Roles aligned with what you're actively working toward — each card also flags the additional skills that role still expects, so it's clear what stands between you and it.
            </p>
            {devGoalKeywords.length === 0 ? (
              <div className="rounded-lg bg-card border border-border p-4 text-sm text-muted-foreground">
                Add an active development goal on My Goals to get growth-oriented role suggestions here.
              </div>
            ) : rotationLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                <Loader2 className="size-4 animate-spin" />
                Fetching live listings from PhillipCapital…
              </div>
            ) : rotationData && !rotationData.error && filteredDevGoalJobs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredDevGoalJobs.map(j => (
                  <div key={j.url} className="bg-card rounded-lg p-4 border border-border flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm leading-snug flex-1 min-w-0">{j.title}</div>
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 whitespace-nowrap">
                        {j.matchScore}% match
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{j.dept}</div>
                    {j.experienceYears !== null && (
                      <div className="text-[10px] text-muted-foreground/70">{j.experienceYears}+ yrs experience required</div>
                    )}
                    {j.transferableSkills.length > 0 && (
                      <div className="mt-1 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1 mb-1.5">
                          <ArrowLeftRight className="size-3 text-violet-600 dark:text-violet-400" />
                          <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest">Aligned To Your Development Goals</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {j.transferableSkills.map((s, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/25 font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {j.skillGaps.length > 0 && (
                      <div className="pt-1.5">
                        <div className="flex items-center gap-1 mb-1.5">
                          <AlertTriangle className="size-3 text-amber-foreground" />
                          <span className="text-[10px] font-semibold text-amber-foreground uppercase tracking-widest">Additional Skills Needed</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {j.skillGaps.map((s, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber/10 text-amber-foreground border border-amber/25 font-medium capitalize">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <a
                      href={j.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto text-sm flex items-center gap-1 text-primary hover:underline"
                    >
                      View listing <ExternalLink className="size-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-card border border-border p-4 text-sm text-muted-foreground space-y-2">
                <div>No roles currently match your development goals at 70% or higher.</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Search for job listings by <span className="text-foreground font-medium">exploring an area of interest below</span></li>
                  <li>Beef up your skills inventory above to unlock a wider plethora of relevant roles at PhillipCapital</li>
                </ul>
                <a href={CAREERS_PAGE} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Browse open roles on PhillipCapital <ExternalLink className="size-3" />
                </a>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground/70 mt-3">
              For a broader view of Financial Services career pathways and the skills each one expects, see the{" "}
              <a href="https://www.skillsfuture.gov.sg/skills-framework" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                SSG Skills Framework — Financial Services
              </a>.
            </p>
          </div>

          {/* ── Area of Interest Picker ── */}
          <div className="mt-5 pt-5 border-t border-border/60">
            <div className="flex items-center gap-2 mb-3">
              <Search className="size-4 text-muted-foreground" />
              <div className="text-sm font-semibold">Explore by Area of Interest</div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Type a job function to discover open roles at PhillipCapital that match your interest.
            </p>
            <div className="relative" ref={dropdownRef}>
              <input
                value={interestQuery}
                onChange={e => {
                  setInterestQuery(e.target.value);
                  setSelectedFunction(null);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="e.g. Human Resources, Finance, Technology…"
                className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {showDropdown && filteredFunctions.length > 0 && !selectedFunction && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                  {filteredFunctions.map(fn => (
                    <button
                      key={fn}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        setSelectedFunction(fn);
                        setInterestQuery(fn);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      {fn}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedFunction && (
              <div className="mt-3">
                {phillipLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="size-4 animate-spin" />
                    Fetching live listings from PhillipCapital…
                  </div>
                ) : phillipFetchError || phillipData?.error ? (
                  <div className="rounded-lg bg-card border border-border p-3 text-sm text-muted-foreground">
                    <a href={CAREERS_PAGE} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                      Browse open roles on PhillipCapital <ExternalLink className="size-3" />
                    </a>
                  </div>
                ) : phillipData && phillipData.jobs.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground mb-2">
                      Live listings from PhillipCapital for{" "}
                      <span className="font-medium text-foreground">{selectedFunction}</span>:
                    </div>
                    {phillipData.jobs.map(job => (
                      <a
                        key={job.url}
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{job.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{job.dept}</div>
                          {job.experienceYears !== null && (
                            <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                              {job.experienceYears}+ yrs experience required
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primary group-hover:underline shrink-0 ml-3">
                          View listing <ExternalLink className="size-3" />
                        </div>
                      </a>
                    ))}
                  </div>
                ) : phillipData ? (
                  <div className="rounded-lg bg-card border border-border p-3 text-sm text-muted-foreground">
                    <a href={CAREERS_PAGE} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                      Browse open roles on PhillipCapital <ExternalLink className="size-3" />
                    </a>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </Card>
      )}

      {attachModalSkill && (
        <SkillAttachmentModal
          skillName={attachModalSkill}
          onSubmit={handleAttachmentSubmit}
          onClose={() => setAttachModalSkill(null)}
          submitLabel="Submit for Approval"
        />
      )}
    </div>
  );
}
