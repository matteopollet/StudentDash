import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import SimulatorClient from './SimulatorClient'
import { redirect } from 'next/navigation'

function normalizeSubject(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

export default async function SimulatorPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/')
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { academicPath: true }
  })
  const userPath = dbUser?.academicPath || 'DL'

  const curriculum = await prisma.curriculumSubject.findMany({
    where: {
      path: { in: ['COMMON', userPath] }
    },
    orderBy: [
      { semester: 'asc' },
      { ueCode: 'asc' },
      { id: 'asc' }
    ]
  })

  const userGrades = await prisma.grade.findMany({
    where: { userId: session.user.id }
  })

  const simulatorData: Record<string, Record<string, {
    name: string,
    subjects: { name: string; coef: number; grade: string }[]
  }>> = {}

  for (const c of curriculum) {
    if (!simulatorData[c.semester]) simulatorData[c.semester] = {}
    if (!simulatorData[c.semester][c.ueCode]) {
      simulatorData[c.semester][c.ueCode] = {
        name: c.ueName,
        subjects: []
      }
    }

    const cNorm = normalizeSubject(c.subjectName)
    const ueGrades = userGrades.filter(g => g.semester === c.semester && g.ueCode === c.ueCode)
    
    let matchingGrade = ueGrades.find(g => normalizeSubject(g.subjectName) === cNorm)
    
    if (!matchingGrade) {
      matchingGrade = ueGrades.find(g => 
        normalizeSubject(g.subjectName).includes(cNorm) || 
        cNorm.includes(normalizeSubject(g.subjectName))
      )
    }

    simulatorData[c.semester][c.ueCode].subjects.push({
      name: c.subjectName,
      coef: c.coefficient,
      grade: matchingGrade && matchingGrade.value !== null ? matchingGrade.value.toString() : ''
    })
  }

  return <SimulatorClient initialData={simulatorData} />
}
