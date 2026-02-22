# Frontend–Backend Alignment Report

Your Angular frontend and .NET backend are **mostly aligned** at the model level. Below is what matches and what to fix or handle when you link them (API + DTOs).

---

## Fixes applied

| Fix | Where | What was done |
|-----|--------|----------------|
| **Site code_fiscale** | Frontend only | Backend keeps `code_fiscale` as-is. Frontend uses `codeFiscale` (camelCase) to match API; model, service, and sites component updated. |
| **StockMovement type** | Backend `Domain/Models/StockMovement.cs` | Added `Type` property (string, default `"entry"`) for entry/exit. Matches frontend `type: 'entry' \| 'exit'`. |
| **Migration for Type** | Backend | Run `dotnet ef migrations add AddStockMovementType --project Backend/Data --startup-project Backend/Application` then `dotnet ef database update` to add column `Type` to `stock_movement`. |
| **CORS** | Backend `Application/Startup.cs` | Added `AddCors` with default policy allowing `http://localhost:4200` and `UseCors()` so the Angular app can call the API. |
| **JSON camelCase** | Backend `Application/Startup.cs` | Added `AddNewtonsoftJson` with `CamelCasePropertyNamesContractResolver` so API responses use camelCase (e.g. `id`, `dateCreation`, `resolue`). |
| **Snapshot** | Backend | Site stays as `code_fiscale` in snapshot. After you run `migrations add AddStockMovementType`, the snapshot will include StockMovement `Type`. |

---

## Summary

| Area | Status | Notes |
|------|--------|--------|
| **Category** | Aligned | Same fields; only ID naming differs (API can map). |
| **Product** | Aligned | Same fields; categorieId ↔ id_c, optional categorieLibelle from API. |
| **Stock** | Aligned | Same fields; productId/siteId ↔ id_p/Id_site, optional names from API. |
| **User** | Aligned | Same concepts; API returns role name and status as string. |
| **Role** | Minor | Backend uses Guid for RoleId; frontend uses number in constants – use role `nom` for matching. |
| **Alert** | Minor | Backend has Stock FK only; API should add produitNom/siteNom (from Stock). |
| **Site** | Aligned | Backend keeps `code_fiscale`; frontend uses `codeFiscale` (camelCase) to match API. |
| **Movement** | Aligned | Backend now has `Type` ("entry"/"exit"); API can expose productId/siteId from Stock in DTOs. |

---

## 1. Category

| Frontend | Backend | Notes |
|----------|---------|--------|
| `id` (number \| string) | `Id_c` (Guid) | API: return as string. |
| `libelle` | `Libelle` | Match. |

**Verdict:** Aligned. Use camelCase in API (e.g. `id`, `libelle`).

---

## 2. Product

| Frontend | Backend | Notes |
|----------|---------|--------|
| `id` | `id_p` | API: map to `id`. |
| `nom` | `Nom` | Match. |
| `description` | `Description` | Match. |
| `codeBarre?` | `CodeBarre?` | Match. |
| `prix` (number) | `Prix` (double) | Match. |
| `categorieId` | `id_c` | API: map id_c → categorieId. |
| `categorieLibelle?` | (from Category) | API: include Category and set in DTO. |

**Verdict:** Aligned. DTO: camelCase + `categorieLibelle` when needed.

---

## 3. Stock

| Frontend | Backend | Notes |
|----------|---------|--------|
| `id` | `id_s` | API: map to `id`. |
| `quantiteDisponible` | `QuantiteDisponible` | Match. |
| `seuilAlerte` | `SeuilAlerte` | Match. |
| `produitId` | `id_p` | API: map id_p → produitId. |
| `siteId` | `Id_site` | API: map Id_site → siteId. |
| `produitNom?`, `siteNom?` | (from Product, Site) | API: include and set in DTO. |

**Verdict:** Aligned.

---

## 4. User

| Frontend | Backend | Notes |
|----------|---------|--------|
| `id` | `Id_u` | API: map to `id`. |
| `nom`, `prenom`, `email` | Same | Match. |
| (no password in UI) | `MotDePasse` | Never return in API. |
| `role` (UserRole string) | `RoleId` + Role | API: return `role: Role.Nom` (e.g. "admin", "gestionnaire_de_stock", "operateur"). |
| `status` ('active' \| 'inactive') | `Status` (bool) | API: return `status: Status ? "active" : "inactive"`. |
| `lastLogin?` | `LastLogin?` | Match. |

**Verdict:** Aligned if login/user DTOs return role name and string status.

---

## 5. Role

| Frontend | Backend | Notes |
|----------|---------|--------|
| `idRole` (number in ROLES) | `RoleId` (Guid) | Frontend uses 1,2,3 in constants but matches by `nom`; API can return Guid as string. |
| `nom` | `Nom` | Match (admin, gestionnaire_de_stock, operateur). |
| `description?` | `Description?` | Match. |
| `permissions` (Permission[]) | RolePermissions → Permission | API: return list of permission codes (Code_p). |

**Verdict:** Aligned by `nom`; frontend can keep number ids in constants and map API role by `nom`.

---

## 6. Alert

| Frontend | Backend | Notes |
|----------|---------|--------|
| `id` | `Id_a` | API: map to `id`. |
| `type`, `message`, `dateCreation`, `resolue` | Same | Match (camelCase in API). |
| `produitNom?`, `siteNom?` | (not on entity) | Backend has `id_s` (Stock). API: from Stock → Product.Nom, Site.Nom. |

**Verdict:** Aligned if API DTO includes produitNom and siteNom (from Stock).

---

## 7. Site

| Frontend | Backend | Notes |
|----------|---------|--------|
| `id` | `Id_site` | API: map to `id`. |
| `nom`, `adresse`, `ville` | Same | Match. |
| `codeFiscale` | `code_fiscale` | **Aligned.** Frontend uses `codeFiscale`; API returns `code_fiscale` (or camelCase `codeFiscale` if backend uses camelCase JSON). |
| `telephone?`, `email?`, `responsableSite?`, `type`, `capacite?` | Same | Match. |

**Verdict:** Aligned.

---

## 8. Movement (MouvementStock / StockMovement)

| Frontend | Backend | Notes |
|----------|---------|--------|
| `id` | `id_sm` | API: map to `id`. |
| `dateMouvement`, `raison`, `quantite`, `note?` | Same | Match. |
| `productId?`, `siteId?` | `Id_s` (Stock) | API DTO: set productId/siteId from Stock.id_p, Stock.Id_site. |
| `produitNom?`, `siteNom?`, `utilisateurNom?` | (nav only) | API: from Stock.Produit, Stock.Site, Utilisateur. |
| `type?` 'entry' \| 'exit' | `Type` (string, default "entry") | **Fixed.** Backend has `Type`; migration adds column. |

**Verdict:** Aligned.

---

## ID and naming conventions

- **Backend:** PascalCase, specific names (Id_a, id_p, Id_site, id_sm, id_s, id_c, Id_u, RoleId, etc.).
- **Frontend:** camelCase, generic `id`, and names like `categorieId`, `produitId`, `siteId`.
- **When linking:** Use DTOs (or JSON options) so the API returns camelCase and the names the frontend expects (e.g. `id`, `categorieId`, `produitNom`, `siteNom`, `codePostal` or `codeFiscale`). No need to change frontend model property names if the API matches them.

---

## Recommended order of work when linking

1. **API layer:** Add controllers (or minimal APIs) and DTOs for each entity.
2. **DTOs:** Map backend entities → DTOs with camelCase and the field names above (id, categorieId, productId, siteId, etc.).
3. **Site:** Decide meaning of code_fiscale vs codePostal and align naming (backend DTO or frontend).
4. **StockMovement:** Add or derive `type` (entry/exit) and expose productId/siteId (and optional names) in the movement DTO.
5. **Auth:** Implement login and return user with `role` (Role.Nom) and `status` as string.
6. **Frontend:** Add environment API base URL and switch services from in-memory to `HttpClient` calls using these DTOs.

Once you do that, the frontend and backend will be aligned for linking.
