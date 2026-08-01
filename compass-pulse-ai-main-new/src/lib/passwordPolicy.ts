// A 2026 financial-institution-style password baseline: long, mixed-case, numeric, symbol,
// no whitespace. Shared verbatim between the client (live checklist UI) and the server
// (re-validation on setNewPassword) so the two can never drift out of sync.
export interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 12 characters", test: (pw) => pw.length >= 12 },
  { label: "At least one uppercase letter (A–Z)", test: (pw) => /[A-Z]/.test(pw) },
  { label: "At least one lowercase letter (a–z)", test: (pw) => /[a-z]/.test(pw) },
  { label: "At least one number (0–9)", test: (pw) => /\d/.test(pw) },
  { label: "At least one special character (!@#$%^&*...)", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
  { label: "No spaces", test: (pw) => pw.length > 0 && !/\s/.test(pw) },
];

export function isPasswordStrong(pw: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(pw));
}

// "YYYY-MM-DD" -> "ddmmyy", e.g. "2022-03-01" -> "010322"
export function formatJoinDateAsPassword(joinDateIso: string): string {
  const [y, m, d] = joinDateIso.split("-");
  return `${d}${m}${y.slice(2)}`;
}
