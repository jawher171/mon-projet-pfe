# Dossier d'Analyse et de Conception de l'Application de Gestion de Stock (PFE)

## 1. Introduction et Objectif du Projet
L'objectif de ce projet de fin d'études (PFE) est de concevoir et développer une application complète de gestion de stock multi-sites. Ce système permet d'automatiser et de numériser les processus logistiques afin de suivre en temps réel les niveaux de stock, de gérer les mouvements (entrées, sorties, transferts inter-sites) et d'automatiser les alertes de réapprovisionnement pour éviter les ruptures de stock ainsi que le sur-stockage.

## 2. Architecture Globale et Technologies (Stack Technique)
Le projet se base sur une **Architecture Client-Serveur** moderne, isolant complètement la partie interface utilisateur de la logique métier.

- **Frontend (Application Client) :**
  - **Framework :** Angular 21 (Single Page Application - SPA).
  - **Styling & UI :** TailwindCSS pour le design utilitaire, SCSS.
  - **Visualisation de Données :** Chart.js avec ng2-charts pour des graphiques dynamiques.
  - **Fonctionnalités matérielles (Hardware) :** Scanner de code-barres et QR code via `@zxing/browser`.
  - **Temps Réel :** Intégration de Microsoft SignalR pour des mises à jour asynchrones en temps réel sur les clients connectés.

- **Backend (API Restful) :**
  - **Framework :** ASP.NET Core 3.1 Web API.
  - **Langage :** C#.
  - **Design Patterns :**
    - **N-Tiers :** Couches Application, Domain, Data.
    - **CQRS (Command Query Responsibility Segregation) :** Implémenté avec la librairie **MediatR**. Séparation stricte entre les modèles modifiant les données (Commands) et ceux les lisant (Queries).
    - **Repository Pattern :** Utilisation d'un `IGenericRepository` pour mutualiser la logique d'accès aux données.
  - **ORM (Object-Relational Mapping) :** Entity Framework Core (EF Core).
  - **Base de données :** Microsoft SQL Server.

- **Sécurité et Authentification :**
  - Sécurisation des routes par **JWT (JSON Web Tokens)**.
  - Concept de **RBAC (Role-Based Access Control)** couplé à une **matrice de permissions** granulaire (ex: `view_products`, `manage_sites`, `manage_movements`).

## 3. Modélisation des Données (Entités Principales)
La base de données relationnelle est articulée autour des entités fondamentales suivantes :
- **User (Utilisateur) :** Informations de connexion, lié de manière N:1 à un `Role`.
- **Role & Permission :** L'association `RolePermission` définit l'accès aux sous-systèmes de l'application.
- **Product (Produit) & Category :** Définition centralisée du catalogue articles (Code-barres, Nom, Prix, Catégorie).
- **Site :** Un lieu physique de stockage (Magasin principal, Entrepôt secondaire).
- **Stock (L'entité pivot) :** Représente l'intersection entre un `Produit` et un `Site`. Contient la `QuantiteDisponible` et gère le paramétrage des différents seuils logistiques (Alerte, Sécurité).
- **StockMovement (Mouvement de Stock) :** Registre inaltérable mémorisant qui (Utilisateur) a fait quoi (Type: Entrée/Sortie/Transfert), de combien (Quantité), sur quel Stock, et pour quelle `Raison`.
- **Alert (Alerte) :** Entité de surveillance générée par des déclencheurs métiers quand un niveau critique est atteint.

## 4. Fonctionnalités Détaillées (Ce que fait l'application)

### 4.1. Tableau de Bord Intéractif (Dashboard)
- Vue d'ensemble stratégique sur l'état du système via des graphiques.
- Suivi des Indicateurs Clés de Performance (KPI) : Mouvements totaux, alertes ouvertes, valeur du stock.

### 4.2. Gestion Multi-Sites et Catalogue Produits
- Configuration avancée de multiples sites depuis l'interface d'administration.
- Maintenance du catalogue de produits et génération automatisée ou manuelle de codes-barres.
- **Aperçu des Stocks (Stocks Overview) :** Visualisation matricielle des quantitées disponibles de chaque produit réparties sur chaque site actif de l'entreprise.

### 4.3. Mouvements de Stock et Transferts Inter-Magasins
- **Traçabilité :** Enregistrement de tous types de transactions (réception fournisseur, vente, casse).
- **Transferts Inter-Magasins :** Fonctionnalité complexe de déplacement de marchandise d'un Site A (Source) vers un Site B (Destination). L'application gère la mise à jour double et simultanée du `Stock` pour garantir l'équité des quantités.
- **Raisons personnalisées (Gérer Raisons) :** Interface d'administration pour créer, éditer et supprimer des motifs de mouvement de stock ("Défectueux", "DLC dépassée"). Le backend inclut des contrôles robustes contre l'ajout de motifs en doublon pour le même type d'action.

### 4.4. Moteur de Règles des Seuils et Alertes
- Configuration poussée des paramètres de stock : *Seuil de Sécurité, Seuil Minimum, Seuil d'Alerte, Seuil Maximum*.
- **Validation croisée frontend/backend :** Un algorithme empêche la soumission de seuils illogiques (ex: Empêcher un seuil Minimum d'être inférieur au seuil de Sécurité, empêchant l'utilisateur de valider le formulaire HTML, tout en vérifiant côté API).
- **Génération d'Alertes :** Lorsqu'un mouvement de sortie ou de transfert réduit la quantité disponible d'un produit en deçà de son "Seuil d'alerte", une alerte est enregistrée, affichée aux gestionnaires et non dupliquée grâce à un système de `Fingerprint`.

### 4.5. Module Réapprovisionnement Intelligent
- Module analysant les stocks actuels par rapport aux "Seuils Maximum".
- Génère automatiquement des propositions de commandes (Quantité Suggérée) pour ramener le stock à son niveau optimal sans intervention manuelle complexe.

### 4.6. Scanner Mobile et PDA (Relais Téléphone)
- Interface spécialement pensée pour une utilisation sur smartphone (`Route: /scan`).
- Permet l'ouverture de la caméra pour lire en direct les codes-barres ou QR codes des produits.
- L'architecture permet, lors du scan mobile, de remonter l'information en temps réel sur le poste ordinateur du magasinier, synchronisant l'action dans le panier ou provoquant un mouvement direct de la base de données.
- Accompagné d'un journal/historique des scans (`Scan History`) côté backend.

## 5. Exemple de Flux Technologique (Workflow de transfert)
*Ce workflow illustre le niveau technique devant être repris dans la rédaction du mémoire d'ingénieur/technicien :*
1. Le "Gestionnaire de Stock" navigue vers l'écran de mouvements et choisit "Transfert".
2. Angular vérifie la permission `view_movements` et `manage_movements` (via Guards).
3. Soumission de la requête `POST /api/StockMovements/AddStockMovement`.
4. Le Backend .NET valide le Token JWT.
5. Une "Command" MediatR (`CreateStockMovementCommand`) est encapsulée avec le DTO reçu et traitée par son `Handler`.
6. Le gestionnaire de la commande effectue une transaction avec EF Core : Déduction de la quantité du Site Source (sortie) => Ajout de la même quantité sur le Site Destinataire (entrée).
7. Le système de domaine interroge ensuite les seuils dynamiques. Si la source est < Seuil Alerte, une alerte est persistée en DB.
8. La transaction est commitée dans SQL Server, et une notification temps-réel (SignalR) est poussée à tous les clients pour rafraîchir l'UI.

---

**Comment utiliser ce document pour Claude.ai (ou ChatGPT) :** 
Fournissez l'intégralité de ce prompt à l'IA en lui demandant :
*"Voici l'analyse complète de l'architecture et des fonctionnalités de mon application de PFE. Agis comme un directeur de thèse ou un consultant technique, et rédige-moi les différentes parties de mon rapport (Introduction, Contexte, Choix Techniques, Modélisation, Diagramme de cas d'utilisation, Architecture) en te basant exclusivement sur ce contenu exhaustif."*
