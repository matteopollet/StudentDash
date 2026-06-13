import fs from 'fs'
import { prisma } from '../lib/prisma'

async function main() {
  const content = fs.readFileSync('../Programme_INFRES17_2024-2027.txt', 'utf8')
  const lines = content.split('\n')

  let currentSemester = ''
  let currentPath = 'COMMON'
  let currentUeCode = ''
  let currentUeName = ''

  await prisma.curriculumSubject.deleteMany({})

  for (let line of lines) {
    line = line.trim()
    if (!line) continue

    // Detect Semester & Path
    // e.g. "SEMESTRE 7 — Parcours DL : Développement Logiciel" or just "SEMESTRE 5"
    const semMatch = line.match(/SEMESTRE (\d+)/)
    if (semMatch) {
      currentSemester = `S${semMatch[1]}`
      if (line.includes('Parcours DL')) {
        currentPath = 'DL'
      } else if (line.includes('Parcours SR')) {
        currentPath = 'SR'
      } else {
        currentPath = 'COMMON'
      }
      continue
    }

    // Detect Module: [Module: 5.1 MATH] UE Mathématiques Outils et Concepts — ECTS: 3
    const moduleMatch = line.match(/^\[Module:\s+([^\]]+)\]\s+UE\s+(.*?)\s*—/)
    if (moduleMatch) {
      currentUeCode = moduleMatch[1].trim()
      currentUeName = moduleMatch[2].trim()
      continue
    }

    // Detect Subject: - Mathématiques pour l'ingénieur                 | h: 36 | Coef: 3
    const subjectMatch = line.match(/^-\s+([^|]+?)\s*\|.*Coef:\s*([\d.]+)/)
    if (subjectMatch && currentSemester && currentUeCode) {
      const subjectName = subjectMatch[1].trim()
      const coef = parseFloat(subjectMatch[2])

      if (isNaN(coef)) continue

      const exists = await prisma.curriculumSubject.findUnique({
        where: {
          semester_path_ueCode_subjectName: {
            semester: currentSemester,
            path: currentPath,
            ueCode: currentUeCode,
            subjectName: subjectName
          }
        }
      })

      if (!exists) {
        await prisma.curriculumSubject.create({
          data: {
            semester: currentSemester,
            path: currentPath,
            ueCode: currentUeCode,
            ueName: currentUeName,
            subjectName: subjectName,
            coefficient: coef
          }
        })
      }
    }
  }

  console.log('Curriculum seeded successfully!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
