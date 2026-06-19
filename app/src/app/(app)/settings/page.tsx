'use client'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from '@/components/ThemeProvider'
import { useTranslation } from '@/i18n/I18nProvider'

export default function SettingsPage() {
  const { data: session } = useSession()
  const { t, lang, setLang } = useTranslation()
  const { mode, setMode, colorHex, setColorHex } = useTheme()
  const [minesId, setMinesId] = useState('')
  const [minesPassword, setMinesPassword] = useState('')
  const [academicPath, setAcademicPath] = useState('DL')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isStandalone, setIsStandalone] = useState(true)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
      setIsStandalone(!!isPWA)
      const ua = window.navigator.userAgent.toLowerCase()
      setIsIOS(/iphone|ipad|ipod/.test(ua))
    }
  }, [])
  const [deleteStep, setDeleteStep] = useState(0)
  const [deleteCheckbox, setDeleteCheckbox] = useState(false)
  
  const handleDeleteData = async () => {
    try {
      await fetch('/api/credentials', { method: 'DELETE' })
      setExistingId(null)
      setMinesId('')
      setMinesPassword('')
      setLastSync(null)
      setStatus({ type: 'success', msg: t.settings.status.dataDeleted })
      setDeleteStep(0)
    } catch {
      setStatus({ type: 'error', msg: t.settings.status.deleteError })
    }
  }

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
      setStatus({ type: 'error', msg: t.settings.status.fillFields })
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
        setStatus({ type: 'success', msg: `${t.settings.status.credsSaved} ${d.gradesCount} ${t.settings.status.gradesRetrieved}` })
        setExistingId(minesId)
        setMinesPassword('')
        setLastSync(new Date().toLocaleString('fr-FR'))
        
        try {
          const planRes = await fetch('/api/planning', { method: 'POST' })
          const planData = await planRes.json()
          if (planData.success) {
            setStatus({ type: 'success', msg: `${t.settings.status.allReady} ${d.gradesCount} ${lang === 'fr' ? 'notes et' : 'grades and'} ${planData.count} ${t.settings.status.classesSynced}` })
          } else {
            setStatus({ type: 'success', msg: `${t.settings.status.planningError} ${planData.error}` })
          }
        } catch {
          setStatus({ type: 'success', msg: t.settings.status.planningNetworkError })
        }
      } else {
        setStatus({ type: 'error', msg: d.error ?? t.settings.status.credsValError })
      }
    } catch {
      setStatus({ type: 'error', msg: t.settings.status.networkError })
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
        setStatus({ type: 'success', msg: t.settings.status.notifDisabled })
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
          setStatus({ type: 'success', msg: t.settings.status.notifEnabled })
        } else {
          setStatus({ type: 'error', msg: t.settings.status.notifRefused })
        }
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: `${t.settings.status.pushError} ${e.message}` })
    } finally {
      setPushLoading(false)
    }
  }

  return (
    <>
      <header className="md-top-bar" style={{ margin: 0, width: '100%', padding: '0 calc(max(1rem, (100vw - 800px) / 2))' }}>
        <Link href="/dashboard" className="md-icon-button" style={{ color: 'var(--md-on-surface)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', marginLeft: -8 }}>
          <span className="material-symbols-rounded">arrow_back</span>
        </Link>
        <span className="md-top-bar-title" style={{ marginLeft: 8 }}>{t.settings.title}</span>
      </header>

      <main className="page-content" style={{ margin: '0 auto' }}>
        {/* Language section */}
        <section aria-label={t.settings.language}>
          <h2 style={{ fontSize: 'var(--md-title-medium)', fontWeight: 500, color: 'var(--md-on-surface-variant)', margin: '1.25rem 0 0.75rem' }}>
            {t.settings.language}
          </h2>
          <div className="md-card md-card-elevated animate-in" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface)', marginBottom: '0.75rem' }}>
              {t.settings.languageDesc}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className={`md-btn ${lang === 'fr' ? 'md-btn-filled' : 'md-btn-outlined'}`}
                onClick={() => setLang('fr')}
                style={{ flex: 1 }}
              >
                Français
              </button>
              <button 
                className={`md-btn ${lang === 'en' ? 'md-btn-filled' : 'md-btn-outlined'}`}
                onClick={() => setLang('en')}
                style={{ flex: 1 }}
              >
                English
              </button>
            </div>
          </div>
        </section>

        {/* Profile section */}
        <section aria-label={t.settings.profile}>
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
                <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface)' }}>{t.settings.googleAuth}</p>
                <p style={{ fontSize: 'var(--md-label-small)', color: 'var(--md-on-surface-variant)', marginTop: 2 }}>
                  {t.settings.oauthAuth}
                </p>
              </div>
              <div className="md-chip" style={{ background: 'var(--md-success-container)', color: 'var(--md-on-success-container)', border: 'none' }}>
                <span className="material-symbols-rounded filled" style={{ fontSize: 14 }}>check_circle</span>
                {t.settings.connected}
              </div>
            </div>
          </div>
        </section>

        {/* CyberNotes credentials */}
        <section aria-label={t.settings.cyberNotes}>
          <h2 style={{ fontSize: 'var(--md-title-medium)', fontWeight: 500, color: 'var(--md-on-surface-variant)', margin: '1.25rem 0 0.75rem' }}>
            {t.settings.cyberNotes}
          </h2>

          <div className="md-card md-card-elevated animate-in" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            {existingId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.75rem', borderRadius: 'var(--md-shape-sm)', background: 'var(--md-success-container)' }}>
                <span className="material-symbols-rounded filled" style={{ color: 'var(--md-on-success-container)', fontSize: 18 }}>check_circle</span>
                <div>
                  <p style={{ fontSize: 'var(--md-body-small)', fontWeight: 600, color: 'var(--md-on-success-container)' }}>
                    {t.settings.currentId} <code>{existingId}</code>
                  </p>
                  {lastSync && (
                    <p style={{ fontSize: 'var(--md-label-small)', color: 'var(--md-on-success-container)', opacity: 0.8, marginTop: 2 }}>
                      {t.settings.lastSyncDate} {lastSync}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div style={{ position: 'relative', marginTop: '12px', marginBottom: '1.25rem' }}>
                <label
                  htmlFor="mines-id"
                  style={{ 
                    position: 'absolute', 
                    top: '-8px', 
                    left: '12px', 
                    background: 'var(--md-surface-container)', 
                    padding: '0 4px', 
                    fontSize: 'var(--md-label-small)', 
                    color: 'var(--md-primary)',
                    zIndex: 1 
                  }}
                >
                  {t.settings.minesId}
                </label>
                <input
                  id="mines-id"
                  type="text"
                  placeholder=" "
                  value={minesId}
                  onChange={e => setMinesId(e.target.value)}
                  autoComplete="username"
                  style={{
                    width: '100%',
                    height: 56,
                    padding: '0 1rem',
                    background: 'transparent',
                    border: '1px solid var(--md-outline)',
                    borderRadius: 'var(--md-shape-xs)',
                    color: 'var(--md-on-surface)',
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--md-body-large)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--md-primary)'; e.target.style.borderWidth = '2px'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--md-outline)'; e.target.style.borderWidth = '1px'; }}
                />
            </div>

            <div style={{ position: 'relative', marginTop: '12px', marginBottom: '1.25rem' }}>
              <label
                htmlFor="academic-path"
                style={{ 
                  position: 'absolute', 
                  top: '-8px', 
                  left: '12px', 
                  background: 'var(--md-surface-container)', 
                  padding: '0 4px', 
                  fontSize: 'var(--md-label-small)', 
                  color: 'var(--md-primary)',
                  zIndex: 1 
                }}
              >
                {t.settings.academicPath}
              </label>
              <select
                id="academic-path"
                value={academicPath}
                onChange={e => setAcademicPath(e.target.value)}
                style={{
                  width: '100%',
                  height: 56,
                  padding: '0 1rem',
                  background: 'transparent',
                  border: '1px solid var(--md-outline)',
                  borderRadius: 'var(--md-shape-xs)',
                  color: 'var(--md-on-surface)',
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--md-body-large)',
                  outline: 'none',
                  appearance: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--md-primary)'; e.target.style.borderWidth = '2px'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--md-outline)'; e.target.style.borderWidth = '1px'; }}
              >
                <option value="DL">{t.settings.pathDL}</option>
                <option value="SR">{t.settings.pathSR}</option>
              </select>
            </div>

            <div style={{ position: 'relative', marginTop: '12px', marginBottom: '1.25rem' }}>
              <label
                htmlFor="mines-password"
                style={{ 
                  position: 'absolute', 
                  top: '-8px', 
                  left: '12px', 
                  background: 'var(--md-surface-container)', 
                  padding: '0 4px', 
                  fontSize: 'var(--md-label-small)', 
                  color: 'var(--md-primary)',
                  zIndex: 1 
                }}
              >
                {t.settings.minesPassword}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="mines-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder=" "
                  value={minesPassword}
                  onChange={e => setMinesPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    height: 56,
                    padding: '0 3rem 0 1rem',
                    background: 'transparent',
                    border: '1px solid var(--md-outline)',
                    borderRadius: 'var(--md-shape-xs)',
                    color: 'var(--md-on-surface)',
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--md-body-large)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--md-primary)'; e.target.style.borderWidth = '2px'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--md-outline)'; e.target.style.borderWidth = '1px'; }}
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
                  aria-label={showPassword ? t.settings.hidePassword : t.settings.showPassword}
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
                  {t.settings.validating}
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded filled" style={{ fontSize: 18 }}>save</span>
                  {t.settings.saveAndSync}
                </>
              )}
            </button>

            <p style={{ fontSize: '0.75rem', color: 'var(--md-on-surface-variant)', marginTop: '1.25rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>lock</span>
              {t.settings.encryptionDesc}
            </p>
          </div>
        </section>

        {/* Notifications section */}
        <section aria-label={t.settings.notifications}>
          <h2 style={{ fontSize: 'var(--md-title-medium)', fontWeight: 500, color: 'var(--md-on-surface-variant)', margin: '1.25rem 0 0.75rem' }}>
            {t.settings.notifications}
          </h2>

          <div className="md-card md-card-elevated animate-in" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface)', fontWeight: 500 }}>
                  {t.settings.newGrades}
                </p>
                <p style={{ fontSize: 'var(--md-label-small)', color: 'var(--md-on-surface-variant)', marginTop: 4, maxWidth: '80%' }}>
                  {t.settings.newGradesDesc}
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
                <input 
                  type="checkbox" 
                  checked={pushEnabled} 
                  onChange={handlePushToggle} 
                  disabled={pushLoading}
                  style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }} 
                />
                <div style={{ 
                  width: 52, 
                  height: 32, 
                  background: pushEnabled ? 'var(--md-primary)' : 'var(--md-surface-variant)', 
                  borderRadius: 16, 
                  position: 'relative', 
                  transition: 'background 0.2s',
                  border: pushEnabled ? 'none' : '2px solid var(--md-outline)',
                  boxSizing: 'border-box'
                }}>
                  <div style={{
                    width: pushEnabled ? 24 : 16,
                    height: pushEnabled ? 24 : 16,
                    background: pushEnabled ? 'var(--md-on-primary)' : 'var(--md-outline)',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: pushEnabled ? 4 : 6,
                    left: pushEnabled ? 24 : 6,
                    transition: 'all 0.2s'
                  }} />
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* Appearance section */}
        <section aria-label={t.settings.appearance}>
          <h2 style={{ fontSize: 'var(--md-title-medium)', fontWeight: 500, color: 'var(--md-on-surface-variant)', margin: '1.25rem 0 0.75rem' }}>
            {t.settings.appearance}
          </h2>

          <div className="md-card md-card-elevated animate-in" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface)', fontWeight: 500, marginBottom: '0.75rem' }}>
              {t.settings.displayMode}
            </p>
            
            <div style={{ display: 'flex', background: 'var(--md-surface-variant)', borderRadius: '2rem', padding: '4px', marginBottom: '1.5rem' }}>
              {(['system', 'light', 'dark'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: '2rem',
                    border: 'none',
                    background: mode === m ? 'var(--md-surface)' : 'transparent',
                    color: mode === m ? 'var(--md-on-surface)' : 'var(--md-on-surface-variant)',
                    fontWeight: mode === m ? 600 : 500,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: mode === m ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                    {m === 'system' ? 'smartphone' : m === 'light' ? 'light_mode' : 'dark_mode'}
                  </span>
                  {m === 'system' ? t.settings.system : m === 'light' ? t.settings.light : t.settings.dark}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface)', fontWeight: 500, marginBottom: '0.75rem' }}>
              {t.settings.accentColor}
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
              {[
                { hex: '#6750A4', name: t.settings.colorDefault },
                { hex: '#006A60', name: t.settings.colorMint },
                { hex: '#0061A4', name: t.settings.colorOcean },
                { hex: '#8C4A60', name: t.settings.colorPowderPink },
                { hex: '#984061', name: t.settings.colorRaspberry },
                { hex: '#A23F16', name: t.settings.colorTerracotta },
                { hex: '#4B6320', name: t.settings.colorKhaki },
                { hex: '#6A5F00', name: t.settings.colorGold },
              ].map(color => (
                <button
                  key={color.hex}
                  onClick={() => setColorHex(color.hex)}
                  title={color.name}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: color.hex,
                    border: colorHex === color.hex ? '2px solid var(--md-on-surface)' : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    transform: colorHex === color.hex ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  {colorHex === color.hex && (
                    <span className="material-symbols-rounded" style={{ color: '#ffffff', fontSize: 24, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
                      check
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Mobile App Install section */}
        {!isStandalone && (
          <section aria-label={t.settings.mobileApp}>
            <h2 style={{ fontSize: 'var(--md-title-medium)', fontWeight: 500, color: 'var(--md-on-surface-variant)', margin: '1.25rem 0 0.75rem' }}>
              {t.settings.mobileApp}
            </h2>

            <div className="md-card md-card-elevated animate-in" style={{ padding: '1.25rem', marginBottom: '1rem', background: 'var(--md-primary-container)', border: '1px solid rgba(103, 80, 164, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <span className="material-symbols-rounded filled" style={{ color: 'var(--md-on-primary-container)', fontSize: 32 }}>install_mobile</span>
                <div>
                  <p style={{ fontSize: 'var(--md-body-large)', color: 'var(--md-on-primary-container)', fontWeight: 600 }}>{t.settings.installApp}</p>
                  <p style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-primary-container)', opacity: 0.9 }}>
                    {t.settings.installDesc}
                  </p>
                </div>
              </div>

              <div style={{ background: 'var(--md-surface)', padding: '1rem', borderRadius: 'var(--md-shape-sm)' }}>
                {isIOS ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface)' }}>
                      <strong>{t.settings.onIphone}</strong>
                    </p>
                    <ol style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--md-on-surface-variant)', fontSize: '0.85rem' }}>
                      <li style={{ marginBottom: 6 }}>{t.settings.iphoneStep1}</li>
                      <li>{t.settings.iphoneStep2}</li>
                    </ol>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface)' }}>
                      <strong>{t.settings.onAndroid}</strong>
                    </p>
                    <ol style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--md-on-surface-variant)', fontSize: '0.85rem' }}>
                      <li style={{ marginBottom: 6 }}>{t.settings.androidStep1}</li>
                      <li>{t.settings.androidStep2}</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* About section */}
        <section aria-label={t.settings.about}>
          <h2 style={{ fontSize: 'var(--md-title-medium)', fontWeight: 500, color: 'var(--md-on-surface-variant)', margin: '1.25rem 0 0.75rem' }}>
            {t.settings.about}
          </h2>

          <div className="md-card animate-in" style={{ padding: '1rem', marginBottom: '1rem' }}>
            {[
              { icon: 'school', label: t.settings.aboutLabels.formation, value: 'INFRES17 — Mines Alès' },
              { icon: 'calendar_today', label: t.settings.aboutLabels.promotion, value: '2024 – 2027' },
              { icon: 'code', label: t.settings.aboutLabels.stack, value: 'Next.js · Prisma · PostgreSQL' },
              { icon: 'security', label: t.settings.aboutLabels.encryption, value: 'AES-256-CBC' },
            ].map(item => (
              <div key={item.icon} className="md-list-item" style={{ padding: '0.75rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span className="material-symbols-rounded filled" style={{ color: 'var(--md-on-surface-variant)', fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 'var(--md-body-large)', color: 'var(--md-on-surface)', lineHeight: 1.2 }}>{item.value}</p>
                  <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface-variant)', marginTop: 4 }}>{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* About / Changelog / GitHub */}
        <section aria-label={t.settings.about}>
          <h2 style={{ fontSize: 'var(--md-title-medium)', fontWeight: 500, color: 'var(--md-on-surface-variant)', margin: '1.25rem 0 0.75rem' }}>
            {t.settings.about}
          </h2>
          <div className="md-card md-card-elevated animate-in" style={{ padding: '0.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <Link href="/changelog" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', textDecoration: 'none', color: 'var(--md-on-surface)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-rounded">update</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 'var(--md-body-large)', fontWeight: 500, margin: 0 }}>{t.settings.changelog}</p>
                <p style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)', margin: 0 }}>{t.settings.changelogDesc}</p>
              </div>
              <span className="material-symbols-rounded" style={{ color: 'var(--md-on-surface-variant)' }}>chevron_right</span>
            </Link>
            
            <div style={{ height: 1, background: 'var(--md-outline-variant)', margin: '0 0.75rem', opacity: 0.5 }} />
            
            <a href="https://github.com/matteopollet/StudentDash" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', textDecoration: 'none', color: 'var(--md-on-surface)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-rounded">code</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 'var(--md-body-large)', fontWeight: 500, margin: 0 }}>{t.settings.contribute}</p>
                <p style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)', margin: 0 }}>{t.settings.contributeDesc}</p>
              </div>
              <span className="material-symbols-rounded" style={{ color: 'var(--md-on-surface-variant)' }}>open_in_new</span>
            </a>
          </div>
        </section>

        {/* Sign out */}
        <button
          id="btn-signout"
          className="md-btn md-btn-outlined"
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{ width: '100%', height: 48, color: 'var(--md-error)', borderColor: 'var(--md-error)', marginBottom: '4rem' }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>logout</span>
          {t.settings.logout}
        </button>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button 
            onClick={() => setDeleteStep(1)} 
            style={{ background: 'none', border: 'none', fontSize: '10px', color: 'var(--md-on-surface-variant)', opacity: 0.2, cursor: 'text' }}
          >
            {t.settings.deleteData}
          </button>
        </div>

        {deleteStep > 0 && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }}>
            <div className="md-card md-card-elevated" style={{ maxWidth: 450, width: '100%', padding: '2rem', background: 'var(--md-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {deleteStep === 1 && (
                <>
                  <span className="material-symbols-rounded filled" style={{ fontSize: 64, color: 'var(--md-error)', marginBottom: '1rem' }}>warning</span>
                  <h2 style={{ fontSize: 'var(--md-headline-small)', textAlign: 'center', marginBottom: '1rem' }}>
                    {t.settings.deleteStep1Title}
                  </h2>
                  <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface-variant)', textAlign: 'center', marginBottom: '2rem' }}>
                    {t.settings.deleteStep1Desc}
                  </p>
                  <button 
                    className="md-btn md-btn-filled" 
                    style={{ width: '100%', height: 56, fontSize: '1.1rem', background: 'var(--md-success)', color: 'var(--md-on-primary)', marginBottom: '1rem' }}
                    onClick={() => setDeleteStep(0)}
                  >
                    {t.settings.deleteStep1Keep}
                  </button>
                  <button 
                    style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--md-on-surface-variant)', opacity: 0.6, cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setDeleteStep(2)}
                  >
                    {t.settings.deleteStep1Abandon}
                  </button>
                </>
              )}

              {deleteStep === 2 && (
                <>
                  <span className="material-symbols-rounded" style={{ fontSize: 48, color: 'var(--md-outline)', marginBottom: '1rem' }}>help_center</span>
                  <h2 style={{ fontSize: 'var(--md-title-large)', textAlign: 'center', marginBottom: '1rem' }}>
                    {t.settings.deleteStep2Title}
                  </h2>
                  <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '0.5rem', marginBottom: '2rem', alignItems: 'flex-start' }}>
                    <input 
                      type="checkbox" 
                      id="confirm-delete" 
                      checked={deleteCheckbox} 
                      onChange={(e) => setDeleteCheckbox(e.target.checked)} 
                      style={{ marginTop: '0.25rem' }}
                    />
                    <label htmlFor="confirm-delete" style={{ fontSize: '0.8rem', color: 'var(--md-on-surface-variant)', lineHeight: 1.4 }}>
                      {t.settings.deleteStep2Confirm}
                    </label>
                  </div>

                  <button 
                    className="md-btn md-btn-filled" 
                    style={{ width: '100%', height: 48, background: 'var(--md-primary)', color: 'var(--md-on-primary)', marginBottom: '1.5rem' }}
                    onClick={() => setDeleteStep(0)}
                  >
                    {t.settings.deleteStep2Cancel}
                  </button>
                  
                  <button 
                    style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: deleteCheckbox ? 'var(--md-error)' : 'var(--md-outline)', opacity: deleteCheckbox ? 0.8 : 0.3, cursor: deleteCheckbox ? 'pointer' : 'not-allowed' }}
                    disabled={!deleteCheckbox}
                    onClick={handleDeleteData}
                  >
                    {t.settings.deleteStep2Delete}
                  </button>
                </>
              )}

            </div>
          </div>
        )}
      </main>
    </>
  )
}
