// Verifies that an uploaded supporting document (certificate/result slip) actually looks like it's
// for the skill/development-goal being claimed — by genuinely reading the file, not just trusting
// its name. PDFs are read via their text layer (pdfjs-dist); JPG/PNG go through in-browser OCR
// (tesseract.js, WASM, fully client-side — no external API/keys). Both are lazy-loaded so the ~2MB+
// OCR engine never ships to users who never open the upload modal.

// "CMFAS Module 5" -> "cmfas module 5" -> "cmfas 5" isn't what we want; we want the claim's own
// distinctive wording preserved but normalized so punctuation/case/extra-whitespace differences
// between a title and a scanned document don't cause a false mismatch.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// A handful of very short/common words aren't distinctive enough to prove a match on their own
// (e.g. "the", "a", "of", "for") — require the claim's *meaningful* tokens to be present, not every
// token verbatim, since real certificates often reorder or abbreviate ("Cert." vs "Certificate").
const STOPWORDS = new Set(["the", "a", "an", "of", "for", "and", "on", "in", "to", "with"]);

function meaningfulTokens(normalized: string): string[] {
  return normalized.split(" ").filter(t => t.length > 1 && !STOPWORDS.has(t));
}

export async function extractDocumentText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  try {
    if (ext === "pdf") return await extractPdfText(file);
    if (ext === "jpg" || ext === "jpeg" || ext === "png") return await extractImageText(file);
    return await file.text();
  } catch {
    // Extraction failing (corrupt file, scanned-image-only PDF with no text layer, OCR error, etc.)
    // isn't itself proof of a mismatch — matchesClaim falls back to the filename in that case.
    return "";
  }
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts: string[] = [];
  const pageCount = Math.min(doc.numPages, 10); // certificates are short — cap for speed
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pageTexts.push(content.items.map(item => ("str" in item ? item.str : "")).join(" "));
  }
  return pageTexts.join(" ");
}

async function extractImageText(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(file);
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

// Fraction of a claim's meaningful tokens that must appear somewhere in a haystack to count as a
// match, when there's no shorter distinctive code to key off (see below). Order doesn't matter —
// real filenames/certificates routinely rephrase, abbreviate, or reorder a long title.
const TOKEN_MATCH_THRESHOLD = 0.6;

function containsAllTokens(haystack: string, tokens: string[]): boolean {
  return tokens.length > 0 && tokens.every(t => haystack.includes(t));
}

// True if either the extracted document text or the filename looks like it's for the claim.
// Real certificate titles in this app are often long and descriptive with a short distinctive code
// tucked inside — e.g. "IHRP Certified Professional (IHRP-CP)" or "CMFAS Module 5" — and real
// uploads are far more likely to carry that short code (in the filename or printed on the slip) than
// the full title verbatim. So: prefer a parenthesised abbreviation/code from the claim as the
// strongest signal if present; otherwise require most (not all, and in any order) of the claim's
// meaningful words to appear.
export function matchesClaim(extractedText: string, fileName: string, claimTitle: string): boolean {
  const claimTokens = meaningfulTokens(normalize(claimTitle));
  if (claimTokens.length === 0) return true; // nothing distinctive to check against

  const abbrevMatch = claimTitle.match(/\(([A-Za-z0-9][A-Za-z0-9\-. ]{1,20})\)/);
  const abbrevTokens = abbrevMatch ? meaningfulTokens(normalize(abbrevMatch[1])) : [];

  const haystacks = [normalize(extractedText), normalize(fileName)];
  return haystacks.some(haystack => {
    if (!haystack) return false;
    if (abbrevTokens.length > 0 && containsAllTokens(haystack, abbrevTokens)) return true;
    const present = claimTokens.filter(t => haystack.includes(t)).length;
    return present / claimTokens.length >= TOKEN_MATCH_THRESHOLD;
  });
}
