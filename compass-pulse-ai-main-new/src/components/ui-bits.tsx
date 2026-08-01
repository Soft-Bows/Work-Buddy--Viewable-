import { useState, type CSSProperties } from "react";
import { CalendarDays, Upload, X, AlertCircle, FileCheck2, Info, UserCircle2, GraduationCap, Gauge, TrendingUp, type LucideIcon } from "lucide-react";
import { cn, formatMonthlyConfidenceDueDate, formatGoalStatusDueDate } from "@/lib/utils";
import { extractDocumentText, matchesClaim } from "@/lib/certificateMatch";
import type { RAG, SkillAttachment } from "@/lib/mockData";

export function RagDot({ rag, pulse }: { rag: RAG; pulse?: boolean }) {
  const map = { red: "bg-rag-red", amber: "bg-rag-amber", green: "bg-rag-green" };
  return <span className={cn("inline-block size-2.5 rounded-full", map[rag], pulse && rag === "red" && "pulse-red")} />;
}

// The one consistent "something here needs your response" icon, reused everywhere in the dashboard
// that surfaces a pending action (currently: an open challenge remark on a Key Result/Objective).
// A soft amber sparkle-badge with a gentle pulse — deliberately its own recognisable identity rather
// than reusing the generic AlertCircle/AlertTriangle glyphs already used elsewhere for unrelated
// warnings, so this specific "you owe someone a response" signal is unmistakable at a glance.
export function ActionNeededIcon({ className, title, size = 18 }: { className?: string; title?: string; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      className={cn("pulse-action rounded-full shrink-0", className)}
      role="img"
      aria-label={title ?? "Needs a response"}
    >
      <title>{title ?? "Needs a response"}</title>
      <circle cx="12" cy="12" r="10" fill="#F59E0B" />
      <circle cx="9.5" cy="9" r="5" fill="white" opacity="0.22" />
      <rect x="10.6" y="6.3" width="2.8" height="7.6" rx="1.4" fill="white" />
      <circle cx="12" cy="16.8" r="1.5" fill="white" />
      <path d="M18.5 3.8 L19.3 5.7 L21.2 6.5 L19.3 7.3 L18.5 9.2 L17.7 7.3 L15.8 6.5 L17.7 5.7 Z" fill="#FCD34D" />
    </svg>
  );
}

// `value` (optional) is a derived 0.0–1.0 number — e.g. an Objective's averaged confidence or
// quarterly score — rendered in a much smaller, lower-emphasis font right after the RED/AMBER/GREEN
// label, inside the same bubble, so the band is still the primary read and the number is a quiet
// footnote showing how that band was arrived at (always shown to 1 decimal place).
export function RagPill({ rag, label, value }: { rag: RAG; label?: string; value?: number }) {
  const map = {
    red: "bg-rag-red/10 text-rag-red border-rag-red/30",
    amber: "bg-rag-amber/15 text-amber-foreground border-rag-amber/40",
    green: "bg-rag-green/10 text-rag-green border-rag-green/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border", map[rag])}>
      <RagDot rag={rag} pulse />
      {label ?? rag.toUpperCase()}
      {value !== undefined && <span className="text-[9px] font-normal opacity-70">{value.toFixed(1)}</span>}
    </span>
  );
}

// Solid-filled sublabel chip for a field like "Owner"/"Skills Needed"/"Monthly Confidence"/
// "Quarterly Score" — replaces plain small uppercase text, which read as quiet decoration rather
// than as "this is an action item you should notice." A filled pill + icon makes it unmistakable
// at a glance without adding a full extra line.
const FIELD_BADGE_ICON = { owner: UserCircle2, skills: GraduationCap, confidence: Gauge, score: TrendingUp } as const;
const FIELD_BADGE_TONE = {
  owner: "bg-sky-600 dark:bg-sky-500 text-white",
  skills: "bg-teal-600 dark:bg-teal-500 text-white",
  confidence: "bg-indigo-600 dark:bg-indigo-500 text-white",
  score: "bg-indigo-600 dark:bg-indigo-500 text-white",
} as const;
export function FieldBadge({ kind, children, className }: { kind: keyof typeof FIELD_BADGE_ICON; children: React.ReactNode; className?: string }) {
  const Icon: LucideIcon = FIELD_BADGE_ICON[kind];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm shrink-0", FIELD_BADGE_TONE[kind], className)}>
      <Icon className="size-3" />
      {children}
    </span>
  );
}

// Soft, irregular colour-wash layer behind a row/card — purely decorative (no illustrations), just
// a few blurred, translucent blobs that give the thing behind it its own "watercolour" identity
// without adding visual noise on top of the content itself. Shared across Home's Department/Team
// OKRs rows and Team OKRs' "no goals set" cards.
export function WatercolorWash({ blobs }: { blobs: { color: string; style: CSSProperties }[] }) {
  return (
    <div className="absolute -inset-3 -z-10 overflow-hidden rounded-[2rem] pointer-events-none" aria-hidden="true">
      {blobs.map((b, i) => (
        <div key={i} className="absolute rounded-full blur-2xl opacity-[0.16] dark:opacity-[0.12]" style={{ background: b.color, ...b.style }} />
      ))}
    </div>
  );
}

// Decorative mascot illustration (see public/mascot/) — purely visual, never interactive, so it's
// excluded from tab order / hit-testing and hidden from screen readers by default.
export function MascotFlourish({ src, alt, className, style }: { src: string; alt?: string; className?: string; style?: CSSProperties }) {
  return (
    <img
      src={src}
      alt={alt ?? ""}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      style={style}
      className={cn("pointer-events-none select-none drop-shadow-sm", className)}
    />
  );
}

export function Card({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <div className={cn("bg-card border border-border rounded-xl p-5 shadow-sm", className)} onClick={onClick}>{children}</div>;
}

export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-2xl">{children}</h2>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ── HOD-only "skills needed" tag picker — shared by Home's (legacy, read-only) department goal
// preview and Team OKRs' Objective/Key Result cards, so a skill tagged anywhere feeds the same
// Organisational Competency Gaps computation and skill-gap dev-goal recommendation flow. Capped at
// 5 required skills per goal/KR.
const MAX_SKILLS_PER_GOAL = 5;

export function SkillsNeededPicker({ value, onChange, catalog }: { value: string[]; onChange: (skills: string[]) => void; catalog: string[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const atMax = value.length >= MAX_SKILLS_PER_GOAL;

  // The dropdown itself stays short (top matches only), but the search runs across the entire
  // catalog — not just a role-scoped subset — so any skill in the catalog can be found by typing.
  const available = catalog.filter(s =>
    !value.includes(s) && (!query.trim() || s.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 6);

  const addSkill = (skill: string) => {
    if (atMax) return;
    onChange([...value, skill]);
    setQuery("");
    setOpen(false);
  };

  const removeSkill = (skill: string) => {
    onChange(value.filter(s => s !== skill));
  };

  return (
    <div className="flex-1 min-w-0">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {value.map(skill => (
            <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-teal/10 text-teal border border-teal/20">
              {skill}
              <button type="button" onMouseDown={() => removeSkill(skill)} className="hover:text-red-500 transition-colors">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {atMax ? (
        <p className="text-[11px] text-muted-foreground/70 italic">Maximum {MAX_SKILLS_PER_GOAL} skills reached — remove one to add another.</p>
      ) : (
        <div className="relative">
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={value.length === 0 ? "Type a skill to add…" : `Add another skill… (${value.length}/${MAX_SKILLS_PER_GOAL})`}
            className="w-full text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {open && available.length > 0 && (
            <div className="absolute z-20 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
              {available.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onMouseDown={() => addSkill(skill)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  {skill}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Multi-owner picker for Objectives/Key Results ──────────────────────────────────────────────
// Selected owners render as removable pills; the search box defaults to the given department but
// expands org-wide (any colleague in staffList, any department) the moment the user types —
// mirroring TeamSection.tsx's single-select OwnerSelect's search behaviour, just multi-select. Value
// in/out is the same comma-joined-names convention used throughout for DeptGoal.owner/KeyResult.owner
// (see ownerNames/isAmongOwners in utils.ts) — an Objective or Key Result can have more than one
// owner, including people from other departments.
export function MultiOwnerSelect({
  value, onChange, dept, staffList, teamLeadsOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  dept?: string;
  staffList: { name: string; dept: string; role: string; hod?: boolean; supervisor?: string }[];
  // Restricts the *default, dept-scoped* pool to leave supervisors/team leads (for a team-level
  // Objective's owner) — dropped once searching, same as OwnerSelect, since appointing any colleague
  // org-wide once the HOD explicitly searches for them is the explicit ask.
  teamLeadsOnly?: boolean;
}) {
  const selected = value ? value.split(",").map(s => s.trim()).filter(Boolean) : [];
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const isSearching = query.trim().length > 0;
  const deptScoped = dept ? staffList.filter(s => s.dept === dept) : staffList;
  const base = teamLeadsOnly ? deptScoped.filter(s => !s.hod && staffList.some(o => o.supervisor === s.name)) : deptScoped;
  const pool = isSearching ? staffList : base;
  const matches = pool
    .filter(s => !selected.includes(s.name) && (!isSearching || s.name.toLowerCase().includes(query.trim().toLowerCase())))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);

  const addOwner = (name: string) => {
    onChange([...selected, name].join(", "));
    setQuery("");
  };
  const removeOwner = (name: string) => onChange(selected.filter(n => n !== name).join(", "));

  return (
    <div className="flex-1 min-w-0">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {selected.map(name => (
            <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
              {name}
              <button type="button" onMouseDown={() => removeOwner(name)} className="hover:text-red-500 transition-colors">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={selected.length === 0 ? "Search any colleague to add as owner…" : "Add another owner…"}
          className="w-full text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {open && matches.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full max-h-56 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg">
            {matches.map(s => (
              <button key={s.name} type="button" onMouseDown={() => addOwner(s.name)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors">
                {s.name}
                {isSearching && <span className="text-xs text-muted-foreground ml-1.5">— {s.role} ({s.dept})</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── RAG confidence guide — shared across My Goals and Team OKRs, per the OKR framework's standard
// confidence-level convention (a leading indicator of how likely the objective/key result is to be
// fully achieved, distinct from a percentage-complete progress bar). ──────────────────────────────

export function RAGInfoPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 relative animate-in slide-in-from-top-2 duration-200">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 size-7 rounded-full hover:bg-muted grid place-items-center transition-colors"
      >
        <X className="size-3.5" />
      </button>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Info className="size-4 text-primary shrink-0" />
        <div className="font-semibold text-sm">Monthly Confidence &amp; Quarterly Scoring Guide</div>
        <div className="text-xs text-muted-foreground">How likely is this — and, separately, how did it actually turn out?</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-rag-red/10 border border-rag-red/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-3 rounded-full bg-rag-red shrink-0" />
            <div className="text-xs font-semibold text-rag-red">RED — Low Confidence (&lt;0.4)</div>
          </div>
          <div className="text-xs text-foreground/70 leading-relaxed">
            Off track. Significant blockers make full achievement unlikely without intervention. Immediate action or escalation required.
          </div>
          <div className="mt-2.5 text-[10px] font-medium text-rag-red">⚠ Mandatory feedback required</div>
        </div>
        <div className="rounded-lg bg-rag-amber/10 border border-rag-amber/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-3 rounded-full bg-rag-amber shrink-0" />
            <div className="text-xs font-semibold text-amber-foreground">AMBER — Moderate Confidence (0.4–0.6)</div>
          </div>
          <div className="text-xs text-foreground/70 leading-relaxed">
            At risk. Achievable with proactive attention — some risk of slipping below target if not addressed soon.
          </div>
          <div className="mt-2.5 text-[10px] font-medium text-amber-foreground">⚠ Mandatory feedback required</div>
        </div>
        <div className="rounded-lg bg-rag-green/10 border border-rag-green/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-3 rounded-full bg-rag-green shrink-0" />
            <div className="text-xs font-semibold text-rag-green">GREEN — High Confidence (0.7–1.0)</div>
          </div>
          <div className="text-xs text-foreground/70 leading-relaxed">
            On track. Progressing as planned with a high likelihood of full achievement. No major concerns to flag.
          </div>
          <div className="mt-2.5 text-[10px] font-medium text-rag-green">✓ Optional feedback</div>
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-muted/30 border border-border/60 p-3 text-[11px] text-foreground/75 leading-relaxed">
        <strong>Confidence vs. score — two different, complementary check-ins, not a repeat of the
        same question.</strong> This 0.0–1.0 scale is used twice: by <strong>{formatMonthlyConfidenceDueDate()}</strong>,
        you set a <strong>confidence level</strong> — a forward-looking "will we hit this?"
        pulse-check, updated every month. By <strong>{formatGoalStatusDueDate()}</strong>, you set a{" "}
        <strong>score</strong> — a one-time, retrospective grade of what was actually achieved. A KR
        can sit at Green confidence all quarter and still score 0.65 if the bar was genuinely
        ambitious — that's not a contradiction, it's the two questions doing their separate jobs.
        Reviewing them side by side each quarter is what surfaces whether a team is consistently
        over-promising (confidence stayed Green, score kept landing low) or sandbagging (confidence
        was cautious, score came in high).
      </div>
      <div className="mt-2.5 rounded-lg bg-primary/5 border border-primary/20 p-3 text-[11px] text-foreground/75 leading-relaxed">
        <strong>Reading the score itself — Google's 0.7 rule.</strong> The scoring scale here follows
        the convention Google popularised (and most fintechs running OKRs in 2026 — Atlassian, Revolut,
        Stripe among them — still use): <strong>0.7 is the target, not 1.0.</strong> A stretch/aspirational
        Key Result scoring 0.6–0.7 is a genuine win; consistently landing at 1.0 is usually read as a
        signal the bar was set too low, not that the team is over-performing. The exception is a{" "}
        <strong>committed</strong> KR — an operational must-hit with no stretch built in (e.g. "pass the
        annual compliance audit") — where 1.0 is the correct, expected outcome. How to use it in
        practice: when you set a Key Result, decide (informally, with your HOD) whether it's committed
        or aspirational, and score against that bar rather than treating every KR as if it should
        max out.
      </div>
    </div>
  );
}

// ── Month picker — shared "due date" input used for development goals across My Goals & Team pages ──

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDueDate(dueDate: string): string {
  if (!dueDate) return "No due date";
  const [y, m] = dueDate.split("-");
  return `${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

// ── Supporting-certificate upload — required before any skill can be submitted for verified-skill
// approval. No backend file storage exists in this app; "upload" reads the browser File object's
// metadata and creates a local object URL so the reviewing manager can actually open what was
// "uploaded" in a new tab, without persisting bytes anywhere durable — same simulation approach as
// every other live-data feature in this app.

const ALLOWED_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE_KB = 5 * 1024;

export function SkillAttachmentModal({
  skillName,
  onSubmit,
  onClose,
  submitLabel = "Submit for Approval",
}: {
  skillName: string;
  onSubmit: (attachment: SkillAttachment) => void;
  onClose: () => void;
  submitLabel?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    const ext = `.${f.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
      setError("Unsupported file type — please upload a PDF, JPG, or PNG.");
      setFile(null);
      return;
    }
    if (f.size / 1024 > MAX_FILE_SIZE_KB) {
      setError("File is too large — maximum size is 5MB.");
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleConfirm = async () => {
    if (!file) return;
    setError(null);
    setScanning(true);
    try {
      const text = await extractDocumentText(file);
      if (!matchesClaim(text, file.name, skillName)) {
        setError(`This file doesn't look like it's for "${skillName}" — could you double-check you've attached the right result slip or certificate?`);
        return;
      }
      onSubmit({
        fileName: file.name,
        fileSizeKB: Math.round(file.size / 1024),
        fileType: file.type,
        objectUrl: URL.createObjectURL(file),
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-background rounded-2xl shadow-2xl border border-border w-full max-w-md mx-4 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-lg leading-snug">Upload Supporting Certificate</div>
            <div className="text-sm text-muted-foreground mt-0.5 truncate">{skillName}</div>
          </div>
          <button onClick={onClose} className="size-7 rounded-full hover:bg-muted grid place-items-center shrink-0">
            <X className="size-3.5" />
          </button>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-foreground/80 leading-relaxed">
          Accepted formats: PDF, JPG, PNG · Max size: 5MB · Please upload a certificate or result slip so your manager can verify this has been completed.
        </div>

        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted/20 transition-colors py-8 cursor-pointer">
          <input
            type="file"
            accept={ALLOWED_FILE_EXTENSIONS.join(",")}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {file ? (
            <>
              <FileCheck2 className="size-6 text-rag-green" />
              <div className="text-sm font-medium text-center px-4 truncate max-w-full">{file.name}</div>
              <div className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</div>
            </>
          ) : (
            <>
              <Upload className="size-6 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Click to choose a file</div>
            </>
          )}
        </label>

        {error && (
          <div className="flex items-start gap-1.5 text-xs text-rag-red">
            <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleConfirm}
            disabled={!file || scanning}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {scanning ? "Scanning your document…" : submitLabel}
          </button>
          <button onClick={onClose} disabled={scanning} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors disabled:opacity-40">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function MonthPicker({ value, onChange, highlight }: { value: string; onChange: (v: string) => void; highlight?: boolean }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => {
    if (value) return parseInt(value.split("-")[0]);
    return new Date().getFullYear();
  });

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={cn(
          "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors border",
          highlight
            ? "border-amber/50 bg-amber/10 text-amber-foreground hover:bg-amber/20"
            : "border-border bg-background hover:bg-muted"
        )}
      >
        <CalendarDays className={cn("size-3", highlight ? "text-amber-foreground" : "text-muted-foreground")} />
        {value ? formatDueDate(value) : "Set due date"}
      </button>
      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 bg-popover border border-border rounded-xl shadow-lg p-3 w-52">
          <div className="flex items-center justify-between mb-2">
            <button
              onMouseDown={() => setYear((y) => y - 1)}
              className="size-6 rounded hover:bg-muted grid place-items-center text-sm font-medium"
            >‹</button>
            <span className="text-sm font-medium">{year}</span>
            <button
              onMouseDown={() => setYear((y) => y + 1)}
              className="size-6 rounded hover:bg-muted grid place-items-center text-sm font-medium"
            >›</button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MONTHS_SHORT.map((m, i) => {
              const val = `${year}-${String(i + 1).padStart(2, "0")}`;
              const selected = val === value;
              return (
                <button
                  key={m}
                  onMouseDown={() => { onChange(val); setOpen(false); }}
                  className={cn(
                    "text-xs py-1.5 rounded-md transition-colors font-medium",
                    selected ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground/80",
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
