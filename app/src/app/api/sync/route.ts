import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { scrapeCyberNotes } from '@/lib/scraper'
import webpush from 'web-push'

// POST /api/sync — manually trigger a grade sync
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { minesId: true, minesPasswordEnc: true, academicPath: true, lastSync: true },
  })

  if (!user?.minesId || !user?.minesPasswordEnc) {
    return NextResponse.json({ error: 'No credentials configured' }, { status: 400 })
  }

  // Rate limiting for grades sync: Max 1 scrape every 15 minutes per user
  if (user.lastSync) {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    if (user.lastSync > fifteenMinutesAgo) {
      // Just return success and don't spam the school server
      const gradesCount = await prisma.grade.count({ where: { userId: session.user.id } })
      return NextResponse.json({ success: true, gradesCount, cached: true })
    }
  }

  try {
    const password = decrypt(user.minesPasswordEnc)
    const grades = await scrapeCyberNotes(user.minesId, password)
    
    const newlyReleasedSubjects: string[] = []

    for (const grade of grades) {
      // Community Sync Logic: Check if this grade is newly released for the whole school
      if (grade.value !== null) {
        const existingGradeInDb = await prisma.grade.findFirst({
          where: {
            semester: grade.semester,
            subjectName: grade.subjectName,
            value: { not: null }
          }
        })
        if (!existingGradeInDb && !newlyReleasedSubjects.includes(grade.subjectName)) {
          newlyReleasedSubjects.push(grade.subjectName)
        }
      }

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

    // Broadcast Push Notifications for newly released subjects
    if (newlyReleasedSubjects.length > 0 && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:studentdash@example.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      )

      const subscriptions = await prisma.pushSubscription.findMany({
        where: { 
          userId: { not: session.user.id },
          user: { academicPath: user.academicPath }
        }
      })

      for (const subject of newlyReleasedSubjects) {
        const payload = JSON.stringify({
          title: 'Nouvelle note disponible !',
          body: `Une note en "${subject}" semble avoir été publiée. Ouvrez l'appli pour vérifier !`,
          url: '/grades'
        })

        await Promise.allSettled(
          subscriptions.map(sub => 
            webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            }, payload)
            .catch(err => {
              if (err.statusCode === 410 || err.statusCode === 404) {
                // Subscription has expired or is no longer valid, delete it
                return prisma.pushSubscription.delete({ where: { id: sub.id } })
              }
            })
          )
        )
      }
    }

    return NextResponse.json({ success: true, gradesCount: grades.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Sync failed' }, { status: 500 })
  }
}

