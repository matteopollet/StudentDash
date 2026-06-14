'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback, useRef } from 'react'

import Link from 'next/link'
import styles from './page.module.css'

interface GradeData {
  grades: any[]
  grouped: Record<string, Record<string, any[]>>
  semesterAverages: Record<string, number | null>
}

function ScoreRing({ value, max = 20, size = 100, disableAnimation = false }: { value: number | null; max?: number; size?: number; disableAnimation?: boolean }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const progress = value !== null ? (value / max) * circumference : 0
  const color = value === null ? 'var(--md-outline)' : value >= 14 ? '#4ade80' : value >= 12 ? '#86efac' : value >= 10 ? '#facc15' : 'var(--md-error)'

  return (
    <div className="score-ring" style={{ flexShrink: 0, width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0 }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--md-surface-container-highest)"
          strokeWidth={8}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: disableAnimation ? 'none' : 'stroke-dashoffset 800ms var(--md-motion-emphasized)' }}
        />
      </svg>
      <div className="score-ring-text" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <div style={{ fontSize: size > 80 ? '1.5rem' : '1rem', fontWeight: 800, color: color, lineHeight: 1 }}>
          {value !== null ? value.toFixed(2) : '—'}
        </div>
        <div style={{ fontSize: size > 80 ? '0.85rem' : '0.65rem', color: 'var(--md-on-surface-variant)', marginTop: 4, fontWeight: 600 }}>/20</div>
      </div>
    </div>
  )
}

function CanvasScoreRing({ value, max = 20, size = 100 }: { value: number | null; max?: number; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const color = value === null ? 'var(--md-outline)' : value >= 14 ? '#4ade80' : value >= 12 ? '#86efac' : value >= 10 ? '#facc15' : 'var(--md-error)'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Handle high DPI displays for crisp rendering
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, size, size)

    const cx = size / 2
    const cy = size / 2
    const radius = (size - 12) / 2

    // Resolve CSS variables
    const getCSSVar = (v: string) => {
      if (v.startsWith('var(')) {
        return getComputedStyle(document.documentElement).getPropertyValue(v.slice(4, -1)).trim()
      }
      return v
    }

    const bgColor = getCSSVar('var(--md-surface-container-highest)') || '#e5e7eb'
    const strokeColor = getCSSVar(color) || color

    // Draw background
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
    ctx.lineWidth = 8
    ctx.strokeStyle = bgColor
    ctx.stroke()

    // Draw progress
    if (value !== null && value > 0) {
      const progress = value / max
      const startAngle = -Math.PI / 2
      const endAngle = startAngle + (progress * 2 * Math.PI)
      
      ctx.beginPath()
      ctx.arc(cx, cy, radius, startAngle, endAngle)
      ctx.lineWidth = 8
      ctx.strokeStyle = strokeColor
      ctx.lineCap = 'round'
      ctx.stroke()
    }
  }, [value, max, size, color])

  return (
    <div style={{ flexShrink: 0, width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas 
        ref={canvasRef} 
        style={{ width: size, height: size, position: 'absolute', top: 0, left: 0 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <div style={{ fontSize: size > 80 ? '1.5rem' : '1rem', fontWeight: 800, color: color, lineHeight: 1 }}>
          {value !== null ? value.toFixed(2) : '—'}
        </div>
        <div style={{ fontSize: size > 80 ? '0.85rem' : '0.65rem', color: 'var(--md-on-surface-variant)', marginTop: 4, fontWeight: 600 }}>/20</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<GradeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [snack, setSnack] = useState<string | null>(null)
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const [nextEvent, setNextEvent] = useState<any>(null)

  const showSnack = (msg: string) => {
    setSnack(msg)
    setTimeout(() => setSnack(null), 3500)
  }

  const loadData = useCallback(async () => {
    try {
      const [gradesRes, credRes, planRes] = await Promise.all([
        fetch('/api/grades'),
        fetch('/api/credentials'),
        fetch('/api/planning?limit=1')
      ])
      const gradesData = await gradesRes.json()
      const credData = await credRes.json()
      const planData = await planRes.json()
      
      setData(gradesData)
      setHasCredentials(!!credData.minesId)
      if (credData.lastSync) {
        setLastSync(new Date(credData.lastSync).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }))
      }
      if (planData.events && planData.events.length > 0) {
        setNextEvent(planData.events[0])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const [gradesRes, planRes] = await Promise.all([
        fetch('/api/sync', { method: 'POST' }),
        fetch('/api/planning', { method: 'POST' })
      ])
      const gradesData = await gradesRes.json()
      const planData = await planRes.json()
      
      let msg = ''
      if (gradesData.success) msg += `✓ ${gradesData.gradesCount} notes`
      if (planData.success) msg += ` • ${planData.count} cours`
      
      if (msg) {
        showSnack(`${msg} synchronisés`)
        loadData()
      } else {
        showSnack(`Erreur de synchronisation`)
      }
    } catch (err: any) {
      showSnack(`Erreur : ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const semesters = data ? Object.keys(data.semesterAverages).sort() : []
  const overallAvg = data && semesters.length > 0
    ? semesters.reduce((sum, s) => sum + (data.semesterAverages[s] ?? 0), 0) / semesters.filter(s => data.semesterAverages[s] !== null).length
    : null

  const totalGrades = data?.grades.filter(g => g.value !== null).length ?? 0
  const totalSubjects = data?.grades.length ?? 0

  let trendIndicator = null;
  if (data && semesters.length > 1) {
    const currentSemAvg = data.semesterAverages[semesters[semesters.length - 1]];
    const prevSemAvg = data.semesterAverages[semesters[semesters.length - 2]];
    if (currentSemAvg !== null && prevSemAvg !== null) {
      const diff = currentSemAvg - prevSemAvg;
      const isPositive = diff > 0;
      const isNeutral = diff === 0;
      trendIndicator = (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 4, 
          fontSize: '0.75rem', 
          fontWeight: 600, 
          padding: '0 8px', 
          height: 28,
          borderRadius: 'var(--md-shape-sm)', 
          background: isPositive ? 'var(--md-success-container)' : isNeutral ? 'var(--md-surface-variant)' : 'var(--md-error-container)', 
          color: isPositive ? 'var(--md-on-success-container)' : isNeutral ? 'var(--md-on-surface)' : 'var(--md-on-error-container)' 
        }} aria-label={isPositive ? 'En hausse' : isNeutral ? 'Stable' : 'En baisse'}>
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
            {isPositive ? 'trending_up' : isNeutral ? 'trending_flat' : 'trending_down'}
          </span>
          {isPositive ? '+' : ''}{diff.toFixed(2)}
        </span>
      )
    }
  }

  let validGrades: any[] = []
  if (data) {
    validGrades = data.grades.filter(g => typeof g.value === 'number' && !isNaN(g.value))
  }
  const bestGradeObj = validGrades.length > 0 ? validGrades.reduce((prev, curr) => (prev.value > curr.value ? prev : curr)) : null
  const worstGradeObj = validGrades.length > 0 ? validGrades.reduce((prev, curr) => (prev.value < curr.value ? prev : curr)) : null

  const [showShare, setShowShare] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)

  const handleShare = async () => {
    if (!shareRef.current) return
    setIsSharing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(shareRef.current, { backgroundColor: null, scale: 2 })
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const file = new File([blob], 'studentdash-bilan.png', { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Mon Bilan StudentDash',
            text: 'Regarde mes notes ! Essaie toi aussi sur StudentDash :',
            url: window.location.origin
          })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'studentdash-bilan.png'
          a.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } catch (e) {
      console.error(e)
      showSnack('Erreur lors du partage')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <>
      {/* Top App Bar */}
      <header className="md-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px', padding: '0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="md-top-bar-title" style={{ fontSize: 'var(--md-title-large)', fontWeight: 400 }}>StudentDash</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            onClick={handleSync} 
            disabled={syncing || !hasCredentials}
            className="md-icon-button"
            style={{ background: 'transparent', border: 'none', color: 'var(--md-on-surface)', width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Synchroniser les notes"
            title={!hasCredentials ? 'Configurez vos identifiants dans Réglages' : undefined}
          >
            <span className={`material-symbols-rounded ${syncing ? 'spin' : ''}`}>sync</span>
          </button>
          {session?.user && (
            <Link href="/settings" className="md-icon-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', color: 'var(--md-on-surface)', textDecoration: 'none' }} aria-label="Réglages">
              <span className="material-symbols-rounded">settings</span>
            </Link>
          )}
        </div>
      </header>

      <main className="page-content">
        {/* Welcome section */}
        <section className={styles.welcome} aria-label="Bienvenue" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface-variant)' }}>
              Bonjour,
            </p>
            <h1 style={{ fontSize: 'var(--md-headline-medium)', fontWeight: 400, color: 'var(--md-on-surface)' }}>
              {session?.user?.name?.split(' ')[0] ?? 'Étudiant'} 👋
            </h1>
          </div>
          {lastSync && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>history</span>
              Dernière synchro: {lastSync}
            </p>
          )}
        </section>

        {/* No credentials banner / modal */}
        {!loading && hasCredentials === false && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
            <div className="md-card md-card-elevated animate-in" style={{ maxWidth: 400, width: '100%', padding: '2rem', textAlign: 'center', background: 'var(--md-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <span className="material-symbols-rounded filled" style={{ fontSize: 32 }}>person_add</span>
              </div>
              <h2 style={{ fontSize: 'var(--md-headline-small)', margin: '0 0 1rem 0', color: 'var(--md-on-surface)' }}>Bienvenue ! 👋</h2>
              <p style={{ fontSize: 'var(--md-body-large)', color: 'var(--md-on-surface-variant)', marginBottom: '2rem', lineHeight: 1.5 }}>
                Pour voir vos notes et votre emploi du temps, vous devez renseigner vos identifiants Mines Alès (CyberNotes) dans les paramètres.
              </p>
              <Link href="/settings" className="md-btn md-btn-filled" style={{ width: '100%', height: 48, fontSize: '1rem' }}>
                Aller aux paramètres
              </Link>
            </div>
          </div>
        )}

        {/* Overall average hero card */}
        <div className={`md-card md-card-elevated animate-in ${styles.heroCard}`} style={{ position: 'relative' }} aria-label="Moyenne générale">
          {loading ? (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 100, height: 100, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '60%', height: 20, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '40%', height: 16 }} />
              </div>
            </div>
          ) : (
            <>
              <button 
                onClick={() => setShowShare(true)} 
                className="md-icon-button" 
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', color: 'var(--md-on-surface)', border: 'none', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                aria-label="Partager mon bilan"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 24 }}>share</span>
              </button>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingRight: '2rem' }}>
                <ScoreRing value={overallAvg !== null && !isNaN(overallAvg) ? Number(overallAvg.toFixed(2)) : null} size={108} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 'var(--md-title-large)', fontWeight: 600, color: 'var(--md-on-surface)', margin: '0 0 0.25rem 0', wordBreak: 'break-word', lineHeight: 1.2 }}>Moyenne générale</p>
                  <p style={{ fontSize: 'var(--md-title-small)', color: 'var(--md-on-surface-variant)' }}>
                    {semesters.length} semestre{semesters.length !== 1 ? 's' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 8 }}>
                    <span className="md-chip active" style={{ height: 28, fontSize: '0.75rem' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 14 }}>check_circle</span>
                      {totalGrades}/{totalSubjects} notés
                    </span>
                    {trendIndicator}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Next Event Card */}
        {nextEvent && (
          <Link href="/planning" className="md-card md-card-elevated animate-in" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', textDecoration: 'none' }}>
            <div style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)', width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded">event</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 'var(--md-label-small)', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Prochain cours • {new Date(nextEvent.start).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              <p style={{ fontSize: 'var(--md-title-medium)', fontWeight: 700, margin: '0 0 4px 0', lineHeight: 1.2 }}>
                {(function(summary) {
                  const match = summary.match(/^([\w\.]+)\s+(.*)$/);
                  if (match) {
                    return match[1] + ' ' + match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
                  }
                  return summary.charAt(0).toUpperCase() + summary.slice(1).toLowerCase();
                })(nextEvent.summary)}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: 'var(--md-body-small)', opacity: 0.9 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 14 }}>schedule</span>
                  {new Date(nextEvent.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {nextEvent.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 14 }}>location_on</span>
                    {nextEvent.location}
                  </span>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Quick links */}
        <h2 style={{ fontSize: 'var(--md-title-medium)', color: 'var(--md-on-surface-variant)', margin: '1.5rem 0 0.75rem', fontWeight: 500 }}>
          Accès rapide
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          {[
            { href: '/simulator', icon: 'calculate', label: 'Simulateur d\'UE' },
            { href: '/documents', icon: 'folder_open', label: 'Documents' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="md-card md-card-elevated animate-in"
              style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem 1rem' }}
            >
              <span className="material-symbols-rounded filled" style={{ fontSize: 28, color: 'var(--md-primary)' }}>
                {item.icon}
              </span>
              <span style={{ fontSize: 'var(--md-body-medium)', fontWeight: 500, color: 'var(--md-on-surface)' }}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </main>

      {/* Snackbar */}
      {snack && (
        <div className="md-snackbar" role="status" aria-live="polite">
          {snack}
        </div>
      )}

      {/* Share Modal */}
      {showShare && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.8)', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem', backdropFilter: 'blur(4px)' }}>
          
          {/* Content to be captured */}
          <div 
            ref={shareRef}
            style={{ 
              width: 360, 
              minHeight: 640,
              background: 'linear-gradient(135deg, var(--md-surface) 0%, var(--md-surface-container-high) 100%)', 
              borderRadius: 'var(--md-shape-xl)', 
              padding: '2rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              position: 'relative',
              overflow: 'hidden',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {/* Background design elements */}
            <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'var(--md-primary)', opacity: 0.08, filter: 'blur(30px)' }} />
            <div style={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: '50%', background: 'var(--md-tertiary)', opacity: 0.08, filter: 'blur(30px)' }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', zIndex: 1, justifyContent: 'center' }}>
              <span className="material-symbols-rounded filled" style={{ color: 'var(--md-primary)', fontSize: 36 }}>school</span>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--md-on-surface)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>StudentDash</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--md-primary)', fontWeight: 600 }}>Bilan de {session?.user?.name ?? 'Étudiant'}</span>
              </div>
            </div>

            {/* Gauge */}
            <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--md-on-surface-variant)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>
                Moyenne Générale
              </div>
              <CanvasScoreRing value={overallAvg !== null && !isNaN(overallAvg) ? Number(overallAvg.toFixed(2)) : null} size={130} />
            </div>

            {/* Best & Worst */}
            <div style={{ width: '100%', display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', zIndex: 1 }}>
              {/* Best */}
              <div style={{ flex: 1, minWidth: 0, background: 'rgba(74, 222, 128, 0.1)', padding: '1rem', borderRadius: 'var(--md-shape-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#4ade80', marginBottom: '0.5rem' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 20 }}>trending_up</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Meilleure Note</span>
                </div>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4ade80', lineHeight: 1 }}>
                  {bestGradeObj?.value?.toFixed(2) ?? '—'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--md-on-surface)', marginTop: '0.75rem', lineHeight: 1.3, wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {bestGradeObj?.subjectName ? (bestGradeObj.subjectName.length > 40 ? bestGradeObj.subjectName.slice(0, 37) + '...' : bestGradeObj.subjectName) : ''}
                </span>
              </div>
              
              {/* Worst */}
              <div style={{ flex: 1, minWidth: 0, background: 'rgba(248, 113, 113, 0.1)', padding: '1rem', borderRadius: 'var(--md-shape-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#f87171', marginBottom: '0.5rem' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 20 }}>trending_down</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pire Note</span>
                </div>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', lineHeight: 1 }}>
                  {worstGradeObj?.value?.toFixed(2) ?? '—'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--md-on-surface)', marginTop: '0.75rem', lineHeight: 1.3, wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {worstGradeObj?.subjectName ? (worstGradeObj.subjectName.length > 40 ? worstGradeObj.subjectName.slice(0, 37) + '...' : worstGradeObj.subjectName) : ''}
                </span>
              </div>
            </div>

            {/* Semesters Table */}
            {semesters.length > 0 && (
              <div style={{ width: '100%', zIndex: 1 }}>
                <div style={{ background: 'var(--md-surface)', borderRadius: 'var(--md-shape-lg)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid var(--md-outline-variant)' }}>
                  <div style={{ background: 'var(--md-surface-variant)', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--md-outline-variant)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--md-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Moyennes par Semestre</span>
                  </div>
                  <div style={{ padding: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                      {semesters.map(sem => (
                        <div key={sem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.75rem', background: 'var(--md-surface-container-lowest)', borderRadius: '6px', border: '1px solid var(--md-surface-container)' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--md-on-surface)' }}>{sem}</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: data!.semesterAverages[sem]! >= 10 ? '#4ade80' : '#f87171' }}>
                            {data!.semesterAverages[sem]?.toFixed(2) ?? '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Branding */}
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.5, zIndex: 1 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>verified</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Généré par StudentDash</span>
            </div>
            
          </div>

          {/* Action buttons (not captured) */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexShrink: 0 }}>
            <button 
              className="md-btn md-btn-tonal"
              onClick={() => setShowShare(false)}
              disabled={isSharing}
            >
              Fermer
            </button>
            <button 
              className="md-btn md-btn-filled"
              onClick={handleShare}
              disabled={isSharing}
            >
              {isSharing ? (
                <><span className="material-symbols-rounded spin" style={{ fontSize: 18 }}>sync</span> Création...</>
              ) : (
                <><span className="material-symbols-rounded" style={{ fontSize: 18 }}>share</span> Partager l'image</>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
