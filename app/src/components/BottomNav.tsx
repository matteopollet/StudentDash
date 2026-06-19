'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/i18n/I18nProvider'

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useTranslation()

  if (pathname === '/settings' || pathname === '/changelog') return null

  const navItems = [
    { href: '/dashboard', icon: 'dashboard', label: t.nav.dashboard },
    { href: '/grades', icon: 'school', label: t.nav.grades },
    { href: '/planning', icon: 'calendar_month', label: t.nav.planning },
  ]

  return (
    <nav className="md-nav-bar" role="navigation" aria-label="Navigation principale">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`md-nav-item ${isActive ? 'active' : ''}`}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="nav-indicator">
              <span className="material-symbols-rounded">{item.icon}</span>
            </div>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
