'use client'
import Link from 'next/link'

const documents = [
  {
    id: 'calendrier',
    title: "Calendrier d'apprentissage",
    description: "Alternance et périodes en entreprise (2024-2027)",
    filename: "R-FIA-89-Calendrier_apprentissage_2024-2027_v02.2.pdf",
    icon: 'calendar_month',
    color: 'var(--md-primary)'
  },
  {
    id: 'programme',
    title: "Programme INFRES 17",
    description: "Syllabus détaillé de la formation",
    filename: "FIA-Programme-Infres-promotion-17(2024-2027).pdf",
    icon: 'menu_book',
    color: 'var(--md-tertiary)'
  },
  {
    id: 'referentiel',
    title: "Référentiel de Compétences",
    description: "Compétences à valider pour le diplôme",
    filename: "REFERENTIEL_COMPETENCES_INFRES.pdf",
    icon: 'verified',
    color: 'var(--md-success)'
  },
  {
    id: 'missions',
    title: "Missions et Planning (DPPA)",
    description: "Document Pédagogique et Professionnel d'Apprentissage",
    filename: "DPPA_missions_planning2024-2027.pdf",
    icon: 'work',
    color: '#c4930d' // Warning/Amber color
  }
]

export default function DocumentsPage() {
  return (
    <>
      <header className="md-top-bar">
        <Link href="/dashboard" className="md-btn md-btn-text" style={{ padding: '0 8px', minWidth: 48, marginLeft: -8 }}>
          <span className="material-symbols-rounded">arrow_back</span>
        </Link>
        <span className="md-top-bar-title" style={{ marginLeft: 8 }}>Documents utiles</span>
      </header>

      <main className="page-content">
        <p style={{ fontSize: 'var(--md-body-medium)', color: 'var(--md-on-surface-variant)', marginBottom: '1.5rem' }}>
          Retrouvez ici tous les documents administratifs et pédagogiques essentiels de votre scolarité.
        </p>

        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {documents.map((doc, i) => (
            <div key={doc.id} className="md-card md-card-elevated animate-in" style={{ animationDelay: `${i * 50}ms` }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ 
                  background: `color-mix(in srgb, ${doc.color} 15%, transparent)`, 
                  color: doc.color, 
                  width: 48, 
                  height: 48, 
                  borderRadius: 'var(--md-shape-sm)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span className="material-symbols-rounded filled">{doc.icon}</span>
                </div>
                
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 'var(--md-title-medium)', fontWeight: 600, color: 'var(--md-on-surface)', marginBottom: 4 }}>
                    {doc.title}
                  </h2>
                  <p style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)', marginBottom: 12 }}>
                    {doc.description}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a 
                      href={`/documents/${doc.filename}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="md-btn md-btn-filled"
                      style={{ height: 32, fontSize: '0.75rem', padding: '0 1rem', background: doc.color }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 16 }}>visibility</span>
                      Ouvrir
                    </a>
                    <a 
                      href={`/documents/${doc.filename}`} 
                      download
                      className="md-btn md-btn-tonal"
                      style={{ height: 32, fontSize: '0.75rem', padding: '0 1rem' }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 16 }}>download</span>
                      Télécharger
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
