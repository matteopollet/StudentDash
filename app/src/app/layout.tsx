import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/SessionProvider'
import { auth } from '@/auth'

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
})

export const metadata: Metadata = {
  title: 'StudentDash — Suivi académique INFRES17',
  description: 'Tableau de bord académique pour les étudiants de Mines Alès — suivez vos notes, simulez vos UEs et ne ratez jamais un cours.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  return (
    <html lang="fr" className={roboto.variable}>
      <body>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
