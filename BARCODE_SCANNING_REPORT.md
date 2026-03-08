# Rapport — Système de Scan Code-Barres en Temps Réel

## Vue d'ensemble

Ce document décrit l'implémentation du système de scan de code-barres en temps réel, permettant la communication entre un téléphone mobile (scanner) et un PC (application web) via **SignalR**. Le système couvre 5 fonctionnalités principales + la configuration réseau nécessaire pour l'accès mobile.

---

## Architecture technique

```
┌──────────────────┐     SignalR WebSocket      ┌──────────────────────┐
│  📱 Téléphone    │ ◄──────────────────────► │  🖥️ Backend .NET     │
│  (Page /scan)    │                            │  InventoryHub        │
│  Caméra + ZXing  │                            │  /hubs/inventory     │
└──────────────────┘                            └──────────┬───────────┘
        │                                                  │ SignalR
        │ HTTPS (ngrok tunnel)                             ▼
        │                                       ┌──────────────────────┐
        └──────────────────────────────────────► │  💻 PC (Angular)     │
          ngrok-free.dev → localhost:4200        │  Products / Movements│
                                                 │  QR Modal affiché    │
                                                 └──────────────────────┘
```

**Flux de communication :**
1. Le PC génère un QR code contenant une URL **publique ngrok** avec `sessionId` + `purpose`
2. Le téléphone scanne le QR code → ouvre la page `/scan` via le tunnel ngrok
3. Le téléphone et le PC rejoignent la même session SignalR (`scan-{sessionId}`)
4. Le téléphone lit un code-barres via la caméra (ZXing) et l'envoie au hub
5. Le hub diffuse le code au PC via l'événement `ScanDetected`
6. Le PC reçoit le code et remplit automatiquement le champ concerné

---

## Configuration réseau et connectivité mobile

### Problème
Le serveur de développement Angular tourne sur `localhost:4200` — inaccessible depuis un téléphone sur un réseau Wi-Fi différent ou avec isolation AP activée.

### Solution : Tunnel ngrok

Un tunnel **ngrok** expose le serveur local via une URL HTTPS publique, permettant au téléphone d'accéder à l'application sans configuration réseau complexe.

**Démarrage du tunnel :**
```bash
# 1. Configurer le token ngrok (une seule fois)
ngrok config add-authtoken <VOTRE_TOKEN>

# 2. Lancer le tunnel
ngrok http 4200
```

### Configuration Angular (`angular.json`)

Le serveur de développement Angular bloque par défaut les requêtes provenant de domaines externes. Il faut ajouter `allowedHosts` :

```json
{
  "serve": {
    "options": {
      "host": "0.0.0.0",
      "port": 4200,
      "proxyConfig": "proxy.conf.json",
      "allowedHosts": [".ngrok-free.dev", ".ngrok.io"]
    }
  }
}
```

### Proxy Angular → Backend .NET (`proxy.conf.json`)

Pour éviter les erreurs CORS entre le frontend Angular et le backend .NET :

```json
{
  "/backend": {
    "target": "https://localhost:44353",
    "secure": false,
    "changeOrigin": true,
    "ws": true,
    "pathRewrite": { "^/backend": "" },
    "logLevel": "debug"
  }
}
```

- `API_BASE_URL = '/backend'` dans `app.config.ts`
- Toutes les requêtes HTTP et WebSocket (SignalR) passent par le proxy
- Le hub SignalR est accessible via `/backend/hubs/inventory`

### Résolution d'URL pour le QR code

Les composants `ProductsComponent` et `MovementsComponent` utilisent `resolveScanBaseUrl()` pour construire l'URL du QR code :

```typescript
private resolveScanBaseUrl(): string {
  // 1. Vérifier l'environnement configuré
  const configured = environment.scanPublicBaseUrl?.trim();
  if (configured && !this.isLocalhostUrl(configured)) return configured;

  // 2. Vérifier le localStorage
  const remembered = localStorage.getItem('scan_public_base_url')?.trim();
  if (remembered && !this.isLocalhostUrl(remembered)) return remembered;

  // 3. Si localhost → utiliser l'URL ngrok
  const { origin, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'https://<subdomain>.ngrok-free.dev';
  }

  return origin;
}
```

### Fichiers modifiés/créés pour la connectivité
| Fichier | Action |
|---------|--------|
| `angular.json` | Modifié (`host: 0.0.0.0`, `allowedHosts`, `proxyConfig`) |
| `proxy.conf.json` | Créé (proxy vers backend .NET) |
| `src/app/app.config.ts` | Modifié (`API_BASE_URL = '/backend'`) |
| `src/environments/environment.ts` | Modifié (ajout `scanPublicBaseUrl`) |
| `src/environments/environment.development.ts` | Modifié (ajout `scanPublicBaseUrl`) |
| `src/app/features/products/products.component.ts` | Modifié (`resolveScanBaseUrl()`) |
| `src/app/features/movements/movements.component.ts` | Modifié (`resolveScanBaseUrl()`) |

---

## Feature 1 — Page Scanner : Recherche produit par code-barres

### Description
La page Scanner (`/scanner`) permet de scanner un code-barres et de rechercher le produit correspondant via l'API backend.

### Backend (CQRS)
- **Query** : `GetProductByBarcodeQuery` — Requête CQRS avec propriété `Code`
- **Handler** : `GetProductByBarcodeHandler` — Utilise `IGenericRepository<Product>` pour chercher par `CodeBarre`, inclut la catégorie via `Include(x => x.Categorie)`
- **Endpoint** : `GET /api/Products/GetByBarcode/{code}` dans `ProductsController` — Retourne un `ProductDto` ou 404

### Frontend
- **Service** : `ProductService.getProductByBarcode(code)` — Appel HTTP GET, mappe le DTO en modèle `Product`, retourne `null` en cas de 404
- **Composant** : `ScannerComponent.processBarcode()` — Appelle l'API puis affiche les détails du produit (nom, référence, code-barres, catégorie) ou un message « Produit non trouvé »

### Fichiers modifiés/créés
| Fichier | Action |
|---------|--------|
| `Backend/Application/Queries/GetProductByBarcodeQuery.cs` | Créé |
| `Backend/Application/Handlers/GetProductByBarcodeHandler.cs` | Créé |
| `Backend/Application/Controllers/ProductsController.cs` | Modifié (ajout endpoint) |
| `src/app/core/services/product.service.ts` | Modifié (ajout méthode) |
| `src/app/features/scanner/scanner.component.ts` | Modifié (appel API) |
| `src/app/features/scanner/scanner.component.html` | Modifié (affichage détails) |

---

## Feature 2 — Hub SignalR pour communication temps réel

### Description
Un hub SignalR (`InventoryHub`) gère les groupes de sessions de scan et la diffusion des codes-barres détectés entre le téléphone et le PC.

### Backend
- **Hub** : `InventoryHub` dans `Application/Hubs/`
  - `JoinSession(string sessionId)` → Ajoute la connexion au groupe `scan-{sessionId}`
  - `SendScan(string sessionId, string purpose, string code)` → Diffuse l'événement `ScanDetected` avec `{ purpose, code }` au groupe

### Configuration (Startup.cs)
- `services.AddSignalR()` ajouté dans `ConfigureServices`
- `endpoints.MapHub<InventoryHub>("/hubs/inventory")` ajouté dans `Configure`
- CORS mis à jour : `.AllowCredentials()` et `.SetIsOriginAllowed(_ => true)` pour supporter SignalR

### Frontend
- **Service** : `ScanSessionService` (injectable, singleton pattern)
  - `joinSession(sessionId)` : Crée une `HubConnection`, démarre, invoque `JoinSession`, écoute `ScanDetected`
  - `sendScan(sessionId, purpose, code)` : Invoque `SendScan` sur le hub
  - `stop()` : Arrête la connexion
  - `generateSessionId()` : Génère un UUID unique
  - `scan$` : Subject RxJS émettant les événements `{ purpose, code }`
  - `connected` : Signal indiquant l'état de connexion

### Fichiers créés
| Fichier | Action |
|---------|--------|
| `Backend/Application/Hubs/InventoryHub.cs` | Créé |
| `Backend/Application/Startup.cs` | Modifié (SignalR + CORS) |
| `src/app/core/services/scan-session.service.ts` | Créé |

---

## Feature 3 — Icône scan + modal QR dans la page Produits

### Description
Un bouton scan (icône `qr_code_scanner`) est ajouté à côté du champ « Code-barres » dans le formulaire de création/modification de produit. Au clic, un modal affiche un QR code que le téléphone peut scanner pour ouvrir la page de scan.

### Fonctionnement
1. Clic sur l'icône scan → `openBarcodeScan()` est appelé
2. Un `sessionId` unique est généré, l'URL `/scan?sessionId=...&purpose=PRODUCT_BARCODE` est construite
3. Le modal QR s'affiche avec le code QR contenant cette URL
4. Le PC rejoint la session SignalR et attend
5. Quand le téléphone envoie un code-barres, le champ `codeBarre` est automatiquement rempli
6. Le modal se ferme automatiquement

### Composant partagé : QrScanModalComponent
- **Selector** : `<app-qr-scan-modal>`
- **Inputs** : `scanUrl` (URL à encoder en QR), `connected` (état de connexion)
- **Output** : `close` (EventEmitter pour fermer le modal)
- Utilise la bibliothèque `qrcode` pour générer le QR code sur un canvas

### Fichiers modifiés/créés
| Fichier | Action |
|---------|--------|
| `src/app/shared/components/qr-scan-modal.component.ts` | Créé |
| `src/app/features/products/products.component.ts` | Modifié (scan signals + méthodes) |
| `src/app/features/products/products.component.html` | Modifié (icône + modal) |

---

## Feature 4 — Icône scan + modal QR dans la page Mouvements

### Description
Un bouton scan est ajouté à côté du label « Produit * » dans le formulaire de création de mouvement de stock. Le scan depuis le téléphone recherche le produit par code-barres et le sélectionne automatiquement.

### Fonctionnement
1. Clic sur l'icône scan → `openProductScan()` est appelé
2. Session SignalR créée avec `purpose=MOVEMENT_PRODUCT`
3. QR code affiché dans le modal
4. Le téléphone scanne un code-barres produit
5. Le PC reçoit le code → appelle `getProductByBarcode(code)` → si trouvé, `selectProduct(product)` est appelé
6. Le champ quantité (`#movement-quantity`) reçoit le focus automatiquement
7. Si le produit n'est pas trouvé, un toast d'erreur s'affiche

### Fichiers modifiés
| Fichier | Action |
|---------|--------|
| `src/app/features/movements/movements.component.ts` | Modifié (scan signals + méthodes) |
| `src/app/features/movements/movements.component.html` | Modifié (icône + modal + id quantité) |

---

## Feature 5 — Page scan mobile avec caméra ZXing

### Description
La route `/scan` (publique, sans authentification) charge le `ScannerComponent` en mode téléphone. Ce mode est activé automatiquement quand les query params `sessionId` et `purpose` sont présents.

### Mode téléphone
- Détecte les query params via `ActivatedRoute`
- Active la caméra arrière via `BrowserMultiFormatReader` (ZXing)
- Rejoint la session SignalR correspondante
- À chaque code-barres détecté, envoie via `scanSessionService.sendScan()` au hub
- Affiche un message de confirmation « Code envoyé ! »

### Configuration route
- Route `/scan` ajoutée dans `app.routes.ts` **en dehors** du layout principal
- Pas de guard d'authentification (le téléphone n'a pas besoin d'être connecté)
- Le scanner standard reste accessible à `/scanner` avec authentification

### Fichiers modifiés
| Fichier | Action |
|---------|--------|
| `src/app/features/scanner/scanner.component.ts` | Modifié (mode téléphone + ZXing caméra) |
| `src/app/features/scanner/scanner.component.html` | Modifié (UI téléphone + vidéo) |
| `src/app/app.routes.ts` | Modifié (route `/scan` publique) |

---

## Packages installés

| Package | Version | Rôle |
|---------|---------|------|
| `@microsoft/signalr` | ^10.0.0 | Client SignalR pour Angular (communication temps réel) |
| `@zxing/browser` | ^0.1.5 | Lecture code-barres via caméra navigateur |
| `@zxing/library` | ^0.21.3 | Bibliothèque de décodage codes-barres |
| `qrcode` | ^1.5.4 | Génération de QR codes côté client |
| `@types/qrcode` | ^1.x | Types TypeScript pour qrcode |

---

## Récapitulatif des fichiers

### Fichiers créés (8)
1. `Backend/Application/Hubs/InventoryHub.cs`
2. `Backend/Application/Queries/GetProductByBarcodeQuery.cs`
3. `Backend/Application/Handlers/GetProductByBarcodeHandler.cs`
4. `src/app/core/services/scan-session.service.ts`
5. `src/app/shared/components/qr-scan-modal.component.ts`
6. `proxy.conf.json`
7. `src/environments/environment.ts`
8. `src/environments/environment.development.ts`

### Fichiers modifiés (13)
1. `Backend/Application/Controllers/ProductsController.cs`
2. `Backend/Application/Startup.cs`
3. `src/app/core/services/product.service.ts`
4. `src/app/features/scanner/scanner.component.ts`
5. `src/app/features/scanner/scanner.component.html`
6. `src/app/features/products/products.component.ts`
7. `src/app/features/products/products.component.html`
8. `src/app/features/movements/movements.component.ts`
9. `src/app/features/movements/movements.component.html`
10. `src/app/app.routes.ts`
11. `src/app/app.config.ts`
12. `angular.json`

---

## Diagramme de séquence

```
PC (Angular)              Backend (SignalR Hub)           Téléphone (Scanner)
    │                            │                              │
    │── openProductScan() ──────►│                              │
    │   joinSession(sessionId)   │                              │
    │◄── connected ──────────────│                              │
    │                            │                              │
    │   [Affiche QR code avec    │                              │
    │    URL ngrok publique]     │                              │
    │                            │                              │
    │                            │◄── QR scanné (via ngrok) ────│
    │                            │   JoinSession(sessionId)     │
    │                            │──► joined group ────────────►│
    │                            │                              │
    │                            │◄── caméra ZXing détecte ─────│
    │                            │    code-barres               │
    │                            │   SendScan(sessionId,        │
    │                            │     purpose, code)           │
    │                            │                              │
    │◄── ScanDetected ──────────│                              │
    │   { purpose, code }        │                              │
    │                            │                              │
    │── getProductByBarcode() ──►│                              │
    │◄── ProductDto ─────────────│                              │
    │                            │                              │
    │   [Auto-fill champ]        │                              │
    │   [Ferme modal]            │                              │
    └────────────────────────────┘──────────────────────────────┘
```

---

## Diagramme de déploiement réseau

```
┌─────────────────────────────────────────────────────────────────┐
│                        PC Développeur                           │
│                                                                 │
│  ┌──────────────┐   proxy    ┌──────────────────┐              │
│  │ Angular Dev  │──────────►│ Backend .NET      │              │
│  │ localhost:4200│  /backend │ localhost:44353   │              │
│  │ (host 0.0.0.0)│          │ SignalR Hub       │              │
│  └──────┬───────┘           └──────────────────┘              │
│         │                                                       │
│  ┌──────┴───────┐                                              │
│  │ ngrok tunnel │                                              │
│  │ localhost:4200│                                              │
│  └──────┬───────┘                                              │
└─────────┼───────────────────────────────────────────────────────┘
          │ HTTPS
          ▼
┌──────────────────┐
│ ngrok cloud      │
│ *.ngrok-free.dev │
└────────┬─────────┘
         │ HTTPS
         ▼
┌──────────────────┐
│ 📱 Téléphone     │
│ Navigateur mobile│
│ Page /scan       │
│ Caméra ZXing     │
└──────────────────┘
```
