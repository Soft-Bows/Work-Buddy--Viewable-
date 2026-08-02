import { getCurrentQuarterStart, getCurrentQuarterEndWorkingDate, workingDaysSince } from "./utils";

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
  quarter: string; // "YYYY-Q#"
  submittedAt: string; // ISO timestamp — when this response landed, used to date a quarter's aggregate
  ratings: Record<string, number>; // PulseQuestion id -> 1-5
}

// Same confidentiality guardrail Viva Glint documents for manager-facing survey results: never
// surface an aggregate built from fewer than this many responses, so an individual's answer is
// never identifiable from a small team's average.
export const MIN_RESPONSES_FOR_AGGREGATE = 3;

// "YYYY-Q#" label for whichever quarter `reference` falls in — the same quarter math
// getCurrentQuarterStart/getCurrentQuarterEndDate already use, just formatted as a label.
export function currentQuarterLabel(reference: Date = new Date()): string {
  const y = reference.getFullYear();
  const q = Math.floor(reference.getMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

// "YYYY-Q#" label for the quarter immediately before whichever quarter `reference` falls in — used
// to compute the quarter-over-quarter trend shown alongside a department's current-quarter pulse.
export function previousQuarterLabel(reference: Date = new Date()): string {
  const y = reference.getFullYear();
  const q = Math.floor(reference.getMonth() / 3) + 1;
  return q === 1 ? `${y - 1}-Q4` : `${y}-Q${q - 1}`;
}

// Team Pulse is only open for submission from the first working day of a quarter through its last
// working day — outside that window the form is closed, not just "quiet."
export function isPulseWindowOpen(reference: Date = new Date()): boolean {
  return reference >= getCurrentQuarterStart(reference) && reference <= getCurrentQuarterEndWorkingDate(reference);
}

// The "New Insights" badge stays lit for 7 *working* days from the date a quarter's aggregate first
// became visible (crossed MIN_RESPONSES_FOR_AGGREGATE) — not from quarter-start, since a
// late-arriving 3rd response can cross the threshold mid-quarter.
export function isNewInsightsBadgeActive(firstShownDate: string | undefined): boolean {
  if (!firstShownDate) return false;
  return workingDaysSince(firstShownDate) < 7;
}

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

// The earliest submittedAt among a quarter's responses once it has enough to aggregate — i.e. the
// date the aggregate itself first became visible, used to drive isNewInsightsBadgeActive above.
export function aggregateFirstShownDate(responses: PulseResponse[]): string | undefined {
  if (responses.length < MIN_RESPONSES_FOR_AGGREGATE) return undefined;
  const sorted = [...responses].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  return sorted[MIN_RESPONSES_FOR_AGGREGATE - 1]?.submittedAt;
}
