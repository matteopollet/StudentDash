'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/i18n/I18nProvider'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

type SimulatorData = Record<string, Record<string, {
  name: string,
  subjects: { name: string; coef: number; grade: string }[]
}>>

const TARGET_AVG = 8

export default function SimulatorClient({ initialData }: { initialData: SimulatorData }) {
  const { t, lang } = useTranslation()
  const allSemesters = Object.keys(initialData).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0
    return numA - numB
  })
  
  const semesters = allSemesters.filter(sem => {
    return Object.values(initialData[sem]).some(ue => ue.subjects.some(s => s.grade !== ''))
  })

  const defaultSem = semesters[semesters.length - 1] || ''
  const defaultUe = defaultSem && initialData[defaultSem] ? Object.keys(initialData[defaultSem])[0] : ''

  const [activeSem, setActiveSem] = useState<string>(defaultSem)
  const [activeUe, setActiveUe] = useState<string>(defaultUe)
  
  const ues = initialData[activeSem] ?? {}
  const ue = ues[activeUe]
  const subjects = ue?.subjects || []

  // Store hypothetical grades for all missing subjects
  const [hypotheticalGrades, setHypotheticalGrades] = useState<Record<string, string>>({})
  const [lockedGrades, setLockedGrades] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (subjects.length > 0) {
      const initialHypos: Record<string, string> = {}
      const initialLocks: Record<string, boolean> = {}
      subjects.forEach(s => {
        if (s.grade === '') {
          initialHypos[s.name] = '10' // Default to 10
          initialLocks[s.name] = false
        }
      })
      setHypotheticalGrades(initialHypos)
      setLockedGrades(initialLocks)
    }
  }, [activeUe, activeSem, subjects])

  if (!semesters.length) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--md-on-surface-variant)' }}>
        {lang === 'fr' ? 'Aucune donnée de programme disponible.' : 'No program data available.'}
      </div>
    )
  }

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

  const missingSubjects = subjects.filter(s => s.grade === '')
  const unlockedMissingSubjects = missingSubjects.filter(s => !lockedGrades[s.name])
  const missingCoef = missingSubjects.reduce((sum, s) => sum + s.coef, 0)
  const unlockedMissingCoef = unlockedMissingSubjects.reduce((sum, s) => sum + s.coef, 0)
  const currentUeAvg = realCoef > 0 ? realPoints / realCoef : null
  const isRealValidated = currentUeAvg !== null && currentUeAvg >= TARGET_AVG

  // Calculate strictly required grade to reach TARGET_AVG in the UE
  let fixedPoints = realPoints
  missingSubjects.forEach(s => {
    if (lockedGrades[s.name]) {
      fixedPoints += (parseFloat(hypotheticalGrades[s.name]) || 0) * s.coef
    }
  })
  
  const uniformRequiredGrade = unlockedMissingCoef > 0 ? ((TARGET_AVG * totalCoef) - fixedPoints) / unlockedMissingCoef : 0

  // Calculate simulated scenario
  let simulatedPoints = 0
  let simulatedCoef = 0
  subjects.forEach(s => {
    if (s.grade !== '') {
      simulatedPoints += parseFloat(s.grade) * s.coef
      simulatedCoef += s.coef
    } else {
      const hypo = parseFloat(hypotheticalGrades[s.name]) || 0
      simulatedPoints += hypo * s.coef
      simulatedCoef += s.coef
    }
  })

  const simulatedUeAvg = simulatedCoef > 0 ? simulatedPoints / simulatedCoef : null
  const isSimValidated = simulatedUeAvg !== null && simulatedUeAvg >= TARGET_AVG - 0.001

  // SVG Gauge Math
  const gaugeRadius = 60
  const gaugeCircumference = Math.PI * gaugeRadius
  const gaugeProgress = currentUeAvg !== null 
    ? (Math.min(Math.max(currentUeAvg, 0), 20) / 20) * gaugeCircumference 
    : 0
    
  // The angle for the threshold line: from left (180deg) to right (0deg)
  const angle = Math.PI - (TARGET_AVG / 20) * Math.PI

  const updateHypo = (name: string, val: string) => {
    setHypotheticalGrades(p => ({ ...p, [name]: val }))
  }

  const handleCalculateMinimum = () => {
    if (unlockedMissingCoef === 0) return
    const uniformGrade = Math.max(0, uniformRequiredGrade)
    const newHypos = { ...hypotheticalGrades }
    unlockedMissingSubjects.forEach(s => {
      newHypos[s.name] = Math.min(20, uniformGrade).toFixed(2)
    })
    setHypotheticalGrades(newHypos)
  }

  const toggleLock = (name: string) => {
    setLockedGrades(p => ({ ...p, [name]: !p[name] }))
  }

  return (
    <>
      <header className="md-top-bar" style={{ gap: '0.5rem' }}>
        <span className="material-symbols-rounded filled" style={{ color: 'var(--md-primary)', fontSize: 24 }}>calculate</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <select 
            value={activeSem} 
            onChange={(e) => {
              setActiveSem(e.target.value)
              setActiveUe(Object.keys(initialData[e.target.value] || {})[0] || '')
            }}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              fontSize: 'var(--md-title-large)', 
              color: 'var(--md-on-surface)', 
              outline: 'none', 
              fontWeight: 400,
              appearance: 'none',
              cursor: 'pointer',
              padding: '0 4px',
            }}
            aria-label={lang === 'fr' ? 'Sélectionner le semestre' : 'Select semester'}
          >
            {semesters.map(sem => <option key={sem} value={sem}>{sem}</option>)}
          </select>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--md-on-surface-variant)', marginLeft: -4, pointerEvents: 'none' }}>arrow_drop_down</span>
        </div>
      </header>

      <main className="page-content" style={{ paddingBottom: '88px' }}>
        {/* UE selector */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
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

        {/* Predictive Chart */}
        <div className="md-card md-card-elevated animate-in" style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'var(--md-surface-container)' }}>
          <p style={{ fontSize: 'var(--md-title-medium)', color: 'var(--md-on-surface-variant)', marginBottom: '1rem' }}>{lang === 'fr' ? 'Projection sur les semestres' : 'Semester projection'}</p>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                data={semesters.map(sem => {
                  if (sem === activeSem) {
                    return { name: sem, value: simulatedUeAvg !== null ? Number(simulatedUeAvg.toFixed(2)) : null }
                  }
                  let pts = 0, coef = 0
                  Object.values(initialData[sem] || {}).forEach(ueGroup => {
                    ueGroup.subjects.forEach(s => {
                      if (s.grade !== '') { pts += parseFloat(s.grade) * s.coef; coef += s.coef }
                    })
                  })
                  const avg = coef > 0 ? pts / coef : null
                  return { name: sem, value: avg !== null ? Number(avg.toFixed(2)) : null }
                }).filter(d => d.value !== null)} 
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--md-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--md-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--md-on-surface)', fontSize: 12 }} dy={10} />
                <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip 
                  contentStyle={{ background: 'var(--md-surface-container-highest)', border: 'none', borderRadius: 'var(--md-shape-sm)', color: 'var(--md-on-surface)' }}
                  itemStyle={{ color: 'var(--md-primary)', fontWeight: 'bold' }}
                  formatter={(val: any) => [`${val} / 20`, lang === 'fr' ? 'Moyenne' : 'Average']}
                />
                <Area type="monotone" dataKey="value" stroke="var(--md-primary)" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#simGrad)" isAnimationActive={true} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 1. Visualisation de l'État Actuel */}
        <div className="md-card md-card-elevated animate-in" style={{ marginBottom: '1.5rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 'var(--md-title-medium)', fontWeight: 600, color: 'var(--md-on-surface)', marginBottom: '1rem' }}>
            {lang === 'fr' ? 'État Actuel :' : 'Current Status:'} {activeUe}
          </p>

          <div style={{ position: 'relative', width: 220, height: 130, display: 'flex', justifyContent: 'center' }}>
            <svg viewBox="0 -20 140 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {/* Background track */}
              <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke="var(--md-surface-container-highest)" strokeWidth="12" strokeLinecap="round" />
              
              {/* Threshold tick mark at TARGET_AVG */}
              <line 
                x1={70 + Math.cos(angle)*50} 
                y1={70 - Math.sin(angle)*50} 
                x2={70 + Math.cos(angle)*70} 
                y2={70 - Math.sin(angle)*70} 
                stroke="var(--md-outline)" 
                strokeWidth="3" 
                strokeLinecap="round"
              />
              <text x={70 + Math.cos(angle)*85} y={70 - Math.sin(angle)*85 + 4} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--md-on-surface-variant)">{lang === 'fr' ? 'Seuil' : 'Threshold'} ({TARGET_AVG})</text>
              
              {/* Progress track */}
              {currentUeAvg !== null && (
                <motion.path 
                  d="M 10 70 A 60 60 0 0 1 130 70" 
                  fill="none" 
                  stroke={isRealValidated ? "var(--md-primary)" : "var(--md-error)"} 
                  strokeWidth="12" 
                  strokeLinecap="round" 
                  strokeDasharray={gaugeCircumference} 
                  initial={{ strokeDashoffset: gaugeCircumference }}
                  animate={{ strokeDashoffset: gaugeCircumference - gaugeProgress }} 
                  transition={{ duration: 0.8, ease: "circOut" }} 
                />
              )}
            </svg>
            <div style={{ position: 'absolute', bottom: 10, textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--md-display-small)', fontWeight: 700, color: 'var(--md-on-surface)', lineHeight: 1 }}>
                {currentUeAvg !== null ? currentUeAvg.toFixed(2) : '—'}
              </p>
              <p style={{ fontSize: 'var(--md-label-small)', color: 'var(--md-on-surface-variant)' }}>/ 20</p>
            </div>
          </div>

          <div style={{ 
            marginTop: '1rem', 
            padding: '0.5rem 1rem', 
            borderRadius: 'var(--md-shape-full)', 
            background: currentUeAvg === null ? 'var(--md-surface-container-highest)' : isRealValidated ? 'var(--md-primary-container)' : 'var(--md-error-container)',
            color: currentUeAvg === null ? 'var(--md-on-surface-variant)' : isRealValidated ? 'var(--md-on-primary-container)' : 'var(--md-on-error-container)',
            fontWeight: 700,
            fontSize: 'var(--md-label-large)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {currentUeAvg === null ? (
              <>{lang === 'fr' ? 'En attente de notes' : 'Waiting for grades'}</>
            ) : isRealValidated ? (
              <><span className="material-symbols-rounded" style={{ fontSize: 18 }}>check_circle</span> {lang === 'fr' ? 'VALIDÉ' : 'VALIDATED'}</>
            ) : (
              <><span className="material-symbols-rounded" style={{ fontSize: 18 }}>cancel</span> {lang === 'fr' ? 'À VALIDER' : 'TO VALIDATE'}</>
            )}
          </div>
        </div>

        {/* 2. Résultat de Simulation (Le Cœur du Simulateur) */}
        <div 
          className="md-card md-card-elevated animate-in" 
          style={{ 
            marginBottom: '2rem', 
            padding: '1.5rem',
            background: 'var(--md-secondary-container)',
            color: 'var(--md-on-secondary-container)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
            <span className="material-symbols-rounded filled" style={{ fontSize: 32, color: 'var(--md-primary)' }}>
              flag
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 'var(--md-label-large)', color: 'var(--md-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                {lang === 'fr' ? 'Objectif (Matières restantes)' : 'Target (Remaining subjects)'}
              </p>
              <p style={{ fontSize: 'var(--md-display-medium)', fontWeight: 700, color: 'var(--md-on-secondary-container)', lineHeight: 1 }}>
                {unlockedMissingCoef > 0 ? (
                  uniformRequiredGrade <= 0 ? (
                    <span style={{ fontSize: 'var(--md-headline-medium)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      🎉 {lang === 'fr' ? 'Objectif atteint' : 'Target reached'}
                    </span>
                  ) : uniformRequiredGrade > 20 ? (lang === 'fr' ? 'Impossible' : 'Impossible') : uniformRequiredGrade.toFixed(2).replace('.', ',')
                ) : (
                  <span style={{ fontSize: 'var(--md-headline-medium)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-rounded">{isSimValidated ? 'verified' : 'warning'}</span> 
                    {isSimValidated ? (lang === 'fr' ? 'Validé' : 'Validated') : (lang === 'fr' ? 'Échec' : 'Failed')}
                  </span>
                )}
                {unlockedMissingCoef > 0 && uniformRequiredGrade > 0 && uniformRequiredGrade <= 20 && <span style={{ fontSize: 'var(--md-title-medium)', fontWeight: 400, opacity: 0.8 }}> / 20</span>}
              </p>
              {unlockedMissingCoef > 0 && uniformRequiredGrade > 20 && (
                <p style={{ fontSize: 'var(--md-body-small)', marginTop: 8, color: 'var(--md-error)' }}>
                  {lang === 'fr' ? "Mathématiquement impossible d'atteindre" : "Mathematically impossible to reach"} {TARGET_AVG}/20 {lang === 'fr' ? "avec les notes verrouillées." : "with locked grades."}
                </p>
              )}
            </div>
          </div>

          <div style={{ 
            marginTop: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(var(--md-primary-rgb, 103, 80, 164), 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <p style={{ fontSize: 'var(--md-label-medium)', color: 'var(--md-on-secondary-container)', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {lang === 'fr' ? 'Moyenne UE simulée' : 'Simulated UE average'}
              </p>
              <p style={{ fontSize: 'var(--md-title-large)', fontWeight: 700, color: 'var(--md-on-secondary-container)' }}>
                {simulatedUeAvg !== null ? simulatedUeAvg.toFixed(2).replace('.', ',') : '—'} <span style={{ fontSize: 'var(--md-title-medium)', fontWeight: 400, opacity: 0.8 }}>/ 20</span>
              </p>
            </div>
          </div>
        </div>

        {/* 3. Détail des Enseignements (Interactif) */}
        <h2 style={{ fontSize: 'var(--md-title-medium)', fontWeight: 500, color: 'var(--md-on-surface-variant)', marginBottom: '0.75rem' }}>
          {lang === 'fr' ? 'Détail des enseignements' : 'Subject details'}
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
                  border: !isReal ? '1px solid var(--md-outline-variant)' : '1px solid transparent'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {subject.name}
                  </p>
                  <p style={{ fontSize: 'var(--md-label-small)', color: 'var(--md-on-surface-variant)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Coef {subject.coef}
                    {isReal && <span style={{ color: 'var(--md-primary)', background: 'var(--md-primary-container)', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{lang === 'fr' ? 'Note réelle' : 'Real grade'}</span>}
                    {!isReal && <span style={{ color: 'var(--md-secondary)', background: 'var(--md-secondary-container)', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{lang === 'fr' ? 'Simulé' : 'Simulated'}</span>}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {isReal ? (
                    <span style={{ fontSize: 'var(--md-title-medium)', fontWeight: 700, color: 'var(--md-on-surface)' }}>
                      {parseFloat(subject.grade).toFixed(2).replace('.', ',')}
                    </span>
                  ) : (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="md-icon-button"
                        onClick={() => toggleLock(subject.name)}
                        style={{
                          width: 36, height: 36,
                          color: lockedGrades[subject.name] ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
                          background: lockedGrades[subject.name] ? 'var(--md-primary-container)' : 'transparent',
                          borderRadius: '50%',
                          border: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          opacity: lockedGrades[subject.name] ? 1 : 0.6
                        }}
                        aria-label={lockedGrades[subject.name] ? (lang === 'fr' ? "Déverrouiller cette note" : "Unlock this grade") : (lang === 'fr' ? "Verrouiller cette note" : "Lock this grade")}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
                          {lockedGrades[subject.name] ? 'lock' : 'lock_open_right'}
                        </span>
                      </button>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          step={0.1}
                          value={hypotheticalGrades[subject.name] !== undefined ? hypotheticalGrades[subject.name] : ''}
                          onChange={e => updateHypo(subject.name, e.target.value)}
                          disabled={lockedGrades[subject.name]}
                          style={{
                            width: 80,
                            height: 48,
                            paddingRight: '1.5rem',
                            textAlign: 'center',
                            background: lockedGrades[subject.name] ? 'var(--md-surface-variant)' : 'var(--md-surface-container-highest)',
                            border: '1px solid var(--md-outline)',
                            borderRadius: 'var(--md-shape-xs)',
                            color: lockedGrades[subject.name] ? 'var(--md-on-surface-variant)' : 'var(--md-on-surface)',
                            fontFamily: 'var(--font-family)',
                            fontSize: 'var(--md-title-medium)',
                            fontWeight: 700,
                            outline: 'none',
                            appearance: 'textfield',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => { e.target.style.borderColor = 'var(--md-primary)'; e.target.style.borderWidth = '2px'; }}
                          onBlur={(e) => { e.target.style.borderColor = 'var(--md-outline)'; e.target.style.borderWidth = '1px'; }}
                          aria-label={lang === 'fr' ? `Note simulée pour ${subject.name}` : `Simulated grade for ${subject.name}`}
                        />
                        <span className="material-symbols-rounded" style={{ position: 'absolute', right: 8, fontSize: 16, color: lockedGrades[subject.name] ? 'transparent' : 'var(--md-on-surface-variant)', pointerEvents: 'none' }}>edit</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Extended FAB for Calculate */}
      {unlockedMissingCoef > 0 && uniformRequiredGrade <= 20 && (
        <div style={{ position: 'fixed', bottom: '96px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
          <motion.button 
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="md-btn md-btn-filled" 
            onClick={handleCalculateMinimum}
            style={{ 
              height: 56, 
              padding: '0 1.5rem', 
              borderRadius: '1.75rem', 
              boxShadow: '0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.3)',
              fontSize: 'var(--md-label-large)',
              display: 'flex',
              gap: '8px',
              pointerEvents: 'auto'
            }}
          >
            <span className="material-symbols-rounded filled">calculate</span>
            {t.simulator.calculate}
          </motion.button>
        </div>
      )}
    </>
  )
}
