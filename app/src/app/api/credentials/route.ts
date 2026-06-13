import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { scrapeCyberNotes } from '@/lib/scraper'

// GET /api/credentials — check if credentials are set
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { minesId: true, lastSync: true, academicPath: true },
  })

  return NextResponse.json({
    minesId: user?.minesId,
    lastSync: user?.lastSync,
    academicPath: user?.academicPath || 'DL'
  })
}

// POST /api/credentials — save Mines Alès credentials and trigger first sync
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { minesId, password, academicPath } = await req.json()
  
  if (academicPath) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { academicPath }
    })
  }

  if (!minesId || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }

  // Validate credentials before saving by attempting a scrape
  try {
    const grades = await scrapeCyberNotes(minesId, password)

    // Save encrypted credentials
    const encrypted = encrypt(password)
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        minesId,
        minesPasswordEnc: encrypted,
        lastSync: new Date(),
      },
    })

    // Upsert all scraped grades
    for (const grade of grades) {
      await prisma.grade.upsert({
        where: {
          userId_semester_ueCode_subjectName_gradeType: {
            userId: session.user.id,
            semester: grade.semester,
            ueCode: grade.ueCode,
            subjectName: grade.subjectName,
            gradeType: grade.gradeType ?? '',
          },
        },
        update: {
          value: grade.value,
          ueName: grade.ueName,
          coefficient: grade.coefficient,
        },
        create: {
          userId: session.user.id,
          semester: grade.semester,
          ueCode: grade.ueCode,
          ueName: grade.ueName,
          subjectName: grade.subjectName,
          coefficient: grade.coefficient,
          value: grade.value,
          gradeType: grade.gradeType,
        },
      })
    }

    return NextResponse.json({ success: true, gradesCount: grades.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Scraping failed' }, { status: 422 })
  }
}
