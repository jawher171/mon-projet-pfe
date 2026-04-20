# Dossier d'Analyse et de Conception de l'Application de Gestion de Stock (PFE)

## 1. Introduction et Objectif du Projet
L'objectif de ce projet de fin d'études (PFE) est de concevoir et développer une application complète de gestion de stock multi-sites. Ce système permet d'automatiser et de numériser les processus logistiques afin de suivre en temps réel les niveaux de stock, de gérer les mouvements (entrées, sorties, transferts inter-sites) et d'automatiser les alertes de réapprovisionnement pour éviter les ruptures de stock ainsi que le sur-stockage.

## 2. Architecture Globale et Technologies (Stack Technique)
Le projet se base sur une **Architecture Client-Serveur** moderne, isolant complètement la partie interface utilisateur de la logique métier.

- **Frontend (Application Client) :**
  - **Framework :** Angular 21 (Single Page Application - SPA). Utilisation massive des `Signals` pour une réactivité optimale et synchronisée.
  - **Styling & UI :** CSS Modulaire/SCSS et Layouts dynamiques.
  - **Visualisation de Données :** Chart.js avec ng2-charts pour des graphiques dynamiques.
  - **Temps Réel :** Intégration de Microsoft SignalR et rafraîchissements périodiques asynchrones (polling rxJS).

- **Backend (API Restful) :**
  - **Framework :** ASP.NET Core 3.1 Web API en C#.
  - **Design Patterns :** Architecture N-Tiers, CQRS via **MediatR**, et Repository Pattern (`IGenericRepository`).
  - **ORM :** Entity Framework Core couplé à SQL Server.

## 3. Modélisation des Données (Entités Principales)
La base de données relationnelle s'articule autour des entités suivantes : User, Role/Permission (Sécurité RBAC), Product, Category, Site, Stock (Intersection cruciale entre Site et Produit incluant tous les seuils d'alerte), StockMovement, et Alert.

---

## 4. Focus Analytique et Technique sur les Interfaces (UI/UX) Clés

Pour maximiser l'ergonomie et l'aide à la décision logistique, l'application propose trois modules interactifs hautement travaillés : le **Tableau de Bord**, le **Gestionnaire d'Alertes**, et le module de **Réapprovisionnement**.

### 4.1. Tableau de Bord (Dashboard) : Le Centre Stratégique
Le composant `DashboardComponent` est une véritable centrale de contrôle réactive (mise à jour via polling et Signals). Il est conçu pour offrir une visibilité instantanée sur la valeur et la santé de l'inventaire.

**a. Filtres et Recherche Multicritères Avancée :**
L'en-tête (Header) propose une barre de filtrage granulaire dynamique liant plusieurs composants :
- **Type de site** (Entrepôt vs Magasin), **Site physique**, **Catégorie de produit** et **Produit spécifique**. Les filtres sont connectés : choisir un "Entrepôt" filtre automatiquement la dropdown associée.
- **Période d'analyse temporelle :** (Aujourd'hui, 7 jours, 30 jours, Mois en cours, Historique Complet).

**b. Indicateurs Clés de Performance (KPI Cards) :**
Le haut du tableau de bord déploie 6 cartes KPI interactives colorées :
1. **Valorisation du Stock :** Montant financier global affiché formatté dynamiquement (en TND).
2. **Unités en Stock :** Comptage brut des produits.
3. **Produits Gérés :** Variété d'articles dans le catalogue.
4. **Mouvements (E/S) :** Visualisation scindée et colorée des entrées (↑ Vert) et sorties (↓ Rouge).
5. **Transferts Inter-magasins :** (↔ Violet).
6. **Alertes Critiques :** Rouge clignotant s'il dépasse zéro.

**c. Dashboard Graphique & Visualisation des Datas (Chart.js) :**
- **Trending (Line Chart) :** *Tendance des Flux Comparatifs* affiche l'évolution des stocks selon la période.
- **Doughnut Chart :** *Santé de l'Inventaire* qui modélise visuellement les pourcentages de l'inventaire en statut Normal, Sur-stock, Alerte, ou Rupture.
- **Bar Chart :** *Stock Total par Produit* (Top des inventaires).
- **Recent Activity Feed :** Une liste ergonomique ("Derniers Mouvements") montrant l'heure exacte, le produit, l'utilisateur et l'icône de la direction du flux.

**d. Moteur d'Exportation Natif (Rapports CSV & PDF) :**
L'UI intègre un puissant module asynchrone permettant au gestionnaire d'exporter la situation exacte filtrée (Génération HTML programmatique dynamique convertie en fenêtre d'impression globale).

### 4.2. Module des Alertes (Alerts UI) : Surveillance Proactive
Le module d'alerte (`AlertsComponent`) est bâti pour la réactivité, interrogeant le backend toutes les 10 secondes et rafraîchissant l'écran avec fluidité.

**a. Synthèse Statistique (Stats Strip) :**
Au sommet, quatre cartes statistiques distinctives catégorisent le degré d'urgence : Critiques (Rouge), Avertissements (Orange), Infos (Bleu) et Alertes Non Lues.

**b. Liste d'Alertes Intelligentes et Modales interactives :**
- La liste est constituée de **"Cards" (Cartes d'alerte)** dynamiques disposant de badges (Résolu, Criticité).
- L'affichage montre exactement la localisation (Site), l'objet (Produit), l'auteur (Utilisateur) et un formatage temporel "Il y a X minutes/jours" (Time-ago formatter).
- **Interactivité :** En cliquant, une Modale (Pop-up) détaillée s'ouvre, expliquant la règle ayant déclenché l'alerte, et présente un bouton "Marquer comme résolu" exclusif aux rôles manager.
- Filtres intégrés par sévérité (Pills), par produit, par sélecteur de date calendaire natif HTML5, et un toggle pour masquer/afficher les archives résolues.

### 4.3. Module de Réapprovisionnement : Aide à la décision automatisée
Le script métier derrière le `ReapprovisionnementComponent` analyse la totalité des matrices (seuilMaximum, seuilMinimum, seuilSecurite, seuilAlerte) pour chaque article de chaque site. 

**a. Algorithme de Suggestion et Moteur de Décision :**
La logique (Logique Métier/Front) est stricte :
- Si la **Quantité disponible** ≤ **Seuil Alerte** : Le produit est flagué pour action.
- Le système calcule une **Quantité Commandée Suggérée**. 
  - *Calcul :* Il identifie la cible idéale (soit le paramètre "Seuil Maximum", soit "Seuil Alerte") et lui soustrait la quantité actuelle, garantissant une commande mathématiquement optimisée évitant le surstockage inutile.

**b. Interface "Action-oriented" (Data Grid) :**
- La vue tableau est expurgée de bruit visuel. Chaque ligne reçoit une animation d'entrée décalée (Staggered Animation en MS).
- Des statuts colorés et iconographiés qualifient l'urgence : **Rupture** (Icône danger), **Critique** (Warning), **Sécurité** (Shield), ou **Alerte** (Cloche).
- **Le Deep-Linking (Deep Action) :** Face à chaque rupture, un bouton "Approvisionner" redirige le magasinier directement vers le module d'entrée de stock (`/movements`), en remplissant automatiquement l'URL avec les *QueryParameters* (`productId`, `siteId`, `mode=entry`). Cela supprime 4 clics de navigation pour le travailleur et optimise considérablement le flux de travail (Workflow efficiency).

---

## 5. Synthèse des Exigences Non Fonctionnelles et de la Logique Métier
- **Temps Réel et Asynchronisme :** Les requêtes sont asynchrones (RxJS) pour maintenir l'application vivante et rapide (absence de rafraîchissements de page bloquants).
- **Traçabilité stricte :** Rien n'échappe au backend (Historique de Scan Mobile par ZXing, Historique complet des motifs avec validations anti-doublons).
- **Architecture de droit RBAC :** Intégrée nativement en *Guards Angular*, tout composant masque ses sous-briques administratives aux simples Opérateurs manutentionnaires.
