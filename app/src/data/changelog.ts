export interface ChangelogRelease {
  version: string;
  date: { fr: string, en: string };
  sections: {
    title: string;
    items: { fr: string, en: string }[];
  }[];
}

export const changelog: ChangelogRelease[] = [
  {
    version: "2.1.0",
    date: { fr: "19 Juin 2026", en: "June 19, 2026" },
    sections: [
      {
        title: "INTERNATIONALIZATION",
        items: [
          {
            fr: "Ajout du support complet de la langue anglaise sur l'ensemble de l'application.",
            en: "Added complete support for English language across the entire application."
          },
          {
            fr: "Détection automatique de la langue selon les préférences du navigateur de l'utilisateur.",
            en: "Automatic language detection based on user's browser preferences."
          },
          {
            fr: "Possibilité de changer manuellement la langue depuis les paramètres, avec sauvegarde des préférences.",
            en: "Ability to manually switch languages from settings, with preference saving."
          },
          {
            fr: "Changement de langue instantané sans rechargement complet de la page pour une meilleure fluidité.",
            en: "Instant language switching without full page reload for better fluidity."
          }
        ]
      },
      {
        title: "UI / ACCESSIBILITY",
        items: [
          {
            fr: "Traduction intégrale des pages Accueil, Notes, Planning, Cantine, Simulateur, Documents et Paramètres.",
            en: "Complete translation of Dashboard, Grades, Schedule, Cantina, Simulator, Documents, and Settings pages."
          },
          {
            fr: "Adaptation de la page des notes de mise à jour (Changelog) pour supporter le bilinguisme.",
            en: "Adapted the release notes (Changelog) page to support bilingual content."
          }
        ]
      },
      {
        title: "OPEN SOURCE",
        items: [
          {
            fr: "Le projet est officiellement open-source ! Un lien GitHub a été ajouté dans les Paramètres pour inviter la communauté à contribuer.",
            en: "The project is officially open-source! A GitHub link has been added in the Settings to invite the community to contribute."
          },
          {
            fr: "Ajout d'instructions claires pour les développeurs souhaitant améliorer le projet et l'adapter à d'autres écoles.",
            en: "Added clear instructions for developers wishing to improve the project and adapt it to other schools."
          }
        ]
      }
    ]
  },
  {
    version: "2.0.0",
    date: { fr: "18 Juin 2026", en: "June 18, 2026" },
    sections: [
      {
        title: "CANTINA",
        items: [
          {
            fr: "Ajout du système de menu de la semaine avec extraction automatique PDF.",
            en: "Added weekly menu system with automatic PDF extraction."
          },
          {
            fr: "Ajout de la « règle des 14h00 » (sélection automatique du menu du lendemain).",
            en: "Added the '14:00 rule' (automatic selection of the next day's menu)."
          },
          {
            fr: "Ajout du défilement automatique pour centrer le jour actif sur l'onglet mobile.",
            en: "Added auto-scrolling to center the active day on the mobile tab."
          },
          {
            fr: "Ajout de la présentation côte-à-côte des plats et accompagnements sur les grands écrans.",
            en: "Added side-by-side presentation of main and side dishes on large screens."
          },
          {
            fr: "Ajout d'emojis dynamiques pour identifier instantanément le type de plat (végétarien, viande, poisson).",
            en: "Added dynamic emojis to instantly identify the type of dish (vegetarian, meat, fish)."
          }
        ]
      },
      {
        title: "DASHBOARD & DESKTOP",
        items: [
          {
            fr: "Ajout de la Navigation Rail (barre latérale) pour les utilisateurs sur ordinateur.",
            en: "Added Navigation Rail (sidebar) for desktop users."
          },
          {
            fr: "Refonte de l'interface d'accueil en mode 'Pleine largeur / Scindé / Pleine largeur' pour optimiser l'espace.",
            en: "Redesigned the home interface in 'Full width / Split / Full width' mode to optimize space."
          },
          {
            fr: "Correction d'un problème rendant les scrolls horizontaux inaccessibles à la souris sur ordinateur.",
            en: "Fixed an issue making horizontal scrolls inaccessible with a mouse on desktop."
          },
          {
            fr: "Désactivation des barres de navigation sur les pages secondaires (ex: Paramètres) pour plus d'immersion.",
            en: "Disabled navigation bars on secondary pages (e.g., Settings) for better immersion."
          }
        ]
      },
      {
        title: "UI / ACCESSIBILITÉ",
        items: [
          {
            fr: "Correction d'un problème majeur de lisibilité des textes et titres en Thème Clair.",
            en: "Fixed a major readability issue with text and titles in Light Theme."
          },
          {
            fr: "Migration complète vers les variables dynamiques Material Design 3 pour un contraste garanti.",
            en: "Complete migration to Material Design 3 dynamic variables for guaranteed contrast."
          },
          {
            fr: "Correction de l'affichage des bordures et espacements masqués sur iOS/Safari.",
            en: "Fixed hidden borders and spacing rendering on iOS/Safari."
          }
        ]
      },
      {
        title: "TECH / MISC",
        items: [
          {
            fr: "Ajout de polyfills spécialisés (DOMMatrix, Path2D) pour supporter l'extraction PDF sur les serveurs Vercel.",
            en: "Added specialized polyfills (DOMMatrix, Path2D) to support PDF extraction on Vercel servers."
          }
        ]
      }
    ]
  }
];
