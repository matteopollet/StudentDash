/**
 * Diagnostic script: dumps every text item from the canteen PDF
 * with its (x, y) coordinates, sorted by Y descending then X ascending.
 * Run: node scripts/analyze-pdf.mjs
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PDF_PATH = join(__dirname, 'Menu_semaine.pdf')

async function analyze() {
  const data = readFileSync(PDF_PATH)
  const doc = await getDocument({ data: new Uint8Array(data) }).promise

  console.log(`Pages: ${doc.numPages}`)

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale: 1 })
    console.log(`\n=== Page ${p} — ${viewport.width.toFixed(1)} x ${viewport.height.toFixed(1)} pt ===\n`)

    const textContent = await page.getTextContent()
    const items = []

    for (const item of textContent.items) {
      if (!('transform' in item)) continue
      const str = item.str.trim()
      if (!str) continue
      items.push({
        text: str,
        x: Math.round(item.transform[4] * 10) / 10,
        y: Math.round(item.transform[5] * 10) / 10,
        fontSize: Math.round(item.transform[0] * 10) / 10,
      })
    }

    // Sort: Y descending (top of page first), then X ascending
    items.sort((a, b) => b.y - a.y || a.x - b.x)

    // Print as table
    console.log('X\tY\tSize\tText')
    console.log('─'.repeat(80))
    for (const it of items) {
      console.log(`${it.x}\t${it.y}\t${it.fontSize}\t${it.text}`)
    }

    // Also write a CSV for easier analysis
    const csv = ['x,y,fontSize,text']
    for (const it of items) {
      csv.push(`${it.x},${it.y},${it.fontSize},"${it.text.replace(/"/g, '""')}"`)
    }
    const csvPath = join(__dirname, `pdf_coords_page${p}.csv`)
    writeFileSync(csvPath, csv.join('\n'))
    console.log(`\nCSV written to ${csvPath}`)
  }
}

analyze().catch(console.error)
