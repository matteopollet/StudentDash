'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function PageTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return

    const data = JSON.stringify({ path: pathname })
    const blob = new Blob([data], { type: 'application/json' })
    navigator.sendBeacon('/api/analytics/track', blob)
  }, [pathname])

  return null
}
