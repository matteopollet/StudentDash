'use client'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [minesId, setMinesId] = useState('')
  const [minesPassword, setMinesPassword] = useState('')
  const [academicPath, setAcademicPath] = useState('DL')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    fetch('/api/credentials')
      .then(r => r.json())
      .then(d => {
        if (d.minesId) setExistingId(d.minesId)
        if (d.lastSync) setLastSync(new Date(d.lastSync).toLocaleString('fr-FR'))
        if (d.academicPath) setAcademicPath(d.academicPath)
      })
  }, [])

  const handleSave = async () => {
    if (!minesId || !minesPassword) {
      setStatus({ type: 'error', msg: 'Veuillez remplir tous les champs obligatoires.' })
      return
    }
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minesId, password: minesPassword, academicPath }),
      })
      const d = await res.json()
      if (d.success) {
        setStatus({ type: 'success', msg: `✓ Identifiants sauvegardés et ${d.gradesCount} notes synchronisées !` })
        setExistingId(minesId)
        setMinesPassword('')
        setLastSync(new Date().toLocaleString('fr-FR'))
      } else {
        setStatus({ type: 'error', msg: d.error ?? 'Erreur lors de la validation des identifiants.' })
      }
    } catch {
      setStatus({ type: 'error', msg: 'Erreur réseau. Réessayez.' })
    } finally {
      setSaving(false)
    }
  }

  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(true)

  useEffect(() => {
    // Check push status
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setPushEnabled(!!sub)
          setPushLoading(false)
        })
      })
    } else {
      setPushLoading(false)
    }
  }, [])

  function urlBase64ToUint8Array(base64String: string) {
    if (!base64String) throw new Error("Clé VAPID introuvable. Avez-vous configuré Vercel ?")
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const handlePushToggle = async () => {
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            body: JSON.stringify({ endpoint: sub.endpoint })
          })
        }
        setPushEnabled(false)
        setStatus({ type: 'success', msg: 'Notifications désactivées.' })
      } else {
        const perm = await Notification.requestPermission()
        if (perm === 'granted') {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
          })
          await fetch('/api/push/subscribe', {
            method: 'POST',
            body: JSON.stringify(sub)
          })
          setPushEnabled(true)
          setStatus({ type: 'success', msg: 'Notifications activées !' })
        } else {
          setStatus({ type: 'error', msg: 'Permission refusée par le navigateur.' })
        }
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: `Erreur Push: ${e.message}` })
    } finally {
      setPushLoading(false)
    }
  }

  return (
    <>
      <header className="md-top-bar">
        <span className="material-symbols-rounded filled" style={{ color: 'var(--md-primary)', fontSize: 24 }}>settings</span>
        <span className="md-top-bar-title">Réglages</span>
      </header>

      <main className="page-content">
        {/* Profile section */}
        <section aria-label="Profil">
          <div className="md-card md-card-elevated animate-in" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              {session?.user?.image && (
                <Image
                  src={session.user.image}
                  alt="Avatar"
                  width={56}
                  height={56}
                  style={{ borderRadius: '50%', objectFit: 'cover' }}
                />
              )}
              <div>
                <p style={{ fontSize: 'var(--md-title-medium)', fontWeight: 500, color: 'var(--md-on-surface)' }}>
                  {session?.user?.name}
                </p>
                <p style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)' }}>
                  {session?.user?.email}
                </p>
              </div>
            </div>
            <div className="md-divider" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem' }}>
              <div>
                <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface)' }}>Connexion Google</p>
                <p style={{ fontSize: 'var(--md-label-small)', color: 'var(--md-on-surface-variant)', marginTop: 2 }}>
                  Authentification OAuth 2.0
                </p>
              </div>
              <div className="md-chip" style={{ background: 'var(--md-success-container)', color: 'var(--md-on-success-container)', border: 'none' }}>
                <span className="material-symbols-rounded filled" style={{ fontSize: 14 }}>check_circle</span>
                Connecté
              </div>
            </div>
          </div>
        </section>

        {/* CyberNotes credentials */}
        <section aria-label="Identifiants CyberNotes">
          <h2 style={{ fontSize: 'var(--md-title-medium)', fontWeight: 500, color: 'var(--md-on-surface-variant)', margin: '1.25rem 0 0.75rem' }}>
            Identifiants CyberNotes
          </h2>

          <div className="md-card md-card-elevated animate-in" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            {existingId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.75rem', borderRadius: 'var(--md-shape-sm)', background: 'var(--md-success-container)' }}>
                <span className="material-symbols-rounded filled" style={{ color: 'var(--md-on-success-container)', fontSize: 18 }}>check_circle</span>
                <div>
                  <p style={{ fontSize: 'var(--md-body-small)', fontWeight: 600, color: 'var(--md-on-success-container)' }}>
                    Identifiant actuel : <code>{existingId}</code>
                  </p>
                  {lastSync && (
                    <p style={{ fontSize: 'var(--md-label-small)', color: 'var(--md-on-success-container)', opacity: 0.8, marginTop: 2 }}>
                      Dernière sync : {lastSync}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="mines-id"
                style={{ display: 'block', fontSize: 'var(--md-label-medium)', color: 'var(--md-on-surface-variant)', marginBottom: '0.5rem' }}
              >
                Identifiant Mines Alès
              </label>
              <input
                id="mines-id"
                type="text"
                placeholder="ex: matteo.pollet"
                value={minesId}
                onChange={e => setMinesId(e.target.value)}
                autoComplete="username"
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
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="academic-path"
                style={{ display: 'block', fontSize: 'var(--md-label-medium)', color: 'var(--md-on-surface-variant)', marginBottom: '0.5rem' }}
              >
                Parcours Académique
              </label>
              <select
                id="academic-path"
                value={academicPath}
                onChange={e => setAcademicPath(e.target.value)}
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
                  appearance: 'none',
                }}
              >
                <option value="DL">Développement Logiciel (DL)</option>
                <option value="SR">Systèmes et Réseaux (SR)</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="mines-password"
                style={{ display: 'block', fontSize: 'var(--md-label-medium)', color: 'var(--md-on-surface-variant)', marginBottom: '0.5rem' }}
              >
                Mot de passe Mines Alès
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="mines-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={minesPassword}
                  onChange={e => setMinesPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    height: 48,
                    padding: '0 3rem 0 1rem',
                    background: 'var(--md-surface-container-highest)',
                    border: '1px solid var(--md-outline)',
                    borderRadius: 'var(--md-shape-xs)',
                    color: 'var(--md-on-surface)',
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--md-body-large)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--md-on-surface-variant)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {status && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--md-shape-sm)',
                  marginBottom: '1rem',
                  background: status.type === 'success' ? 'var(--md-success-container)' : 'var(--md-error-container)',
                  color: status.type === 'success' ? 'var(--md-on-success-container)' : 'var(--md-on-error-container)',
                  fontSize: 'var(--md-body-small)',
                }}
                role="alert"
              >
                {status.msg}
              </div>
            )}

            <button
              id="btn-save-credentials"
              className="md-btn md-btn-filled"
              onClick={handleSave}
              disabled={saving}
              style={{ width: '100%', height: 48 }}
            >
              {saving ? (
                <>
                  <span className="material-symbols-rounded spin" style={{ fontSize: 18 }}>sync</span>
                  Validation en cours…
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded filled" style={{ fontSize: 18 }}>save</span>
                  Enregistrer et synchroniser
                </>
              )}
            </button>

            <p style={{ fontSize: 'var(--md-label-small)', color: 'var(--md-on-surface-variant)', marginTop: '0.75rem', textAlign: 'center', opacity: 0.7 }}>
              🔒 Votre mot de passe est chiffré avec AES-256 avant d&apos;être stocké.
            </p>
          </div>
        </section>

        {/* Notifications section */}
        <section aria-label="Notifications">
          <h2 style={{ fontSize: 'var(--md-title-medium)', fontWeight: 500, color: 'var(--md-on-surface-variant)', margin: '1.25rem 0 0.75rem' }}>
            Notifications
          </h2>

          <div className="md-card md-card-elevated animate-in" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface)', fontWeight: 500 }}>
                  Nouvelles notes
                </p>
                <p style={{ fontSize: 'var(--md-label-small)', color: 'var(--md-on-surface-variant)', marginTop: 4, maxWidth: '80%' }}>
                  Recevez une alerte lorsqu'une nouvelle note est publiée pour votre promotion.
                </p>
              </div>
              <button
                className={`md-btn ${pushEnabled ? 'md-btn-outlined' : 'md-btn-tonal'}`}
                onClick={handlePushToggle}
                disabled={pushLoading}
                style={{ height: 36, padding: '0 1rem', fontSize: '0.75rem', minWidth: 110 }}
              >
                {pushLoading ? '...' : pushEnabled ? 'Désactiver' : 'Activer'}
              </button>
            </div>
          </div>
        </section>

        {/* About section */}
        <section aria-label="À propos">
          <h2 style={{ fontSize: 'var(--md-title-medium)', fontWeight: 500, color: 'var(--md-on-surface-variant)', margin: '1.25rem 0 0.75rem' }}>
            À propos
          </h2>

          <div className="md-card animate-in" style={{ padding: '1rem', marginBottom: '1rem' }}>
            {[
              { icon: 'school', label: 'Formation', value: 'INFRES17 — Mines Alès' },
              { icon: 'calendar_today', label: 'Promotion', value: '2024 – 2027' },
              { icon: 'code', label: 'Stack', value: 'Next.js · Prisma · PostgreSQL' },
              { icon: 'security', label: 'Chiffrement', value: 'AES-256-CBC' },
            ].map(item => (
              <div key={item.icon} className="md-list-item" style={{ padding: '0.625rem 0' }}>
                <span className="material-symbols-rounded filled" style={{ color: 'var(--md-primary)', fontSize: 20 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)' }}>{item.label}</p>
                  <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface)' }}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sign out */}
        <button
          id="btn-signout"
          className="md-btn md-btn-outlined"
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{ width: '100%', height: 48, color: 'var(--md-error)', borderColor: 'var(--md-error)' }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>logout</span>
          Se déconnecter
        </button>
      </main>
    </>
  )
}
