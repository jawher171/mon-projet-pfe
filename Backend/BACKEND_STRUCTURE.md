# Backend Structure Report (ApplicationS)

## Solution layout

| Project      | Role |
|-------------|------|
| **Application** | ASP.NET Core 3.1 Web API – startup, controllers, Swagger |
| **Domain**      | Models, CQRS (Commands/Queries/Handlers), `IGenericRepository` |
| **Data**        | EF Core `AppDbContext`, migrations, `GenericRepository` |
| **Infra**       | `DependencyContainer` (currently unused) |

**Dependencies:** Application → Data, Domain; Data → Domain; Infra → Data.

---

## Data layer

### DbContext (`Data/Context/DBContext.cs`)

- **Class:** `AppDbContext` (EF Core `DbContext`).
- **Provider:** SQL Server (`UseSqlServer`, connection string key: `"Connection"`).
- **DbSets:**

| DbSet           | Entity       | Table (convention) |
|-----------------|-------------|---------------------|
| `users`         | User        | users               |
| `alerts`        | Alert       | alerts              |
| `category`      | Category    | category            |
| `Product`        | Product     | Product             |
| `role`          | Role        | role                |
| `rolepermission`| RolePermission | rolepermission   |
| `site`          | Site        | site                |
| `stock`         | Stock       | stock               |
| `stock_movement`| StockMovement | stock_movement   |
| `permission`    | Permission  | permission          |

### Relationships (from `OnModelCreating`)

- **Role ↔ Permission:** many-to-many via `RolePermission` (keys: `RoleId`, `permissionId`).
- **User → Role:** N:1 (`RoleId`).
- **Product → Category:** N:1 (`id_c`).
- **Stock:** Product×Site (FKs: `id_p`, `Id_site`); **fix applied:** Stock→Site FK must use `Id_site`, not `id_s`.
- **StockMovement → Stock, User:** FKs `Id_s`, `Id_u`; **fix applied:** StockMovement→Stock FK must use `Id_s`, not `id_sm`.
- **Alert → Stock:** N:1 (`id_s`).

---

## Domain models

| Entity         | Primary key | Main properties |
|----------------|------------|-----------------|
| **User**       | `Id_u` (Guid) | Nom, Prenom, Email, MotDePasse, Status, RoleId, LastLogin |
| **Role**       | `RoleId` (Guid) | Nom, Description |
| **Permission** | `permissionId` (Guid) | Code_p, Description |
| **RolePermission** | `id_RP` (Guid) | RoleId, permissionId, CreatedAt |
| **Category**   | `Id_c` (Guid) | Libelle |
| **Product**    | `id_p` (Guid) | Nom, Description, CodeBarre, Prix, id_c |
| **Site**       | `Id_site` (Guid) | Nom, Adresse, Ville, code_fiscale, Telephone, Email, ResponsableSite, Type, Capacite |
| **Stock**      | `id_s` (Guid) | QuantiteDisponible, SeuilAlerte, id_p, Id_site |
| **StockMovement** | `id_sm` (Guid) | DateMouvement, Raison, Quantite, Note, Id_s, Id_u |
| **Alert**      | `Id_a` (Guid) | Type, Message, DateCreation, Resolue, id_s |

**Naming note:** Site uses `code_fiscale` (backend) vs frontend `codePostal` – consider aligning for API DTOs.

---

## Repositories and CQRS

- **Interface:** `Domain/Interface/IGenericRepository<TEntity>` – `Get`, `GetList`, `Add`, `Put`, `Remove(Guid id)`, plus async `FirstOrDefaultAsync`, `GetListAsync`.
- **Implementation:** `Data/Repositories/GenericRepository<TEntity>` – uses `AppDbContext.Set<TEntity>()`, includes supported via `IIncludableQueryable`.
- **CQRS:** Commands/Queries and Handlers in Domain (e.g. `AddGenericCommand`, `GetListGenericQuery`, `GetListGenericHandler`) – **MediatR is not registered** in `Startup.cs`, so these are unused unless you add `services.AddMediatR(...)` and call them from controllers.

---

## API layer

- **Startup:** `AddControllers()`, Swagger, `AddDbContext<AppDbContext>`, `AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>))`.
- **Infra:** `DependencyContainer.RegisterServices` is **not called** in Startup; either call it and move registrations there or remove Infra from the solution if unused.
- **Controllers:**
  - `Authentification`: route `api/Authentification`, **no actions**.
  - `WeatherForecastController`: route `[controller]`, sample `HttpGet` only.

So today there are **no REST endpoints** for your domain (Users, Alerts, Products, Sites, Stock, StockMovement, Categories, Roles). You need to add controllers (or minimal APIs) that use `IGenericRepository<T>` (or application services) and expose DTOs aligned with the frontend.

---

## Frontend alignment (summary)

| Frontend concept   | Backend entity    | Notes |
|--------------------|-------------------|--------|
| Alert              | Alert             | Map `resolue` ↔ `Resolue`; consider `produitNom`/`siteNom` from Stock/Product/Site in API. |
| Product            | Product           | Map `categorieId` ↔ `id_c`; `nom`, `codeBarre`, `prix` align. |
| MouvementStock     | StockMovement     | Frontend has `productId`/`siteId`/`type` (entry|exit); backend has `Id_s` (Stock). You may need to derive or expose product/site and type in API. |
| Site               | Site              | Map `codePostal` ↔ `code_fiscale` (or rename in API). |
| Category           | Category          | `libelle` aligns. |
| User / Auth        | User              | Auth controller empty; add login (e.g. JWT) and return user + role. |
| Stock              | Stock             | `quantiteDisponible`, `seuilAlerte`, `produitId`/`siteId` align. |

---

## Recommended next steps

1. **Fix DBContext** – Stock→Site FK and StockMovement→Stock FK (see below).
2. **Add REST controllers** (or minimal APIs) for Alerts, Products, Sites, Stock, StockMovement, Categories, Users, and optionally Roles/Permissions.
3. **Add DTOs** for API responses/requests and map to/from domain entities (or use a shared contract with the frontend).
4. **Implement auth** in `Authentification` (e.g. login, JWT, or cookie auth) and return user + role so the frontend can replace mock auth.
5. **Optionally:** Register MediatR and use existing CQRS handlers from controllers; or keep controllers calling repositories directly and treat CQRS as future refactor.
6. **CORS:** If the Angular app runs on a different origin, add `UseCors` and `AddCors` in Startup.
