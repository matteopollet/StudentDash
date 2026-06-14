import Link from 'next/link'

export const metadata = {
  title: 'Conditions d\'utilisation — StudentDash',
  description: 'Conditions d\'utilisation de l\'application StudentDash.',
}

export default function TermsPage() {
  return (
    <>
      <header className="md-top-bar">
        <Link href="/login" className="md-icon-button" aria-label="Retour" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', color: 'var(--md-on-surface)', textDecoration: 'none' }}>
          <span className="material-symbols-rounded">arrow_back</span>
        </Link>
        <span className="md-top-bar-title" style={{ marginLeft: 8 }}>Conditions d&apos;utilisation</span>
      </header>

      <main className="page-content" style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
        <div className="md-card md-card-elevated animate-in" style={{ padding: '2rem' }}>
          <h1 style={{ fontSize: 'var(--md-headline-medium)', color: 'var(--md-on-surface)', marginBottom: '1.5rem' }}>
            Conditions d&apos;utilisation de StudentDash
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--md-on-surface-variant)', lineHeight: 1.6 }}>
            
            <section>
              <h2 style={{ fontSize: 'var(--md-title-large)', color: 'var(--md-primary)', marginBottom: '0.5rem' }}>1. Projet Étudiant Indépendant</h2>
              <p>
                <strong>StudentDash est un projet étudiant strictement indépendant.</strong> Il n&apos;est en aucun cas affilié, sponsorisé, soutenu ou validé par l&apos;École des Mines d&apos;Alès (IMT Mines Alès) ou tout autre organisme officiel. Les logos, noms et marques cités (comme "CyberNotes" ou "Mines Alès") appartiennent à leurs propriétaires respectifs et ne sont mentionnés qu&apos;à des fins de compatibilité technique et de clarté pour les utilisateurs.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--md-title-large)', color: 'var(--md-primary)', marginBottom: '0.5rem' }}>2. Objectif du service</h2>
              <p>
                StudentDash a été conçu pour offrir aux étudiants (notamment la promotion INFRES17) une interface plus moderne, centralisée et mobile-friendly pour consulter leurs notes et leur emploi du temps. L&apos;application agit comme un "client alternatif" qui se connecte au portail officiel en votre nom.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--md-title-large)', color: 'var(--md-primary)', marginBottom: '0.5rem' }}>3. Sécurité et traitement des identifiants</h2>
              <p>
                Pour fonctionner, StudentDash nécessite l&apos;enregistrement de vos identifiants institutionnels (nom d&apos;utilisateur et mot de passe).
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><strong>Chiffrement fort :</strong> Vos identifiants sont chiffrés de bout en bout dans notre base de données utilisant l&apos;algorithme standard de l&apos;industrie <strong>AES-256</strong>.</li>
                <li><strong>Usage exclusif :</strong> Vos identifiants ne sont utilisés que par le serveur de StudentDash au moment de la synchronisation avec le portail officiel pour récupérer vos données académiques.</li>
                <li><strong>Aucune revente :</strong> Aucune donnée personnelle, note ou identifiant n&apos;est partagé avec des tiers ou exploité à des fins commerciales.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--md-title-large)', color: 'var(--md-primary)', marginBottom: '0.5rem' }}>4. Disponibilité et exactitude des données</h2>
              <p>
                Bien que StudentDash s&apos;efforce de refléter fidèlement les données de CyberNotes, des erreurs de synchronisation ou d&apos;affichage peuvent survenir. <strong>Seules les notes et informations affichées sur le portail officiel de l&apos;école font foi.</strong> Les calculs de moyennes et simulations sont fournis à titre indicatif. L&apos;auteur du projet décline toute responsabilité quant aux conséquences d&apos;une information erronée affichée sur StudentDash.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--md-title-large)', color: 'var(--md-primary)', marginBottom: '0.5rem' }}>5. Consentement</h2>
              <p>
                En vous connectant à l&apos;application et en fournissant vos identifiants via les paramètres de StudentDash, vous acceptez expressément que le système automatise la récupération de vos données sur le portail de l&apos;école en utilisant ces identifiants. Vous pouvez à tout moment supprimer vos identifiants ou votre compte StudentDash, ce qui effacera immédiatement vos données chiffrées de nos serveurs.
              </p>
            </section>

            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--md-outline-variant)' }}>
              <Link href="/login" className="md-btn md-btn-filled">
                Retour à l&apos;accueil
              </Link>
            </div>
            
          </div>
        </div>
      </main>
    </>
  )
}
