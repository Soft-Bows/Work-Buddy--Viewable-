// Server-side scraper for PhillipCapital careers page.
// Runs inside a TanStack Start server function — Node.js fetch bypasses CORS.
//
// Two modes:
//   Job Rotation (keyword=""):  sitemap → sample 25 jobs → score vs user profile
//     → filter ≥70% → top 6, with transferable skills highlighted per card.
//   Explore by Interest (keyword="dealing" etc.): category page → all listings,
//     no scoring, no filtering — just return what PhillipCapital lists.
//
// Scoring uses domain-keyword coverage (what % of the job's specific domain
// requirements the user's skills cover) to prevent generic words like
// "development" or "management" from creating false matches across functions.

const CAREERS_BASE = "https://www.phillip.com.sg";
const CAREERS_SITEMAP = `${CAREERS_BASE}/sg/career-sitemap.xml`;
const FETCH_TIMEOUT_MS = 8_000;

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PhillipJob {
  title: string;
  dept: string;
  url: string;
  experienceYears: number | null;
  matchScore: number;            // 0 when scoring is skipped (explore mode)
  transferableSkills: string[];  // user skills directly relevant to this role
}

// ── Category → page URL mapping ───────────────────────────────────────────────
// 12 actual PhillipCapital job categories from /sg/job-opportunities/.
// Keys are the lowercase display names sent from the UI.

const PC_CATEGORY_URL: Record<string, string> = {
  "client services":                          `${CAREERS_BASE}/sg/career-category/client-services/`,
  "compliance":                               `${CAREERS_BASE}/sg/career-category/compliance/`,
  "dealing":                                  `${CAREERS_BASE}/sg/career-category/dealing/`,
  "digital innovation":                       `${CAREERS_BASE}/sg/career-category/digital-innovation/`,
  "finance":                                  `${CAREERS_BASE}/sg/career-category/finance/`,
  "fund management & research":               `${CAREERS_BASE}/sg/career-category/fund-management-research/`,
  "information technology":                   `${CAREERS_BASE}/sg/career-category/information-technology/`,
  "marketing":                                `${CAREERS_BASE}/sg/career-category/marketing/`,
  "operations":                               `${CAREERS_BASE}/sg/career-category/operations/`,
  "others":                                   `${CAREERS_BASE}/sg/career-category/others/`,
  "risk / business process":                  `${CAREERS_BASE}/sg/career-category/risk-business-process/`,
  "wealth management & business development": `${CAREERS_BASE}/sg/career-category/wealth-management-business-development/`,
};

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function getHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

// ── URL extraction ────────────────────────────────────────────────────────────

function extractJobUrlsFromSitemap(xml: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  const pattern = /<loc>(https?:\/\/(?:www\.)?phillip\.com\.sg\/sg\/careers\/[^<\/]+\/)<\/loc>/gi;
  let m;
  while ((m = pattern.exec(xml)) !== null) {
    const url = m[1];
    if (!seen.has(url)) { seen.add(url); results.push(url); }
  }
  return results;
}

function extractJobUrlsFromPage(html: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  const pattern = /href=["'](https?:\/\/(?:www\.)?phillip\.com\.sg\/sg\/careers\/[^<\/]+\/)/gi;
  let m;
  while ((m = pattern.exec(html)) !== null) {
    const url = m[1];
    if (!seen.has(url)) { seen.add(url); results.push(url); }
  }
  return results;
}

// ── Text helpers ──────────────────────────────────────────────────────────────

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractTitle(html: string, url: string): string {
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (h1) {
    const t = stripTags(h1[1]).trim();
    if (t.length > 2 && t.length < 200) return t;
  }
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (titleTag) {
    const t = stripTags(titleTag[1]).split(/[|–\-—]/)[0].trim();
    if (t.length > 2 && t.length < 200) return t;
  }
  const slug = url.replace(/\/$/, "").split("/").pop() ?? "";
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function extractDept(text: string): string {
  const patterns = [
    /(?:Department|Team|Division|Function|Business Unit)[:\s]+([^\n.,<]{3,60})/i,
    /(?:Reporting to|Report to)[:\s]+[^\n]+?(?:in the|,\s*)([A-Z][a-zA-Z &]+)/,
  ];
  for (const p of patterns) {
    const m = p.exec(text);
    if (m) return m[1].trim();
  }
  return "PhillipCapital";
}

function extractExperienceYears(text: string): number | null {
  const patterns = [
    /(?:at\s+least|minimum\s+(?:of\s+)?)\s*(\d+)\s*(?:\+)?\s*years?/i,
    /(\d+)\s*(?:\+)?\s*years?\s*(?:of\s+)?(?:relevant|related|working|industry)?\s*experience/i,
    /(\d+)\s*(?:to|-)\s*\d+\s*years?\s*(?:of\s+)?(?:relevant\s+)?experience/i,
    /experience[:\s]*(\d+)\s*(?:\+)?\s*years?/i,
  ];
  for (const p of patterns) {
    const m = p.exec(text);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

// Extracts the requirements / qualifications section from a job's body text.
// This is the section that lists what the candidate must have — much more
// precise than the full page text for skill matching purposes.
function extractRequirementsText(text: string): string {
  const lower = text.toLowerCase();
  const headers = [
    "requirements:", "requirements :", "job requirements",
    "qualifications:", "what you need", "what you'll need",
    "you should have", "skills required", "we are looking for",
    "minimum qualifications", "you will need",
  ];
  let start = -1;
  for (const h of headers) {
    const i = lower.indexOf(h);
    if (i >= 0 && (start < 0 || i < start)) start = i;
  }
  return start >= 0 ? text.slice(start, start + 1500) : text.slice(0, 1200);
}

// Normalizes text for comparison: lowercase, replace & / with space, collapse spaces.
// Applied to both the job requirements text and user skills so that e.g.
// "Learning & Development" == "learning and development" == "learning development".
function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*[&\/]\s*/g, " ")
    .replace(/[,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Seniority / grade matching ────────────────────────────────────────────────

function titleGradeRange(title: string): { min: number; max: number } {
  const t = title.toLowerCase();
  if (/\b(chairman|managing[\s-]?director)\b/.test(t)) return { min: 7, max: 9 };
  if (/\b(executive[\s-]?director|senior[\s-]?vice[\s-]?president|svp\b)\b/.test(t)) return { min: 6, max: 8 };
  if (/\bdirector\b/.test(t) && !/\b(assistant[\s-]?director|executive[\s-]?director|deputy[\s-]?director)\b/.test(t))
    return { min: 6, max: 7 };
  if (/\b(assistant[\s-]?director|senior[\s-]?manager|avp\b|assistant[\s-]?vice[\s-]?president)\b/.test(t))
    return { min: 5, max: 6 };
  if (/\b(head\b|deputy[\s-]?head|department[\s-]?head|head[\s-]?of)\b/.test(t)) return { min: 4, max: 6 };
  if (/\bmanager\b/.test(t) && !/\b(assistant[\s-]?manager|senior[\s-]?manager|deputy)\b/.test(t))
    return { min: 4, max: 5 };
  if (/\b(assistant[\s-]?manager|senior[\s-]?executive)\b/.test(t)) return { min: 3, max: 4 };
  if (/\b(specialist|analyst|coordinator|consultant|associate)\b/.test(t)) return { min: 3, max: 4 };
  if (/\bsenior\b/.test(t)) return { min: 3, max: 5 };
  if (/\bexecutive\b/.test(t)) return { min: 1, max: 3 };
  if (/\b(officer|dealer)\b/.test(t)) return { min: 1, max: 3 };
  if (/\b(junior|intern|trainee|graduate|attachment|entry[\s-]?level)\b/.test(t)) return { min: 1, max: 2 };
  return { min: 1, max: 6 };
}

function expGradeRange(years: number): { min: number; max: number } {
  if (years >= 10) return { min: 5, max: 7 };
  if (years >= 7)  return { min: 4, max: 6 };
  if (years >= 4)  return { min: 3, max: 5 };
  if (years >= 2)  return { min: 2, max: 4 };
  return              { min: 1, max: 3 };
}

function resolvedGradeRange(title: string, expYears: number | null): { min: number; max: number } {
  const tr = titleGradeRange(title);
  if (expYears === null) return tr;
  const er = expGradeRange(expYears);
  const intMin = Math.max(tr.min, er.min);
  const intMax = Math.min(tr.max, er.max);
  if (intMin > intMax) return tr;
  return { min: intMin, max: intMax };
}

// ── Domain keyword vocabulary ─────────────────────────────────────────────────
// Each entry is a normalized phrase (lowercase, & → space) that is
// specific enough to a functional domain that it will NOT appear in
// unrelated job requirements.
//
// Deliberately excluded: generic words like "management", "leadership",
// "communication", "teamwork" — they appear in every JD and provide no
// discriminating signal.

const DOMAIN_KEYWORDS: string[] = [
  // L&D / HR Training
  "learning and development", "instructional design", "curriculum design",
  "facilitation", "e-learning", "learning management", "training design",
  "training delivery", "training needs analysis", "learning needs analysis",
  "talent development", "blended learning", "coaching", "mentoring",

  // HR Operations
  "hris", "payroll", "recruitment", "talent acquisition", "ihrp",
  "employment act", "industrial relations", "organizational development",
  "employee engagement", "hr analytics", "performance management",
  "compensation and benefits", "workforce planning", "succession planning",

  // Dealing / Capital Markets
  "cmfas", "cacs", "capital markets", "securities",
  "equities", "fixed income", "derivatives", "futures",
  "portfolio management", "asset management", "fund management", "unit trust",
  "financial advisory", "wealth management", "financial planning",
  "investment products", "bloomberg", "cfp", "cfa", "chfc",

  // Compliance / Risk
  "compliance", "regulatory", "aml", "kyc", "anti-money laundering",
  "risk management", "operational risk", "credit risk", "frm",

  // Operations / Finance
  "trade settlement", "clearing", "reconciliation", "back office",
  "financial reporting", "accounting", "acca", "cpa",
  "treasury", "internal audit", "cia", "cisa",

  // IT / Digital
  "software development", "programming", "python", "sql",
  "data analytics", "machine learning", "artificial intelligence",
  "cloud computing", "aws", "azure", "cybersecurity", "automation",

  // Client / Business Development
  "business development", "relationship management", "client acquisition",
  "stakeholder management", "customer experience",

  // Project / Strategy
  "project management", "pmp", "agile", "scrum",
  "change management", "digital transformation",

  // Marketing
  "digital marketing", "content marketing", "brand management",
  "social media", "campaign management",
];

// ── Profile match scoring ─────────────────────────────────────────────────────
//
// Two-signal approach that prevents cross-functional false positives:
//
// Signal 1 — domain keyword coverage (primary, 60 pts max):
//   What % of the job's detected domain requirements does the user's profile
//   cover?  Uses the DOMAIN_KEYWORDS list, matched against the requirements
//   section only (not the full page).  A dealer job needing "cmfas" and
//   "equities" gives an L&D candidate 0/2 = 0 pts, not a false positive.
//
// Signal 2 — skill phrase match (secondary, 10 pts max):
//   Does any of the user's skill names appear verbatim in the requirements
//   text?  Normalized (& → space) so "Learning & Development" matches
//   "learning and development" in job text.  Adds specificity on top of the
//   domain coverage score.
//
// Seniority — 30 pts max:
//   Grade overlap between user grade and the role's expected grade band.
//   In-range = 30, 1-grade off = 15, 2+ off = 0.

function computeMatchScore(
  jobTitle: string,
  expYears: number | null,
  bodyText: string,
  userGrade: number,
  userSkills: string[],
  userDesignation: string,
): { score: number; transferableSkills: string[] } {
  const reqText = extractRequirementsText(bodyText);
  const reqNorm = normalizeText(reqText);

  // Part A — seniority (30 pts)
  const { min, max } = resolvedGradeRange(jobTitle, expYears);
  let senPts: number;
  if (userGrade >= min && userGrade <= max) {
    senPts = 30;
  } else {
    const dist = userGrade < min ? min - userGrade : userGrade - max;
    senPts = dist === 1 ? 15 : 0;
  }

  // Build the user's normalized profile text (skills + designation)
  const userNorm = normalizeText([...userSkills, userDesignation].join(" "));

  // Part B1 — domain keyword coverage of job requirements (60 pts)
  const jobDomainKws = DOMAIN_KEYWORDS.filter(kw => reqNorm.includes(kw));
  const coveredKws = jobDomainKws.filter(kw => userNorm.includes(kw));
  const domainPts = jobDomainKws.length >= 2
    ? Math.round((coveredKws.length / jobDomainKws.length) * 60)
    : jobDomainKws.length === 1
      ? coveredKws.length > 0 ? 30 : 0
      : 0; // no domain keywords → cannot score via this signal

  // Part B2 — skill phrase verbatim match in requirements (10 pts)
  const phraseMatchSkills = userSkills.filter(skill => {
    const n = normalizeText(skill);
    return n.length >= 5 && reqNorm.includes(n);
  });
  const phrasePts = Math.min(10, phraseMatchSkills.length * 4);

  // Fallback: when no domain keywords detected in requirements, use phrase
  // matches as the sole skill signal (prevents rejecting all jobs from niche roles).
  const skillPts = jobDomainKws.length === 0
    ? Math.min(70, phraseMatchSkills.length * 14)
    : Math.min(70, domainPts + phrasePts);

  // Transferable skills = user skills that directly align with this job's needs
  // Priority 1: skills covering a job domain keyword
  const domainAligned = userSkills.filter(skill => {
    const n = normalizeText(skill);
    return coveredKws.some(kw => n.includes(kw) || kw.includes(n));
  });
  // Priority 2: skills matched as a phrase in requirements (not already in domainAligned)
  const domainAlignedSet = new Set(domainAligned);
  const phraseOnly = phraseMatchSkills.filter(s => !domainAlignedSet.has(s));
  const transferableSkills = [...domainAligned, ...phraseOnly].slice(0, 5);

  return { score: senPts + skillPts, transferableSkills };
}

// ── Main export ───────────────────────────────────────────────────────────────
// No server-side cache — per-user independent fetches.
// scoreEnabled=false skips matching entirely and returns raw listings
// (used by "Explore by Area of Interest").

export async function scrapePhillipJobs(
  keyword: string,
  userGrade: number,
  userSkills: string[],
  userDesignation = "",
  scoreEnabled = true,
): Promise<{ jobs: PhillipJob[]; error?: string }> {
  const kw = keyword.trim().toLowerCase();
  const categoryUrl = PC_CATEGORY_URL[kw];
  const isRotation = kw === ""; // empty keyword = cross-functional rotation via sitemap

  // ── 1. Fetch source of job URLs ───────────────────────────────────────────

  let allJobUrls: string[];

  if (categoryUrl) {
    const catHtml = await getHtml(categoryUrl);
    if (!catHtml) return { jobs: [], error: "Could not reach PhillipCapital careers page." };
    allJobUrls = extractJobUrlsFromPage(catHtml);
  } else {
    const sitemapXml = await getHtml(CAREERS_SITEMAP);
    if (!sitemapXml) return { jobs: [], error: "Could not reach PhillipCapital careers page." };
    allJobUrls = extractJobUrlsFromSitemap(sitemapXml);
  }

  if (allJobUrls.length === 0) {
    return { jobs: [], error: "No job listings were detected on the PhillipCapital careers page." };
  }

  // For rotation, sample 25 from the full sitemap for performance.
  // For category pages this is irrelevant (already filtered by category).
  const toFetch = isRotation ? allJobUrls.slice(0, 25) : allJobUrls;

  // ── 2. Fetch each job page in parallel ───────────────────────────────────

  type RawJob = {
    title: string; dept: string; url: string;
    experienceYears: number | null; bodyText: string;
  };
  const fetchedJobs: RawJob[] = [];

  await Promise.all(
    toFetch.map(async url => {
      const html = await getHtml(url);
      if (!html) return;
      const text = stripTags(html);
      fetchedJobs.push({
        title: extractTitle(html, url),
        dept: extractDept(text),
        url,
        experienceYears: extractExperienceYears(text),
        bodyText: text,
      });
    })
  );

  // ── 3a. Explore mode: return all jobs, no scoring ─────────────────────────

  if (!scoreEnabled) {
    return {
      jobs: fetchedJobs.map(j => ({
        title: j.title,
        dept: j.dept,
        url: j.url,
        experienceYears: j.experienceYears,
        matchScore: 0,
        transferableSkills: [],
      })),
    };
  }

  // ── 3b. Rotation mode: score, filter ≥70%, top 6 ─────────────────────────

  const MATCH_THRESHOLD = 70;
  const scored: PhillipJob[] = [];

  for (const j of fetchedJobs) {
    const { score, transferableSkills } = computeMatchScore(
      j.title, j.experienceYears, j.bodyText, userGrade, userSkills, userDesignation
    );
    if (score < MATCH_THRESHOLD) continue;
    scored.push({
      title: j.title,
      dept: j.dept,
      url: j.url,
      experienceYears: j.experienceYears,
      matchScore: score,
      transferableSkills,
    });
  }

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return { jobs: scored.slice(0, 6) };
}
