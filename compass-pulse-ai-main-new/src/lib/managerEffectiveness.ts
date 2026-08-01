// Upward feedback on manager behaviours — grounded in Google re:Work's Project Oxygen, whose 10
// published behaviours of highly effective managers are openly available (unlike most of this
// research), so importing them as survey items is a straight content reuse rather than invention.
// Trimmed to 6 of the 10 (the ones most directly actionable for a mid-size FS org) to keep the
// survey short enough to actually get completed. Source: rework.withgoogle.com's "Identify what
// makes a great manager" guide.
export interface ManagerBehavior {
  id: string;
  text: string;
}

export const MANAGER_BEHAVIORS: ManagerBehavior[] = [
  { id: "coach", text: "Is a good coach" },
  { id: "empower", text: "Empowers the team and does not micromanage" },
  { id: "wellbeing", text: "Expresses genuine interest in team members' success and wellbeing" },
  { id: "communicate", text: "Communicates effectively — listens and shares information" },
  { id: "career", text: "Helps with career development" },
  { id: "vision", text: "Has a clear vision/strategy for the team" },
];

export interface ManagerEffectivenessRating {
  id: string;
  managerName: string;
  raterName: string;
  month: string; // "YYYY-MM"
  ratings: Record<string, number>; // ManagerBehavior id -> 1-5
}

// Same anonymity threshold as the pulse survey — a manager only ever sees an aggregate, never a
// single rater's score, and never at all below this count.
export const MIN_RATERS_FOR_AGGREGATE = 3;

export function averageManagerScores(ratings: ManagerEffectivenessRating[]): Record<string, number> | null {
  if (ratings.length < MIN_RATERS_FOR_AGGREGATE) return null;
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const r of ratings) {
    for (const [bId, val] of Object.entries(r.ratings)) {
      sums[bId] = (sums[bId] ?? 0) + val;
      counts[bId] = (counts[bId] ?? 0) + 1;
    }
  }
  const avgs: Record<string, number> = {};
  for (const bId of Object.keys(sums)) avgs[bId] = sums[bId] / counts[bId];
  return avgs;
}
