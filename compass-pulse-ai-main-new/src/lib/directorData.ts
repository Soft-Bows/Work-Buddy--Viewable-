// The 2 "Director" demo personas — real people (Elsa Ling, Ethan Lim) per "Staff Listing 2
// (MGT).pdf", each the real leave supervisor of one or more department HODs (per users.csv
// u300/u301: Elsa Ling supervises Sarah Chen/HCWM + Michelle Sylvia/Marketing Communications;
// Ethan Lim supervises Nadia Yong/Credit Risk). Unlike every other tier, a director owns no
// department's OKRs/skills content of their own — their identity here is deliberately minimal
// (just enough for the Sidebar switcher/greeting; appContext.tsx's directorMeta resolves their
// real name/department/designation live from staffList, not from this file), and their real
// multi-department oversight is embedded into Team OKRs' Key Staff Challenges and Admin Console's
// Departmental Competency Gaps via getRelevantDeptsForViewer (src/lib/insights.ts), not a
// dedicated page.
export interface DirectorPersona {
  tier: "director1" | "director2";
  id: string;
  name: string;
  designation: string;
  avatar: string;
}

export const DIRECTOR_PERSONAS: DirectorPersona[] = [
  { tier: "director1", id: "u300", name: "Elsa Ling", designation: "Executive Director", avatar: "EL" },
  { tier: "director2", id: "u301", name: "Ethan Lim", designation: "Executive Director", avatar: "EM" },
];
