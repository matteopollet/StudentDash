import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { scrapeCyberNotes } from '@/lib/scraper'

// POST /api/sync — manually trigger a grade sync
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { minesId: true, minesPasswordEnc: true },
  })

  if (!user?.minesId || !user?.minesPasswordEnc) {
    return NextResponse.json({ error: 'No credentials configured' }, { status: 400 })
  }

  try {
    const password = decrypt(user.minesPasswordEnc)
    const grades = await scrapeCyberNotes(user.minesId, password)

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
          scrapedAt: new Date(),
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
          scrapedAt: new Date(),
        },
      })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastSync: new Date() },
    })

    return NextResponse.json({ success: true, gradesCount: grades.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Sync failed' }, { status: 500 })
  }
}
