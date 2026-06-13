import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import PlanningClient from './PlanningClient'

export default async function PlanningPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  })

  if (!user || !user.minesId || !user.minesPasswordEnc) {
    redirect('/settings')
  }

  return <PlanningClient />
}
