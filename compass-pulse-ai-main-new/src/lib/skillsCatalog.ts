// IBF Skills Framework for Financial Services — curated for PhillipCapital
// Source: https://www.ibf.org.sg/home/for-financial-institutions/resource-tools/skills-framework-for-financial-services
//
// Covers PhillipCapital's full business scope:
//   Investment brokerage · Fintech arm · Digital media · Wealth management · Web3 / crypto
//
// To update: revise the skill arrays below when IBF publishes a new version of the framework.
// The app derives the catalog from this file — no CSV changes are needed.

export type SkillCategory =
  | "Management"
  | "Operations / Settlement"
  | "Human Capital"
  | "Dealing"
  | "Sales"
  | "Client Services"
  | "Risk / Business Process"
  | "IT"
  | "Finance / Accounting"
  | "Marketing"
  | "Fund Management & Research"
  | "Compliance"
  | "Audit"
  | "Fintech & Blockchain"
  | "Data & Analytics";

export const SKILLS_BY_CATEGORY: Record<SkillCategory, string[]> = {
  "Management": [
    "Strategic Planning",
    "Stakeholder Engagement",
    "P&L Management",
    "Corporate Governance",
    "Business Development Strategy",
    "Organisational Leadership",
    "Executive Communication",
    "Budget Management",
    "Board Reporting",
    "Change Leadership",
    "Business Continuity Management",
    "Crisis Management",
    "Resource Planning",
    "Project Portfolio Management",
  ],

  "Operations / Settlement": [
    "Trade Settlement",
    "Reconciliation Management",
    "Corporate Actions Processing",
    "Custodian Services",
    "Margin Management",
    "Collateral Management",
    "STP (Straight-Through Processing)",
    "Cash Management",
    "Error Resolution & Escalation",
    "Fund Administration",
    "Transfer Agency Operations",
    "Short Selling Operations",
    "Depository Agent Functions",
    "SWIFT Messaging",
  ],

  "Human Capital": [
    // Top 15: universally relevant across all HC roles (shown by default for any HC practitioner)
    "Talent Management",
    "HR Business Partnering",
    "Performance Management",
    "Employee Engagement",
    "Workforce Planning",
    "Organisational Development",
    "Change Management",
    "Coaching & Mentoring",
    "HR Analytics",
    "Training Needs Analysis",
    "Learning & Development",
    "Talent Acquisition",
    "Succession Planning",
    "Leadership Development",
    "Industrial Relations",
    // Below 15: specialised — accessible via search
    "Instructional Design",
    "IBF Accreditation Management",
    "Skills Gap Analysis",
    "Competency Framework Design",
    "Compensation & Benefits Design",
    "HRIS Management",
    "Job Evaluation & Grading",
    "Employer Branding",
    "Onboarding & Offboarding",
  ],

  "Dealing": [
    "Securities Order Execution",
    "Market Making",
    "Equities Dealing",
    "Derivatives Trading",
    "Options Strategies",
    "FX Trading",
    "Algorithmic Trading",
    "DMA (Direct Market Access)",
    "Pre/Post-Trade Compliance",
    "Trade Surveillance",
    "Market Microstructure Analysis",
    "Order Management Systems (OMS)",
    "Fixed Income Dealing",
    "Structured Products Trading",
  ],

  "Sales": [
    "Client Acquisition",
    "Relationship Management",
    "Investment Advisory",
    "Financial Advisory",
    "Product Pitching",
    "Sales Strategy & Pipeline Management",
    "CRM Management",
    "Cross-Selling & Up-Selling",
    "Institutional Sales",
    "Retail Client Servicing",
    "Needs Analysis",
    "Client Retention",
    "Suitability Assessment",
    "Product Knowledge (Capital Markets)",
  ],

  "Client Services": [
    "Client Onboarding",
    "KYC/CDD (Know-Your-Customer)",
    "Account Management",
    "Complaint & Dispute Resolution",
    "Service Recovery",
    "Client Experience Design",
    "Contact Centre Operations",
    "CRM Tools",
    "Escalation Management",
    "Client Communication",
    "Multi-Channel Servicing",
  ],

  "Risk / Business Process": [
    "Market Risk Management",
    "Credit Risk Management",
    "Operational Risk Management",
    "Liquidity Risk Management",
    "Counterparty Risk Assessment",
    "Business Continuity Planning",
    "Stress Testing & Scenario Analysis",
    "Risk Appetite Framework",
    "Internal Controls",
    "Business Process Improvement",
    "Process Mapping & Redesign",
    "Model Risk Management",
    "Third-Party Risk Management",
    "Risk Reporting",
  ],

  "IT": [
    "Software Development (Full-Stack)",
    "Cloud Computing (AWS / Azure / GCP)",
    "Cybersecurity & Information Security",
    "Data Engineering & Pipelines",
    "API Development & Integration",
    "System Architecture Design",
    "DevOps / CI-CD",
    "Database Management",
    "Network & Infrastructure Management",
    "IT Project Management",
    "Agile / Scrum Methodology",
    "Microservices Architecture",
    "Quality Assurance & Testing",
    "MAS Technology Risk Guidelines",
  ],

  "Finance / Accounting": [
    "Financial Analysis",
    "Management Accounting",
    "Financial Reporting (SFRS / IFRS)",
    "Treasury Management",
    "Tax Planning & Compliance",
    "Budgeting & Forecasting",
    "Transfer Pricing",
    "Fund Accounting & NAV Computation",
    "Financial Modelling",
    "Expense Management",
    "Accounts Payable & Receivable",
    "Internal Financial Controls",
    "Regulatory Financial Reporting",
  ],

  "Marketing": [
    "Digital Marketing Strategy",
    "Content Marketing & Copywriting",
    "Social Media Management",
    "Brand Management",
    "Marketing Analytics",
    "SEO / SEM",
    "Campaign Management",
    "Digital Media Production",
    "Video Production",
    "Investor Relations & PR",
    "Influencer & Partnership Marketing",
    "Email Marketing Automation",
    "Community Management",
  ],

  "Fund Management & Research": [
    "Portfolio Management",
    "Asset Allocation & Strategy",
    "Equities Research",
    "Fixed Income Research",
    "Quantitative Analysis",
    "Technical Analysis",
    "Fundamental Analysis",
    "ESG (Environmental, Social, Governance) Investing",
    "Derivatives Valuation",
    "Alternative Investments",
    "Macro-Economic Analysis",
    "Crypto & Digital Assets Research",
    "Sector Research & Analysis",
    "Bloomberg / Reuters Terminal",
    "Discretionary Portfolio Management",
    "Multi-Asset Fund Management",
  ],

  "Compliance": [
    "MAS Regulatory Compliance",
    "AML / CFT (Anti-Money Laundering)",
    "KYC / CDD Compliance",
    "PDPA Data Protection",
    "Securities and Futures Act (SFA)",
    "Financial Advisers Act (FAA)",
    "Sanctions Screening",
    "Regulatory Reporting",
    "Conduct Risk Management",
    "FATCA / CRS Reporting",
    "Trade Surveillance & Monitoring",
    "Capital Markets Regulations",
    "Digital Asset Regulations",
  ],

  "Audit": [
    "Internal Audit",
    "Risk-Based Auditing",
    "Audit Planning & Scoping",
    "IT Systems Audit",
    "Financial Audit",
    "Regulatory & Compliance Audit",
    "Audit Reporting",
    "Control Testing & Evaluation",
    "Fraud Investigation & Detection",
    "Data Analytics for Audit",
    "Root Cause Analysis",
  ],

  "Fintech & Blockchain": [
    "Blockchain Technology",
    "Cryptocurrency Trading & Analysis",
    "DeFi (Decentralised Finance)",
    "NFTs & Digital Asset Tokenisation",
    "Smart Contract Development",
    "Web3 Integration",
    "RegTech Solutions",
    "Robo-Advisory Platforms",
    "Open Banking / API Banking",
    "Digital Payments Solutions",
    "Embedded Finance",
    "Digital Assets Custody & Security",
    "Layer 2 Protocols",
    "Crypto Asset Valuation",
  ],

  "Data & Analytics": [
    "Data Analytics & Visualisation",
    "Machine Learning / AI",
    "Python / R Programming",
    "Business Intelligence (Power BI / Tableau)",
    "Predictive Modelling",
    "Natural Language Processing (NLP)",
    "Big Data Management",
    "Statistical Analysis",
    "Customer Analytics",
    "Fraud Analytics & Detection",
    "ETL Pipeline Development",
    "Real-Time Data Processing",
  ],
};

// Full deduplicated, sorted skill list — shown when the user types in the search bar.
export const ALL_SKILLS: string[] = [
  ...new Set(Object.values(SKILLS_BY_CATEGORY).flat()),
].sort((a, b) => a.localeCompare(b));

// ── Role → default skill categories ──────────────────────────────────────────
//
// Determines which categories are shown before the user types anything.
// The test runs against the user's designation (job title) and department.
// First match wins; falls back to Human Capital + Management for unmatched roles.
//
const ROLE_CATEGORY_MAP: Array<{
  test: (designation: string, dept: string) => boolean;
  categories: SkillCategory[];
}> = [
  // HC leadership: Management secondary gives strategic/governance skills alongside core HC
  {
    test: (d, dept) =>
      /head|hod|director|vp|vice.president|chief/i.test(d) &&
      /human.capital|people|hr|workplace/i.test(d + " " + dept),
    categories: ["Human Capital", "Management"],
  },
  // Generic senior leadership (non-HC): Management primary
  {
    test: d => /head|hod|director|vp|vice.president|chief/i.test(d),
    categories: ["Management", "Human Capital"],
  },
  // HR Business Partner
  {
    test: d => /hrbp|hr.business.partner|hr.bp|business.partner/i.test(d),
    categories: ["Human Capital"],
  },
  // L&D / Training
  {
    test: (d, dept) => /learning|l&d|trainer|training/i.test(d) || /learning/i.test(dept),
    categories: ["Human Capital"],
  },
  // Talent / People roles
  {
    test: d => /talent|people.ops|people.manager|hr.manager|hr.specialist|human.capital/i.test(d),
    categories: ["Human Capital"],
  },
  {
    test: d => /portfolio.manag|fund.manag|investment.manag/i.test(d),
    categories: ["Fund Management & Research", "Risk / Business Process", "Compliance"],
  },
  {
    test: d => /dealer|dealing|trader|trading/i.test(d),
    categories: ["Dealing", "Risk / Business Process", "Compliance"],
  },
  {
    test: d => /sales|relationship.manager|advisory|advisor/i.test(d),
    categories: ["Sales", "Client Services", "Fund Management & Research"],
  },
  {
    test: d => /compliance/i.test(d),
    categories: ["Compliance", "Risk / Business Process", "Audit"],
  },
  {
    test: d => /\baudit/i.test(d),
    categories: ["Audit", "Risk / Business Process", "Compliance"],
  },
  {
    test: d => /\brisk\b/i.test(d),
    categories: ["Risk / Business Process", "Compliance", "Finance / Accounting"],
  },
  {
    test: d => /developer|engineer|architect|software|infrastructure/i.test(d),
    categories: ["IT", "Fintech & Blockchain", "Data & Analytics"],
  },
  {
    test: d => /fintech|blockchain|crypto|web3|digital.asset/i.test(d),
    categories: ["Fintech & Blockchain", "IT", "Data & Analytics"],
  },
  {
    test: d => /data.analyst|data.scientist|analytics/i.test(d),
    categories: ["Data & Analytics", "IT", "Finance / Accounting"],
  },
  {
    test: d => /marketing|media|content|brand|communications/i.test(d),
    categories: ["Marketing", "Data & Analytics"],
  },
  {
    test: (d, dept) => /operations|ops|settlement/i.test(d) || /operations/i.test(dept),
    categories: ["Operations / Settlement", "Risk / Business Process", "Compliance"],
  },
  {
    test: d => /finance|accounting|treasury/i.test(d),
    categories: ["Finance / Accounting", "Risk / Business Process", "Data & Analytics"],
  },
  {
    test: d => /client.service|customer.service|servicing/i.test(d),
    categories: ["Client Services", "Sales", "Compliance"],
  },
  {
    test: d => /research|analyst|equit|fixed.income/i.test(d),
    categories: ["Fund Management & Research", "Data & Analytics", "Compliance"],
  },
];

// ── IBF skill type classification ─────────────────────────────────────────────

// Keywords that signal a Critical Core Skill (IBF CCS); everything else → TSC
export const CCS_KEYWORDS = [
  "stakeholder", "coach", "mentor", "engagement", "leadership", "change",
  "collaborat", "teamwork", "communicat", "customer", "service", "learning",
  "adaptab", "creativ", "problem", "innovat", "relationship", "influenc",
  "facilitat", "motivat", "empathy", "emotional",
];

export function classifySkill(skill: string): "Technical Skills & Competencies" | "Critical Core Skills" {
  const lower = skill.toLowerCase();
  return CCS_KEYWORDS.some(kw => lower.includes(kw)) ? "Critical Core Skills" : "Technical Skills & Competencies";
}

// ── Regulatory examinations per job function ──────────────────────────────────

const REGULATORY_EXAMS_BY_ROLE: Array<{
  test: (d: string, dept: string) => boolean;
  exams: string[];
}> = [
  {
    test: d => /dealer|dealing|trader|trading/i.test(d),
    exams: ["CMFAS M6 (Securities Products)", "CMFAS M6A (Collective Investment Schemes I)", "CMFAS M8 (Collective Investment Schemes II)"],
  },
  {
    test: d => /sales|relationship.manager|advisory|advisor/i.test(d),
    exams: ["CMFAS M5 (Rules & Regulations for Financial Advisory)", "CMFAS M6 (Securities Products)", "CMFAS M9 (Life Insurance & Investment-Linked Policies)"],
  },
  {
    test: d => /fund.manag|portfolio|asset.manag|investment.manag/i.test(d),
    exams: ["CMFAS M8 (Collective Investment Schemes II)", "CMFAS M8A (Structured Products)", "IBF Qualified (IBFQ) — Asset Management"],
  },
  {
    test: d => /compliance/i.test(d),
    exams: ["CMFAS M5 (Rules & Regulations for Financial Advisory)", "CMFAS M6 (Securities Products)", "IBF Anti-Financial Crime (AFC) Certificate"],
  },
  {
    test: d => /\brisk\b/i.test(d),
    exams: ["CMFAS M5 (Rules & Regulations for Financial Advisory)", "IBF Qualified (IBFQ) — Risk Management"],
  },
  {
    test: (d, dept) => /human.capital|people|hr|workplace|talent|learning/i.test(d + " " + dept),
    exams: ["IHRP-CA (Certified Associate, Institute of Human Resource Professionals)", "WSQ Advanced Certificate in Learning & Performance (ACLP)", "IBF Standards (IBF-STS) — Learning Professionals"],
  },
  {
    test: d => /developer|engineer|architect|software|it\b|tech/i.test(d),
    exams: ["MAS Technology Risk Management Certificate", "IBF Qualified (IBFQ) — FinTech & Innovation"],
  },
  {
    test: d => /finance|accounting|treasury/i.test(d),
    exams: ["CMFAS M5 (Rules & Regulations for Financial Advisory)", "ISCA — Singapore CA Qualification", "IBF Qualified (IBFQ) — Finance & Operations"],
  },
  {
    test: d => /marketing|brand|communications/i.test(d),
    exams: ["MAS Financial Promotions Guidelines Certification", "IBF Digital Finance Certificate"],
  },
  {
    test: (d, dept) => /operations|ops|settlement/i.test(d) || /operations/i.test(dept),
    exams: [
      "IBF Qualified (IBFQ) — Operations & Settlement",
      "CDP Depository Agent Examination",
    ],
  },
  {
    test: () => true,
    exams: ["CMFAS M5 (Rules & Regulations for Financial Advisory)", "IBF Qualified (IBFQ) — General Track"],
  },
];

export function getRegulatorExamsForRole(designation: string, dept: string): string[] {
  const entry = REGULATORY_EXAMS_BY_ROLE.find(r => r.test(designation, dept));
  return entry?.exams ?? [];
}

// ── IBF Skills Framework job-function URLs ────────────────────────────────────
// Verified: the IBF SFS interactive framework lives at the main page below.
// Track-specific sub-pages do not exist as stable URLs — all tracks link to the main page.
const IBF_SFS_URL = "https://www.ibf.org.sg/home/for-financial-institutions/resource-tools/skills-framework-for-financial-services";

const IBF_TRACK_MAP: Array<{
  test: (d: string, dept: string) => boolean;
  track: string;
}> = [
  { test: (d, dept) => /human.capital|people|hr|workplace|talent|learning/i.test(d + " " + dept), track: "Human Resource Management" },
  { test: d => /dealer|dealing|trader|trading/i.test(d), track: "Dealing & Trading" },
  { test: d => /sales|relationship.manager|advisory|advisor/i.test(d), track: "Advisory" },
  { test: d => /fund.manag|portfolio|asset.manag|investment.manag/i.test(d), track: "Asset Management" },
  { test: d => /compliance/i.test(d), track: "Compliance" },
  { test: d => /\brisk\b/i.test(d), track: "Risk Management" },
  { test: d => /developer|engineer|architect|software|infrastructure|fintech|blockchain|crypto/i.test(d), track: "Technology & Innovation" },
  { test: d => /finance|accounting|treasury/i.test(d), track: "Finance & Accounting" },
  { test: (d, dept) => /operations|ops|settlement/i.test(d) || /operations/i.test(dept), track: "Operations & Settlement" },
  { test: d => /\baudit/i.test(d), track: "Audit" },
  { test: d => /research|analyst/i.test(d), track: "Asset Management" },
  { test: d => /marketing|brand|communications/i.test(d), track: "General Management" },
];

export function getIBFJobFunctionUrl(designation: string, dept: string): { url: string; track: string } {
  const entry = IBF_TRACK_MAP.find(r => r.test(designation, dept));
  return { url: IBF_SFS_URL, track: entry?.track ?? "Financial Services" };
}

// ── IHRP Skills Badges — for Human Capital & Workplace Management staff ───────
// Source: https://ihrp.sg/skill-badges-overview/
// Based on IHRP Body of Competencies (BoC): https://ihrp.sg/body-of-competencies/

export function isHCWMDept(dept: string): boolean {
  return /human.capital|workplace.management|hcwm/i.test(dept);
}

// Functional Competency badges (BoC functional layer)
const IHRP_FUNCTIONAL_BADGES: string[] = [
  "Strategic Workforce Planning",
  "Talent Acquisition",
  "Performance & Talent Management",
  "Learning & Development Design",
  "Compensation & Benefits Management",
  "Employee Relations & Engagement",
  "People Analytics",
  "HR Technology & AI Fluency",
  "Labour Policies & Legislation",
  "Organisational Change Management",
  "Succession Planning",
  "Total Rewards Strategy",
  "HR Business Partnering",
  "Organisational Effectiveness",
  "Industrial Relations",
];

// HR Mindsets & Behaviours badges (BoC foundational/behavioural layer)
const IHRP_BEHAVIOURAL_BADGES: string[] = [
  "Coaching & Mentoring",
  "Stakeholder Engagement & Communication",
  "Change Leadership",
  "Ethical HR Practice & Inclusion",
  "Data-Driven Decision Making",
  "Insights-Driven HR Practices",
  "Workplace Wellbeing Facilitation",
  "Workplace Fairness & Inclusivity",
];

// Full browseable IHRP catalog (shown in search for HCWM staff)
export const IHRP_SKILLS_CATALOG: string[] = [
  ...IHRP_FUNCTIONAL_BADGES,
  ...IHRP_BEHAVIOURAL_BADGES,
  "Workplace Learning Champion (Role Badge)",
  "Behavioural Transformation Architect (Role Badge)",
  "People Manager (Role Badge)",
];

export const IHRP_CERTIFICATIONS: string[] = [
  "IHRP-CA (Certified Associate)",
  "IHRP-CP (Certified Professional)",
  "IHRP-SP (Senior Professional)",
  "WSQ Advanced Certificate in Learning & Performance (ACLP)",
];

const IHRP_ROLE_MAP: Array<{
  test: (d: string) => boolean;
  functional: string[];
  behavioural: string[];
}> = [
  {
    test: d => /director|head|vp|vice.president|chief/i.test(d),
    functional: ["Strategic Workforce Planning", "Organisational Change Management", "Succession Planning", "Total Rewards Strategy", "Organisational Effectiveness"],
    behavioural: ["Change Leadership", "Stakeholder Engagement & Communication", "Ethical HR Practice & Inclusion"],
  },
  {
    test: d => /learning|l&d|trainer|training|instructional/i.test(d),
    functional: ["Learning & Development Design", "Performance & Talent Management", "People Analytics"],
    behavioural: ["Coaching & Mentoring", "Workplace Wellbeing Facilitation"],
  },
  {
    test: d => /business.partner|hrbp|hr.bp/i.test(d),
    functional: ["HR Business Partnering", "Strategic Workforce Planning", "Employee Relations & Engagement"],
    behavioural: ["Stakeholder Engagement & Communication", "Data-Driven Decision Making"],
  },
  {
    test: d => /workplace|facility|facilities/i.test(d),
    functional: ["Organisational Effectiveness", "Labour Policies & Legislation", "HR Technology & AI Fluency"],
    behavioural: ["Stakeholder Engagement & Communication", "Insights-Driven HR Practices"],
  },
  {
    test: () => true,
    functional: ["Talent Acquisition", "Employee Relations & Engagement", "Labour Policies & Legislation"],
    behavioural: ["Coaching & Mentoring", "Ethical HR Practice & Inclusion"],
  },
];

export function getIHRPBadgesForRole(designation: string, grade: number): {
  functional: string[];
  behavioural: string[];
  certifications: string[];
} {
  const entry = IHRP_ROLE_MAP.find(r => r.test(designation));
  const functional = entry?.functional ?? IHRP_FUNCTIONAL_BADGES.slice(0, 3);
  const behavioural = entry?.behavioural ?? IHRP_BEHAVIOURAL_BADGES.slice(0, 2);
  const certifications: string[] = grade >= 5
    ? ["IHRP-SP (Senior Professional)"]
    : grade >= 4
    ? ["IHRP-CP (Certified Professional)", "IHRP-SP (Senior Professional)"]
    : grade >= 3
    ? ["IHRP-CP (Certified Professional)", "WSQ Advanced Certificate in Learning & Performance (ACLP)"]
    : ["IHRP-CA (Certified Associate)", "WSQ Advanced Certificate in Learning & Performance (ACLP)"];
  return { functional, behavioural, certifications };
}

export function classifyIHRPBadge(badge: string): "IHRP Functional Competency" | "IHRP Mindsets & Behaviours" {
  return IHRP_BEHAVIOURAL_BADGES.includes(badge) ? "IHRP Mindsets & Behaviours" : "IHRP Functional Competency";
}

// Returns the IBF skill categories that apply to a user's role — used to scope the searchable
// pool to the user's job family only (i.e. no cross-family skills shown when searching).
export function getSkillCategoriesForRole(designation: string, dept: string): SkillCategory[] {
  const entry = ROLE_CATEGORY_MAP.find(r => r.test(designation, dept));
  return entry?.categories ?? ["Human Capital", "Management"];
}

// Returns the default skill pool for a user's role and experience level (grade).
// Skills are returned in IBF priority order: primary category first, then secondary.
// Single-category roles receive up to 15 from their primary.
// Multi-category roles use [8, 4, 3] per-category limits (total ≤ 15).
// grade maps to IBF experience tracks: 5-6 = Senior/VP (strategic), 3-4 = Mid (specialist), 1-2 = Entry (operational).
// Typing in the search bar switches the pool to the user's job-family categories (not ALL_SKILLS).
export function getDefaultSkillsForRole(designation: string, dept: string, grade: number = 4): string[] {
  const entry = ROLE_CATEGORY_MAP.find(r => r.test(designation, dept));
  const categories: SkillCategory[] = entry?.categories ?? ["Human Capital", "Management"];
  const perCategoryLimit = categories.length === 1 ? [15] : [8, 4, 3];
  // Grade-based offset: senior staff get strategic (first) skills; junior get operational (later) skills.
  const gradeOffset = grade >= 5 ? 0 : grade >= 3 ? 4 : 8;
  const result: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < categories.length; i++) {
    const limit = perCategoryLimit[i] ?? 2;
    const pool = SKILLS_BY_CATEGORY[categories[i]] ?? [];
    // Start from offset; wrap around if offset exceeds pool length
    const safeOffset = gradeOffset < pool.length ? gradeOffset : 0;
    let count = 0;
    for (let j = 0; j < pool.length && count < limit; j++) {
      const s = pool[(safeOffset + j) % pool.length];
      if (!seen.has(s)) {
        result.push(s);
        seen.add(s);
        count++;
      }
    }
  }
  return result; // naturally ≤15, in role-priority order
}
