# Role-Based Access Control System - Visual Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION ENTRY                         │
│                  (app.routes.ts)                             │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │   Check Authentication  │
        │   (auth.guard)          │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │ Check Authorization     │
        │ (role-based guards)     │
        └────────────┬────────────┘
                     │
        ┌────────────▼─────────────────────────────────┐
        │                                               │
   ┌────▼─────┐  ┌──────────────┐  ┌────────────────┐ │
   │  ADMIN    │  │ STOCK MANAGER│  │  OPERATOR      │ │
   │(Full      │  │(Inventory    │  │(Basic          │ │
   │Access)    │  │Management)   │  │Operations)     │ │
   └──────────┘  └──────────────┘  └────────────────┘ │
        │              │                   │            │
        └──────────────┴───────────────────┴────────────┘
                     │
        ┌────────────▼──────────────────┐
        │  Render Component/Route       │
        │  with Role-Based Features     │
        └──────────────────────────────┘
```

---

## Permission Matrix

```
┌──────────────────────┬────────┬──────────────┬──────────┐
│ Permission           │ Admin  │ Stock Manager│ Operator │
├──────────────────────┼────────┼──────────────┼──────────┤
│ view_dashboard       │   ✅   │      ✅      │    ❌    │
│ manage_movements     │   ✅   │      ✅      │    ❌    │
│ view_movements       │   ✅   │      ✅      │    ❌    │
│ manage_alerts        │   ✅   │      ✅      │    ❌    │
│ view_alerts          │   ✅   │      ✅      │    ❌    │
│ manage_products      │   ✅   │      ❌      │    ❌    │
│ view_products        │   ✅   │      ✅      │    ✅    │
│ manage_sites         │   ✅   │      ✅      │    ❌    │
│ view_sites           │   ✅   │      ✅      │    ✅    │
│ scan_barcode         │   ✅   │      ❌      │    ✅    │
│ basic_entry_exit     │   ✅   │      ❌      │    ✅    │
│ manage_users         │   ✅   │      ❌      │    ❌    │
│ manage_roles         │   ✅   │      ❌      │    ❌    │
│ view_reports         │   ✅   │      ✅      │    ❌    │
└──────────────────────┴────────┴──────────────┴──────────┘
```

---

## Role Capabilities

### 👨‍💼 ADMIN
```
├── User Management
│   ├── Add Members ✅
│   ├── Edit Members ✅
│   ├── Delete Members ✅
│   ├── Assign Roles ✅
│   └── Manage Status ✅
├── Inventory Management
│   ├── View Dashboard ✅
│   ├── Manage Movements ✅
│   ├── Manage Alerts ✅
│   ├── View Reports ✅
│   └── Manage Sites ✅
├── Products
│   ├── View Products ✅
│   ├── Add Products ✅
│   ├── Edit Products ✅
│   └── Delete Products ✅
└── Operations
    ├── Scan Barcodes ✅
    └── Record Entry/Exit ✅
```

### 📦 GESTIONNAIRE DE STOCK (Stock Manager)
```
├── Inventory Management
│   ├── View Dashboard ✅
│   ├── Manage Movements ✅
│   ├── View Movement History ✅
│   ├── Manage Alerts ✅
│   ├── View Site Info ✅
│   └── Generate Reports ✅
├── Products
│   └── View Products ✅
└── User Management
    └── Access Denied ❌
```

### 🔧 OPERATEUR (Operator)
```
├── Operations
│   ├── Scan Barcodes ✅
│   ├── Record Entry ✅
│   ├── Record Exit ✅
│   └── View Operations ✅
├── Inventory
│   ├── View Products ✅
│   ├── View Sites ✅
│   └── Manage Stock ❌
└── Admin
    └── Access Denied ❌
```

---

## Route Protection System

```
Routes Configuration (app.routes.ts)
│
├─ /auth/login (PUBLIC)
│   └─ No guard
│
├─ /dashboard
│   └─ Guard: authGuard + permissionGuard('view_dashboard')
│
├─ /products
│   └─ Guard: permissionGuard('view_products')
│
├─ /movements
│   └─ Guard: permissionGuard('manage_movements')
│   │   Allowed: Admin, Stock Manager
│   │   Blocked: Operator
│
├─ /alerts
│   └─ Guard: permissionGuard('manage_alerts')
│   │   Allowed: Admin, Stock Manager
│   │   Blocked: Operator
│
├─ /sites
│   └─ Guard: permissionGuard('manage_sites')
│   │   Allowed: Admin, Stock Manager
│   │   Blocked: Operator
│
├─ /scanner
│   └─ Guard: permissionGuard('scan_barcode')
│   │   Allowed: Admin, Operator
│   │   Blocked: Stock Manager
│
└─ /members (ADMIN ONLY)
    └─ Guard: adminGuard
        Allowed: Admin
        Blocked: Stock Manager, Operator
```

---

## User Flow Diagrams

### Login Flow
```
User enters email/password
        │
        ▼
AuthService.login()
        │
        ├─ Email contains "admin" → role = 'admin'
        ├─ Email contains "stock" → role = 'gestionnaire_de_stock'
        ├─ Email contains "operator" → role = 'operateur'
        └─ Default → role = 'operateur'
        │
        ▼
Create User object with role
        │
        ▼
Store token & user in localStorage
        │
        ▼
Update signals:
  - currentUser = user object
  - isAuthenticated = true
        │
        ▼
Navigate to /dashboard
```

### Route Access Flow
```
User navigates to route
        │
        ▼
Check canActivate guards
        │
        ├─ authGuard: Is user authenticated?
        │   ├─ Yes → Continue
        │   └─ No → Redirect to /auth/login
        │
        ├─ adminGuard: Is user admin?
        │   ├─ Yes → Continue
        │   └─ No → Redirect to /
        │
        ├─ permissionGuard(permission): 
        │   ├─ User has permission?
        │   │   ├─ Yes → Continue
        │   │   └─ No → Redirect to /
        │   └─ Not authenticated → Redirect to /auth/login
        │
        ▼
Load component/route
        │
        ▼
Render with role-based features
```

### Member Management Flow (Admin)
```
Admin logs in
    │
    ▼
Navigate to /members
    │
    ▼
memberComponent loads
    │
    ├─ Display all members ✅
    ├─ Show statistics ✅
    │
    ▼
Admin Actions:
    │
    ├─ Add Member
    │   ├─ Fill form (email, name, role)
    │   └─ AuthorizationService.addMember() → Added to list
    │
    ├─ Edit Member
    │   ├─ Click edit button
    │   ├─ Update form fields
    │   └─ AuthorizationService.updateMember() → Updated
    │
    ├─ Change Role
    │   ├─ Click change role button
    │   ├─ Cycle: admin → stock_manager → operator
    │   └─ AuthorizationService.changeRole() → Role changed
    │
    ├─ Toggle Status
    │   ├─ Click eye icon
    │   ├─ Toggle: active ↔ inactive
    │   └─ AuthorizationService.toggleMemberStatus() → Status changed
    │
    └─ Delete Member
        ├─ Click delete button
        ├─ Confirm action
        └─ AuthorizationService.deleteMember() → Removed from list
```

---

## Component Integration

### Using Role Badge Component
```html
<!-- In any template -->
<app-role-badge [role]="user.role"></app-role-badge>

<!-- Output -->
👨‍💼 Administrator      (Red)
📦 Stock Manager         (Blue)
🔧 Operator              (Green)
```

### Conditional Rendering by Role
```html
<!-- Show only to admins -->
<div *ngIf="authService.isAdmin()">
  <a href="/members">Manage Members</a>
</div>

<!-- Show only to stock managers and admins -->
<div *ngIf="authService.isAdmin() || authService.isStockManager()">
  <a href="/movements">Movements</a>
</div>

<!-- Show to operators -->
<div *ngIf="authService.isOperator() || authService.isAdmin()">
  <a href="/scanner">Scanner</a>
</div>
```

---

## Testing Credentials

| Role | Email | Password | Permissions |
|------|-------|----------|------------|
| Admin | admin@test.com | any | ✅ Full access |
| Stock Manager | stock@test.com | any | ✅ Limited management |
| Operator | operator@test.com | any | ✅ Basic operations |

---

## Mock Data Provided

### Pre-loaded Members (in AuthorizationService)
```
1. Ahmed Admin (admin@inventaire.ma) - Admin - Active
2. Fatima Zahra (stock@inventaire.ma) - Stock Manager - Active
3. Mohammed Salah (operator@inventaire.ma) - Operator - Active
4. Youssef Amrani (stock2@inventaire.ma) - Stock Manager - Active
5. Leila Khaldi (operator2@inventaire.ma) - Operator - Inactive
```

---

## Key Features Summary

| Feature | Status | Details |
|---------|--------|---------|
| Role-based access control | ✅ | 3 roles with 14 permissions |
| Authentication system | ✅ | Token-based login/logout |
| Route protection | ✅ | Guards on all protected routes |
| Member management | ✅ | Admin can manage team members |
| Permission verification | ✅ | Multiple verification methods |
| Role assignment | ✅ | Dynamic role changes |
| Member status toggle | ✅ | Active/inactive toggling |
| Statistics dashboard | ✅ | Member counts by role |
| Role badges | ✅ | Reusable component with styling |

---

## Security Notes

⚠️ **Current**: Mock authentication for demonstration

✅ **Recommended for Production**:
1. Real JWT tokens with expiration
2. Password hashing (bcrypt, Argon2)
3. Backend permission validation
4. HTTPS only communication
5. Token refresh mechanisms
6. Session timeout
7. Audit logging
8. Rate limiting

---

## Quick Reference

### Check Current User
```typescript
const user = this.authService.currentUser();
console.log(user?.role); // 'admin' | 'gestionnaire_de_stock' | 'operateur'
```

### Check Authentication
```typescript
const isLoggedIn = this.authService.isAuthenticated();
```

### Check Permissions
```typescript
const canManageMovements = this.authorizationService
  .hasPermission(user.role, 'manage_movements');
```

### Get All Members
```typescript
const members = this.authorizationService.getMembers();
```

### Get Member Statistics
```typescript
const stats = this.authorizationService.getMemberStats();
// { total, active, admins, stockManagers, operators }
```

---

**System Status: ✅ Ready for Use**
