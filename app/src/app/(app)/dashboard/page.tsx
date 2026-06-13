'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './page.module.css'

interface GradeData {
  grades: any[]
  grouped: Record<string, Record<string, any[]>>
  semesterAverages: Record<string, number | null>
}

function ScoreRing({ value, max = 20, size = 100 }: { value: number | null; max?: number; size?: number }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const progress = value !== null ? (value / max) * circumference : 0
  const color = value === null ? 'var(--md-outline)' : value >= 14 ? 'var(--md-success)' : value >= 12 ? '#4ade80' : value >= 10 ? '#c4930d' : 'var(--md-error)'

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--md-surface-container-highest)"
          strokeWidth={6}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 800ms var(--md-motion-emphasized)' }}
        />
      </svg>
      <div className="score-ring-text">
        <div style={{ fontSize: size > 80 ? '1.25rem' : '0.875rem', fontWeight: 700, color: color, lineHeight: 1 }}>
          {value !== null ? value.toFixed(2) : '—'}
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--md-on-surface-variant)', marginTop: 2 }}>/20</div>
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

  const showSnack = (msg: string) => {
    setSnack(msg)
    setTimeout(() => setSnack(null), 3500)
  }

  const loadData = useCallback(async () => {
    try {
      const [gradesRes, credRes] = await Promise.all([
        fetch('/api/grades'),
        fetch('/api/credentials'),
      ])
      const gradesData = await gradesRes.json()
      const credData = await credRes.json()
      setData(gradesData)
      setHasCredentials(credData.hasCredentials)
      if (credData.lastSync) {
        setLastSync(new Date(credData.lastSync).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const d = await res.json()
      if (d.success) {
        showSnack(`✓ ${d.gradesCount} notes synchronisées`)
        loadData()
      } else {
        showSnack(`Erreur : ${d.error}`)
      }
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

  return (
    <>
      {/* Top App Bar */}
      <header className="md-top-bar">
        <span className="material-symbols-rounded filled" style={{ color: 'var(--md-primary)', fontSize: 28 }}>school</span>
        <span className="md-top-bar-title">StudentDash</span>
        {session?.user?.image && (
          <Image
            src={session.user.image}
            alt={session.user.name ?? 'Avatar'}
            width={36}
            height={36}
            style={{ borderRadius: '50%', objectFit: 'cover' }}
          />
        )}
      </header>

      <main className="page-content">
        {/* Welcome section */}
        <section className={styles.welcome} aria-label="Bienvenue">
          <div>
            <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface-variant)' }}>
              Bonjour,
            </p>
            <h1 style={{ fontSize: 'var(--md-headline-medium)', fontWeight: 400, color: 'var(--md-on-surface)' }}>
              {session?.user?.name?.split(' ')[0] ?? 'Étudiant'} 👋
            </h1>
          </div>
          <button
            id="btn-sync"
            className="md-btn md-btn-tonal"
            onClick={handleSync}
            disabled={syncing || !hasCredentials}
            aria-label="Synchroniser les notes"
            title={!hasCredentials ? 'Configurez vos identifiants dans Réglages' : undefined}
          >
            <span className={`material-symbols-rounded ${syncing ? 'spin' : ''}`} style={{ fontSize: 18 }}>sync</span>
            {syncing ? 'Synchro…' : 'Sync'}
          </button>
        </section>

        {lastSync && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--md-label-small)', color: 'var(--md-on-surface-variant)', marginBottom: '1rem', opacity: 0.7 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>history</span>
            {lastSync}
          </p>
        )}

        {/* No credentials banner */}
        {!loading && hasCredentials === false && (
          <div className={`md-card animate-in ${styles.credBanner}`} role="alert">
            <span className="material-symbols-rounded filled" style={{ color: 'var(--md-tertiary)', fontSize: 24 }}>info</span>
            <div>
              <strong>Configurez CyberNotes</strong>
              <p style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)', marginTop: 4 }}>
                Ajoutez vos identifiants Mines Alès pour synchroniser vos notes automatiquement.
              </p>
            </div>
            <Link href="/settings" className="md-btn md-btn-tonal" style={{ height: 36, fontSize: '0.75rem' }}>
              Configurer
            </Link>
          </div>
        )}

        {/* Overall average hero card */}
        <div className={`md-card md-card-elevated animate-in ${styles.heroCard}`} aria-label="Moyenne générale">
          {loading ? (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 100, height: 100, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '60%', height: 20, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '40%', height: 16 }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <ScoreRing value={overallAvg !== null && !isNaN(overallAvg) ? Number(overallAvg.toFixed(2)) : null} size={108} />
              <div>
                <p style={{ fontSize: 'var(--md-headline-small)', fontWeight: 600, color: 'var(--md-on-surface)', margin: '0 0 0.25rem 0' }}>Moyenne générale</p>
                <p style={{ fontSize: 'var(--md-title-small)', color: 'var(--md-on-surface-variant)' }}>
                  {semesters.length} semestre{semesters.length !== 1 ? 's' : ''}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 8 }}>
                  <span className="md-chip active" style={{ height: 28, fontSize: '0.75rem' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 14 }}>check_circle</span>
                    {totalGrades}/{totalSubjects} notés
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Semester cards */}
        <h2 style={{ fontSize: 'var(--md-title-medium)', color: 'var(--md-on-surface-variant)', margin: '1.5rem 0 0.75rem', fontWeight: 500 }}>
          Par semestre
        </h2>

        {loading ? (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton animate-in" style={{ height: 80, borderRadius: 'var(--md-shape-lg)' }} />
            ))}
          </div>
        ) : semesters.length === 0 ? (
          <div className={`md-card animate-in ${styles.emptyState}`}>
            <span className="material-symbols-rounded" style={{ fontSize: 48, color: 'var(--md-outline)' }}>assignment</span>
            <p style={{ color: 'var(--md-on-surface-variant)', textAlign: 'center' }}>
              Aucune note trouvée.<br />Synchronisez vos notes depuis CyberNotes.
            </p>
          </div>
        ) : (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {semesters.map((sem, i) => {
              const avg = data!.semesterAverages[sem]
              const ues = data!.grouped[sem]
              const count = Object.values(ues).flat().filter(g => g.value !== null).length
              const total = Object.values(ues).flat().length
              const pct = avg !== null ? (avg / 20) * 100 : 0

              return (
                <Link
                  key={sem}
                  href={`/grades?semester=${sem}`}
                  className={`md-card md-card-elevated animate-in ${styles.semCard}`}
                  style={{ animationDelay: `${i * 50}ms` }}
                  aria-label={`Semestre ${sem}, moyenne ${avg?.toFixed(2) ?? '—'}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 'var(--md-title-medium)', fontWeight: 600, color: 'var(--md-on-surface)' }}>
                        Semestre {sem}
                      </p>
                      <p style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)' }}>
                        {count}/{total} matière{total !== 1 ? 's' : ''} notée{total !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        className={`grade-badge ${avg === null ? 'grade-pending' : avg >= 8 ? 'grade-pass' : 'grade-fail'}`}
                        aria-label={`Moyenne ${avg?.toFixed(2) ?? 'non disponible'}`}
                      >
                        {avg !== null ? avg.toFixed(2) : '—'}
                      </span>
                      <span className="material-symbols-rounded" style={{ color: 'var(--md-on-surface-variant)' }}>chevron_right</span>
                    </div>
                  </div>
                  <div className="md-linear-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="md-linear-progress-track" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Quick links */}
        <h2 style={{ fontSize: 'var(--md-title-medium)', color: 'var(--md-on-surface-variant)', margin: '1.5rem 0 0.75rem', fontWeight: 500 }}>
          Accès rapide
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            { href: '/grades', icon: 'school', label: 'Toutes mes notes', color: 'var(--md-primary)' },
            { href: '/simulator', icon: 'calculate', label: 'Simulateur d\'UE', color: 'var(--md-tertiary)' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="md-card md-card-elevated animate-in"
              style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem 1rem' }}
            >
              <span className="material-symbols-rounded filled" style={{ fontSize: 28, color: item.color }}>
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
    </>
  )
}
