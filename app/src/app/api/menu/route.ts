import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/menu
 *
 * Returns the most recent canteen menu stored in the database.
 * No authentication required – the menu is public information.
 */
export async function GET() {
  try {
    const menu = await prisma.cantinaMenu.findFirst({
      orderBy: { fetchedAt: 'desc' },
      take: 1,
    })

    if (!menu) {
      return NextResponse.json(
        { data: null, message: 'Menu non disponible' },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        },
      )
    }

    return NextResponse.json(
      { data: menu.data, weekStart: menu.weekStart, fetchedAt: menu.fetchedAt },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    )
  } catch (err: any) {
    console.error('[menu] Error fetching menu:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
