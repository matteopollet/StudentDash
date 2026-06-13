'use client'
import { signIn } from 'next-auth/react'
import styles from './page.module.css'

export default function LoginPage() {
  return (
    <main className={styles.container}>
      {/* Background gradient orbs */}
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />
      <div className={styles.orb3} aria-hidden="true" />

      <div className={styles.card} role="main">
        {/* Logo */}
        <div className={styles.logoWrap} aria-hidden="true">
          <span className="material-symbols-rounded filled" style={{ fontSize: 40, color: 'var(--md-primary)' }}>
            school
          </span>
        </div>

        <h1 className={styles.title}>StudentDash</h1>
        <p className={styles.subtitle}>
          Ton suivi académique INFRES17,<br />
          centralisé et intelligent.
        </p>

        {/* Features preview */}
        <ul className={styles.features} aria-label="Fonctionnalités">
          {[
            { icon: 'bar_chart', text: 'Tableau de bord de tes notes' },
            { icon: 'calculate', text: 'Simulateur d\'UE avec coefficients' },
            { icon: 'sync', text: 'Synchronisation CyberNotes automatique' },
          ].map(f => (
            <li key={f.icon} className={styles.feature}>
              <span className="material-symbols-rounded filled" style={{ color: 'var(--md-tertiary)', fontSize: 20 }}>
                {f.icon}
              </span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>

        <div className={styles.divider} aria-hidden="true" />

        <button
          id="btn-google-signin"
          className={`md-btn md-btn-filled ${styles.googleBtn}`}
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#fff" d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z"/>
            <path fill="rgba(255,255,255,0.8)" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
            <path fill="rgba(255,255,255,0.7)" d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z"/>
            <path fill="rgba(255,255,255,0.6)" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.96 13.04C2.44 15.98 5.48 18 9 18z"/>
          </svg>
          Continuer avec Google
        </button>

        <p className={styles.legal}>
          En continuant, vous acceptez les conditions d&apos;utilisation de StudentDash.
          Vos identifiants Mines Alès sont stockés chiffrés (AES-256).
        </p>
      </div>
    </main>
  )
}
