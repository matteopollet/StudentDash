# 🎓 StudentDash

**StudentDash** est une plateforme de suivi académique et d'alertes dédiée aux étudiants, conçue pour simplifier et optimiser la gestion de leur scolarité.

L'application combine un tableau de bord de suivi des résultats, un simulateur de notes pour valider ses semestres, et un assistant automatisé via Telegram pour les rappels d'emploi du temps et la réception des nouvelles notes.

## 📋 Fonctionnalités

### 1. Gestion et suivi académique (Interface Web)
* **Tableau de bord centralisé :** Visualisation rapide de l'ensemble des notes obtenues, de la moyenne générale et de l'état d'avancement du semestre.
* **Simulateur de réussite (Calculateur d'UE) :** Outil interactif et prédictif. L'utilisateur peut calculer la note minimale requise dans une matière spécifique pour valider son Unité d'Enseignement (UE), le système calculant automatiquement le résultat en fonction du coefficient de chaque enseignement.

### 2. Système d'assistance automatisée (Bot Telegram)
* **Rappel d'agenda quotidien :** Envoi d'une notification push la veille au soir indiquant le premier cours du lendemain matin (incluant l'heure, la matière, et la salle).
* **Alerte de résultats :** Notification instantanée envoyée directement sur le téléphone de l'étudiant dès qu'une nouvelle note est publiée.

## 🚀 Installation & Déploiement

Ce projet est conçu pour être déployable facilement (ex: via Vercel ou Docker). 
Assurez-vous de configurer les variables d'environnement nécessaires pour la base de données (ex: Prisma avec Postgres) et les intégrations (ex: OAuth Google, Telegram Bot API).

1. Clonez le dépôt
2. Installez les dépendances : `npm install`
3. Configurez vos variables d'environnement dans un fichier `.env`
4. Lancez le serveur de développement : `npm run dev`

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.
