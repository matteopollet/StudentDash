import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET /api/grades?semester=S5
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const semester = req.nextUrl.searchParams.get('semester')

  const grades = await prisma.grade.findMany({
    where: {
      userId: session.user.id,
      ...(semester ? { semester } : {}),
    },
    orderBy: [{ semester: 'asc' }, { ueCode: 'asc' }, { subjectName: 'asc' }],
  })

  // Group by semester > ueCode
  const grouped: Record<string, Record<string, typeof grades>> = {}
  for (const grade of grades) {
    if (!grouped[grade.semester]) grouped[grade.semester] = {}
    if (!grouped[grade.semester][grade.ueCode]) grouped[grade.semester][grade.ueCode] = []
    grouped[grade.semester][grade.ueCode].push(grade)
  }

  // Compute averages
  const semesterAverages: Record<string, number | null> = {}
  for (const [sem, ues] of Object.entries(grouped)) {
    let totalWeight = 0, weightedSum = 0, hasGrades = false
    for (const subjects of Object.values(ues)) {
      for (const g of subjects) {
        if (g.value !== null) {
          weightedSum += g.value * g.coefficient
          totalWeight += g.coefficient
          hasGrades = true
        }
      }
    }
    semesterAverages[sem] = hasGrades ? weightedSum / totalWeight : null
  }

  return NextResponse.json({ grades, grouped, semesterAverages })
}
