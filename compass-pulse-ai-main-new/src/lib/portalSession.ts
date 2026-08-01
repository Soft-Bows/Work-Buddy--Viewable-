// Client-only session for the Work Buddy login portal. Login itself is verified server-side
// (loginFn, against users.csv + auth_credentials.csv) — this just remembers *who* is signed in
// on this browser so /portal doesn't ask again on every reload.
const SESSION_KEY = "workBuddy.session";

export interface PortalSession {
  userId: string;
}

export function getPortalSession(): PortalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PortalSession) : null;
  } catch {
    return null;
  }
}

export function setPortalSession(session: PortalSession) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch { /* storage unavailable (e.g. private browsing) */ }
}

export function clearPortalSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch { /* storage unavailable */ }
}
