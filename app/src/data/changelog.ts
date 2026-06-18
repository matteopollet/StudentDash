export interface ChangelogRelease {
  version: string;
  date: string;
  sections: {
    title: string;
    items: string[];
  }[];
}

export const changelog: ChangelogRelease[] = [
  {
    version: "2.0.0",
    date: "18 Juin 2026",
    sections: [
      {
        title: "CANTINA",
        items: [
          "Ajout du système de menu de la semaine avec extraction automatique PDF.",
          "Ajout de la « règle des 14h00 » (sélection automatique du menu du lendemain).",
          "Ajout du défilement automatique pour centrer le jour actif sur l'onglet mobile.",
          "Ajout de la présentation côte-à-côte des plats et accompagnements sur les grands écrans.",
          "Ajout d'emojis dynamiques pour identifier instantanément le type de plat (végétarien, viande, poisson)."
        ]
      },
      {
        title: "DASHBOARD & DESKTOP",
        items: [
          "Ajout de la Navigation Rail (barre latérale) pour les utilisateurs sur ordinateur.",
          "Refonte de l'interface d'accueil en mode 'Pleine largeur / Scindé / Pleine largeur' pour optimiser l'espace.",
          "Correction d'un problème rendant les scrolls horizontaux inaccessibles à la souris sur ordinateur.",
          "Désactivation des barres de navigation sur les pages secondaires (ex: Paramètres) pour plus d'immersion."
        ]
      },
      {
        title: "UI / ACCESSIBILITÉ",
        items: [
          "Correction d'un problème majeur de lisibilité des textes et titres en Thème Clair.",
          "Migration complète vers les variables dynamiques Material Design 3 pour un contraste garanti.",
          "Correction de l'affichage des bordures et espacements masqués sur iOS/Safari."
        ]
      },
      {
        title: "TECH / MISC",
        items: [
          "Ajout de polyfills spécialisés (DOMMatrix, Path2D) pour supporter l'extraction PDF sur les serveurs Vercel."
        ]
      }
    ]
  }
];
