// Excel/CSV export + import for Admin's Activity Management catalog.
//
// Export produces a 3-sheet workbook (Staff / Manager / HOD), each sheet holding the cumulative
// set of activities that audience actually sees in the app today (mirrors RewardsSection.tsx's
// relevantActivities filter: everyone sees "all", managers/HODs additionally see "manager", HODs
// additionally see "hod"). Within each sheet, activities are grouped by category then by audience,
// and sorted by points (descending) within each group.
//
// Import is update-only: every exported row carries the activity's id, and re-uploading an edited
// export only ever updates matching existing activities (never inserts new ones) — matching the
// same "no free-text/unwired activities" constraint enforced on manual edits in AdminSection.tsx.

import * as ExcelJS from "exceljs";
import type { Activity } from "./mockData";
import { CATEGORY_LABELS, CATEGORY_ORDER, AUDIENCE_LABELS, AUDIENCE_ORDER } from "./mockData";
import { pilotTestActivity, recognizeTrigger } from "./utils";

const SHEET_COMPOSITION: Record<string, Activity["audience"][]> = {
  Staff: ["all"],
  Manager: ["all", "manager"],
  HOD: ["all", "manager", "hod"],
};

const COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: "ID", key: "id", width: 8 },
  { header: "Activity Name", key: "name", width: 46 },
  { header: "Category", key: "categoryLabel", width: 14 },
  { header: "Audience", key: "audienceLabel", width: 18 },
  { header: "Points", key: "points", width: 9 },
  { header: "Compulsory", key: "compulsoryLabel", width: 11 },
  { header: "Penalty Points", key: "penaltyPoints", width: 14 },
  { header: "Timeline Days", key: "timelineDays", width: 14 },
  { header: "Starting From", key: "timelineTrigger", width: 46 },
  { header: "Live", key: "liveLabel", width: 7 },
];

const CATEGORY_BY_LABEL: Record<string, Activity["category"]> = Object.fromEntries(
  CATEGORY_ORDER.map((c) => [CATEGORY_LABELS[c].toLowerCase(), c])
);
const AUDIENCE_BY_LABEL: Record<string, Activity["audience"]> = Object.fromEntries(
  AUDIENCE_ORDER.map((a) => [AUDIENCE_LABELS[a].toLowerCase(), a])
);

function toRow(a: Activity) {
  return {
    id: a.id,
    name: a.name,
    categoryLabel: CATEGORY_LABELS[a.category],
    audienceLabel: AUDIENCE_LABELS[a.audience],
    points: a.points,
    compulsoryLabel: a.isCompulsory ? "Yes" : "No",
    penaltyPoints: a.penaltyPoints ?? "",
    timelineDays: a.timelineDays ?? "",
    timelineTrigger: a.timelineTrigger ?? "",
    liveLabel: a.live ? "Yes" : "No",
  };
}

export function buildActivityWorkbook(activities: Activity[]): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Compass Pulse AI";
  wb.created = new Date();

  for (const sheetName of Object.keys(SHEET_COMPOSITION)) {
    const audiences = SHEET_COMPOSITION[sheetName];
    const sheet = wb.addWorksheet(sheetName);
    sheet.columns = COLUMNS;
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };

    const rowsForSheet = activities.filter((a) => audiences.includes(a.audience));

    for (const cat of CATEGORY_ORDER) {
      const inCategory = rowsForSheet.filter((a) => a.category === cat);
      if (inCategory.length === 0) continue;

      const catHeaderRow = sheet.addRow({ name: `${CATEGORY_LABELS[cat]} (${inCategory.length})` });
      catHeaderRow.font = { bold: true, italic: true };
      catHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };

      for (const aud of audiences) {
        const inAudience = inCategory.filter((a) => a.audience === aud).sort((x, y) => y.points - x.points);
        if (inAudience.length === 0) continue;
        if (audiences.length > 1) {
          const audHeaderRow = sheet.addRow({ name: `  ${AUDIENCE_LABELS[aud]}` });
          audHeaderRow.font = { italic: true, color: { argb: "FF6B7280" } };
        }
        for (const a of inAudience) sheet.addRow(toRow(a));
      }
    }
  }

  return wb;
}

export async function exportActivitiesToExcel(activities: Activity[]): Promise<void> {
  const wb = buildActivityWorkbook(activities);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `activity-management-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------- Import ----------

export interface ImportRow {
  id: string;
  changes: Partial<Activity>;
}

function rowFromCells(headerIndex: Record<string, number>, cells: (string | number | undefined)[]): ImportRow | null {
  const get = (h: string): string => {
    const idx = headerIndex[h];
    const v = idx === undefined ? undefined : cells[idx];
    return v === undefined || v === null ? "" : String(v).trim();
  };

  const id = get("id");
  if (!id) return null; // group-header/spacer row from an exported workbook, or a malformed line

  const changes: Partial<Activity> = {};

  const name = get("activity name");
  if (name) changes.name = name;

  const categoryLabel = get("category").toLowerCase();
  if (categoryLabel && CATEGORY_BY_LABEL[categoryLabel]) changes.category = CATEGORY_BY_LABEL[categoryLabel];

  const audienceLabel = get("audience").toLowerCase();
  if (audienceLabel && AUDIENCE_BY_LABEL[audienceLabel]) changes.audience = AUDIENCE_BY_LABEL[audienceLabel];

  const pointsRaw = get("points");
  if (pointsRaw !== "" && !Number.isNaN(Number(pointsRaw))) changes.points = Number(pointsRaw);

  const compulsoryRaw = get("compulsory").toLowerCase();
  if (compulsoryRaw === "yes" || compulsoryRaw === "true") changes.isCompulsory = true;
  else if (compulsoryRaw === "no" || compulsoryRaw === "false") changes.isCompulsory = false;

  // Penalty/timeline fields are legitimately optional — a blank cell means "clear this field",
  // not "leave untouched", since an exported+re-uploaded row represents the activity's full state.
  const penaltyRaw = get("penalty points");
  changes.penaltyPoints = penaltyRaw !== "" && !Number.isNaN(Number(penaltyRaw)) ? Number(penaltyRaw) : undefined;

  const timelineDaysRaw = get("timeline days");
  changes.timelineDays = timelineDaysRaw !== "" && !Number.isNaN(Number(timelineDaysRaw)) ? Number(timelineDaysRaw) : undefined;

  const startingFrom = get("starting from");
  changes.timelineTrigger = startingFrom || undefined;

  const liveRaw = get("live").toLowerCase();
  if (liveRaw === "yes" || liveRaw === "true") changes.live = true;
  else if (liveRaw === "no" || liveRaw === "false") changes.live = false;

  return { id, changes };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
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
  return out.map((f) => f.trim());
}

function parseCsvRows(raw: string): ImportRow[] {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headerIndex: Record<string, number> = {};
  splitCsvLine(lines[0]).forEach((h, i) => { headerIndex[h.toLowerCase()] = i; });
  const rows: ImportRow[] = [];
  for (const line of lines.slice(1)) {
    const parsed = rowFromCells(headerIndex, splitCsvLine(line));
    if (parsed) rows.push(parsed);
  }
  return rows;
}

async function parseXlsxRows(buffer: ArrayBuffer): Promise<ImportRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const rows: ImportRow[] = [];
  wb.eachSheet((sheet) => {
    let headerIndex: Record<string, number> | null = null;
    sheet.eachRow((excelRow) => {
      const cells = (excelRow.values as ExcelJS.CellValue[]).slice(1) as (string | number | undefined)[];
      if (!headerIndex) {
        headerIndex = {};
        cells.forEach((c, i) => { if (c) headerIndex![String(c).trim().toLowerCase()] = i; });
        return;
      }
      const parsed = rowFromCells(headerIndex, cells);
      if (parsed) rows.push(parsed);
    });
  });
  return rows;
}

export async function parseActivityImportFile(file: File): Promise<ImportRow[]> {
  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
  if (isCsv) return parseCsvRows(await file.text());
  return parseXlsxRows(await file.arrayBuffer());
}

export interface ImportValidationResult {
  valid: ImportRow[];
  errors: { id: string; name: string; reasons: string[] }[];
  // Rows that are applied (unlike errors) but whose "Starting from when?" trigger isn't recognized —
  // a soft heuristic warning, not a hard failure, since the dashboard can't authoritatively say an
  // unrecognized trigger is wrong (it may describe a real process that just isn't wired up yet).
  warnings: { id: string; name: string; message: string }[];
}

export function validateImportRows(rows: ImportRow[], existing: Activity[]): ImportValidationResult {
  const byId = new Map(existing.map((a) => [a.id, a]));
  const seen = new Set<string>();
  const valid: ImportRow[] = [];
  const errors: ImportValidationResult["errors"] = [];
  const warnings: ImportValidationResult["warnings"] = [];

  for (const row of rows) {
    // The same activity legitimately appears in multiple cumulative sheets (e.g. an "all"-audience
    // activity is in Staff, Manager, and HOD) — only process its first occurrence.
    if (seen.has(row.id)) continue;
    seen.add(row.id);

    const current = byId.get(row.id);
    if (!current) {
      errors.push({
        id: row.id,
        name: row.changes.name ?? row.id,
        reasons: [`ID "${row.id}" was not found in the current catalog — new activities can only be added from the dashboard's Add flow, not by import.`],
      });
      continue;
    }

    const merged: Activity = { ...current, ...row.changes };
    const reasons = pilotTestActivity(merged);
    if (reasons.length > 0) {
      errors.push({ id: row.id, name: merged.name, reasons });
      continue;
    }
    if (merged.timelineTrigger && !recognizeTrigger(merged.timelineTrigger)) {
      warnings.push({
        id: row.id,
        name: merged.name,
        message: `"Starting from when?" is set to "${merged.timelineTrigger}", which isn't a trigger the dashboard recognizes — it won't automatically enforce a deadline for this activity until the wording matches a known trigger or the underlying logic is built.`,
      });
    }
    valid.push(row);
  }

  return { valid, errors, warnings };
}
