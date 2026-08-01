// A lightweight, recurring team-health pulse — the missing "listening instrument" every agentic
// engagement platform (Viva Glint, Culture Amp) builds its insights on top of. Deliberately short
// (4 questions, 1-5 scale) so it's actually completed, not a quarterly chore.
export interface PulseQuestion {
  id: string;
  text: string;
}

export const PULSE_QUESTIONS: PulseQuestion[] = [
  { id: "workload", text: "My workload feels manageable right now" },
  { id: "clarity", text: "I have clarity on what's expected of me this quarter" },
  { id: "support", text: "I feel supported by my manager when I raise a blocker" },
  { id: "growth", text: "I'm making real progress on my own development goals" },
];

export interface PulseResponse {
  id: string;
  respondentName: string;
  department: string;
  month: string; // "YYYY-MM"
  ratings: Record<string, number>; // PulseQuestion id -> 1-5
}

// Same confidentiality guardrail Viva Glint documents for manager-facing survey results: never
// surface an aggregate built from fewer than this many responses, so an individual's answer is
// never identifiable from a small team's average.
export const MIN_RESPONSES_FOR_AGGREGATE = 3;

export function averagePulseScores(responses: PulseResponse[]): Record<string, number> | null {
  if (responses.length < MIN_RESPONSES_FOR_AGGREGATE) return null;
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const r of responses) {
    for (const [qId, val] of Object.entries(r.ratings)) {
      sums[qId] = (sums[qId] ?? 0) + val;
      counts[qId] = (counts[qId] ?? 0) + 1;
    }
  }
  const avgs: Record<string, number> = {};
  for (const qId of Object.keys(sums)) avgs[qId] = sums[qId] / counts[qId];
  return avgs;
}
