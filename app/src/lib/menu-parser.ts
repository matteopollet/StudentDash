/**
 * Canteen menu PDF parser.
 *
 * Parses the weekly menu PDF from Mines Alès using pdfjs-dist.
 * Text items are placed into a grid of day columns × meal zones
 * based on their geometric coordinates in the PDF.
 *
 * PDF coordinate system (pdfjs-dist):
 *   - Origin is bottom-left of the page
 *   - transform[4] = x position (left → right)
 *   - transform[5] = y position (bottom → top, higher = higher on page)
 *
 * Calibrated from the real Mines Alès PDF (1440 × 810 pt, landscape).
 * Last calibration: June 2026.
 *
 * Run `node scripts/analyze-pdf.mjs` to re-dump coordinates if the
 * PDF template changes.
 */

// Use the legacy build for Node.js (no DOM / canvas dependency)
import './pdf-polyfills'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'

// Next.js static import to bundle the worker properly
// @ts-expect-error: pdfjs-dist does not provide types for the worker file
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs'

// Mock the global variable so the fake worker doesn't use dynamic import
if (typeof globalThis !== 'undefined') {
  ;(globalThis as any).pdfjsWorker = pdfjsWorker
}

// Tell pdf.js to use a dummy string to bypass the "No workerSrc" error
GlobalWorkerOptions.workerSrc = 'dummy'

/** Subset of the pdfjs-dist TextItem shape we actually use. */
interface TextItem {
  str: string
  transform: number[]
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DayMenu {
  name: string
  plats: string[]
  accompagnements: string[]
}

export interface WeekMenu {
  days: DayMenu[]
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

// ---------------------------------------------------------------------------
// Layout configuration – calibrated from the real PDF (1440 × 810 pt)
// ---------------------------------------------------------------------------

/**
 * Column boundaries (x-axis) for each weekday, in PDF points.
 *
 * Derived from measured header positions:
 *   LUNDI x≈205  MARDI x≈447  MERCREDI x≈668  JEUDI x≈932  VENDREDI x≈1154
 *
 * Content extends ~50pt left of the header and up to the next column start.
 * Extra margin on the right of Vendredi to catch all content.
 */
const DAY_COLUMNS: { name: string; xMin: number; xMax: number }[] = [
  { name: 'Lundi',    xMin: 100,  xMax: 370 },
  { name: 'Mardi',    xMin: 370,  xMax: 600 },
  { name: 'Mercredi', xMin: 600,  xMax: 840 },
  { name: 'Jeudi',    xMin: 840,  xMax: 1090 },
  { name: 'Vendredi', xMin: 1090, xMax: 1350 },
]

/**
 * Y-axis zones. PDF Y goes bottom → top, so "Plats" (higher on the page)
 * have HIGHER y values than "Accompagnements".
 *
 * Measured from the real PDF:
 *   - Plats zone:  3 rows at y ≈ 541/514 (poisson), 418/392 (viande), 309/280 (végé)
 *     → Y range roughly 270 to 560
 *   - Accomp zone: 2 rows at y ≈ 191/178 (féculent), 101/73 (légume)
 *     → Y range roughly 60 to 210
 *   - Day headers at y ≈ 632, title at y ≈ 721, disclaimer at y ≈ 25
 *     → all outside both zones, correctly ignored
 */
const ZONES = {
  plats:            { yMin: 260, yMax: 560 },
  accompagnements:  { yMin: 55,  yMax: 210 },
}

/**
 * Text items to ignore — day names, section headers, labels, disclaimers.
 * Matched case-insensitively against the trimmed text.
 */
const IGNORED_PATTERNS: RegExp[] = [
  /^(LUNDI|MARDI|MERCREDI|JEUDI|VENDREDI)/i,
  /^PLAT$/i,
  /^\d$/,                               // "1", "2" (plat numbering)
  /^MENU DE LA SEMAINE$/i,
  /^VERT$/i,                            // "Le jeudi se met au VERT"
  /allergènes/i,
  /approvisionnement/i,
  /repas sains/i,
  /se met au$/i,
  /Le jeudi se met au/i,
  /^\(origine /i,                        // "(origine FR)"
]

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse a canteen menu PDF buffer into a structured {@link WeekMenu}.
 *
 * @param pdfBuffer - The raw PDF file as a Buffer / Uint8Array.
 * @returns Parsed week menu with 5 days.
 */
export async function parseMenuPdf(pdfBuffer: Buffer): Promise<WeekMenu> {
  // pdfjs-dist expects a Uint8Array (or ArrayBuffer) — Buffer works directly.
  const doc = await getDocument({ data: new Uint8Array(pdfBuffer) }).promise
  const page = await doc.getPage(1)
  const textContent = await page.getTextContent()

  // Accumulate text items into buckets keyed by day + zone
  const buckets: Record<string, { plats: string[]; accompagnements: string[] }> = {}
  for (const col of DAY_COLUMNS) {
    buckets[col.name] = { plats: [], accompagnements: [] }
  }

  for (const item of textContent.items) {
    // Skip non-text items (e.g. marked content)
    if (!('transform' in item)) continue
    const textItem = item as TextItem
    const text = textItem.str.trim()
    if (!text) continue

    // Filter out non-food text (headers, labels, disclaimers)
    if (IGNORED_PATTERNS.some(re => re.test(text))) continue

    const x = textItem.transform[4]
    const y = textItem.transform[5]

    // Find which day column this item belongs to
    const col = DAY_COLUMNS.find(c => x >= c.xMin && x < c.xMax)
    if (!col) continue

    // Determine zone
    if (y >= ZONES.plats.yMin && y <= ZONES.plats.yMax) {
      buckets[col.name].plats.push(text)
    } else if (y >= ZONES.accompagnements.yMin && y <= ZONES.accompagnements.yMax) {
      buckets[col.name].accompagnements.push(text)
    }
    // Items outside both zones (title, day headers, footers) are ignored.
  }

  const days: DayMenu[] = DAY_COLUMNS.map(col => ({
    name: col.name,
    plats: cleanItems(buckets[col.name].plats),
    accompagnements: cleanItems(buckets[col.name].accompagnements),
  }))

  return { days }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a parsed menu: exactly 5 days, each with ≥ 1 plat.
 */
export function validateMenu(menu: WeekMenu): ValidationResult {
  const errors: string[] = []

  if (menu.days.length !== 5) {
    errors.push(`Expected 5 days, got ${menu.days.length}`)
  }

  for (const day of menu.days) {
    if (day.plats.length === 0) {
      errors.push(`${day.name} has no plats`)
    }
  }

  return { valid: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Clean up a list of raw text fragments:
 * - Trim whitespace
 * - Drop empty / whitespace-only strings
 * - Join consecutive fragments that look like a continuation (e.g. a dish
 *   name split across two text items). Heuristic: if a fragment starts with
 *   a lowercase letter, append it to the previous item.
 */
function cleanItems(raw: string[]): string[] {
  const trimmed = raw.map(s => s.trim()).filter(Boolean)

  const merged: string[] = []
  for (const fragment of trimmed) {
    if (merged.length > 0 && /^[a-zàâéèêëïîôùûüç]/.test(fragment)) {
      // Looks like a continuation of the previous line
      merged[merged.length - 1] += ' ' + fragment
    } else {
      merged.push(fragment)
    }
  }

  return merged
}
