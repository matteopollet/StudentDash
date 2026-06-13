'use client'
import { useState, useEffect } from 'react'

type SimulatorData = Record<string, Record<string, {
  name: string,
  subjects: { name: string; coef: number; grade: string }[]
}>>

const TARGET_AVG = 8

export default function SimulatorClient({ initialData }: { initialData: SimulatorData }) {
  const semesters = Object.keys(initialData)
  const defaultSem = semesters.includes('S5') ? 'S5' : (semesters[0] || '')
  const defaultUe = defaultSem && initialData[defaultSem] ? Object.keys(initialData[defaultSem])[0] : ''

  const [activeSem, setActiveSem] = useState<string>(defaultSem)
  const [activeUe, setActiveUe] = useState<string>(defaultUe)
  
  const ues = initialData[activeSem] ?? {}
  const ue = ues[activeUe]
  const subjects = ue?.subjects || []

  // Default simulated subject to the first one without a real grade, or the first one
  const [simulatedSubjectName, setSimulatedSubjectName] = useState<string>('')
  
  // Store hypothetical grades for all missing subjects
  const [hypotheticalGrades, setHypotheticalGrades] = useState<Record<string, string>>({})

  useEffect(() => {
    if (subjects.length > 0) {
      const firstEmpty = subjects.find(s => s.grade === '')
      setSimulatedSubjectName(firstEmpty ? firstEmpty.name : subjects[0].name)
      
      const initialHypos: Record<string, string> = {}
      subjects.forEach(s => {
        if (s.grade === '') initialHypos[s.name] = '8' // Default estimate
      })
      setHypotheticalGrades(initialHypos)
    }
  }, [activeUe, activeSem])

  if (!semesters.length) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--md-on-surface-variant)' }}>
        Aucune donnée de programme disponible.
      </div>
    )
  }

  const activeSubject = subjects.find(s => s.name === simulatedSubjectName) || subjects[0]
  const otherMissingSubjects = subjects.filter(s => s.name !== activeSubject?.name && s.grade === '')

  // Calculate real UE average (from actual DB grades only)
  let realPoints = 0
  let realCoef = 0
  let totalCoef = 0

  subjects.forEach(s => {
    totalCoef += s.coef
    if (s.grade !== '') {
      realPoints += parseFloat(s.grade) * s.coef
      realCoef += s.coef
    }
  })

  const currentUeAvg = realCoef > 0 ? realPoints / realCoef : null
  const isRealValidated = currentUeAvg !== null && currentUeAvg >= TARGET_AVG

  // Calculate simulated scenario
  let fixedPoints = 0
  let fixedCoef = 0
  subjects.forEach(s => {
    if (s.name !== activeSubject?.name) {
      if (s.grade !== '') {
        fixedPoints += parseFloat(s.grade) * s.coef
        fixedCoef += s.coef
      } else {
        const hypo = parseFloat(hypotheticalGrades[s.name]) || 0
        fixedPoints += hypo * s.coef
        fixedCoef += s.coef
      }
    }
  })

  const simVal = activeSubject?.grade !== '' ? parseFloat(activeSubject?.grade || '0') : parseFloat(hypotheticalGrades[activeSubject?.name] || '0')
  const simulatedPoints = fixedPoints + (!isNaN(simVal) ? simVal * activeSubject?.coef : 0)
  const simulatedCoef = fixedCoef + activeSubject?.coef
  const simulatedUeAvg = simulatedCoef > 0 ? simulatedPoints / simulatedCoef : null
  const isSimValidated = simulatedUeAvg !== null && simulatedUeAvg >= TARGET_AVG

  // Calculate strictly required grade to reach TARGET_AVG in the UE
  const requiredPoints = (TARGET_AVG * totalCoef) - fixedPoints
  const requiredGrade = activeSubject ? requiredPoints / activeSubject.coef : 0

  // SVG Gauge Math
  const gaugeRadius = 60
  const gaugeCircumference = Math.PI * gaugeRadius
  const gaugeProgress = currentUeAvg !== null 
    ? (Math.min(Math.max(currentUeAvg, 0), 20) / 20) * gaugeCircumference 
    : 0
    
  const thresholdPercentage = (TARGET_AVG / 20) * 100
  const thresholdX = 10 + (120 * (thresholdPercentage / 100))
  // The angle for the threshold line: from left (180deg) to right (0deg)
  const angle = Math.PI - (TARGET_AVG / 20) * Math.PI
  const lineX = 70 + Math.cos(angle) * 60
  const lineY = 70 - Math.sin(angle) * 60

  const updateHypo = (name: string, val: string) => {
    setHypotheticalGrades(p => ({ ...p, [name]: val }))
  }

  return (
    <>
      <header className="md-top-bar">
        <span className="material-symbols-rounded filled" style={{ color: 'var(--md-primary)', fontSize: 24 }}>calculate</span>
        <span className="md-top-bar-title">Calculateur de Validation</span>
      </header>

      <main className="page-content">
        {/* Semester selector */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '4px' }} role="tablist">
          {semesters.map(sem => (
            <button
              key={sem}
              role="tab"
              aria-selected={activeSem === sem}
              className={`md-chip ${activeSem === sem ? 'active' : ''}`}
              onClick={() => {
                setActiveSem(sem)
                setActiveUe(Object.keys(initialData[sem] || {})[0] || '')
              }}
            >
              {sem}
            </button>
          ))}
        </div>

        {/* UE selector */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
          {Object.entries(ues).map(([code, _]) => (
            <button
              key={code}
              className={`md-chip ${activeUe === code ? 'active' : ''}`}
              onClick={() => setActiveUe(code)}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {code}
            </button>
          ))}
        </div>

        {/* 1. Visualisation de l'État Actuel */}
        <div className="md-card md-card-elevated animate-in" style={{ marginBottom: '1.5rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 'var(--md-title-medium)', fontWeight: 600, color: 'var(--md-on-surface)', marginBottom: '1rem' }}>
            État Actuel : {activeUe}
          </p>

          <div style={{ position: 'relative', width: 200, height: 110, display: 'flex', justifyContent: 'center' }}>
            <svg viewBox="0 0 140 80" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {/* Background track */}
              <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke="var(--md-surface-container-highest)" strokeWidth="12" strokeLinecap="round" />
              
              {/* Threshold line at TARGET_AVG */}
              <line x1={lineX} y1={lineY} x2={lineX + Math.cos(angle)*10} y2={lineY - Math.sin(angle)*10} stroke="var(--md-outline)" strokeWidth="2" strokeDasharray="2 2" />
              <text x={lineX + Math.cos(angle)*18} y={lineY - Math.sin(angle)*18 + 4} textAnchor="middle" fontSize="8" fill="var(--md-on-surface-variant)">{TARGET_AVG}</text>
              
              {/* Progress track */}
              {currentUeAvg !== null && (
                <path 
                  d="M 10 70 A 60 60 0 0 1 130 70" 
                  fill="none" 
                  stroke={isRealValidated ? "var(--md-success)" : "var(--md-error)"} 
                  strokeWidth="12" 
                  strokeLinecap="round" 
                  strokeDasharray={gaugeCircumference} 
                  strokeDashoffset={gaugeCircumference - gaugeProgress} 
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.2, 0, 0, 1)' }} 
                />
              )}
            </svg>
            <div style={{ position: 'absolute', bottom: 0, textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--md-display-small)', fontWeight: 700, color: 'var(--md-on-surface)', lineHeight: 1 }}>
                {currentUeAvg !== null ? currentUeAvg.toFixed(2) : '—'}
              </p>
              <p style={{ fontSize: 'var(--md-label-small)', color: 'var(--md-on-surface-variant)' }}>/ 20</p>
            </div>
          </div>

          <div style={{ 
            marginTop: '1.5rem', 
            padding: '0.5rem 1rem', 
            borderRadius: 'var(--md-shape-full)', 
            background: currentUeAvg === null ? 'var(--md-surface-container-highest)' : isRealValidated ? 'var(--md-success-container)' : 'var(--md-error-container)',
            color: currentUeAvg === null ? 'var(--md-on-surface-variant)' : isRealValidated ? 'var(--md-success)' : 'var(--md-error)',
            fontWeight: 700,
            fontSize: 'var(--md-label-large)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {currentUeAvg === null ? (
              <>En attente de notes</>
            ) : isRealValidated ? (
              <><span className="material-symbols-rounded" style={{ fontSize: 18 }}>check_circle</span> VALIDÉ</>
            ) : (
              <><span className="material-symbols-rounded" style={{ fontSize: 18 }}>cancel</span> À VALIDER</>
            )}
          </div>
        </div>

        {/* 2. Espace de Simulation Ciblé */}
        <h2 style={{ fontSize: 'var(--md-title-medium)', fontWeight: 500, color: 'var(--md-on-surface-variant)', marginBottom: '0.75rem' }}>
          Simuler une matière
        </h2>
        <div className="md-card animate-in" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: 'var(--md-label-medium)', color: 'var(--md-on-surface-variant)', marginBottom: '0.5rem' }}>
            Choisir l&apos;enseignement à calculer
          </label>
          <select
            value={simulatedSubjectName}
            onChange={e => setSimulatedSubjectName(e.target.value)}
            style={{
              width: '100%',
              height: 48,
              padding: '0 1rem',
              background: 'var(--md-surface-container-highest)',
              border: '1px solid var(--md-outline)',
              borderRadius: 'var(--md-shape-xs)',
              color: 'var(--md-on-surface)',
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--md-body-large)',
              outline: 'none',
              marginBottom: '1.5rem'
            }}
          >
            {subjects.map(s => (
              <option key={s.name} value={s.name}>
                {s.name} (Coef. {s.coef}) {s.grade !== '' ? `— Note acquise: ${parseFloat(s.grade).toFixed(2)}` : ''}
              </option>
            ))}
          </select>

          {activeSubject?.grade === '' ? (
            <>
              <label style={{ display: 'block', fontSize: 'var(--md-label-medium)', color: 'var(--md-on-surface-variant)', marginBottom: '0.5rem' }}>
                Tester une note hypothétique
              </label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: otherMissingSubjects.length > 0 ? '1.5rem' : '0' }}>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={0.5}
                  value={hypotheticalGrades[activeSubject.name] || '0'}
                  onChange={e => updateHypo(activeSubject.name, e.target.value)}
                  style={{ flex: 1, accentColor: 'var(--md-primary)' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    className="md-btn md-btn-tonal"
                    style={{ width: 36, height: 36, padding: 0, minWidth: 36, borderRadius: 'var(--md-shape-xs)' }}
                    onClick={() => updateHypo(activeSubject.name, Math.max(0, parseFloat(hypotheticalGrades[activeSubject.name] || '0') - 0.5).toString())}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: 18 }}>remove</span>
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    value={hypotheticalGrades[activeSubject.name] || '0'}
                    onChange={e => updateHypo(activeSubject.name, e.target.value)}
                    style={{
                      width: 72,
                      height: 48,
                      textAlign: 'center',
                      background: 'var(--md-surface-container-highest)',
                      border: '1px solid var(--md-outline)',
                      borderRadius: 'var(--md-shape-xs)',
                      color: 'var(--md-on-surface)',
                      fontFamily: 'var(--font-family)',
                      fontSize: 'var(--md-title-medium)',
                      fontWeight: 700,
                      outline: 'none',
                      appearance: 'textfield',
                    }}
                  />
                  <button
                    className="md-btn md-btn-tonal"
                    style={{ width: 36, height: 36, padding: 0, minWidth: 36, borderRadius: 'var(--md-shape-xs)' }}
                    onClick={() => updateHypo(activeSubject.name, Math.min(20, parseFloat(hypotheticalGrades[activeSubject.name] || '0') + 0.5).toString())}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '1rem', background: 'var(--md-surface-container-highest)', borderRadius: 'var(--md-shape-sm)', marginBottom: otherMissingSubjects.length > 0 ? '1.5rem' : '0' }}>
              <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface-variant)' }}>
                Cette matière a déjà une note réelle de <strong>{parseFloat(activeSubject?.grade || '0').toFixed(2)}/20</strong>. Le calcul ci-dessous vous indique la note qui aurait été nécessaire.
              </p>
            </div>
          )}

          {otherMissingSubjects.length > 0 && (
            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--md-outline-variant)' }}>
              <p style={{ fontSize: 'var(--md-label-medium)', color: 'var(--md-on-surface-variant)', marginBottom: '1rem' }}>
                Notes estimées pour les autres matières non notées :
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {otherMissingSubjects.map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <span style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="range"
                        min={0}
                        max={20}
                        step={0.5}
                        value={hypotheticalGrades[s.name] || '8'}
                        onChange={e => updateHypo(s.name, e.target.value)}
                        style={{ width: 80, accentColor: 'var(--md-secondary)' }}
                      />
                      <span style={{ fontSize: 'var(--md-body-small)', fontWeight: 600, width: 32, textAlign: 'right' }}>
                        {parseFloat(hypotheticalGrades[s.name] || '8').toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Résultat de Simulation Dynamique */}
        {activeSubject && (
          <div 
            className="md-card md-card-elevated animate-in" 
            style={{ 
              marginBottom: '2rem', 
              padding: '1.5rem',
              background: isSimValidated ? 'var(--md-success-container)' : 'var(--md-error-container)',
              transition: 'background 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <span className="material-symbols-rounded filled" style={{ fontSize: 32, color: isSimValidated ? 'var(--md-on-success-container)' : 'var(--md-on-error-container)' }}>
                {isSimValidated ? 'verified' : 'warning'}
              </span>
              <div>
                <p style={{ fontSize: 'var(--md-label-large)', color: isSimValidated ? 'var(--md-success)' : 'var(--md-error)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Moyenne UE Simulée
                </p>
                <p style={{ fontSize: 'var(--md-headline-medium)', fontWeight: 700, color: isSimValidated ? 'var(--md-on-success-container)' : 'var(--md-on-error-container)' }}>
                  {simulatedUeAvg !== null ? simulatedUeAvg.toFixed(2) : '—'} 
                  <span style={{ fontSize: 'var(--md-title-medium)', fontWeight: 400, opacity: 0.8 }}> / 20</span>
                </p>
              </div>
            </div>

            <div style={{ 
              background: isSimValidated ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)', 
              padding: '1rem', 
              borderRadius: 'var(--md-shape-sm)',
              color: isSimValidated ? 'var(--md-on-success-container)' : 'var(--md-on-error-container)'
            }}>
              {requiredGrade <= 0 ? (
                <p style={{ fontSize: 'var(--md-body-medium)', fontWeight: 500 }}>
                  🎉 L&apos;UE est validée, quelle que soit la note en {activeSubject.name} !
                </p>
              ) : requiredGrade > 20 ? (
                <p style={{ fontSize: 'var(--md-body-medium)', fontWeight: 500 }}>
                  ⚠️ Même avec 20/20 en {activeSubject.name}, vous ne pourrez pas atteindre la moyenne de {TARGET_AVG}.
                </p>
              ) : (
                <p style={{ fontSize: 'var(--md-body-medium)', fontWeight: 500 }}>
                  Vous devez obtenir au moins une note de <strong>{requiredGrade.toFixed(2)}/20</strong> en <em>{activeSubject.name}</em> pour valider cette UE à {TARGET_AVG}/20.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 4. Détail des Enseignements (Statique) */}
        <h2 style={{ fontSize: 'var(--md-title-medium)', fontWeight: 500, color: 'var(--md-on-surface-variant)', marginBottom: '0.75rem' }}>
          Détail des enseignements (Acquis)
        </h2>

        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {subjects.map((subject, i) => {
            const isReal = subject.grade !== ''

            return (
              <div
                key={i}
                className="md-card animate-in"
                style={{ 
                  animationDelay: `${i * 40}ms`, 
                  padding: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  border: subject.name === simulatedSubjectName ? '2px solid var(--md-primary)' : '2px solid transparent'
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface)', marginBottom: 4, fontWeight: subject.name === simulatedSubjectName ? 600 : 400 }}>
                    {subject.name}
                  </p>
                  <p style={{ fontSize: 'var(--md-label-small)', color: 'var(--md-on-surface-variant)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Coef {subject.coef}
                    {isReal && <span style={{ color: 'var(--md-primary)', background: 'var(--md-primary-container)', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>Note réelle</span>}
                    {!isReal && subject.name === simulatedSubjectName && <span style={{ color: 'var(--md-tertiary)', background: 'var(--md-tertiary-container)', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>Calcul cible</span>}
                    {!isReal && subject.name !== simulatedSubjectName && <span style={{ color: 'var(--md-secondary)', background: 'var(--md-secondary-container)', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>Note estimée</span>}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isReal ? (
                    <span style={{ fontSize: 'var(--md-title-medium)', fontWeight: 700, color: 'var(--md-on-surface)' }}>
                      {parseFloat(subject.grade).toFixed(2)}
                    </span>
                  ) : (
                    <span style={{ fontSize: 'var(--md-title-medium)', fontWeight: 700, color: 'var(--md-on-surface-variant)', opacity: subject.name === simulatedSubjectName ? 1 : 0.7 }}>
                      {parseFloat(hypotheticalGrades[subject.name] || '0').toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </>
  )
}
