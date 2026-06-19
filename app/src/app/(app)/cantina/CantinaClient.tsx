'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './cantina.module.css'
import { useTranslation } from '@/i18n/I18nProvider'

/* ─── Types ─── */
interface MenuDay {
  name: string
  plats: string[]
  accompagnements: string[]
}

interface MenuResponse {
  data: { days: MenuDay[] } | null
  message?: string
  weekStart?: string
  fetchedAt?: string
}

/* ─── Helpers ─── */
function getDefaultDayIndex(): number {
  const now = new Date()
  let jsDay = now.getDay() // 0=Sun, 1=Mon … 6=Sat
  const hour = now.getHours()

  // After 14:00, show the menu for the next day
  if (hour >= 14) {
    jsDay = (jsDay + 1) % 7
  }

  // 0=Sun, 6=Sat → Map to Monday (index 0)
  if (jsDay === 0 || jsDay === 6) return 0
  return jsDay - 1 // Mon=0 … Fri=4
}

function formatWeekStart(iso: string, lang: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

/* ─── Component ─── */
export default function CantinaClient() {
  const { t, lang } = useTranslation()
  const [days, setDays] = useState<MenuDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [empty, setEmpty] = useState(false)
  const [weekStart, setWeekStart] = useState('')
  const [activeDay, setActiveDay] = useState(getDefaultDayIndex)

  /* Refs for swipe & scroll-snap */
  const swipeRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  /* ─── Fetch menu data ─── */
  useEffect(() => {
    setLoading(true)
    fetch('/api/menu')
      .then(res => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`)
        return res.json()
      })
      .then((data: MenuResponse) => {
        if (!data.data || !data.data.days || data.data.days.length === 0) {
          setEmpty(true)
        } else {
          setDays(data.data.days)
          if (data.weekStart) setWeekStart(data.weekStart)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  /* ─── Scroll the snap container to match active tab ─── */
  const scrollToDay = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const container = swipeRef.current
    if (!container) return
    const pane = container.children[index] as HTMLElement | undefined
    if (pane) {
      container.scrollTo({ left: pane.offsetLeft - container.offsetLeft, behavior })
    }
  }, [])

  /* When activeDay changes programmatically, or data just loaded, sync scroll */
  useEffect(() => {
    if (loading || days.length === 0) return
    
    // Small timeout to ensure DOM is fully laid out before calculating offsetLeft
    const timer = setTimeout(() => {
      const container = swipeRef.current
      if (!container) return
      
      // Auto-scroll the active tab into view
      const activeTab = tabRefs.current[activeDay]
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }

      const pane = container.children[activeDay] as HTMLElement | undefined
      if (pane) {
        const targetLeft = pane.offsetLeft - container.offsetLeft
        // Only trigger scroll if we are not already there (avoids fighting with user scroll)
        if (Math.abs(container.scrollLeft - targetLeft) > 5) {
          // Use 'auto' behavior for immediate jump on first load, 'smooth' otherwise
          const isInitialLoad = container.scrollLeft === 0 && activeDay !== 0
          container.scrollTo({ left: targetLeft, behavior: isInitialLoad ? 'auto' : 'smooth' })
        }
      }
    }, 50)
    
    return () => clearTimeout(timer)
  }, [activeDay, loading, days.length, scrollToDay])

  /* ─── Detect snap-based scroll to update tab ─── */
  useEffect(() => {
    const container = swipeRef.current
    if (!container || days.length === 0) return

    let timeout: ReturnType<typeof setTimeout>
    const handleScroll = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const paneWidth = container.children[0]?.clientWidth ?? 1
        const newIndex = Math.round(container.scrollLeft / paneWidth)
        const clamped = Math.max(0, Math.min(newIndex, days.length - 1))
        setActiveDay(clamped)
      }, 80)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      clearTimeout(timeout)
      container.removeEventListener('scroll', handleScroll)
    }
  }, [days.length])

  /* ─── Touch swipe (fallback for non-snap browsers) ─── */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // Only handle horizontal swipes (ignore vertical scroll)
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return
    if (dx < 0 && activeDay < days.length - 1) {
      setActiveDay(prev => prev + 1)
    } else if (dx > 0 && activeDay > 0) {
      setActiveDay(prev => prev - 1)
    }
  }

  /* ─── Keyboard navigation for tabs ─── */
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let newIndex = index
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      newIndex = Math.min(index + 1, days.length - 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      newIndex = Math.max(index - 1, 0)
    } else if (e.key === 'Home') {
      e.preventDefault()
      newIndex = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      newIndex = days.length - 1
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setActiveDay(index)
      return
    } else {
      return
    }
    setActiveDay(newIndex)
    tabRefs.current[newIndex]?.focus()
  }

  /* ─── Render: Loading skeleton ─── */
  if (loading) {
    return (
      <>
        <header className="md-top-bar">
          <span className="material-symbols-rounded" style={{ color: 'var(--md-primary)' }}>restaurant</span>
          <h1 className="md-top-bar-title">{t.cantina.title}</h1>
        </header>
        <div className="page-content">
          <div className={styles.skeletonWrap}>
            <div className={styles.skeletonTabs}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`${styles.skeletonTab} animate-in`} style={{ animationDelay: `${i * 50}ms` }} />
              ))}
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`${styles.skeletonCard} animate-in`} style={{ animationDelay: `${(i + 5) * 50}ms` }}>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonSectionLabel} />
                <div className={styles.skeletonItem} />
                <div className={styles.skeletonItem} />
                <div className={styles.skeletonSectionLabel} />
                <div className={styles.skeletonItem} />
                <div className={styles.skeletonItem} />
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  /* ─── Render: Error state ─── */
  if (error) {
    return (
      <>
        <header className="md-top-bar">
          <span className="material-symbols-rounded" style={{ color: 'var(--md-primary)' }}>restaurant</span>
          <h1 className="md-top-bar-title">{t.cantina.title}</h1>
        </header>
        <div className="page-content">
          <div className={styles.errorState}>
            <span className={`material-symbols-rounded ${styles.errorIcon}`}>error</span>
            <p className={styles.errorText}>{error}</p>
          </div>
        </div>
      </>
    )
  }

  /* ─── Render: Empty state ─── */
  if (empty || days.length === 0) {
    return (
      <>
        <header className="md-top-bar">
          <span className="material-symbols-rounded" style={{ color: 'var(--md-primary)' }}>restaurant</span>
          <h1 className="md-top-bar-title">{t.cantina.title}</h1>
        </header>
        <div className="page-content">
          <div className={styles.emptyState}>
            <span className={`material-symbols-rounded ${styles.emptyIcon}`}>restaurant</span>
            <p className={styles.emptyTitle}>{t.cantina.noMenu}</p>
            <p className={styles.emptyDescription}>
              {lang === 'fr' ? 'Le menu est généralement publié en début de semaine. Revenez plus tard !' : 'The menu is usually published at the start of the week. Check back later!'}
            </p>
          </div>
        </div>
      </>
    )
  }

  /* ─── Render: Menu ─── */
  return (
    <>
      <header className="md-top-bar">
        <span className="material-symbols-rounded" style={{ color: 'var(--md-primary)' }}>restaurant</span>
        <h1 className="md-top-bar-title">{t.cantina.title}</h1>
      </header>

      <div className="page-content">
        {/* Week info */}
        {weekStart && (
          <p className={styles.weekInfo}>
            <span className="material-symbols-rounded">date_range</span>
            {lang === 'fr' ? 'Semaine du' : 'Week of'} {formatWeekStart(weekStart, lang)}
          </p>
        )}

        {/* Tab bar (mobile only, hidden on desktop via CSS) */}
        <div className={styles.tabBar} role="tablist" aria-label="Jours de la semaine">
          {days.map((day, i) => (
            <button
              key={day.name}
              ref={el => { tabRefs.current[i] = el }}
              role="tab"
              id={`tab-${day.name}`}
              aria-selected={activeDay === i}
              aria-controls={`panel-${day.name}`}
              tabIndex={activeDay === i ? 0 : -1}
              className={`${styles.tab} ${activeDay === i ? styles.tabActive : ''}`}
              onClick={() => setActiveDay(i)}
              onKeyDown={e => handleTabKeyDown(e, i)}
            >
              {day.name}
            </button>
          ))}
        </div>

        {/* Day cards — swipe container on mobile, grid on desktop */}
        <div
          ref={swipeRef}
          className={`${styles.swipeContainer} ${styles.stagger}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {days.map((day, i) => (
            <div
              key={day.name}
              className={styles.swipePane}
              role="tabpanel"
              id={`panel-${day.name}`}
              aria-labelledby={`tab-${day.name}`}
              hidden={false}
            >
              <article
                className={`${styles.dayCard}`}
                aria-label={`Menu du ${day.name}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Plats section */}
                {day.plats.length > 0 && (
                  <section className={styles.sectionCard}>
                    <h3 className={styles.sectionHeader}>
                      <span className="material-symbols-rounded">restaurant_menu</span>
                      {lang === 'fr' ? 'Plats' : 'Main dishes'}
                    </h3>
                    <ul className={styles.foodList}>
                      {day.plats.map((plat, j) => {
                        let prefix = '•'
                        const lower = plat.toLowerCase()
                        if (lower.includes('végét') || lower.includes('soja') || lower.includes('légume') || lower.includes('blé')) prefix = '🌱'
                        else if (lower.includes('poisson') || lower.includes('merlu') || lower.includes('truite') || lower.includes('hoki') || lower.includes('cabillaud') || lower.includes('saumon')) prefix = '🐟'
                        else if (lower.includes('poulet') || lower.includes('dinde') || lower.includes('volaille') || lower.includes('nugget')) prefix = '🍗'
                        else prefix = '🥩' // Default to meat if not identified otherwise

                        return (
                          <li key={j} className={styles.foodItem}>
                            <span aria-hidden="true" style={{ fontSize: '1.2rem', marginTop: '-2px' }}>{prefix}</span>
                            <span>{plat}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}

                {/* Accompagnements section */}
                {day.accompagnements.length > 0 && (
                  <section className={styles.sectionCard}>
                    <h3 className={styles.sectionHeader}>
                      <span className="material-symbols-rounded">grocery</span>
                      {lang === 'fr' ? 'Accompagnements' : 'Side dishes'}
                    </h3>
                    <ul className={styles.foodList}>
                      {day.accompagnements.map((acc, j) => (
                        <li key={j} className={styles.foodItem}>
                          <span aria-hidden="true" style={{ fontSize: '1.2rem', marginTop: '-2px' }}>🥗</span>
                          <span>{acc}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </article>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
