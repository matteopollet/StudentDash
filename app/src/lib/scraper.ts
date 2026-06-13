import axios from 'axios'
import * as cheerio from 'cheerio'
import { Buffer } from 'buffer'

export interface ScrapedGrade {
  semester: string
  ueCode: string
  ueName: string
  subjectName: string
  coefficient: number
  value: number | null
  gradeType: string | null
}

const BASE_URL = 'https://webdfd.mines-ales.fr/cybernotes'

// Mapping from semester label in sommaire.php to clean semester name
const SEM_LABEL_MAP: Record<string, string> = {
  INFRES17_2027_S5: 'S5',
  INFRES17_2027_S6: 'S6',
  INFRES17_2027_S7: 'S7',
  INFRES17_2027_S8: 'S8',
  INFRES17_2027_S9: 'S9',
}

// Maps the exact numeric prefix from CyberNotes titles to a canonical UE code.
// Built directly from Programme_INFRES17_2024-2027.txt as the source of truth.
// Sub-modules (8.1.a / 8.1.b) are distinct UEs and CyberNotes marks them as 8.1.A / 8.1.B.
// Key format matches what appears before the first dot-separator in the title:
//   "5.1 MATH : ..."  → key "5.1"
//   "7.2.3. DL - ..."  → key "7.2"
//   "8.1.A. DL - ..."  → key "8.1.a"  (lowercase letter)
//   "8.1.B. DL - ..."  → key "8.1.b"
const NUMBER_TO_UE: Record<string, string> = {
  // ── SEMESTRE 5 ──────────────────────────────────────────────
  '5.1': '5.1 MATH',   // Mathématiques Outils et Concepts
  '5.2': '5.2 BST',    // Bases Scientifiques ou Technologiques
  '5.3': '5.3 BST',    // Bases Scientifiques ou Technologiques
  '5.4': '5.4 BST',    // Bases Scientifiques ou Technologiques
  '5.5': '5.5 ASSI',   // Architecture et Sécurité du SI
  '5.6': '5.6 DIM',    // Développement de l'Ingénieur Manager
  '5.7': '5.7 LING',   // Linguistique
  '5.8': '5.8 DPPA',   // Développement Personnel et Professionnel
  // ── SEMESTRE 6 ──────────────────────────────────────────────
  '6.1': '6.1 MATH',   // Mathématiques Outils et Concepts
  '6.2': '6.2 BST',    // Bases Scientifiques ou Technologiques
  '6.3': '6.3 ASSI',   // Architecture et Sécurité du SI
  '6.4': '6.4 ASSI',   // Architecture et Sécurité du SI
  '6.5': '6.5 PROJ',   // Projet
  '6.6': '6.6 LING',   // Linguistique
  '6.7': '6.7 DPPA',   // Développement Personnel et Professionnel
  // ── SEMESTRE 7 (DL & SR partagent les mêmes codes) ──────────
  '7.1': '7.1 BST',    // Bases Scientifiques ou Technologiques
  '7.2': '7.2 ASSI',   // Architecture et Sécurité du SI
  '7.3': '7.3 GL',     // Génie Logiciel (DL) / Systèmes Informatiques (SR → même code)
  '7.4': '7.4 GL',     // Génie Logiciel (DL) / Réseaux Informatiques (SR)
  '7.5': '7.5 DIM',    // Développement de l'Ingénieur Manager
  '7.6': '7.6 LING',   // Linguistique
  '7.7': '7.7 DPPA',   // Développement Personnel et Professionnel
  // ── SEMESTRE 8 DL ───────────────────────────────────────────
  // 8.1.a and 8.1.b are DISTINCT UEs per the programme
  '8.1.a': '8.1.a DEV',  // Développement — Systèmes embarqués & Androïd
  '8.1.b': '8.1.b DEV',  // Développement — IA & Optimisation de code
  '8.2':   '8.2 GL',     // Génie Logiciel
  '8.3':   '8.3 PROJ',   // Projet
  '8.4':   '8.4 DIM',    // Développement de l'Ingénieur Manager
  '8.5':   '8.5 LING',   // Linguistique
  '8.6':   '8.6 DPPA',   // Développement Personnel et Professionnel
  // ── SEMESTRE 9 DL ───────────────────────────────────────────
  '9.1': '9.1 BST',    // Bases Scientifiques ou Technologiques
  '9.2': '9.2 DEV',    // Développement
  '9.3': '9.3 GL',     // Génie Logiciel
  '9.4': '9.4 GL',     // Génie Logiciel
  '9.5': '9.5 ASSI',   // Architectures et Sécurité du SI
  '9.6': '9.6 PROJ',   // Projet
  '9.7': '9.7 DPPA',   // Développement Personnel et Professionnel
}

// UE code → full name (from Programme_INFRES17_2024-2027.txt)
const UE_NAMES: Record<string, string> = {
  // S5
  '5.1 MATH':  'Mathématiques Outils et Concepts',
  '5.2 BST':   'Bases Scientifiques ou Technologiques',
  '5.3 BST':   'Bases Scientifiques ou Technologiques',
  '5.4 BST':   'Bases Scientifiques ou Technologiques',
  '5.5 ASSI':  "Architecture et Sécurité du Système d'Information",
  '5.6 DIM':   "Développement de l'Ingénieur Manager",
  '5.7 LING':  'Linguistique',
  '5.8 DPPA':  "Développement Personnel et Professionnel de l'Apprenti",
  // S6
  '6.1 MATH':  'Mathématiques Outils et Concepts',
  '6.2 BST':   'Bases Scientifiques ou Technologiques',
  '6.3 ASSI':  "Architecture et Sécurité du Système d'Information",
  '6.4 ASSI':  "Architecture et Sécurité du Système d'Information",
  '6.5 PROJ':  'Projet',
  '6.6 LING':  'Linguistique',
  '6.7 DPPA':  "Développement Personnel et Professionnel de l'Apprenti",
  // S7
  '7.1 BST':   'Bases Scientifiques ou Technologiques',
  '7.2 ASSI':  "Architecture et Sécurité du Système d'Information",
  '7.3 GL':    'Génie Logiciel',
  '7.4 GL':    'Génie Logiciel',
  '7.5 DIM':   "Développement de l'Ingénieur Manager",
  '7.6 LING':  'Linguistique',
  '7.7 DPPA':  "Développement Personnel et Professionnel de l'Apprenti",
  // S8 DL — 8.1.a et 8.1.b sont deux UEs distinctes
  '8.1.a DEV': 'Développement — Systèmes embarqués & Mobile',
  '8.1.b DEV': 'Développement — IA & Optimisation',
  '8.2 GL':    'Génie Logiciel',
  '8.3 PROJ':  'Projet',
  '8.4 DIM':   "Développement de l'Ingénieur Manager",
  '8.5 LING':  'Linguistique',
  '8.6 DPPA':  "Développement Personnel et Professionnel de l'Apprenti",
  // S9 DL
  '9.1 BST':   'Bases Scientifiques ou Technologiques',
  '9.2 DEV':   'Développement',
  '9.3 GL':    'Génie Logiciel',
  '9.4 GL':    'Génie Logiciel',
  '9.5 ASSI':  "Architectures et Sécurité du Système d'Information",
  '9.6 PROJ':  'Projet',
  '9.7 DPPA':  "Développement Personnel et Professionnel de l'Apprenti",
}

/**
 * Main scraper: logs in to CyberNotes, discovers all semesters from sommaire.php,
 * then scrapes each semester's notes.php page.
 */
export async function scrapeCyberNotes(
  minesId: string,
  minesPassword: string
): Promise<ScrapedGrade[]> {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    },
    withCredentials: true,
    maxRedirects: 0,  // handle manually
    validateStatus: () => true,
  })

  // Step 1: POST credentials to debut.php
  const loginResp = await client.post(
    '/debut.php',
    new URLSearchParams({ id: minesId, pwd: minesPassword }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      responseType: 'arraybuffer',
    }
  )

  // Extract cookies from Set-Cookie header
  const rawCookies = loginResp.headers['set-cookie'] ?? []
  const cookieHeader = rawCookies.map((c: string) => c.split(';')[0]).join('; ')

  if (!cookieHeader) {
    throw new Error('Login failed — no session cookie received. Check your Mines Alès credentials.')
  }

  // The response body redirects us to frames.php via JS
  // We need to check for authentication success by fetching sommaire.php
  const sommaireResp = await client.get('/sommaire.php', {
    headers: { Cookie: cookieHeader },
    responseType: 'arraybuffer',
  })
  // CyberNotes serves pages in ISO-8859-1; decode properly
  sommaireResp.data = Buffer.from(sommaireResp.data).toString('latin1')

  const $sommaire = cheerio.load(sommaireResp.data)

  // Check auth: if sommaire still shows a login form, credentials are wrong
  if (sommaireResp.data.includes('Mot de passe') && sommaireResp.data.includes('input')) {
    throw new Error('Identifiants CyberNotes incorrects.')
  }

  // Step 2: Extract all semester links from sommaire.php
  // Pattern: <a href="notes.php?SEM=XXXX&EVECLEUNIK=YYYY">INFRES17_2027_S5</a>
  const semesters: Array<{ semId: string; label: string; name: string }> = []

  $sommaire('a[href*="notes.php"]').each((_, el) => {
    const href = $sommaire(el).attr('href') ?? ''
    const text = $sommaire(el).text().replace(/\s+/g, ' ').trim()

    const semMatch = href.match(/SEM=(\d+)/)
    if (!semMatch) return

    const semId = semMatch[1]
    // Match labels like "INFRES17_2027_S5" or similar
    const labelMatch = text.match(/(?:INFRES\w+_)(S\d+)/i) || text.match(/(S\d+)\s*$/)
    const semLabel = labelMatch ? labelMatch[1] : text.replace(/\s+/g, '_')

    // Also try to match from the full text
    const knownSem = Object.entries(SEM_LABEL_MAP).find(([k]) => text.includes(k))
    const semName = knownSem ? knownSem[1] : semLabel

    semesters.push({ semId, label: text, name: semName })
  })

  if (semesters.length === 0) {
    throw new Error('No semesters found in CyberNotes. Login may have failed.')
  }

  // Step 3: Scrape each semester's notes page
  const allGrades: ScrapedGrade[] = []

  for (const sem of semesters) {
    // Skip TOEIC and other non-standard semesters
    if (!sem.name.match(/^S\d+$/)) continue

    const notesResp = await client.get(`/notes.php?SEM=${sem.semId}`, {
      headers: { Cookie: cookieHeader },
      responseType: 'arraybuffer',
    })
    notesResp.data = Buffer.from(notesResp.data).toString('latin1')

    const grades = parseNotesPage(notesResp.data, sem.name)
    allGrades.push(...grades)
  }

  return allGrades
}

/**
 * Parse a notes.php page.
 *
 * Each grade entry has this HTML pattern:
 * <td>
 *   <font class="SousTitre">5.1 MATH : MATHEMATIQUES POUR L'INGENIEUR (18/06/2024)</font>
 *   <font class="TexteStandard"> :</font>
 *   <font ...><B>13.01</B></font> / 20 Coef. 3
 * </td>
 */
function parseNotesPage(html: string, semesterName: string): ScrapedGrade[] {
  const $ = cheerio.load(html)
  const grades: ScrapedGrade[] = []

  $('table td').each((_, td) => {
    const tdText = $(td).text()

    // Only process rows with "Coef." — those are real grade entries
    if (!tdText.includes('Coef.')) return

    // Extract the SousTitre text: "5.1 MATH : MATHEMATIQUES POUR L'INGENIEUR (18/06/2024)"
    const titleFont = $(td).find('font.SousTitre').first().text().trim()
    if (!titleFont) return

    // Parse UE code and subject name from title.
    // CyberNotes uses 3 different formats across semesters:
    //   Format 1 (S5/S6): "5.1 MATH : MATHEMATIQUES POUR L'INGENIEUR"
    //   Format 2 (S7/S8): "7.2.3. DL - INFRASTRUCTURE AS CODE"  (with DL/GL/etc. label)
    //   Format 3 (S7/S8): "7.2.2. APPLICATIONS DE LA CRYPTOGRAPHIE"  (no label, direct subject)
    //
    // Strategy: always extract the leading X.Y number and look up in NUMBER_TO_UE,
    // then extract the subject name after whichever separator is present.
    const titleClean = titleFont.replace(/\s*\(\d{2}\/\d{2}\/\d{4}\)\s*$/, '').trim()

    // Extract the numeric prefix — 3 possible formats from CyberNotes:
    //   "5.1 MATH : ..."      → "5.1"
    //   "7.2.3. DL - ..."     → "7.2"   (third digit is a sub-index, ignored)
    //   "8.1.A. DL - ..."     → "8.1.a" (letter identifies the sub-module, keep it)
    //   "8.1.B. DL - ..."     → "8.1.b"
    const numMatch = titleClean.match(/^(\d+)\.(\d+)(?:\.([A-Za-z]))?/)
    let numPrefix: string | null = null
    if (numMatch) {
      if (numMatch[3]) {
        // Has letter sub-module: "8.1.A" → "8.1.a"
        numPrefix = `${numMatch[1]}.${numMatch[2]}.${numMatch[3].toLowerCase()}`
      } else {
        numPrefix = `${numMatch[1]}.${numMatch[2]}`
      }
    }

    // Canonical UE code from number map
    const ueCode = (numPrefix && NUMBER_TO_UE[numPrefix]) ? NUMBER_TO_UE[numPrefix] : 'AUTRE'

    // Extract subject name:
    // - After " : " (Format 1)
    // - After " - " with optional "X.X. LABEL - " prefix stripped (Format 2)
    // - After "X.X.Y. LABEL " entirely (Format 3 — no separator, just the subject)
    let subjectName: string
    // Try Format 1: colon separator
    const colonIdx = titleClean.indexOf(' : ')
    if (colonIdx !== -1) {
      subjectName = toTitleCase(titleClean.slice(colonIdx + 3).trim())
    } else {
      // Strip the leading number+letter prefix and optional label:
      // "7.2.3. DL - INFRASTRUCTURE AS CODE" → strip "7.2.3. DL - " → "Infrastructure As Code"
      // "7.2.2. APPLICATIONS DE LA CRYPTOGRAPHIE" → strip "7.2.2. " → "Applications De La Cryptographie"
      // "8.1.A. DL - SYSTÈMES EMBARQUÉS" → strip "8.1.A. DL - " → "Systèmes Embarqués Et Iot"
      // "8.1.B. DL - OPTIMISATION DE CODE" → strip "8.1.B. DL - " → "Optimisation De Code"
      const stripped = titleClean
        // Remove "X.Y.Z." or "X.Y.A." (number with optional letter, then dot)
        .replace(/^\d+\.\d+(?:\.[A-Za-z\d]+)*\.\s*/, '')
        // Remove optional short uppercase label like "DL -" or "GL -"
        .replace(/^(?:[A-Z]{1,5}(?:\s+[A-Z]{1,5})*\s*-\s*)/, '')
        .trim()
      subjectName = toTitleCase(stripped || titleClean)
    }

    // Extract grade value from <B> tag (blue bold number)
    const boldText = $(td).find('b, B').first().text().trim()
    const gradeValue = parseFloat(boldText.replace(',', '.'))

    // Extract coefficient from text "Coef. X"
    const coefMatch = tdText.match(/Coef\.\s*([\d.]+)/)
    const coef = coefMatch ? parseFloat(coefMatch[1]) : 1

    // Skip ECTS letter-grade entries (no numeric grade)
    if (isNaN(gradeValue)) return

    // Get UE name from our map, fallback to code
    const ueName = UE_NAMES[ueCode] ?? ueCode

    grades.push({
      semester: semesterName,
      ueCode,
      ueName,
      subjectName,
      coefficient: coef,
      value: gradeValue,
      gradeType: 'Contrôle',
    })
  })

  return grades
}

/**
 * Convert uppercase string to Title Case
 * "MATHEMATIQUES POUR L'INGENIEUR" -> "Mathématiques Pour L'Ingenieur"
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|\s|-|')\S/g, (c) => c.toUpperCase())
    .replace(/\bDe\b/g, 'de')
    .replace(/\bDu\b/g, 'du')
    .replace(/\bLe\b/g, 'le')
    .replace(/\bLa\b/g, 'la')
    .replace(/\bLes\b/g, 'les')
    .replace(/\bEt\b/g, 'et')
    .replace(/\bEn\b/g, 'en')
    .replace(/\bPour\b/g, 'pour')
    .replace(/\bAux\b/g, 'aux')
    .replace(/\bPar\b/g, 'par')
    .replace(/\bSur\b/g, 'sur')
    .replace(/\bAu\b/g, 'au')
    .replace(/L'i/g, "L'I")
}
