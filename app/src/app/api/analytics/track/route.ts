import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let path = ''
    try {
      const body = await req.json()
      path = body.path
    } catch {
      // If req.json() fails, try parsing form data or text depending on how sendBeacon sends it.
      // sendBeacon with Blob(application/json) usually works with req.json().
      const text = await req.text()
      try {
        path = JSON.parse(text).path
      } catch {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
      }
    }

    if (!path) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 })
    }

    // Anti-spam F5 : on vérifie si l'utilisateur a déjà visité cette même page dans la dernière minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
    const recentDuplicate = await prisma.userActivity.findFirst({
      where: {
        userId: session.user.id,
        action: 'pageView',
        path: path,
        createdAt: { gte: oneMinuteAgo }
      }
    })

    if (recentDuplicate) {
      // On ignore silencieusement pour ne pas polluer la base de données
      return NextResponse.json({ success: true, ignored: true })
    }

    // Fire and forget
    prisma.userActivity.create({
      data: {
        userId: session.user.id,
        action: 'pageView',
        path,
      }
    }).catch(console.error)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 })
  }
}
