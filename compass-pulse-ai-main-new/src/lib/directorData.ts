// The 2 "Director" demo personas — direct leave supervisors of one or more department HODs (per
// users.csv u300/u301). Unlike every other tier, a director owns no department's OKRs/skills
// content of their own — their identity here is deliberately minimal (just enough for the Sidebar
// switcher/greeting), and their whole dashboard is the aggregated Director Insights view, which
// reads live data for every department via getRelevantDeptsForViewer (src/lib/insights.ts) rather
// than anything hardcoded here.
export interface DirectorPersona {
  tier: "director1" | "director2";
  id: string;
  name: string;
  designation: string;
  avatar: string;
}

export const DIRECTOR_PERSONAS: DirectorPersona[] = [
  { tier: "director1", id: "u300", name: "Daniel Lee", designation: "Director, People & Risk", avatar: "DL" },
  { tier: "director2", id: "u301", name: "Priya Goh", designation: "Director, Risk & Compliance", avatar: "PG" },
];
