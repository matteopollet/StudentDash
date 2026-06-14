'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

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
  const semParam = searchParams.get('semester')

  const [data, setData] = useState<GradeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSem, setActiveSem] = useState<string>(semParam ?? '')
  const [expandedUes, setExpandedUes] = useState<Set<string>>(new Set())

  useEffect(() => {
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
  }, [])

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
      <header className="md-top-bar">
        <span className="material-symbols-rounded filled" style={{ color: 'var(--md-primary)', fontSize: 24 }}>school</span>
        <span className="md-top-bar-title">Mes notes</span>
      </header>

      <main className="page-content">
        {/* Semester selector chips */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1rem' }} role="tablist" aria-label="Semestres">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="skeleton" style={{ width: 60, height: 32, borderRadius: 'var(--md-shape-sm)', flexShrink: 0 }} />)
          ) : (
            semesters.map(sem => (
              <button
                key={sem}
                role="tab"
                aria-selected={activeSem === sem}
                className={`md-chip ${activeSem === sem ? 'active' : ''}`}
                onClick={() => setActiveSem(sem)}
                id={`tab-${sem}`}
              >
                {sem}
              </button>
            ))
          )}
        </div>

        {/* Semester average summary */}
        {!loading && activeSem && data && (
          <div className="md-card md-card-elevated animate-in" style={{ marginBottom: '1rem', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)' }}>Semestre {activeSem}</p>
              <p style={{ fontSize: 'var(--md-headline-small)', fontWeight: 500, color: 'var(--md-on-surface)' }}>
                Moyenne: {' '}
                <span style={{ color: 'var(--md-primary)' }}>
                  {data.semesterAverages[activeSem]?.toFixed(2) ?? '—'}/20
                </span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="md-btn md-btn-text"
                style={{ height: 36, fontSize: '0.75rem', padding: '0 0.5rem' }}
                onClick={() => setExpandedUes(new Set(Object.keys(currentUes)))}
              >
                Tout ouvrir
              </button>
              <button
                className="md-btn md-btn-text"
                style={{ height: 36, fontSize: '0.75rem', padding: '0 0.5rem' }}
                onClick={() => setExpandedUes(new Set())}
              >
                Réduire
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
            <p style={{ color: 'var(--md-on-surface-variant)' }}>Aucune note pour ce semestre.</p>
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
                    style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 0, padding: '0.875rem 1rem' }}
                    onClick={() => toggleUe(ueCode)}
                    aria-expanded={isExpanded}
                    aria-controls={`ue-${ueCode}`}
                  >
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <p style={{ fontSize: 'var(--md-title-small)', fontWeight: 600, color: 'var(--md-on-surface)' }}>
                        {ueCode}
                      </p>
                      <p style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)', marginTop: 2 }}>
                        {ueName}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {ueAvg !== null && (
                        <span
                          className={`grade-badge ${gradeClass(ueAvg)}`}
                          style={{
                            height: 28, fontSize: '0.75rem', minWidth: 'auto', padding: '0 0.5rem'
                          }}
                        >
                          {ueAvg.toFixed(2)}/20
                        </span>
                      )}
                      <span className="material-symbols-rounded" style={{ color: 'var(--md-on-surface-variant)', transition: 'transform 200ms', transform: isExpanded ? 'rotate(180deg)' : 'none', fontSize: 20 }}>
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
                            padding: '0.75rem 1rem',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface)' }}>
                              {grade.subjectName}
                            </p>
                            <p style={{ fontSize: 'var(--md-label-small)', color: 'var(--md-on-surface-variant)', marginTop: 2 }}>
                              Coef. {grade.coefficient}
                              {grade.gradeType ? ` · ${grade.gradeType}` : ''}
                            </p>
                          </div>
                          <span className={`grade-badge ${gradeClass(grade.value)}`} aria-label={`Note ${grade.value ?? 'non disponible'}`}>
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
