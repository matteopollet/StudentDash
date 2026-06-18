import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { PageTracker } from '@/components/PageTracker'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <>
      <PageTracker />
      {children}
      <BottomNav />
    </>
  )
}
