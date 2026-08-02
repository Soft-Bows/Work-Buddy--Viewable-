// The 3 "Director" demo personas — real people per "Staff Listing 2 (MGT).pdf", each the real
// leave supervisor of one or more department HODs (per users.csv u300/u301: Elsa Ling supervises
// Sarah Chen/HCWM + Michelle Sylvia/Marketing Communications; Ethan Lim supervises Nadia Yong/
// Credit Risk) — plus Jong Kook (u302), the real Managing Director both Elsa Ling and Ethan Lim
// list as their own supervisor in users.csv (a "staff row not added" until now). Unlike every
// other tier, a director owns no department's OKRs/skills content of their own — their identity
// here is deliberately minimal (just enough for the Sidebar switcher/greeting; appContext.tsx's
// directorMeta resolves their real name/department/designation live from staffList, not from this
// file), and their real multi-department oversight is embedded into Team OKRs' Key Staff
// Challenges and Admin Console's Departmental Competency Gaps via getRelevantDeptsForViewer
// (src/lib/insights.ts), not a dedicated page. isManagingDirector gates the 2026 Philly Group
// OKRs propose/approve workflow (src/lib/phillyGroupOkrs.ts) — only the MD can finalize a change;
// every other director can only propose one.
export interface DirectorPersona {
  tier: "director0" | "director1" | "director2";
  id: string;
  name: string;
  designation: string;
  avatar: string;
  isManagingDirector?: boolean;
}

export const DIRECTOR_PERSONAS: DirectorPersona[] = [
  { tier: "director1", id: "u300", name: "Elsa Ling", designation: "Executive Director", avatar: "EL" },
  { tier: "director2", id: "u301", name: "Ethan Lim", designation: "Executive Director", avatar: "EM" },
  { tier: "director0", id: "u302", name: "Jong Kook", designation: "Managing Director", avatar: "JK", isManagingDirector: true },
];
