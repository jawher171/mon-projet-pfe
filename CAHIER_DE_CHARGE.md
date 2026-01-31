# CAHIER DE CHARGE - Plateforme d'Inventaire Intelligent

## Table des Matières
1. [Vue d'ensemble du projet](#vue-densemble)
2. [Objectifs](#objectifs)
3. [Scope du projet](#scope)
4. [Acteurs du système](#acteurs)
5. [Exigences fonctionnelles](#exigences-fonctionnelles)
6. [Exigences non-fonctionnelles](#exigences-non-fonctionnelles)
7. [Architecture technique](#architecture-technique)
8. [Processus Scrum](#processus-scrum)
9. [Risques et mitigation](#risques)
10. [Livrables et timeline](#livrables)

---

## Vue d'ensemble du projet {#vue-densemble}

### Description générale
La **Plateforme d'Inventaire Intelligent** est une application web destinée à gérer les entrées, sorties et mouvements d'inventaire avec un système d'alertes automatiques. L'application supportera le multi-magasin, le tracking par QR/code-barres et un tableau de bord de réapprovisionnement complet.

### Service
Développement

### Contexte métier
L'entreprise a besoin d'une solution moderne et scalable pour :
- Gérer les stocks à travers plusieurs sites/magasins
- Automatiser la génération d'alertes selon des règles métier
- Tracer les mouvements d'inventaire en temps réel
- Faciliter les opérations grâce au scanning QR/code-barres

### Durée estimée du projet
À définir selon le calendrier de sprint

---

## Objectifs {#objectifs}

### Objectifs primaires
1. **Gérer les mouvements d'entrées/sorties** : Enregistrer et suivre tous les mouvements d'inventaire avec traçabilité complète
2. **Mettre en place un tableau de bord de réapprovisionnement** : Visualiser les niveaux de stock et les seuils d'alerte en temps réel
3. **Générer des alertes automatiques** : Créer un système d'alertes intelligentes selon des règles métier prédéfinies
4. **Ajouter le scanning QR/Code-barres** : Faciliter les opérations de stock par scanning rapide
5. **Administrer plusieurs sites/magasins** : Gérer les permissions et les données par site

### Objectifs secondaires
- Améliorer l'efficacité opérationnelle
- Réduire les erreurs manuelles
- Fournir des reports et statistiques d'inventaire

---

## Scope du projet {#scope}

### Inclus dans le scope
- Application web responsive (Angular)
- Backend API (.NET avec CQRS)
- Gestion multi-magasin
- Système d'authentification et d'autorisation
- Module de scanning QR/code-barres
- Tableau de bord d'alertes
- Reporting d'inventaire
- Système de gestion des utilisateurs et des rôles

### Exclus du scope
- Application mobile native (à phase ultérieure)
- Intégration ERP avancée (future phase)
- Prévisions d'inventaire IA/ML (future phase)

---

## Acteurs du système {#acteurs}

### Acteurs internes

#### 1. **Responsable d'inventaire (Inventory Manager)**
- **Responsabilités** : Gérer les mouvements, valider les alertes, générer des reports
- **Permissions** : Lecture/écriture complète sur son site, lecture sur autres sites
- **Interactions** : Tableau de bord, scanning, gestion des mouvements

#### 2. **Gestionnaire de magasin (Warehouse Manager)**
- **Responsabilités** : Superviser les opérations, valider les mouvements importants
- **Permissions** : Accès complet à son magasin, supervision des utilisateurs
- **Interactions** : Dashboard administrateur, approvals, reporting

#### 3. **Opérateur de stock (Stock Operator)**
- **Responsabilités** : Effectuer les mouvements quotidiens, scanner les articles
- **Permissions** : Création de mouvements, scanning QR/code-barres
- **Interactions** : Interface de scanning simplifiée, liste des mouvements

#### 4. **Administrateur système (System Administrator)**
- **Responsabilités** : Gérer les utilisateurs, les sites, les configurations système
- **Permissions** : Accès administrateur complet
- **Interactions** : Panneau d'administration, gestion des droits

#### 5. **Responsable achats (Procurement Manager)**
- **Responsabilités** : Gérer les commandes et les alertes de réapprovisionnement
- **Permissions** : Lecture des stocks, gestion des seuils d'alerte
- **Interactions** : Dashboard de réapprovisionnement

### Acteurs externes
- **Fournisseurs** : Consultation des commandes (futur)
- **Clients** : Consultation des stocks disponibles (futur)

---

## Exigences fonctionnelles {#exigences-fonctionnelles}

### 1. Authentification et Autorisation
- **EXF-001** : L'utilisateur doit pouvoir se connecter avec ses identifiants
- **EXF-002** : Le système doit gérer les rôles et permissions (RBAC)
- **EXF-003** : La session doit expirer après 30 minutes d'inactivité
- **EXF-004** : L'administrateur doit pouvoir gérer les accès des utilisateurs

### 2. Gestion des mouvements d'inventaire
- **EXF-005** : L'opérateur doit pouvoir créer un mouvement (entrée/sortie)
- **EXF-006** : Le système doit enregistrer la traçabilité complète (qui, quand, quoi)
- **EXF-007** : Le gestionnaire doit pouvoir valider les mouvements
- **EXF-008** : Le système doit gérer les mouvements de transfert entre sites
- **EXF-009** : Chaque mouvement doit avoir un statut (brouillon, validé, rejeté)

### 3. Scanning QR/Code-barres
- **EXF-010** : Le système doit supporter le scanning de codes-barres via caméra/lecteur
- **EXF-011** : Le scanning doit récupérer automatiquement les données du produit
- **EXF-012** : Le système doit valider le format du code avant traitement
- **EXF-013** : L'interface de scanning doit être optimisée pour mobile/tactile

### 4. Gestion des produits
- **EXF-014** : L'administrateur doit pouvoir créer/modifier/supprimer des produits
- **EXF-015** : Chaque produit doit avoir un code-barres unique
- **EXF-016** : Le système doit gérer les catégories de produits
- **EXF-017** : Le système doit stocker la photo et la description du produit

### 5. Tableau de bord d'alertes
- **EXF-018** : Le système doit générer des alertes automatiquement selon des règles
- **EXF-019** : Les alertes doivent être affichées sur le dashboard en temps réel
- **EXF-020** : L'utilisateur doit pouvoir filtrer/rechercher les alertes
- **EXF-021** : Le gestionnaire doit pouvoir configurer les règles d'alerte

### 6. Dashboard de réapprovisionnement
- **EXF-022** : Afficher les niveaux de stock par produit/site
- **EXF-023** : Identifier les produits sous le seuil minimum
- **EXF-024** : Suggérer des quantités de réapprovisionnement
- **EXF-025** : Historique des réapprovisionnements

### 7. Gestion multi-site
- **EXF-026** : L'administrateur doit pouvoir créer/modifier/supprimer des sites
- **EXF-027** : Le système doit isoler les données par site
- **EXF-028** : Les utilisateurs doivent avoir des permissions par site
- **EXF-029** : Le système doit permettre les transfers entre sites

### 8. Reporting et statistiques
- **EXF-030** : Générer des rapports d'inventaire par période
- **EXF-031** : Exporter les données en CSV/Excel
- **EXF-032** : Visualiser les statistiques de mouvements (graphiques)
- **EXF-033** : Générer des rapports d'alertes par critères

---

## Exigences non-fonctionnelles {#exigences-non-fonctionnelles}

### Performance
- **ENF-001** : Le système doit supporter 100+ utilisateurs simultanés
- **ENF-002** : Les pages doivent charger en moins de 3 secondes
- **ENF-003** : Les requêtes API doivent répondre en moins de 500ms
- **ENF-004** : Le scanning doit être instantané (< 200ms)

### Sécurité
- **ENF-005** : Toutes les communications doivent être en HTTPS
- **ENF-006** : Les mots de passe doivent être hashés (bcrypt/Argon2)
- **ENF-007** : Les données sensibles doivent être chiffrées en base de données
- **ENF-008** : L'authentification doit inclure 2FA (optionnel pour phase 1)
- **ENF-009** : Audit trail de toutes les modifications critiques

### Scalabilité
- **ENF-010** : L'architecture doit supporter la croissance à 10 000 produits
- **ENF-011** : Capable de gérer 50+ sites
- **ENF-012** : DB optimisée pour les requêtes fréquentes (indexes)

### Fiabilité
- **ENF-013** : Disponibilité cible : 99.5%
- **ENF-014** : RTO (Recovery Time Objective) : 1 heure
- **ENF-015** : RPO (Recovery Point Objective) : 15 minutes
- **ENF-016** : Backup automatique quotidien

### Maintenabilité
- **ENF-017** : Code bien documenté et commenté
- **ENF-018** : Tests unitaires avec couverture > 80%
- **ENF-019** : Logs structurés pour monitoring
- **ENF-020** : Deployement automatisé (CI/CD)

### Compatibilité
- **ENF-021** : Support des navigateurs modernes (Chrome, Firefox, Safari, Edge)
- **ENF-022** : Responsive design pour desktop, tablet, mobile
- **ENF-023** : Compatible iOS et Android pour le scanning

---

## Architecture technique {#architecture-technique}

### Diagramme d'architecture globale
```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                               │
│                   (Angular 17+ TypeScript)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Components │ Services │ Store │ Routing │ Styling (SCSS)  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             ↓ HTTPS REST API
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY LAYER                            │
│  (Authentication, Rate Limiting, CORS, Load Balancing)          │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER (.NET)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Controllers │ Commands │ Queries │ Handlers │ Services   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                    (CQRS Pattern)                               │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Entities │ Domain Services │ Value Objects │ Aggregates  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Database │ Cache │ Message Bus │ External Services      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend - Angular Architecture

```
src/
├── app/
│   ├── core/
│   │   ├── models/          # Modèles de données (TypeScript interfaces)
│   │   │   ├── product.model.ts
│   │   │   ├── movement.model.ts
│   │   │   ├── alert.model.ts
│   │   │   ├── user.model.ts
│   │   │   ├── site.model.ts
│   │   │   ├── category.model.ts
│   │   │   ├── supplier.model.ts
│   │   │   └── order.model.ts
│   │   ├── services/        # Services API et métier
│   │   │   ├── auth.service.ts          # Authentification
│   │   │   ├── product.service.ts       # Produits
│   │   │   ├── movement.service.ts      # Mouvements
│   │   │   ├── alert.service.ts         # Alertes
│   │   │   ├── category.service.ts      # Catégories
│   │   │   └── site.service.ts          # Sites/Magasins
│   │   └── guards/          # Route guards (AuthGuard, RoleGuard)
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   └── login/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── movements/
│   │   ├── scanner/
│   │   ├── alerts/
│   │   └── sites/
│   │
│   ├── layouts/
│   │   └── main-layout/
│   │
│   ├── shared/              # Composants réutilisables (future)
│   │
│   ├── app.config.ts        # Configuration globale
│   ├── app.routes.ts        # Routing
│   ├── app.ts               # Composant principal
│   └── app.scss             # Styles globaux
│
└── index.html
```

**Stack Frontend:**
- Angular 17+ (dernière version stable)
- TypeScript 5.x
- RxJS (Observables)
- Angular Material / Bootstrap (UI Framework)
- SCSS (Stylisation)
- HttpClient (Requêtes API)

### Backend - .NET Architecture (CQRS)

```
Inventaire.API/
├── Controllers/
│   ├── AuthController.cs
│   ├── ProductController.cs
│   ├── MovementController.cs
│   ├── AlertController.cs
│   └── SiteController.cs
│
├── Application/
│   ├── Commands/
│   │   ├── CreateMovementCommand.cs
│   │   ├── CreateProductCommand.cs
│   │   └── UpdateAlertRuleCommand.cs
│   │
│   ├── Queries/
│   │   ├── GetProductsQuery.cs
│   │   ├── GetMovementsQuery.cs
│   │   └── GetAlertsQuery.cs
│   │
│   └── Handlers/
│       ├── CreateMovementCommandHandler.cs
│       ├── GetProductsQueryHandler.cs
│       └── GenerateAlertCommandHandler.cs
│
├── Domain/
│   ├── Entities/
│   │   ├── Product.cs
│   │   ├── Movement.cs
│   │   ├── Alert.cs
│   │   ├── User.cs
│   │   ├── Site.cs
│   │   └── Category.cs
│   │
│   └── Services/
│       ├── AlertingService.cs
│       ├── InventoryService.cs
│       └── ValidationService.cs
│
├── Infrastructure/
│   ├── Persistence/
│   │   ├── InventaireDbContext.cs
│   │   └── Repositories/
│   │       ├── ProductRepository.cs
│   │       ├── MovementRepository.cs
│   │       └── AlertRepository.cs
│   │
│   ├── Identity/
│   │   └── AuthService.cs
│   │
│   └── ExternalServices/
│       └── BarcodeService.cs
│
└── Program.cs (Configuration Dependency Injection)
```

**Stack Backend:**
- .NET 8 LTS
- C# 12
- Entity Framework Core (ORM)
- SQL Server (Base de données)
- MediatR (CQRS)
- AutoMapper (DTO Mapping)
- JWT (Authentication)
- Serilog (Logging)

### Flux CQRS

**Pattern CQRS (Command Query Responsibility Segregation):**

```
                    REQUEST
                       ↓
         ┌─────────────────────────┐
         │   MediatR Dispatcher    │
         └─────────────┬───────────┘
                       ↓
         ┌──────────────────────────────┐
         │ Est-ce une Command/Query?    │
         └──────────────────────────────┘
                 ↙          ↘
          COMMAND          QUERY
           ↓                ↓
    ┌───────────────┐  ┌─────────────┐
    │   Handler     │  │   Handler   │
    │   (Écriture)  │  │  (Lecture)  │
    └───────┬───────┘  └─────┬───────┘
            ↓                ↓
       [Database]      [Database]
       [Write DB]      [Read DB] (optionnel)
            ↓                ↓
         RESPONSE     ←────────┘
```

### Base de données

**Modèle relationnel simplifié:**

```
USERS
├── UserId (PK)
├── Username (UNIQUE)
├── Email
├── PasswordHash
├── Role (Admin, Manager, Operator, Buyer)
├── SiteId (FK)
└── CreatedAt

SITES
├── SiteId (PK)
├── Name
├── Location
├── Address
└── IsActive

PRODUCTS
├── ProductId (PK)
├── Name
├── Barcode (UNIQUE)
├── CategoryId (FK)
├── Description
├── ImageUrl
├── SupplierId (FK)
└── CreatedAt

CATEGORIES
├── CategoryId (PK)
├── Name
└── Description

STOCK_LEVELS
├── StockLevelId (PK)
├── ProductId (FK)
├── SiteId (FK)
├── Quantity
├── MinimumThreshold
├── ReorderQuantity
└── LastUpdated

MOVEMENTS
├── MovementId (PK)
├── MovementType (In/Out/Transfer)
├── ProductId (FK)
├── FromSiteId (FK)
├── ToSiteId (FK)
├── Quantity
├── Reason
├── UserId (FK)
├── Status (Draft/Approved/Rejected)
├── CreatedAt
└── ApprovedAt

ALERTS
├── AlertId (PK)
├── AlertType (StockLow, StockHigh, MovementAnomaly)
├── ProductId (FK)
├── SiteId (FK)
├── RuleId (FK)
├── Message
├── Severity (Critical, Warning, Info)
├── IsResolved
├── CreatedAt
└── ResolvedAt

ALERT_RULES
├── RuleId (PK)
├── Name
├── Condition (JSON)
├── Action
├── IsActive
└── CreatedAt

SUPPLIERS
├── SupplierId (PK)
├── Name
├── ContactPerson
├── Email
└── Phone

ORDERS
├── OrderId (PK)
├── OrderNumber (UNIQUE)
├── SupplierId (FK)
├── OrderDate
├── ExpectedDeliveryDate
├── Status (Pending/Received/Cancelled)
└── TotalAmount
```

---

## Processus Scrum {#processus-scrum}

### Rôles Scrum

#### 1. Product Owner
- Définit et priorise le Product Backlog
- Clarie les exigences avec les stakeholders
- Accepte les user stories complétées
- Gère les priorités et les changes

#### 2. Scrum Master
- Facilite les cérémonies Scrum
- Élimine les obstacles/blockers
- Protège l'équipe des interruptions externes
- Assure le respect des pratiques Scrum

#### 3. Développement Team
- 4-8 développeurs
- Multi-disciplinaire (Frontend + Backend + QA)
- Auto-organisée et responsable
- Estimates et complète les user stories

### Durée des Sprints
**2 semaines (10 jours ouvrables)**

### Cérémonies Scrum

#### 1. Sprint Planning
- **Quand** : Premier jour du sprint, 10h00
- **Durée** : 2 heures (max)
- **Participants** : Équipe complète + Product Owner
- **Objectifs** :
  - Sélectionner les user stories pour le sprint
  - Définir le Sprint Goal
  - Décomposer les user stories en tâches techniques
  - Estimer les tâches (Planning Poker)

#### 2. Daily Standup
- **Quand** : Chaque jour de 9h30 à 9h45 (15 minutes)
- **Participants** : Équipe de dev + Scrum Master
- **Format** (par personne) :
  - Qu'ai-je fait hier ?
  - Que vais-je faire aujourd'hui ?
  - Ai-je des blockers ?

#### 3. Sprint Review
- **Quand** : Dernier jour du sprint, 15h00
- **Durée** : 1 heure
- **Participants** : Équipe + Product Owner + Stakeholders
- **Objectifs** :
  - Démontrer les items complétés
  - Recueillir le feedback
  - Discuter du Product Backlog

#### 4. Sprint Retrospective
- **Quand** : Immédiatement après le Sprint Review
- **Durée** : 45 minutes
- **Participants** : Équipe de dev + Scrum Master
- **Format** :
  - Qu'avons-nous bien fait ?
  - Où pouvons-nous nous améliorer ?
  - Action items pour le prochain sprint

#### 5. Product Backlog Refinement
- **Quand** : Mi-sprint (jeudi)
- **Durée** : 1 heure
- **Participants** : Product Owner + équipe
- **Objectifs** :
  - Clarifier et détailler les user stories futures
  - Faire des estimations préalables
  - Préparer le backlog pour les prochains sprints

### Velocity et Estimation

**Système d'estimation** : Planning Poker (1, 2, 3, 5, 8, 13, 21 points)

**Formule de Velocity** :
$$V_{sprint} = \sum_{i=1}^{n} \text{points complétés dans le sprint}$$

**Velocity cible** : À affiner après les 2-3 premiers sprints

**Prévisions** :
$$\text{Date de livraison estimée} = \frac{\text{Total points restants}}{\text{Velocity moyenne}}$$

### Definition of Done (DoD)

Une user story est considérée comme "Done" si :

- ✅ Code écrit et review effectuée (+ 1 approbation)
- ✅ Tests unitaires écrits (couverture ≥ 80%)
- ✅ Tests d'intégration réussis
- ✅ Code mergé dans la branche develop
- ✅ Documentation code à jour
- ✅ Pas de code smell détecté (SonarQube)
- ✅ Performance testée (pas de régression)
- ✅ Validé par le Product Owner

### Definition of Ready (DoR)

Une user story est prête pour le sprint si :

- ✅ Bien définie et clarifiée avec le PO
- ✅ Critères d'acceptation clairs
- ✅ Estimée par l'équipe
- ✅ Priorisée dans le backlog
- ✅ Dépendances identifiées

---

## Risques et mitigation {#risques}

| # | Risque | Probabilité | Impact | Mitigation |
|---|--------|-------------|--------|-----------|
| R1 | Retard de livraison backend | Moyen | Haut | Dédier un dev senior, daily follow-up |
| R2 | Intégration QR/Code-barres complexe | Moyen | Moyen | PoC en sprint 1, expert technique |
| R3 | Défaut de performance BD | Moyen | Haut | Indexation, optimisation requêtes, load tests |
| R4 | Fuite de données sensibles | Bas | Critique | Audit sécurité, chiffrement, HTTPS obligatoire |
| R5 | Changements de requirements | Haut | Moyen | Backlog bien priorisé, Process change control |
| R6 | Indisponibilité d'une ressource clé | Bas | Moyen | Pair programming, documentation |
| R7 | Problèmes d'intégration multi-site | Moyen | Moyen | Données test variées, tests d'intégration |

---

## Livrables et timeline {#livrables}

### Livrables par phase

#### Phase 1 : Infrastructure et Authentification (Sprint 1-2)
- **Livrable 1.1** : Infrastructure cloud/serveur prête
- **Livrable 1.2** : API authentification (Login/Logout, JWT)
- **Livrable 1.3** : Système RBAC fonctionnel
- **Livrable 1.4** : Interface Login (Angular)

#### Phase 2 : Gestion des produits et catégories (Sprint 3-4)
- **Livrable 2.1** : API CRUD Produits
- **Livrable 2.2** : API Catégories
- **Livrable 2.3** : Dashboard Produits (Angular)
- **Livrable 2.4** : Gestion des codes-barres

#### Phase 3 : Mouvements d'inventaire (Sprint 5-7)
- **Livrable 3.1** : API Mouvements (Create, Read, Update, Validate)
- **Livrable 3.2** : Interface mouvements (Angular)
- **Livrable 3.3** : Gestion multi-site pour mouvements
- **Livrable 3.4** : Traçabilité complète

#### Phase 4 : Scanning QR/Code-barres (Sprint 8)
- **Livrable 4.1** : Service scanning intégré
- **Livrable 4.2** : Interface scanner optimisée mobile
- **Livrable 4.3** : Validation et mapping données
- **Livrable 4.4** : Tests scanning (différents types)

#### Phase 5 : Système d'alertes (Sprint 9-10)
- **Livrable 5.1** : API Alertes avec rules engine
- **Livrable 5.2** : Dashboard Alertes (Angular)
- **Livrable 5.3** : Notifications temps réel (WebSocket/SignalR)
- **Livrable 5.4** : Configurations des règles

#### Phase 6 : Dashboard de réapprovisionnement (Sprint 11)
- **Livrable 6.1** : API Dashboard Restock
- **Livrable 6.2** : Visualisations et graphiques
- **Livrable 6.3** : Suggestions automatiques
- **Livrable 6.4** : Intégration commandes

#### Phase 7 : Reporting et optimisations (Sprint 12-13)
- **Livrable 7.1** : Rapports Excel/CSV
- **Livrable 7.2** : Statistiques et graphiques avancés
- **Livrable 7.3** : Optimisations performance
- **Livrable 7.4** : Documentation complète

#### Phase 8 : Tests et déploiement (Sprint 14-15)
- **Livrable 8.1** : Tests UAT complétés
- **Livrable 8.2** : Documentation utilisateur
- **Livrable 8.3** : Déploiement production
- **Livrable 8.4** : Formation utilisateurs

### Timeline estimée

```
Sprint 1-2   (Semaines 1-4)   : Infrastructure & Auth
Sprint 3-4   (Semaines 5-8)   : Produits & Catégories
Sprint 5-7   (Semaines 9-14)  : Mouvements
Sprint 8     (Semaine 15-16)  : Scanner QR
Sprint 9-10  (Semaines 17-20) : Alertes
Sprint 11    (Semaines 21-22) : Dashboard Restock
Sprint 12-13 (Semaines 23-26) : Reporting & Optimisations
Sprint 14-15 (Semaines 27-30) : Tests & Déploiement

TOTAL : ~7,5 mois (30 semaines)
```

### Critères de succès du projet

- ✅ Tous les livrables complétés dans les délais
- ✅ Couverture de tests > 80%
- ✅ Zéro défauts critiques en production
- ✅ Performance : temps de réponse < 500ms (95e centile)
- ✅ Taux d'adoption utilisateur > 90%
- ✅ Satisfaction utilisateur > 4/5
- ✅ Disponibilité > 99.5%

---

## Points de contact et escalade

### Escalade

1. **Niveau 1** (Daily) : Scrum Master & Team Lead
2. **Niveau 2** (Weekly) : Product Owner & Tech Lead
3. **Niveau 3** (Escalation) : Project Manager & Sponsor

### Communication

- **Daily Standup** : 9h30
- **Sprint Planning** : Premier jour du sprint, 10h00
- **Status Report** : Vendredi 17h00 (Email)
- **On-demand** : Slack channel #pfe-inventaire

---

## Annexes

### Annexe A : User Stories template

```
En tant que [acteur],
Je veux [action],
Afin de [bénéfice métier].

Critères d'acceptation :
- Critère 1
- Critère 2
- Critère 3

Tâches techniques :
- [ ] Tâche 1
- [ ] Tâche 2
- [ ] Tâche 3

Estimation : X points
```

### Annexe B : Technologies complètes

| Couche | Technologie | Version |
|--------|-------------|---------|
| Frontend | Angular | 17+ |
| Frontend | TypeScript | 5.x |
| Frontend | SCSS | Latest |
| Frontend | RxJS | 7.x |
| Backend | .NET | 8 LTS |
| Backend | C# | 12 |
| Backend | EF Core | 8.x |
| Backend | MediatR | 12.x |
| Database | SQL Server | 2022 |
| Authentication | JWT | Standard |
| Testing | XUnit/.NETUnit | Latest |
| Testing | Jest/Karma | Latest |
| Logging | Serilog | Latest |
| Monitoring | Application Insights | Latest |
| CI/CD | GitHub Actions / Azure DevOps | Latest |

---

**Document rédigé le** : 31 janvier 2026  
**Version** : 1.0  
**Statut** : À approuver
