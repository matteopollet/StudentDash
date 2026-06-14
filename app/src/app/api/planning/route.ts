import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { decrypt } from '@/lib/crypto'
import https from 'https'

function request(options: https.RequestOptions, postData?: string): Promise<{ data: string; headers: any; statusCode: number }> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.setEncoding('latin1')
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ data, headers: res.headers, statusCode: res.statusCode || 200 }))
    })
    req.on('error', reject)
    if (postData) {
      req.write(postData)
    }
    req.end()
  })
}

function parseICS(icsData: string) {
  const events = []
  const lines = icsData.split(/\r?\n/)
  let currentEvent: any = null

  let i = 0
  while (i < lines.length) {
    let line = lines[i]
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      line += lines[i + 1].substring(1)
      i++
    }

    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {}
    } else if (line.startsWith('END:VEVENT')) {
      if (currentEvent && currentEvent.id && currentEvent.start && currentEvent.end) {
        events.push(currentEvent)
      }
      currentEvent = null
    } else if (currentEvent) {
      const splitIdx = line.indexOf(':')
      if (splitIdx !== -1) {
        const keyFull = line.substring(0, splitIdx)
        const value = line.substring(splitIdx + 1).replace(/\\n/g, '\n').replace(/\\,/g, ',')
        const key = keyFull.split(';')[0]
        
        if (key === 'SUMMARY') currentEvent.summary = value
        else if (key === 'LOCATION') currentEvent.location = value
        else if (key === 'DESCRIPTION') currentEvent.description = value
        else if (key === 'UID') currentEvent.id = value
        else if (key === 'DTSTART' || key === 'DTEND') {
          const y = value.substring(0,4)
          const m = value.substring(4,6)
          const d = value.substring(6,8)
          const h = value.substring(9,11)
          const min = value.substring(11,13)
          const sec = value.substring(13,15)
          const isZ = value.endsWith('Z')
          const dt = isZ ? new Date(`${y}-${m}-${d}T${h}:${min}:${sec}Z`) : new Date(`${y}-${m}-${d}T${h}:${min}:${sec}+02:00`)
          
          if (key === 'DTSTART') currentEvent.start = dt
          else currentEvent.end = dt
        }
      }
    }
    i++
  }
  return events
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Extract optional limit query parameter
    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    const events = await prisma.event.findMany({
      where: {
        path: user.academicPath,
        start: { gte: today }
      },
      orderBy: { start: 'asc' },
      ...(limit ? { take: limit } : {})
    })
    return NextResponse.json({ events })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || !user.minesId || !user.minesPasswordEnc) {
      return NextResponse.json({ error: 'Credentials not configured' }, { status: 400 })
    }

    // Rate limiting: avoid fetching if this path was synced within the last hour
    const latestEvent = await prisma.event.findFirst({
      where: { path: user.academicPath },
      orderBy: { updatedAt: 'desc' }
    })

    if (latestEvent) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      if (latestEvent.updatedAt > oneHourAgo) {
        // Return success using cached DB events
        const count = await prisma.event.count({ where: { path: user.academicPath } })
        return NextResponse.json({ success: true, count, cached: true })
      }
    }

    const password = decrypt(user.minesPasswordEnc)
    const postData = new URLSearchParams({
      Username: user.minesId,
      Password: password,
      url: '',
      login: ''
    }).toString()

    const loginRes = await request({
      hostname: 'webdfd.mines-ales.fr',
      port: 443,
      path: '/php/planning-eleves/login/login.php',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData)

    const cookieHeader = loginRes.headers['set-cookie']
    if (!cookieHeader) throw new Error("Failed to get session cookie")

    const indexRes = await request({
      hostname: 'webdfd.mines-ales.fr',
      port: 443,
      path: '/planning-eleves/index.php',
      method: 'GET',
      headers: { 'Cookie': cookieHeader.join('; ') }
    })

    const parts = user.minesId.split('.')
    if (parts.length !== 2) throw new Error("Unsupported username format for planning")
    const [firstName, lastName] = parts
    
    const nameRegex = new RegExp(`<option data-value="(\\d+)" value="([^"]*${lastName}[^"]*${firstName}[^"]*|[^"]*${firstName}[^"]*${lastName}[^"]*)"`, 'i')
    const match = indexRes.data.match(nameRegex)
    
    let studentId = ''
    if (match) studentId = match[1]
    else throw new Error(`Could not find student ID in planning datalist`)

    const icsRes = await request({
      hostname: 'webdfd.mines-ales.fr',
      port: 443,
      path: `/planning-eleves/index.php?url=ics/eleve/${studentId}`,
      method: 'GET',
      headers: { 'Cookie': cookieHeader.join('; ') }
    })

    const parsedEvents = parseICS(icsRes.data)
    
    // Save to DB in small batches to avoid transaction timeout on remote DB
    const BATCH_SIZE = 10
    for (let i = 0; i < parsedEvents.length; i += BATCH_SIZE) {
      const batch = parsedEvents.slice(i, i + BATCH_SIZE)
      await prisma.$transaction(
        batch.map(e =>
          prisma.event.upsert({
            where: { path_icsUid: { path: user.academicPath, icsUid: e.id } },
            update: {
              summary: e.summary || '',
              description: e.description || null,
              location: e.location || null,
              start: e.start,
              end: e.end
            },
            create: {
              path: user.academicPath,
              icsUid: e.id,
              summary: e.summary || '',
              description: e.description || null,
              location: e.location || null,
              start: e.start,
              end: e.end
            }
          })
        )
      )
    }
    
    return NextResponse.json({ success: true, count: parsedEvents.length })
  } catch (error: any) {
    console.error("Planning sync error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
