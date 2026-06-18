import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export default async function AnalyticsPage() {
  const session = await auth()
  
  // Protect the route
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com' // Remplacez par votre email
  if (session?.user?.email !== adminEmail) {
    return (
      <>
        <header className="md-top-bar" style={{ display: 'flex', alignItems: 'center', height: '64px', padding: '0 1rem' }}>
          <span className="md-top-bar-title" style={{ fontSize: 'var(--md-title-large)', fontWeight: 400 }}>Accès refusé</span>
        </header>
        <main className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', padding: '1.5rem' }}>
          <div className="md-card md-card-elevated" style={{ textAlign: 'center', padding: '2rem', background: 'var(--md-error-container)', color: 'var(--md-on-error-container)', maxWidth: 400 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 48, marginBottom: '1rem' }}>lock</span>
            <h1 style={{ fontSize: 'var(--md-headline-small)', margin: '0 0 1rem' }}>Accès refusé</h1>
            <p style={{ margin: 0, fontSize: 'var(--md-body-medium)' }}>Vous n'êtes pas autorisé à voir cette page. (Configurez ADMIN_EMAIL dans votre .env)</p>
          </div>
        </main>
      </>
    )
  }

  // Aggregate stats
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Nb connexions par jour (aujourd'hui)
  const todayLogins = await prisma.userActivity.count({
    where: {
      action: 'login',
      createdAt: { gte: todayStart }
    }
  })

  // Users actifs (distinct users on pageView today)
  const activeUsersToday = await prisma.userActivity.findMany({
    where: {
      action: 'pageView',
      createdAt: { gte: todayStart }
    },
    select: { userId: true },
    distinct: ['userId']
  })

  // Pages les plus visitées
  const topPagesRaw = await prisma.userActivity.groupBy({
    by: ['path'],
    where: { action: 'pageView', path: { not: null } },
    _count: { path: true },
    orderBy: { _count: { path: 'desc' } },
    take: 10
  })

  // Top Utilisateurs (par nombre de pages vues = le plus actif)
  const topActiveUsersRaw = await prisma.userActivity.groupBy({
    by: ['userId'],
    where: { action: 'pageView' },
    _count: { userId: true },
    orderBy: { _count: { userId: 'desc' } },
    take: 10
  })

  const topUsersMap = new Map()
  if (topActiveUsersRaw.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: topActiveUsersRaw.map(u => u.userId) } },
      select: { id: true, name: true, email: true }
    })
    users.forEach(u => topUsersMap.set(u.id, u))
  }

  // Derniers utilisateurs en ligne (basé sur la dernière page vue)
  const recentActivities = await prisma.userActivity.findMany({
    where: { action: 'pageView' },
    orderBy: { createdAt: 'desc' },
    take: 200, // On en prend assez pour dédupliquer
    include: {
      user: {
        select: { name: true, email: true }
      }
    }
  })

  const seenUsers = new Set()
  const recentActiveUsers = []
  for (const activity of recentActivities) {
    if (!seenUsers.has(activity.userId)) {
      seenUsers.add(activity.userId)
      recentActiveUsers.push(activity)
      if (recentActiveUsers.length >= 10) break
    }
  }

  return (
    <>
      <header className="md-top-bar" style={{ display: 'flex', alignItems: 'center', height: '64px', padding: '0 1rem' }}>
        <span className="md-top-bar-title" style={{ fontSize: 'var(--md-title-large)', fontWeight: 400 }}>Dashboard Analytics</span>
      </header>
      
      <main className="page-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div className="md-card md-card-elevated" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 28 }}>login</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 'var(--md-label-large)', color: 'var(--md-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Connexions (Aujourd'hui)</p>
              <p style={{ margin: 0, fontSize: 'var(--md-display-small)', fontWeight: 600, color: 'var(--md-on-surface)' }}>{todayLogins}</p>
            </div>
          </div>

          <div className="md-card md-card-elevated" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--md-tertiary-container)', color: 'var(--md-on-tertiary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 28 }}>group</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 'var(--md-label-large)', color: 'var(--md-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Utilisateurs Actifs (Auj.)</p>
              <p style={{ margin: 0, fontSize: 'var(--md-display-small)', fontWeight: 600, color: 'var(--md-on-surface)' }}>{activeUsersToday.length}</p>
            </div>
          </div>
        </div>

        <div className="md-card md-card-elevated" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--md-primary)' }}>public</span>
            <h2 style={{ margin: 0, fontSize: 'var(--md-title-medium)', color: 'var(--md-on-surface)', fontWeight: 500 }}>Pages les plus visitées</h2>
          </div>
          
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topPagesRaw.map((page, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--md-surface-container-lowest)', borderRadius: 'var(--md-shape-md)', border: '1px solid var(--md-outline-variant)' }}>
                <span style={{ fontSize: 'var(--md-body-large)', color: 'var(--md-on-surface)', fontWeight: 500 }}>{page.path}</span>
                <span style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: 'var(--md-label-medium)', fontWeight: 600 }}>
                  {page._count.path} vues
                </span>
              </li>
            ))}
            {topPagesRaw.length === 0 && (
              <li style={{ padding: '1rem', textAlign: 'center', color: 'var(--md-on-surface-variant)', fontSize: 'var(--md-body-medium)' }}>
                Aucune donnée pour le moment.
              </li>
            )}
          </ul>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Top Utilisateurs */}
          <div className="md-card md-card-elevated" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--md-primary)' }}>star</span>
              <h2 style={{ margin: 0, fontSize: 'var(--md-title-medium)', color: 'var(--md-on-surface)', fontWeight: 500 }}>Utilisateurs les plus actifs</h2>
            </div>
            
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topActiveUsersRaw.map((stat, i) => {
                const user = topUsersMap.get(stat.userId)
                return (
                  <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--md-surface-container-lowest)', borderRadius: 'var(--md-shape-md)', border: '1px solid var(--md-outline-variant)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: 'var(--md-body-large)', color: 'var(--md-on-surface)', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.name || 'Inconnu'}</span>
                      <span style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.email}</span>
                    </div>
                    <span style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: 'var(--md-label-medium)', fontWeight: 600, flexShrink: 0 }}>
                      {stat._count.userId} actions
                    </span>
                  </li>
                )
              })}
              {topActiveUsersRaw.length === 0 && (
                <li style={{ padding: '1rem', textAlign: 'center', color: 'var(--md-on-surface-variant)', fontSize: 'var(--md-body-medium)' }}>
                  Aucune activité enregistrée.
                </li>
              )}
            </ul>
          </div>

          {/* Dernières connexions */}
          <div className="md-card md-card-elevated" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--md-primary)' }}>history</span>
              <h2 style={{ margin: 0, fontSize: 'var(--md-title-medium)', color: 'var(--md-on-surface)', fontWeight: 500 }}>Derniers utilisateurs en ligne</h2>
            </div>
            
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentActiveUsers.map((activity, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--md-surface-container-lowest)', borderRadius: 'var(--md-shape-md)', border: '1px solid var(--md-outline-variant)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: 'var(--md-body-large)', color: 'var(--md-on-surface)', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{activity.user?.name || 'Inconnu'}</span>
                    <span style={{ fontSize: 'var(--md-body-small)', color: 'var(--md-on-surface-variant)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{activity.user?.email}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                    <span style={{ fontSize: 'var(--md-label-small)', color: 'var(--md-on-surface-variant)' }}>
                      {activity.createdAt.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--md-primary)' }}>
                      {activity.path}
                    </span>
                  </div>
                </li>
              ))}
              {recentActiveUsers.length === 0 && (
                <li style={{ padding: '1rem', textAlign: 'center', color: 'var(--md-on-surface-variant)', fontSize: 'var(--md-body-medium)' }}>
                  Aucune activité récente.
                </li>
              )}
            </ul>
          </div>
        </div>
      </main>
    </>
  )
}
