import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseMenuPdf, validateMenu } from '@/lib/menu-parser'
import type { Prisma } from '@prisma/client'

const PDF_URL = 'https://webdfd.mines-ales.fr/restau/Menu_semaine.pdf'
const FETCH_TIMEOUT_MS = 8_000

/**
 * GET /api/cron/update-menu
 *
 * Fetches the weekly canteen PDF, parses it, and upserts the result into the
 * database. Protected by a CRON_SECRET bearer token so only Vercel Cron (or
 * authorised callers) can trigger it.
 */
export async function GET(request: Request) {
  // ---- Auth check ----
  const authHeader = request.headers.get('Authorization')
  const expectedToken = process.env.CRON_SECRET
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ---- Fetch PDF ----
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let pdfResponse: Response
    try {
      pdfResponse = await fetch(PDF_URL, { signal: controller.signal })
    } catch (err: any) {
      clearTimeout(timeout)
      const message = err.name === 'AbortError'
        ? 'PDF fetch timed out'
        : `PDF fetch failed: ${err.message}`
      console.error('[update-menu]', message)
      return NextResponse.json({ error: message }, { status: 502 })
    } finally {
      clearTimeout(timeout)
    }

    if (!pdfResponse.ok) {
      const message = `PDF download returned HTTP ${pdfResponse.status}`
      console.error('[update-menu]', message)
      return NextResponse.json({ error: message }, { status: 502 })
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

    // ---- Parse ----
    const menu = await parseMenuPdf(pdfBuffer)

    // ---- Validate ----
    const validation = validateMenu(menu)
    if (!validation.valid) {
      console.warn('[update-menu] Validation failed:', validation.errors)
      return NextResponse.json(
        { error: 'Menu validation failed', details: validation.errors },
        { status: 422 },
      )
    }

    // ---- Compute Monday of the current week ----
    const now = new Date()
    const dayOfWeek = now.getUTCDay() // 0 = Sunday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + diffToMonday,
    ))

    // ---- Upsert ----
    const menuJson = menu as unknown as Prisma.InputJsonValue
    await prisma.cantinaMenu.upsert({
      where: { weekStart: monday },
      update: {
        data: menuJson,
        fetchedAt: new Date(),
      },
      create: {
        weekStart: monday,
        data: menuJson,
      },
    })

    console.log('[update-menu] Menu upserted for week starting', monday.toISOString())

    return NextResponse.json({
      success: true,
      weekStart: monday.toISOString(),
      days: menu.days.map(d => d.name),
    })
  } catch (err: any) {
    console.error('[update-menu] Unexpected error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
