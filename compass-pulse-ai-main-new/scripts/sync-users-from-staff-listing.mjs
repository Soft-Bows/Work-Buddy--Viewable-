// Syncs datasrc/users.csv from a real staff-listing export ("Staff Listing 2").
//
// Usage:
//   node scripts/sync-users-from-staff-listing.mjs <path-to-source-csv>
//
// The source CSV must have these columns (matching the real PhillipCapital export):
//   Full Name, Alias Name, Company, Job Grade, Department, Designation, Date Joined,
//   Length of Service(Service Date), Last Day of Service, Leave Supervisor,
//   E-mail Address (Office), Job family, HOD
//
// Re-run this any time a newer "Staff Listing 2" is uploaded — that's the whole sync
// process. Anonymized names and ids are kept stable across runs via
// datasrc/_staff_import_map.csv (real name -> id -> anonymized name); never delete
// that file, or everyone's anonymized identity will be reshuffled on the next run.
//
// The 8 named demo accounts (Sarah Chen, Anabelle Tan, Priya Kapoor, Belle Lim,
// Eliza Lim, Brandon Lim, Goi Teck Poh Frankie, James Okafor) are hand-maintained and
// are never overwritten by this script, except for a permanent correction to James
// Okafor's designation/grade (see JAMES_OVERRIDE) and a job_family backfill for all 8.
// Eliza Lim / Brandon Lim / Goi Teck Poh are excluded from the bulk import since their
// rows already exist and are already sourced from this same listing.
//
// Also hand-maintained: u300-u304 — the 2 "Director" demo accounts (Daniel Lee, Priya
// Goh, each the leave supervisor of one or more department HODs) and the 3-person
// Compliance department (Reuben Tan + 2 reports) created to give the multi-department
// Director view real data to aggregate. None of these exist in the real staff listing —
// don't remove them from HAND_MAINTAINED_IDS or a re-sync will silently delete them.
//
// Only active, permanent staff become NEW accounts: rows whose Designation contains "Intern"
// or "Temporary Assistant" are always skipped, and a person with no existing account who
// already has a past Last Day of Service is never imported at all (never create an account
// for a resignee). A person who *already has* an account (found in the stable id map) and
// whose latest row now shows a past LDOS is kept, not dropped — transitioned to
// status=disabled with a one-time disabled_detected_date, so Admin's Disabled Accounts panel
// can offer Enable/Export for 30 working days from that date (see AdminSection.tsx).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "datasrc");
const MAP_FILE = path.join(DATA_DIR, "_staff_import_map.csv");
const USERS_FILE = path.join(DATA_DIR, "users.csv");

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error("Usage: node scripts/sync-users-from-staff-listing.mjs <path-to-source-csv>");
  process.exit(1);
}

// ---------- CSV helpers (mirrors src/lib/csvData.server.ts) ----------

function splitLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(f => f.trim());
}

function parseCsv(raw) {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = splitLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

function toCsv(headers, rows) {
  const esc = (v) => {
    const s = v ?? "";
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map(r => headers.map(h => esc(r[h])).join(",")),
  ].join("\n") + "\n";
}

// ---------- Stable identity assignment ----------

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const FIRST_NAME_POOL = [
  "Aiden", "Bella", "Caleb", "Delia", "Elton", "Farah", "Gavin", "Hana", "Ivan", "Julia",
  "Kieran", "Leona", "Marcus", "Nadia", "Oscar", "Petra", "Quinn", "Rhea", "Samuel", "Tessa",
  "Umar", "Vera", "Wesley", "Xena", "Yusuf", "Zara", "Bryan", "Brianna", "Corin", "Diana",
  "Ethan", "Fiona", "Gareth", "Hazel", "Ian", "Jasmine", "Keith", "Layla", "Milo", "Nora",
  "Owen", "Priya", "Reuben", "Sasha", "Tobias", "Uma", "Victor", "Willa", "Xander", "Yara",
];

function titleCase(s) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const EXEMPT_REAL_NAMES = new Set(["Eliza Lim", "Brandon Lim", "Goi Teck Poh"]);

let mapRows = existsSync(MAP_FILE) ? parseCsv(readFileSync(MAP_FILE, "utf8")) : [];
const mapByRealName = new Map(mapRows.map((r) => [r.real_name, r]));
const usedAnonNames = new Set(mapRows.map((r) => r.anon_name));
let nextIdNum = Math.max(99, ...mapRows.map((r) => Number(r.id?.replace(/^u/, "")) || 0));
// Captured *before* this run mints any new identities — "already had an account" for the
// disabled-not-dropped rule below means present here, not just present by the time we're done.
const previouslyKnownNames = new Set(mapByRealName.keys());

// Common surnames repeat often enough that two different people can hash to the same
// first name and collide on the full anonymized display name (e.g. two "Ong"s both
// landing on "Bella"). Linear-probe deterministically through the pool until the
// resulting (firstName, surname) pair is unused, so every anonymized name is unique.
function resolveIdentity(realFullName) {
  const existing = mapByRealName.get(realFullName);
  if (existing) return existing;
  const seed = hashStr(realFullName);
  const surname = realFullName.trim().split(/\s+/)[0];
  let anonName = "";
  for (let i = 0; i < FIRST_NAME_POOL.length; i++) {
    const candidate = `${FIRST_NAME_POOL[(seed + i) % FIRST_NAME_POOL.length]} ${surname}`;
    if (!usedAnonNames.has(candidate)) { anonName = candidate; break; }
  }
  if (!anonName) anonName = `${FIRST_NAME_POOL[seed % FIRST_NAME_POOL.length]}${nextIdNum} ${surname}`;
  usedAnonNames.add(anonName);
  nextIdNum += 1;
  const entry = { real_name: realFullName, id: `u${nextIdNum}`, anon_name: anonName };
  mapByRealName.set(realFullName, entry);
  return entry;
}

// ---------- Field derivation ----------

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function parseSourceDate(raw) {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/.exec((raw || "").trim());
  if (!m) return "";
  const [, dd, mon, yy] = m;
  const monthIdx = MONTHS[mon];
  if (monthIdx === undefined) return "";
  const currentYY = new Date().getFullYear() % 100;
  const yyNum = Number(yy);
  const year = (yyNum > currentYY ? 1900 : 2000) + yyNum;
  return new Date(Date.UTC(year, monthIdx, Number(dd))).toISOString().slice(0, 10);
}

const TODAY_ISO = new Date().toISOString().slice(0, 10);

function isPermanentRole(row) {
  const desig = row["Designation"] || "";
  return !(/intern/i.test(desig) || /temporary assistant/i.test(desig));
}

function isActiveRow(row) {
  const ldos = parseSourceDate(row["Last Day of Service"]);
  return !ldos || ldos > TODAY_ISO;
}

function mapGrade(jobGrade) {
  const g = (jobGrade || "").trim();
  if (/^Vice President/i.test(g)) return 6;
  if (/^Assistant Vice President/i.test(g)) return 5;
  if (/^Assistant Manager/i.test(g)) return 4;
  if (/^Senior Executive/i.test(g)) return 3;
  if (/^Executive/i.test(g)) return 2;
  return 1; // Corporate/Operations Support, None, Internship-grade
}

function mapJobFamily(raw) {
  const v = (raw || "").trim().toUpperCase();
  if (!v || v === "NONE") return "—";
  const known = {
    "OPERATIONS / SETTLEMENT": "Operations / Settlement",
    "HUMAN CAPITAL": "Human Capital",
    "RISK / BUSINESS PROCESS": "Risk / Business Process",
    SALES: "Sales",
    DEALING: "Dealing",
    COMPLIANCE: "Compliance",
    IT: "IT",
    MARKETING: "Marketing",
    OTHERS: "Others",
  };
  return known[v] || titleCase(raw.trim());
}

function tenureYearsFrom(joinIso) {
  if (!joinIso) return 0;
  const ms = Date.now() - new Date(joinIso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25)));
}

function avatarOf(name) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
}

// ---------- Load source + existing users.csv ----------

const sourceRows = parseCsv(readFileSync(sourcePath, "utf8"));

// Only these 8 ids are hand-maintained demo accounts. Re-running this script must be
// idempotent: users.csv may already contain a previous run's bulk-imported rows, and
// those must NOT be treated as "existing" and kept alongside a freshly regenerated
// batch (that would duplicate every bulk row). Anything outside this allowlist is
// always fully regenerated from the source + the stable id/name map below.
const HAND_MAINTAINED_IDS = new Set(["u0", "u1", "u2", "u4", "u21", "u22", "u23", "u42", "u300", "u301", "u302", "u303", "u304"]);
const allExistingRows = parseCsv(readFileSync(USERS_FILE, "utf8"));
const existingRows = allExistingRows.filter((u) => HAND_MAINTAINED_IDS.has(u.id));
// disabled_detected_date must only ever be stamped once — preserve whatever's already on disk for
// a given id so the 30-working-day Admin window has a stable start, even across repeated re-syncs.
const existingDisabledDateById = new Map(allExistingRows.map((u) => [u.id, u.disabled_detected_date || ""]));

const usedEmails = new Set(existingRows.map((u) => (u.email || "").toLowerCase()));
function emailOf(anonName) {
  const parts = anonName.trim().toLowerCase().split(/\s+/);
  const first = parts[0];
  const last = parts[parts.length - 1];
  let n = 1;
  let email = `${first}.${last}@phillipsg.com`;
  while (usedEmails.has(email)) email = `${first}.${last}${++n}@phillipsg.com`;
  usedEmails.add(email);
  return email;
}

// Filter to permanent roles, excluding the 3 already-hand-maintained real matches. Still includes
// resigned people at this stage — the active-vs-disabled-vs-drop decision happens below, once
// duplicates are resolved and we know each person's one canonical row.
const kept = sourceRows.filter(
  (r) => isPermanentRole(r) && !EXEMPT_REAL_NAMES.has((r["Full Name"] || "").trim())
);

// Dedupe by exact Full Name, keeping the latest-joined row if duplicates slip through
const byRealName = new Map();
for (const r of kept) {
  const key = (r["Full Name"] || "").trim();
  const existing = byRealName.get(key);
  if (!existing || parseSourceDate(r["Date Joined"]) > parseSourceDate(existing["Date Joined"])) {
    byRealName.set(key, r);
  }
}
// Never create a brand-new account for someone who has already resigned — only keep a resigned
// row here if they already have an existing account (previouslyKnownNames), so they can transition
// to disabled below rather than being dropped or never imported in the first place.
const uniqueKept = [...byRealName.values()].filter(
  (r) => isActiveRow(r) || previouslyKnownNames.has((r["Full Name"] || "").trim())
);

// Build a supervisor lookup: normalized real name -> anonymized display name
const nameToAnon = new Map();
for (const r of uniqueKept) {
  const identity = resolveIdentity((r["Full Name"] || "").trim());
  nameToAnon.set((r["Full Name"] || "").trim().toUpperCase(), identity.anon_name);
}
nameToAnon.set("ELIZA LIM", "Eliza Lim");
nameToAnon.set("BRANDON LIM", "Brandon Lim");
nameToAnon.set("GOI TECK POH", "Goi Teck Poh Frankie");

function resolveSupervisor(raw) {
  const key = (raw || "").trim().toUpperCase();
  if (!key) return "";
  return nameToAnon.get(key) || titleCase(raw.trim());
}

const supervisorNamesUpper = new Set(
  sourceRows.map((r) => (r["Leave Supervisor"] || "").trim().toUpperCase()).filter(Boolean)
);
function roleTypeOf(row) {
  const hod = (row["HOD"] || "").trim().toLowerCase() === "yes";
  const supervisesSomeone = supervisorNamesUpper.has((row["Full Name"] || "").trim().toUpperCase());
  return hod || supervisesSomeone ? "manager" : "staff";
}

// ---------- Fix the 8 existing hand-authored rows ----------

const JOB_FAMILY_OVERRIDES = {
  u0: "Human Capital", u1: "Human Capital", u2: "Human Capital", u4: "Human Capital",
  u21: "Sales", u22: "Dealing", u23: "Dealing", u42: "Human Capital",
  u300: "Executive Office", u301: "Executive Office",
  u302: "Compliance", u303: "Compliance", u304: "Compliance",
};
// James Okafor's title/grade must always match a title that is *currently held by an
// active (non-resigned) HCWM employee* in the listing — a title that only exists among
// staff with a Last Day of Service (i.e. resigned) is exactly the kind of invalid data
// this script exists to prevent. Rather than hardcoding a grade by hand (which is what
// produced the original "L&D Specialist"/grade-4 bug, and then a follow-up bug where the
// replacement title, "Senior Executive, Human Capital", also turned out to belong only to
// a resigned real employee), both the designation and its grade are derived from — and
// validated against — an actual active HCWM row below, so this class of error can't
// silently recur on a future re-sync.
const JAMES_DESIGNATION = "Executive, Human Capital";
const jamesRealMatch = uniqueKept.find(
  (r) =>
    isActiveRow(r) &&
    (r["Department"] || "").trim() === "Human Capital & Workplace Management" &&
    (r["Designation"] || "").trim() === JAMES_DESIGNATION
);
if (!jamesRealMatch) {
  console.error(
    `James Okafor override designation "${JAMES_DESIGNATION}" no longer belongs to any ` +
    `active HCWM employee in this listing — choose a different real, currently-active ` +
    `title in JAMES_DESIGNATION before re-running.`
  );
  process.exit(1);
}
const JAMES_OVERRIDE = {
  designation: JAMES_DESIGNATION,
  grade: String(mapGrade(jamesRealMatch["Job Grade"])),
};

const fixedExisting = existingRows.map((u) => {
  const row = { ...u };
  if (row.id === "u42") Object.assign(row, JAMES_OVERRIDE);
  row.job_family = JOB_FAMILY_OVERRIDES[row.id] || row.job_family || "—";
  return row;
});

// ---------- Build bulk rows ----------

const bulkRows = uniqueKept.map((r) => {
  const identity = resolveIdentity((r["Full Name"] || "").trim());
  const joinIso = parseSourceDate(r["Date Joined"]);
  const ldos = parseSourceDate(r["Last Day of Service"]);
  const active = isActiveRow(r);
  return {
    id: identity.id,
    name: identity.anon_name,
    email: emailOf(identity.anon_name),
    department: (r["Department"] || "").trim(),
    designation: (r["Designation"] || "").trim(),
    grade: String(mapGrade(r["Job Grade"])),
    join_date: joinIso,
    tenure_years: String(tenureYearsFrom(joinIso)),
    hod: (r["HOD"] || "").trim().toLowerCase() === "yes" ? "true" : "false",
    points_ytd: "0",
    avatar: avatarOf(identity.anon_name),
    supervisor: resolveSupervisor(r["Leave Supervisor"]),
    role_type: roleTypeOf(r),
    job_family: mapJobFamily(r["Job family"]),
    status: active ? "active" : "disabled",
    last_day_of_service: ldos,
    disabled_detected_date: active ? "" : (existingDisabledDateById.get(identity.id) || TODAY_ISO),
  };
});

// ---------- Write output ----------

const USERS_HEADERS = [
  "id", "name", "email", "department", "designation", "grade",
  "join_date", "tenure_years", "hod", "points_ytd", "avatar", "supervisor", "role_type", "job_family",
  "status", "last_day_of_service", "disabled_detected_date",
];
writeFileSync(USERS_FILE, toCsv(USERS_HEADERS, [...fixedExisting, ...bulkRows]), "utf8");

const MAP_HEADERS = ["real_name", "id", "anon_name"];
writeFileSync(MAP_FILE, toCsv(MAP_HEADERS, [...mapByRealName.values()]), "utf8");

const byDept = {};
for (const r of bulkRows) byDept[r.department] = (byDept[r.department] || 0) + 1;
const newlyDisabled = bulkRows.filter((r) => r.status === "disabled");

console.log(`Source rows: ${sourceRows.length}`);
console.log(`Permanent-role rows kept (active + already-known-now-resigned, excluding the 3 hand-maintained matches): ${uniqueKept.length}`);
console.log(`Written to users.csv: ${fixedExisting.length} existing + ${bulkRows.length} imported = ${fixedExisting.length + bulkRows.length} total`);
console.log(`Disabled (existing account, newly resigned): ${newlyDisabled.length}`);
if (newlyDisabled.length > 0) {
  for (const r of newlyDisabled) console.log(`  ${r.name} (${r.id}) — LDOS ${r.last_day_of_service}, detected ${r.disabled_detected_date}`);
}
console.log("By department:");
for (const [dept, count] of Object.entries(byDept).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${dept}: ${count}`);
}
