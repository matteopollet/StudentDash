'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useTranslation } from '@/i18n/I18nProvider'

interface Grade {
  id: string
  semester: string
  ueCode: string
  ueName: string
  subjectName: string
  coefficient: number
  value: number | null
  gradeType: string | null
}

interface GradeData {
  grades: Grade[]
  grouped: Record<string, Record<string, Grade[]>>
  semesterAverages: Record<string, number | null>
}

function gradeClass(v: number | null) {
  if (v === null) return 'grade-pending'
  if (v >= 8) return 'grade-pass'
  return 'grade-fail'
}

function computeUeAvg(subjects: Grade[]): number | null {
  const notedSubjects = subjects.filter(s => s.value !== null)
  if (notedSubjects.length === 0) return null
  const totalCoef = notedSubjects.reduce((s, g) => s + g.coefficient, 0)
  const sum = notedSubjects.reduce((s, g) => s + g.value! * g.coefficient, 0)
  return sum / totalCoef
}

function GradesContent() {
  const searchParams = useSearchParams()
  const { t, lang } = useTranslation()
  const semParam = searchParams.get('semester')

  const [data, setData] = useState<GradeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSem, setActiveSem] = useState<string>(semParam ?? '')
  const [expandedUes, setExpandedUes] = useState<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)
  const [snack, setSnack] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false })

  const showSnack = (msg: string) => {
    setSnack({ msg, visible: true })
    setTimeout(() => setSnack(s => ({ ...s, visible: false })), 3000)
  }

  const loadData = () => {
    setLoading(true)
    fetch('/api/grades')
      .then(r => r.json())
      .then(d => {
        setData(d)
        if (!activeSem && d.semesterAverages) {
          const sems = Object.keys(d.semesterAverages).sort()
          if (sems.length) setActiveSem(sems[sems.length - 1]) // default to latest
        }
        // Expand all UEs by default
        if (d.grouped) {
          const allUeKeys = Object.values(d.grouped as Record<string, Record<string, unknown>>).flatMap(ues => Object.keys(ues))
          setExpandedUes(new Set(allUeKeys))
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const gradesRes = await fetch('/api/sync', { method: 'POST' })
      const gradesData = await gradesRes.json()
      
      if (gradesData.success) {
        showSnack(lang === 'fr' ? `Synchronisation réussie (${gradesData.gradesCount} notes)` : `Sync successful (${gradesData.gradesCount} grades)`)
        loadData()
      } else {
        showSnack(t.dashboard.syncError)
      }
    } catch (err: any) {
      showSnack((lang === 'fr' ? 'Erreur : ' : 'Error: ') + err.message)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    if (semParam) setActiveSem(semParam)
  }, [semParam])

  const semesters = data ? Object.keys(data.semesterAverages).sort() : []
  const currentUes = data && activeSem ? data.grouped[activeSem] ?? {} : {}

  const toggleUe = (code: string) => {
    setExpandedUes(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  return (
    <>
      <header className="md-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="md-top-bar-title">{t.grades.title}</span>
        <button 
          className="md-icon-button" 
          onClick={handleSync} 
          disabled={syncing} 
          aria-label={t.dashboard.syncGrades}
            style={{ background: 'transparent', border: 'none', color: 'var(--md-on-surface)', width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span className={`material-symbols-rounded ${syncing ? 'spin' : ''}`}>sync</span>
        </button>
      </header>

      <main className="page-content">
        {/* Segmented Button for Semester selector */}
        <div style={{ display: 'flex', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem', width: '100%', WebkitOverflowScrolling: 'touch' }} role="tablist" aria-label="Semestres">
          {loading ? (
            <div className="skeleton" style={{ width: 240, height: 40, borderRadius: 'var(--md-shape-full)' }} />
          ) : semesters.length > 0 ? (
            <div style={{ display: 'inline-flex', border: '1px solid var(--md-outline)', borderRadius: 'var(--md-shape-full)', overflow: 'hidden' }}>
              {semesters.map((sem, i) => (
                <button
                  key={sem}
                  role="tab"
                  aria-selected={activeSem === sem}
                  style={{
                    background: activeSem === sem ? 'var(--md-secondary-container)' : 'transparent',
                    color: activeSem === sem ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface)',
                    border: 'none',
                    borderRight: i < semesters.length - 1 ? '1px solid var(--md-outline)' : 'none',
                    padding: activeSem === sem ? '0 1rem 0 0.75rem' : '0 1rem',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 'var(--md-label-large)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background-color 200ms'
                  }}
                  onClick={() => setActiveSem(sem)}
                  id={`tab-${sem}`}
                >
                  {activeSem === sem && <span className="material-symbols-rounded" style={{ fontSize: 18, marginRight: 8 }}>check</span>}
                  {sem}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Semester average summary */}
        {!loading && activeSem && data && (
          <div className="md-card md-card-elevated animate-in" style={{ marginBottom: '1.5rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: 'var(--md-title-medium)', color: 'var(--md-on-surface-variant)', marginBottom: '0.25rem' }}>{t.dashboard.semester.charAt(0).toUpperCase() + t.dashboard.semester.slice(1)} {activeSem}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: 'var(--md-display-small)', fontWeight: 600, color: 'var(--md-primary)' }}>
                  {data.semesterAverages[activeSem]?.toFixed(2) ?? '—'}
                </span>
                <span style={{ fontSize: 'var(--md-headline-small)', color: 'var(--md-on-surface-variant)', fontWeight: 500 }}>/20</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--md-outline-variant)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <button
                className="md-btn"
                style={{ background: 'transparent', color: 'var(--md-primary)', padding: '0 1rem', height: 40 }}
                onClick={() => {
                  const allKeys = Object.keys(currentUes);
                  if (expandedUes.size === allKeys.length) {
                    setExpandedUes(new Set());
                  } else {
                    setExpandedUes(new Set(allKeys));
                  }
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
                  {expandedUes.size === Object.keys(currentUes).length ? 'unfold_less' : 'unfold_more'}
                </span>
                {expandedUes.size === Object.keys(currentUes).length ? (lang === 'fr' ? 'Tout réduire' : 'Collapse all') : (lang === 'fr' ? 'Tout développer' : 'Expand all')}
              </button>
            </div>
          </div>
        )}

        {/* UE sections */}
        {loading ? (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton animate-in" style={{ height: 72, borderRadius: 'var(--md-shape-lg)' }} />
            ))}
          </div>
        ) : Object.keys(currentUes).length === 0 ? (
          <div className="md-card animate-in" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 48, color: 'var(--md-outline)', display: 'block', marginBottom: 16 }}>assignment_late</span>
            <p style={{ color: 'var(--md-on-surface-variant)' }}>{t.grades.noGrades}</p>
          </div>
        ) : (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(currentUes).map(([ueCode, subjects], i) => {
              const ueAvg = computeUeAvg(subjects)
              const isExpanded = expandedUes.has(ueCode)
              const ueName = subjects[0]?.ueName ?? ueCode
              const validated = ueAvg !== null && ueAvg >= 10

              return (
                <div key={ueCode} className="md-card animate-in" style={{ animationDelay: `${i * 40}ms`, padding: 0, overflow: 'hidden' }}>
                  {/* UE header */}
                  <button
                    className="md-list-item"
                    style={{ width: '100%', minHeight: '48px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 0, padding: '1rem' }}
                    onClick={() => toggleUe(ueCode)}
                    aria-expanded={isExpanded}
                    aria-controls={`ue-${ueCode}`}
                  >
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <p style={{ fontSize: 'var(--md-title-medium)', fontWeight: 600, color: 'var(--md-on-surface)' }}>
                        {ueCode}
                      </p>
                      <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface-variant)', marginTop: 2 }}>
                        {ueName}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {ueAvg !== null && (
                        <span
                          className={`grade-badge ${gradeClass(ueAvg)}`}
                          style={{
                            height: 28, fontSize: '0.875rem', fontWeight: 600, minWidth: 'auto', padding: '0 0.5rem'
                          }}
                        >
                          {ueAvg.toFixed(2)}/20
                        </span>
                      )}
                      <span className="material-symbols-rounded" style={{ color: 'var(--md-on-surface-variant)', transition: 'transform 200ms', transform: isExpanded ? 'rotate(180deg)' : 'none', fontSize: 24 }}>
                        expand_more
                      </span>
                    </div>
                  </button>

                  {/* Subjects list */}
                  {isExpanded && (
                    <div id={`ue-${ueCode}`} style={{ borderTop: '1px solid var(--md-outline-variant)' }}>
                      {subjects.map((grade, j) => (
                        <div
                          key={grade.id}
                          className="md-list-item"
                          style={{
                            borderBottom: j < subjects.length - 1 ? '1px solid var(--md-outline-variant)' : 'none',
                            borderRadius: 0,
                            padding: '0.75rem 1rem 0.75rem 2rem',
                            minHeight: '56px',
                            background: 'var(--md-surface)'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 'var(--md-body-large)', color: 'var(--md-on-surface)' }}>
                              {grade.subjectName}
                            </p>
                            <p style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)', marginTop: 2 }}>
                              {t.grades.coef} {grade.coefficient}
                              {grade.gradeType ? ` · ${grade.gradeType}` : ''}
                            </p>
                          </div>
                          <span className={`grade-badge ${gradeClass(grade.value)}`} style={{ fontSize: '0.875rem', fontWeight: 600 }} aria-label={`Note ${grade.value ?? 'non disponible'}`}>
                            {grade.value !== null ? grade.value.toFixed(2) : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Snackbar */}
      {snack.visible && (
        <div className="md-snackbar" role="status" aria-live="polite">
          {snack.msg}
        </div>
      )}
    </>
  )
}

export default function GradesPage() {
  return (
    <Suspense>
      <GradesContent />
    </Suspense>
  )
}
