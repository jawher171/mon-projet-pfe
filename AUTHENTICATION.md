# Authentication & Authorization System

## Overview

The inventory management system includes a comprehensive role-based access control (RBAC) system that manages user authentication and authorization. The system supports three distinct user roles, each with specific permissions and capabilities.

---

## User Roles

### 1. **Admin (Administrator)**
- **Color**: Red (#f44336)
- **Icon**: admin_panel_settings
- **Full System Access**

**Responsibilities:**
- Full control over the entire system
- Create, modify, and delete user accounts
- Assign roles to team members
- Manage system settings and configurations
- Access all features and data

**Permissions:**
- `view_dashboard` - View analytics dashboard
- `manage_movements` - Create and modify stock movements
- `view_movements` - View movement history
- `manage_alerts` - Create and manage system alerts
- `view_alerts` - View alerts
- `manage_products` - Add/edit products
- `view_products` - View product list
- `manage_sites` - Add/edit warehouse sites
- `view_sites` - View site information
- `scan_barcode` - Scan barcodes
- `basic_entry_exit` - Record entry/exit operations
- `manage_users` - Manage user accounts
- `manage_roles` - Assign and modify roles
- `view_reports` - Access reports and analytics

---

### 2. **Gestionnaire de Stock (Stock Manager)**
- **Color**: Blue (#2196f3)
- **Icon**: inventory_2
- **Limited Management Access**

**Responsibilities:**
- Monitor and manage stock movements
- Create and respond to inventory alerts
- View warehouse and site information
- Access dashboard analytics
- Generate reports

**Permissions:**
- `view_dashboard` - View analytics dashboard
- `manage_movements` - Create and modify stock movements
- `view_movements` - View movement history
- `manage_alerts` - Create and manage alerts
- `view_alerts` - View alerts
- `view_products` - View product list
- `view_sites` - View site information
- `view_reports` - Access reports

---

### 3. **Operateur (Operator)**
- **Color**: Green (#4caf50)
- **Icon**: construction_worker
- **Basic Operational Access**

**Responsibilities:**
- Perform basic inventory operations
- Scan barcodes for items
- Record product entry and exit
- View product and site information

**Permissions:**
- `view_products` - View product list
- `view_sites` - View site information
- `scan_barcode` - Scan product barcodes
- `basic_entry_exit` - Record basic entry/exit operations

---

## Architecture

### Core Files

#### 1. **Models** (`src/app/core/models/`)

**role.model.ts**
- Defines role types and permissions
- Contains pre-defined role configurations
- Exports `ROLES` constant with all role definitions

```typescript
// Type definitions
export type Permission = 'view_dashboard' | 'manage_movements' | ...
export type UserRole = 'admin' | 'gestionnaire_de_stock' | 'operateur'

// Pre-defined roles
export const ROLES: Record<UserRole, Role> = {
  admin: { /* full permissions */ },
  gestionnaire_de_stock: { /* limited permissions */ },
  operateur: { /* basic permissions */ }
}
```

**user.model.ts**
- Updated to use `UserRole` type instead of string literals
- Maintains user profile information

```typescript
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;  // Uses role type
  avatar?: string;
  department?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  lastLogin?: Date;
}
```

#### 2. **Services** (`src/app/core/services/`)

**auth.service.ts**
- Handles user login/logout
- Manages authentication tokens
- Provides role checking methods

```typescript
// Key methods
login(email: string, password: string): Promise<boolean>
logout(): void
getToken(): string | null
hasRole(role: UserRole): boolean
isAdmin(): boolean
isStockManager(): boolean
isOperator(): boolean
```

**auth-authorization.service.ts**
- Manages team members (admin only)
- Controls role assignments
- Permission verification

```typescript
// Member management
getMembers(): Signal<User[]>
addMember(member: Omit<User, ...>): User
updateMember(id: string, updates: Partial<User>): boolean
deleteMember(id: string): boolean
changeRole(id: string, role: UserRole): boolean

// Permission checking
hasPermission(userRole: UserRole, permission: Permission): boolean
hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean
hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean

// Statistics
getMemberStats(): ComputedSignal<MemberStats>
```

#### 3. **Guards** (`src/app/core/guards/`)

**auth.guard.ts**
- Implements route protection based on roles
- Prevents unauthorized access

```typescript
// Available guards
export const authGuard: CanActivateFn
export const adminGuard: CanActivateFn
export const stockManagerGuard: CanActivateFn
export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn
export const permissionGuard = (requiredPermission: Permission): CanActivateFn
```

---

## Route Protection

### Route Configuration

All protected routes are defined in `app.routes.ts` with appropriate guards:

```typescript
// Protected routes with guards
{
  path: 'movements',
  loadComponent: () => import('...').then(m => m.MovementsComponent),
  canActivate: [permissionGuard('manage_movements')]
},

{
  path: 'members',
  loadComponent: () => import('...').then(m => m.MembersComponent),
  canActivate: [adminGuard]  // Admin only
}
```

### Route Permissions

| Route | Permission Required | Accessible Roles |
|-------|-------------------|------------------|
| `/dashboard` | `view_dashboard` | All authenticated |
| `/products` | `view_products` | All except restrictions |
| `/movements` | `manage_movements` | Admin, Stock Manager |
| `/sites` | `manage_sites` | Admin, Stock Manager |
| `/alerts` | `manage_alerts` | Admin, Stock Manager |
| `/scanner` | `scan_barcode` | Admin, Operator |
| `/members` | Admin role | Admin only |

---

## Components

### 1. Members Management Component (`members.component.ts`)

**Location**: `src/app/features/members/`

**Features:**
- Display all team members
- Add new members
- Edit member information
- Change member roles
- Toggle member status (active/inactive)
- Delete members (with validation to prevent last admin deletion)
- Display statistics

**Usage**: Admin dashboard only

### 2. Role Badge Component (`role-badge.component.ts`)

**Location**: `src/app/shared/components/role-badge/`

**Features:**
- Display user role with color and icon
- Reusable across the application
- Customizable size and icon visibility

**Usage**:
```html
<app-role-badge [role]="user.role"></app-role-badge>
<app-role-badge [role]="'admin'" [showIcon]="true"></app-role-badge>
```

---

## Usage Examples

### Checking User Role

```typescript
import { AuthService } from '@core/services/auth.service';

export class MyComponent {
  constructor(private authService: AuthService) {}

  ngOnInit() {
    // Check if user is admin
    if (this.authService.isAdmin()) {
      // Show admin features
    }

    // Check specific role
    if (this.authService.hasRole('gestionnaire_de_stock')) {
      // Show stock manager features
    }
  }
}
```

### Checking Permissions

```typescript
import { AuthorizationService } from '@core/services/auth-authorization.service';

export class MyComponent {
  constructor(
    private authService: AuthService,
    private authorizationService: AuthorizationService
  ) {}

  canViewReports(): boolean {
    const user = this.authService.currentUser();
    return user ? this.authorizationService.hasPermission(user.role, 'view_reports') : false;
  }

  canManageUsers(): boolean {
    const user = this.authService.currentUser();
    return user ? this.authorizationService.hasAllPermissions(user.role, ['manage_users', 'manage_roles']) : false;
  }
}
```

### Adding a New Member (Admin Only)

```typescript
import { AuthorizationService } from '@core/services/auth-authorization.service';

export class AdminComponent {
  constructor(private authorizationService: AuthorizationService) {}

  addNewMember() {
    const newMember = this.authorizationService.addMember({
      email: 'operator@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'operateur',
      phone: '+1234567890',
      department: 'Warehouse',
      status: 'active'
    });
  }

  changeUserRole(userId: string, newRole: UserRole) {
    this.authorizationService.changeRole(userId, newRole);
  }
}
```

### Using Route Guards

```typescript
// In routes configuration
{
  path: 'admin',
  canActivate: [adminGuard],
  children: [/* admin routes */]
},

{
  path: 'reports',
  canActivate: [permissionGuard('view_reports')],
  component: ReportsComponent
}
```

---

## Login Credentials for Testing

The system uses mock authentication. Email patterns determine the role:

| Email Pattern | Role | Permissions |
|---|---|---|
| Contains `admin` | Admin | Full access |
| Contains `stock`/`gestionnaire` | Stock Manager | Management permissions |
| Contains `operator` | Operator | Basic permissions |
| Other | Operator | Basic permissions |

**Example Test Credentials:**
- Admin: `admin@inventaire.ma` / any password
- Stock Manager: `stock@inventaire.ma` / any password
- Operator: `operator@inventaire.ma` / any password

---

## Security Considerations

### Current Implementation (Mock)

⚠️ **Important**: The current implementation uses mock authentication for demonstration purposes. In production:

1. **Password Hashing**: Implement proper password hashing (bcrypt, Argon2)
2. **JWT Tokens**: Replace mock tokens with real JWT tokens
3. **Token Expiration**: Implement token expiration and refresh mechanisms
4. **HTTPS**: Use HTTPS for all communications
5. **Backend Validation**: Always validate permissions on the backend
6. **Rate Limiting**: Implement login attempt rate limiting
7. **Audit Logging**: Log all user actions for security auditing

### Best Practices

1. **Never trust frontend validation alone** - Always validate on the backend
2. **Principle of Least Privilege** - Grant minimum necessary permissions
3. **Regular Role Audits** - Periodically review user roles and permissions
4. **Secure Token Storage** - Store tokens securely (currently in localStorage)
5. **Session Management** - Implement proper session timeout and logout

---

## Feature Roadmap

### Phase 1 (Current)
- ✅ Role-based access control
- ✅ Mock authentication with role assignment
- ✅ Permission verification system
- ✅ Member management interface
- ✅ Route protection guards

### Phase 2 (Planned)
- Real JWT token implementation
- Backend API integration
- Password encryption and validation
- Session management
- Two-factor authentication (2FA)
- Audit logging

### Phase 3 (Planned)
- Fine-grained permission control
- Role templates and policies
- Permission inheritance
- Dynamic permission management
- Advanced security features

---

## API Integration Guide

When integrating with a real backend, update the following:

### Authentication Endpoint

```typescript
// auth.service.ts
async login(email: string, password: string): Promise<boolean> {
  const response = await this.http.post<AuthResponse>('/api/auth/login', {
    email,
    password
  }).toPromise();
  
  // Store token and user
  localStorage.setItem(this.TOKEN_KEY, response.token);
  localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
  
  this.currentUser.set(response.user);
  this.isAuthenticated.set(true);
  return true;
}
```

### Member Management Endpoints

```typescript
// auth-authorization.service.ts
addMember(member: Omit<User, 'id' | 'createdAt'>): User {
  // Replace with API call
  const response = await this.http.post<User>('/api/members', member).toPromise();
  this.membersSignal.update(members => [...members, response]);
  return response;
}
```

---

## Support & Documentation

For more information about specific components or services, refer to:
- [Architecture Overview](../../ARCHITECTURE.md)
- [Design Documentation](../../DESIGN.md)
- [Features List](../../FEATURES.md)
