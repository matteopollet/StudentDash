'use client'
import { useState, useEffect, useCallback } from 'react'

interface Event {
  id: string
  summary: string
  description: string
  location: string
  start: string
  end: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function PlanningClient() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [snack, setSnack] = useState<string | null>(null)

  const showSnack = (msg: string) => {
    setSnack(msg)
    setTimeout(() => setSnack(null), 3500)
  }

  const loadData = useCallback(() => {
    setLoading(true)
    fetch('/api/planning')
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setEvents(data.events || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
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
      if (planData.success) msg += (msg ? ' • ' : '✓ ') + `${planData.count} cours`
      
      if (msg) {
        showSnack(`${msg} synchronisés`)
        loadData()
      } else {
        showSnack('Erreur lors de la synchronisation')
      }
    } catch (e: any) {
      setError(e.message)
      showSnack(`Erreur: ${e.message}`)
    } finally {
      setSyncing(false)
    }
  }

  // Group events by day
  const groupedEvents: Record<string, Event[]> = {}
  events.forEach(e => {
    const day = formatDate(e.start)
    if (!groupedEvents[day]) groupedEvents[day] = []
    groupedEvents[day].push(e)
  })

  return (
    <>
      <header className="md-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="md-top-bar-title" style={{ fontSize: 'var(--md-title-large)', fontWeight: 400 }}>Emploi du temps</span>
        </div>
        <button 
          onClick={handleSync} 
          disabled={syncing}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--md-on-surface)', 
            cursor: syncing ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '50%'
          }}
          aria-label="Synchroniser"
        >
          <span className={`material-symbols-rounded ${syncing ? 'spin' : ''}`}>sync</span>
        </button>
      </header>

      <main className="page-content" style={{ paddingBottom: '6rem' }}>
        {loading && (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="skeleton animate-in" style={{ height: 24, width: 150, borderRadius: 4 }} />
            <div className="skeleton animate-in" style={{ height: 80, borderRadius: 'var(--md-shape-md)' }} />
            <div className="skeleton animate-in" style={{ height: 80, borderRadius: 'var(--md-shape-md)' }} />
          </div>
        )}

        {error && (
          <div className="md-card animate-in" style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--md-error-container)' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 48, color: 'var(--md-error)', marginBottom: 16, display: 'block' }}>error</span>
            <p style={{ color: 'var(--md-on-error-container)' }}>{error}</p>
          </div>
        )}

        {!loading && !error && Object.keys(groupedEvents).length === 0 && (
          <div className="md-card animate-in" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 48, color: 'var(--md-outline)', display: 'block', marginBottom: 16 }}>event_available</span>
            <p style={{ color: 'var(--md-on-surface-variant)' }}>Aucun cours à venir !</p>
          </div>
        )}

        {!loading && !error && (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {Object.entries(groupedEvents).map(([day, dayEvents], groupIndex) => (
              <div key={day} className="animate-in" style={{ animationDelay: `${groupIndex * 100}ms` }}>
                <h2 style={{ 
                  fontSize: 'var(--md-headline-small)', 
                  fontWeight: 600, 
                  color: 'var(--md-primary-container)', 
                  textTransform: 'capitalize',
                  marginBottom: '1rem',
                  position: 'sticky',
                  top: '4.5rem',
                  background: 'var(--md-background)',
                  padding: '1.5rem 0 1rem',
                  zIndex: 10
                }}>
                  {day}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {dayEvents.map((event, i) => {
                    let code = '';
                    let name = event.summary;
                    const match = event.summary.match(/^([\w\.]+)\s+(.*)$/);
                    if (match) {
                      code = match[1];
                      name = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
                    }

                    return (
                      <div key={event.id} className="md-card md-card-elevated" style={{ padding: '1rem', display: 'flex', gap: '1rem', borderLeft: '6px solid var(--md-primary-container)', borderRadius: 'var(--md-shape-md)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '4.5rem', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 'var(--md-title-medium)', fontWeight: 700, color: 'var(--md-on-surface)' }}>{formatTime(event.start)}</span>
                          <span style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface-variant)' }}>{formatTime(event.end)}</span>
                        </div>
                        <div style={{ flex: 1, paddingLeft: '1rem', borderLeft: '1px solid var(--md-outline-variant)' }}>
                          {code ? (
                            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'flex-start', gap: '8px', flexDirection: 'column' }}>
                              <span style={{ background: 'var(--md-surface-variant)', color: 'var(--md-on-surface)', padding: '2px 8px', borderRadius: '8px', fontSize: 'var(--md-label-medium)', fontWeight: 600, letterSpacing: '0.5px' }}>{code}</span>
                              <h3 style={{ fontSize: 'var(--md-body-large)', fontWeight: 600, color: 'var(--md-on-surface)', lineHeight: 1.3 }}>{name}</h3>
                            </div>
                          ) : (
                            <h3 style={{ fontSize: 'var(--md-body-large)', fontWeight: 600, color: 'var(--md-on-surface)', marginBottom: 6, lineHeight: 1.3 }}>{name}</h3>
                          )}
                          {event.location && (
                            <p style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--md-primary-container)' }}>location_on</span>
                              {event.location}
                            </p>
                          )}
                          {event.description && (
                            <p style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)', marginTop: 8, fontStyle: 'italic', paddingLeft: '22px' }}>
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
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
