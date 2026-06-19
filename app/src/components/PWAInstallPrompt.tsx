'use client'

import { useEffect, useState, useRef } from 'react'
import { useTranslation } from '@/i18n/I18nProvider'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const { t, lang } = useTranslation()
  const [showPrompt, setShowPrompt] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Don't show if user already dismissed
    if (localStorage.getItem('pwa-install-dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    deferredPrompt.current = null
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <div className="pwa-install-banner animate-in" role="alert">
      <div className="pwa-install-content">
        <span
          className="material-symbols-rounded"
          style={{ fontSize: 32, color: 'var(--md-primary)' }}
        >
          install_mobile
        </span>
        <div className="pwa-install-text">
          <strong>{t.settings.installApp}</strong>
          <span>{lang === 'fr' ? "Accédez à l'appli depuis votre écran d'accueil" : "Access the app from your home screen"}</span>
        </div>
      </div>
      <div className="pwa-install-actions">
        <button className="md-btn md-btn-text" onClick={handleDismiss}>
          {lang === 'fr' ? 'Plus tard' : 'Later'}
        </button>
        <button className="md-btn md-btn-filled" onClick={handleInstall}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
            download
          </span>
          {lang === 'fr' ? 'Installer' : 'Install'}
        </button>
      </div>
    </div>
  )
}
