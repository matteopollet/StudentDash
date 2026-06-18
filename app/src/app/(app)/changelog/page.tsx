import Link from 'next/link'
import { changelog } from '@/data/changelog'

export default function ChangelogPage() {
  return (
    <>
      <header className="md-top-bar" style={{ margin: 0, width: '100%', padding: '0 calc(max(1rem, (100vw - 800px) / 2))' }}>
        <Link href="/settings" className="md-icon-button" style={{ color: 'var(--md-on-surface)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', marginLeft: -8 }}>
          <span className="material-symbols-rounded">arrow_back</span>
        </Link>
        <span className="md-top-bar-title" style={{ marginLeft: 8 }}>Nouveautés</span>
      </header>

      <main className="page-content" style={{ margin: '0 auto', paddingBottom: '4rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {changelog.map((release, index) => (
            <div key={release.version} className="md-card md-card-elevated animate-in" style={{ padding: '1.5rem', animationDelay: `${index * 100}ms` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--md-outline-variant)', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: 'var(--md-headline-small)', fontWeight: 600, color: 'var(--md-primary)', margin: 0 }}>
                  Version {release.version}
                </h2>
                <span style={{ fontSize: 'var(--md-label-medium)', color: 'var(--md-on-surface-variant)', background: 'var(--md-surface-variant)', padding: '4px 10px', borderRadius: '16px', fontWeight: 600 }}>
                  {release.date}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {release.sections.map((section) => (
                  <div key={section.title}>
                    <h3 style={{ fontSize: 'var(--md-label-large)', fontWeight: 700, color: 'var(--md-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
                      [ {section.title} ]
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: '0.5rem', listStyle: 'none' }}>
                      {section.items.map((item, i) => (
                        <li key={i} style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface)', marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', lineHeight: 1.4 }}>
                          <span aria-hidden="true" style={{ color: 'var(--md-primary)', marginTop: '-1px' }}>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
