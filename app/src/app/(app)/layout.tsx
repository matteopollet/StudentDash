import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}
