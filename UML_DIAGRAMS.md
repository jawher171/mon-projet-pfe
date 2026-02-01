# UML Diagrams - Inventory Management System (PFE)

This document contains the UML diagrams for the inventory management system, including class diagrams and sequence diagrams.

## Table of Contents
1. [Class Diagrams](#class-diagrams)
   - [Domain Model (Models)](#domain-model)
   - [Services Architecture](#services-architecture)
   - [Components Structure](#components-structure)
2. [Sequence Diagrams](#sequence-diagrams)
   - [User Authentication](#user-authentication)
   - [Create Stock Movement](#create-stock-movement)
   - [Product Management](#product-management)
   - [Alert Processing](#alert-processing)

---

## Class Diagrams

### Domain Model

This diagram shows the core domain models and their relationships.

```plantuml
@startuml Domain Model

' ===== Enumerations =====
enum UserRole {
  admin
  gestionnaire_de_stock
  operateur
}

enum SiteType {
  warehouse
  store
  distribution_center
  production
}

enum AlertType {
  low_stock
  out_of_stock
  overstock
  expiring_soon
  expired
  reorder_point
  unusual_movement
  pending_order
  transfer_required
  inventory_variance
}

enum AlertSeverity {
  critical
  high
  medium
  low
  info
}

enum MovementReason {
  purchase
  return_supplier
  production
  transfer_in
  adjustment_plus
  initial_stock
  sale
  return_customer
  damaged
  expired
  transfer_out
  adjustment_minus
  internal_use
}

' ===== Core Models =====
class User {
  - id: string
  - email: string
  - firstName: string
  - lastName: string
  - role: UserRole
  - avatar?: string
  - department?: string
  - phone?: string
  - status: 'active' | 'inactive'
  - createdAt: Date
  - lastLogin?: Date
}

class Product {
  - id: string
  - name: string
  - description: string
  - sku: string
  - category: string
  - categoryId: string
  - supplier: string
  - supplierId: string
  - quantity: number
  - minQuantity: number
  - maxQuantity: number
  - price: number
  - cost: number
  - unit: string
  - location: string
  - barcode?: string
  - imageUrl?: string
  - status: 'active' | 'inactive' | 'discontinued'
  - createdAt: Date
  - updatedAt: Date
  - lastRestocked?: Date
}

class StockMovement {
  - id: string
  - movementNumber: string
  - type: 'entry' | 'exit'
  - reason: MovementReason
  - productId: string
  - productName: string
  - productSku: string
  - quantity: number
  - previousStock: number
  - newStock: number
  - siteId: string
  - siteName: string
  - warehouseZone?: string
  - reference?: string
  - supplierId?: string
  - supplierName?: string
  - notes?: string
  - performedBy: string
  - performedAt: Date
  - createdAt: Date
  - updatedAt: Date
}

class Site {
  - id: string
  - code: string
  - name: string
  - type: SiteType
  - address: Address
  - phone?: string
  - email?: string
  - manager?: string
  - managerId?: string
  - capacity?: number
  - currentOccupancy?: number
  - zones: WarehouseZone[]
  - isActive: boolean
  - isMain: boolean
  - createdAt: Date
  - updatedAt: Date
}

class Address {
  - street: string
  - city: string
  - state?: string
  - postalCode: string
  - country: string
  - latitude?: number
  - longitude?: number
}

class WarehouseZone {
  - id: string
  - code: string
  - name: string
  - type: 'storage' | 'receiving' | 'shipping' | 'quarantine' | 'cold'
  - capacity?: number
  - currentStock?: number
}

class Category {
  - id: string
  - name: string
  - description: string
  - parentId?: string
  - icon?: string
  - color?: string
  - productCount: number
  - createdAt: Date
  - updatedAt: Date
}

class Alert {
  - id: string
  - type: AlertType
  - severity: AlertSeverity
  - title: string
  - message: string
  - productId?: string
  - productName?: string
  - productSku?: string
  - siteId?: string
  - siteName?: string
  - currentValue?: number
  - thresholdValue?: number
  - isRead: boolean
  - isResolved: boolean
  - resolvedBy?: string
  - resolvedAt?: Date
  - resolutionNotes?: string
  - createdAt: Date
  - expiresAt?: Date
}

class Role {
  - id: string
  - name: UserRole
  - label: string
  - description: string
  - permissions: Permission[]
  - color?: string
  - icon?: string
}

' ===== Relationships =====
User "1" --> "1" UserRole : has
User "1" --> "0..*" StockMovement : performs
User "0..1" --> "0..1" Site : manages

Product "1" --> "1" Category : belongs to
Product "1" --> "0..*" StockMovement : has movements
Product "1" --> "0..*" Alert : triggers

StockMovement "*" --> "1" Site : occurs at
StockMovement "1" --> "1" MovementReason : categorized by

Site "1" --> "1" Address : located at
Site "1" --> "0..*" WarehouseZone : contains
Site "1" --> "1" SiteType : is of type

Alert "1" --> "1" AlertType : is of type
Alert "1" --> "1" AlertSeverity : has severity
Alert "*" --> "0..1" Product : relates to
Alert "*" --> "0..1" Site : relates to

Role "1" --> "1" UserRole : defines

Category "0..1" --> "0..*" Category : parent/children

@enduml
```

---

### Services Architecture

This diagram shows the service layer architecture and dependencies.

```plantuml
@startuml Services Architecture

package "Core Services" {
  
  class AuthService {
    - TOKEN_KEY: string
    - USER_KEY: string
    - currentUser: signal<User | null>
    - isAuthenticated: signal<boolean>
    --
    + login(email: string, password: string): Promise<boolean>
    + logout(): void
    + getUserRole(): UserRole | null
    + hasPermission(permission: Permission): boolean
    - loadUser(): User | null
    - hasToken(): boolean
  }

  class AuthorizationService {
    + canAccess(requiredPermission: Permission): boolean
    + canAccessRoute(route: string): boolean
    + getRolePermissions(role: UserRole): Permission[]
  }

  class ProductService {
    - products: signal<Product[]>
    --
    + getProducts(): signal<Product[]>
    + fetchProducts(filter?: ProductFilter): Promise<Product[]>
    + getProduct(id: string): Promise<Product | undefined>
    + createProduct(product: Omit<Product, ...>): Promise<Product>
    + updateProduct(id: string, updates: Partial<Product>): Promise<Product>
    + deleteProduct(id: string): Promise<void>
    - delay(ms: number): Promise<void>
  }

  class MovementService {
    - movementsSignal: signal<StockMovement[]>
    --
    + getMovements(): signal<StockMovement[]>
    + getFilteredMovements(filter: MovementFilter): computed<StockMovement[]>
    + getMovementById(id: string): StockMovement | undefined
    + addMovement(movement: Omit<StockMovement, ...>): StockMovement
    + updateMovement(id: string, updates: Partial<StockMovement>): StockMovement
    + deleteMovement(id: string): void
    + getSummary(): MovementSummary
    - generateId(): string
    - generateMovementNumber(type: string): string
  }

  class SiteService {
    - sites: signal<Site[]>
    --
    + getSites(): signal<Site[]>
    + getActiveSites(): computed<Site[]>
    + getSite(id: string): Site | undefined
    + createSite(site: Omit<Site, ...>): Site
    + updateSite(id: string, updates: Partial<Site>): Site
    + deleteSite(id: string): void
  }

  class CategoryService {
    - categories: signal<Category[]>
    --
    + getCategories(): signal<Category[]>
    + getCategory(id: string): Category | undefined
    + createCategory(category: Omit<Category, ...>): Category
    + updateCategory(id: string, updates: Partial<Category>): Category
    + deleteCategory(id: string): void
  }

  class AlertService {
    - alerts: signal<Alert[]>
    --
    + getAlerts(): signal<Alert[]>
    + getUnreadAlerts(): computed<Alert[]>
    + getUnreadCount(): computed<number>
    + getAlertsBySeverity(severity: AlertSeverity): Alert[]
    + markAsRead(alertId: string): void
    + markAllAsRead(): void
    + resolveAlert(alertId: string, notes: string, user: string): void
    + deleteAlert(alertId: string): void
    - checkStockLevels(): void
    - generateId(): string
  }
}

package "Guards" {
  class AuthGuard {
    - authService: AuthService
    --
    + canActivate(route: ActivatedRouteSnapshot): boolean
  }
}

' ===== Relationships =====
AuthGuard --> AuthService : uses
AuthorizationService --> AuthService : uses

ProductService ..> Product : manages
MovementService ..> StockMovement : manages
SiteService ..> Site : manages
CategoryService ..> Category : manages
AlertService ..> Alert : manages

MovementService --> ProductService : may update stock
AlertService --> ProductService : monitors
MovementService --> SiteService : references sites

@enduml
```

---

### Components Structure

This diagram shows the Angular components hierarchy and their relationships.

```plantuml
@startuml Components Architecture

package "App Root" {
  class AppComponent {
    - title: string
  }
}

package "Layouts" {
  class MainLayoutComponent {
    - currentUser: signal<User | null>
    - isAuthenticated: signal<boolean>
    - menuOpen: boolean
    --
    + logout(): void
    + toggleMenu(): void
  }
}

package "Features" {
  
  package "Auth" {
    class LoginComponent {
      - authService: AuthService
      - router: Router
      - email: string
      - password: string
      - errorMessage: string
      --
      + login(): Promise<void>
    }
  }

  class DashboardComponent {
    - productService: ProductService
    - movementService: MovementService
    - alertService: AlertService
    - siteService: SiteService
    - stats: DashboardStats
    --
    + ngOnInit(): void
    - loadDashboardData(): void
  }

  class ProductsComponent {
    - productService: ProductService
    - categoryService: CategoryService
    - products: signal<Product[]>
    - selectedProduct?: Product
    - filter: ProductFilter
    --
    + ngOnInit(): void
    + loadProducts(): void
    + createProduct(product: Product): void
    + updateProduct(id: string, product: Product): void
    + deleteProduct(id: string): void
    + applyFilter(): void
  }

  class MovementsComponent {
    - movementService: MovementService
    - productService: ProductService
    - siteService: SiteService
    - movements: signal<StockMovement[]>
    - filter: MovementFilter
    --
    + ngOnInit(): void
    + loadMovements(): void
    + createMovement(movement: StockMovement): void
    + applyFilter(): void
  }

  class AlertsComponent {
    - alertService: AlertService
    - alerts: signal<Alert[]>
    - filter: AlertFilter
    --
    + ngOnInit(): void
    + loadAlerts(): void
    + markAsRead(id: string): void
    + resolveAlert(id: string, notes: string): void
    + deleteAlert(id: string): void
  }

  class SitesComponent {
    - siteService: SiteService
    - sites: signal<Site[]>
    - selectedSite?: Site
    --
    + ngOnInit(): void
    + loadSites(): void
    + createSite(site: Site): void
    + updateSite(id: string, site: Site): void
    + deleteSite(id: string): void
  }

  class MembersComponent {
    - authService: AuthService
    - users: User[]
    --
    + ngOnInit(): void
    + loadMembers(): void
  }

  class ProfileComponent {
    - authService: AuthService
    - currentUser: signal<User | null>
    --
    + ngOnInit(): void
    + updateProfile(updates: Partial<User>): void
  }

  class ScannerComponent {
    - productService: ProductService
    - scannedBarcode: string
    --
    + onScan(barcode: string): void
    + lookupProduct(barcode: string): void
  }

  class UserManagementComponent {
    - authService: AuthService
    - users: User[]
    --
    + ngOnInit(): void
    + createUser(user: User): void
    + updateUser(id: string, user: User): void
    + deleteUser(id: string): void
  }
}

package "Shared Components" {
  class RoleBadgeComponent {
    - role: UserRole
    - size: 'small' | 'medium' | 'large'
  }

  class TestCredentialsComponent {
    - mockAccounts: MockAccount[]
    - visible: boolean
    --
    + copyCredentials(account: MockAccount): void
  }
}

' ===== Relationships =====
AppComponent --> MainLayoutComponent : contains
MainLayoutComponent --> DashboardComponent : routes to
MainLayoutComponent --> ProductsComponent : routes to
MainLayoutComponent --> MovementsComponent : routes to
MainLayoutComponent --> AlertsComponent : routes to
MainLayoutComponent --> SitesComponent : routes to
MainLayoutComponent --> MembersComponent : routes to
MainLayoutComponent --> ProfileComponent : routes to
MainLayoutComponent --> ScannerComponent : routes to
MainLayoutComponent --> UserManagementComponent : routes to

LoginComponent --> AuthService : uses
DashboardComponent --> ProductService : uses
DashboardComponent --> MovementService : uses
DashboardComponent --> AlertService : uses
DashboardComponent --> SiteService : uses
ProductsComponent --> ProductService : uses
ProductsComponent --> CategoryService : uses
MovementsComponent --> MovementService : uses
MovementsComponent --> ProductService : uses
MovementsComponent --> SiteService : uses
AlertsComponent --> AlertService : uses
SitesComponent --> SiteService : uses
MembersComponent --> AuthService : uses
ProfileComponent --> AuthService : uses
ScannerComponent --> ProductService : uses
UserManagementComponent --> AuthService : uses

MainLayoutComponent ..> RoleBadgeComponent : uses
LoginComponent ..> TestCredentialsComponent : uses

@enduml
```

---

## Sequence Diagrams

### User Authentication

This sequence diagram shows the authentication flow from login to accessing protected resources.

```plantuml
@startuml User Authentication Sequence

actor User
participant LoginComponent
participant AuthService
participant AuthGuard
participant Router
participant MainLayoutComponent
database LocalStorage

User -> LoginComponent: Enter credentials\n(email, password)
activate LoginComponent

LoginComponent -> AuthService: login(email, password)
activate AuthService

AuthService -> AuthService: getMockAccount(email)
AuthService -> AuthService: Validate credentials

alt Valid Credentials
    AuthService -> AuthService: getMockUserByRole(role)
    AuthService -> AuthService: Create User object
    AuthService -> AuthService: Generate mock token
    
    AuthService -> LocalStorage: Store token
    activate LocalStorage
    LocalStorage --> AuthService: Token stored
    deactivate LocalStorage
    
    AuthService -> LocalStorage: Store user data
    activate LocalStorage
    LocalStorage --> AuthService: User stored
    deactivate LocalStorage
    
    AuthService -> AuthService: Update signals\n(currentUser, isAuthenticated)
    AuthService --> LoginComponent: return true
    
    LoginComponent -> Router: navigate('/dashboard')
    activate Router
    
    Router -> AuthGuard: canActivate()
    activate AuthGuard
    AuthGuard -> AuthService: isAuthenticated()
    AuthService --> AuthGuard: true
    AuthGuard --> Router: true
    deactivate AuthGuard
    
    Router -> MainLayoutComponent: Activate component
    activate MainLayoutComponent
    MainLayoutComponent -> AuthService: currentUser signal
    AuthService --> MainLayoutComponent: User data
    MainLayoutComponent --> User: Show dashboard
    deactivate MainLayoutComponent
    deactivate Router
    
else Invalid Credentials
    AuthService --> LoginComponent: return false
    LoginComponent --> User: Show error message
end

deactivate AuthService
deactivate LoginComponent

@enduml
```

---

### Create Stock Movement

This sequence diagram illustrates the process of creating a stock movement (entry or exit).

```plantuml
@startuml Create Stock Movement Sequence

actor User
participant MovementsComponent
participant MovementService
participant ProductService
participant AlertService
participant SiteService

User -> MovementsComponent: Click "New Movement"
activate MovementsComponent

MovementsComponent -> ProductService: getProducts()
activate ProductService
ProductService --> MovementsComponent: products list
deactivate ProductService

MovementsComponent -> SiteService: getSites()
activate SiteService
SiteService --> MovementsComponent: sites list
deactivate SiteService

MovementsComponent --> User: Show movement form

User -> MovementsComponent: Fill form & Submit\n(product, site, quantity, type)
MovementsComponent -> MovementsComponent: Validate input

alt Valid Input
    MovementsComponent -> ProductService: getProduct(productId)
    activate ProductService
    ProductService --> MovementsComponent: product details
    deactivate ProductService
    
    MovementsComponent -> MovementService: addMovement(movementData)
    activate MovementService
    
    MovementService -> MovementService: generateId()
    MovementService -> MovementService: generateMovementNumber(type)
    MovementService -> MovementService: Create StockMovement object
    MovementService -> MovementService: Update movements signal
    MovementService --> MovementsComponent: new movement
    deactivate MovementService
    
    MovementsComponent -> ProductService: updateProduct(productId, {quantity})
    activate ProductService
    ProductService -> ProductService: Calculate new quantity
    ProductService -> ProductService: Update product signal
    
    alt Stock Below Minimum
        ProductService -> AlertService: checkStockLevels()
        activate AlertService
        AlertService -> AlertService: Create low_stock alert
        AlertService -> AlertService: Update alerts signal
        AlertService --> ProductService: Alert created
        deactivate AlertService
    end
    
    ProductService --> MovementsComponent: updated product
    deactivate ProductService
    
    MovementsComponent --> User: Success message\n"Movement recorded"
    MovementsComponent -> MovementsComponent: Refresh movements list
    
else Invalid Input
    MovementsComponent --> User: Show validation errors
end

deactivate MovementsComponent

@enduml
```

---

### Product Management

This sequence diagram shows the complete lifecycle of product management operations.

```plantuml
@startuml Product Management Sequence

actor User
participant ProductsComponent
participant ProductService
participant CategoryService
participant AlertService

== Load Products ==
User -> ProductsComponent: Navigate to Products
activate ProductsComponent

ProductsComponent -> ProductService: fetchProducts(filter)
activate ProductService
ProductService -> ProductService: Apply filters
ProductService --> ProductsComponent: filtered products
deactivate ProductService

ProductsComponent -> CategoryService: getCategories()
activate CategoryService
CategoryService --> ProductsComponent: categories list
deactivate CategoryService

ProductsComponent --> User: Display products table

== Create Product ==
User -> ProductsComponent: Click "Add Product"
ProductsComponent --> User: Show product form

User -> ProductsComponent: Fill form & Submit
ProductsComponent -> ProductsComponent: Validate data

ProductsComponent -> ProductService: createProduct(productData)
activate ProductService
ProductService -> ProductService: Generate ID
ProductService -> ProductService: Set timestamps
ProductService -> ProductService: Add to products signal
ProductService --> ProductsComponent: new product
deactivate ProductService

ProductsComponent -> CategoryService: updateCategory(categoryId, {productCount++})
activate CategoryService
CategoryService --> ProductsComponent: updated category
deactivate CategoryService

ProductsComponent --> User: Success message

== Update Product ==
User -> ProductsComponent: Click Edit on product
ProductsComponent --> User: Show edit form with data

User -> ProductsComponent: Modify & Save
ProductsComponent -> ProductService: updateProduct(id, updates)
activate ProductService
ProductService -> ProductService: Find product
ProductService -> ProductService: Apply updates
ProductService -> ProductService: Update timestamp
ProductService -> ProductService: Update signal

alt Quantity Changed
    ProductService -> AlertService: checkStockLevels()
    activate AlertService
    
    alt Below Minimum
        AlertService -> AlertService: Create low_stock alert
    else Above Maximum
        AlertService -> AlertService: Create overstock alert
    end
    
    AlertService --> ProductService: Alerts updated
    deactivate AlertService
end

ProductService --> ProductsComponent: updated product
deactivate ProductService

ProductsComponent --> User: Success message

== Delete Product ==
User -> ProductsComponent: Click Delete & Confirm
ProductsComponent -> ProductService: deleteProduct(id)
activate ProductService
ProductService -> ProductService: Remove from signal
ProductService --> ProductsComponent: void
deactivate ProductService

ProductsComponent -> CategoryService: updateCategory(categoryId, {productCount--})
activate CategoryService
CategoryService --> ProductsComponent: updated category
deactivate CategoryService

ProductsComponent --> User: Success message
deactivate ProductsComponent

@enduml
```

---

### Alert Processing

This sequence diagram demonstrates how alerts are generated, monitored, and resolved.

```plantuml
@startuml Alert Processing Sequence

participant System
participant AlertService
participant ProductService
participant MovementService
participant AlertsComponent
actor User

== Automatic Alert Generation ==
System -> AlertService: checkStockLevels()\n[Periodic check]
activate AlertService

AlertService -> ProductService: getProducts()
activate ProductService
ProductService --> AlertService: products list
deactivate ProductService

loop For each product
    AlertService -> AlertService: Check quantity vs minQuantity
    
    alt quantity <= 0
        AlertService -> AlertService: Create out_of_stock alert\n(severity: critical)
    else quantity < minQuantity
        AlertService -> AlertService: Create low_stock alert\n(severity: high)
    else quantity > maxQuantity
        AlertService -> AlertService: Create overstock alert\n(severity: medium)
    end
    
    AlertService -> AlertService: Add to alerts signal
end

deactivate AlertService

== Movement-Triggered Alert ==
System -> MovementService: Movement recorded
activate MovementService

MovementService -> AlertService: Check unusual_movement
activate AlertService

AlertService -> AlertService: Calculate average movement
alt Movement > 2x average
    AlertService -> AlertService: Create unusual_movement alert\n(severity: medium)
    AlertService -> AlertService: Add to alerts signal
end

AlertService --> MovementService: Alert check complete
deactivate AlertService
deactivate MovementService

== User Views Alerts ==
User -> AlertsComponent: Navigate to Alerts
activate AlertsComponent

AlertsComponent -> AlertService: getAlerts()
activate AlertService
AlertService --> AlertsComponent: alerts list
deactivate AlertService

AlertsComponent -> AlertService: getUnreadCount()
activate AlertService
AlertService --> AlertsComponent: unread count
deactivate AlertService

AlertsComponent --> User: Display alerts\n(grouped by severity)

== User Marks Alert as Read ==
User -> AlertsComponent: Click on alert
AlertsComponent -> AlertService: markAsRead(alertId)
activate AlertService
AlertService -> AlertService: Find alert
AlertService -> AlertService: Set isRead = true
AlertService -> AlertService: Update signal
AlertService --> AlertsComponent: void
deactivate AlertService

AlertsComponent --> User: Alert marked as read

== User Resolves Alert ==
User -> AlertsComponent: Click "Resolve" & Add notes
AlertsComponent -> AlertService: resolveAlert(alertId, notes, userId)
activate AlertService

AlertService -> AlertService: Find alert
AlertService -> AlertService: Set isResolved = true
AlertService -> AlertService: Set resolvedBy & resolvedAt
AlertService -> AlertService: Add resolutionNotes
AlertService -> AlertService: Update signal

AlertService --> AlertsComponent: void
deactivate AlertService

AlertsComponent --> User: Success message\n"Alert resolved"
deactivate AlertsComponent

@enduml
```

---

## How to View These Diagrams

### Option 1: Online PlantUML Viewer
1. Copy the PlantUML code for any diagram
2. Visit [PlantUML Online Editor](http://www.plantuml.com/plantuml/uml/)
3. Paste the code and view the rendered diagram

### Option 2: VS Code Extension
1. Install "PlantUML" extension in VS Code
2. Install Java (required for PlantUML)
3. Open this file and use `Alt+D` to preview diagrams

### Option 3: Generate PNG/SVG Images
Use PlantUML CLI or online tools to generate image files:
```bash
# If you have PlantUML installed
plantuml UML_DIAGRAMS.md
```

---

## Diagram Descriptions

### Class Diagrams

1. **Domain Model**: Shows all core domain entities (User, Product, StockMovement, Site, Alert, Category) with their attributes and relationships. This represents the data model of the application.

2. **Services Architecture**: Illustrates the service layer with all business logic services (AuthService, ProductService, MovementService, etc.) and their dependencies.

3. **Components Structure**: Displays the Angular components hierarchy, showing how different UI components interact with services.

### Sequence Diagrams

1. **User Authentication**: Complete authentication flow from login form submission to accessing protected routes.

2. **Create Stock Movement**: Shows the process of recording a stock entry/exit, including product updates and alert generation.

3. **Product Management**: Demonstrates CRUD operations for products with category updates and alert triggers.

4. **Alert Processing**: Illustrates automatic alert generation, user notification, and alert resolution workflow.

---

## Notes

- All diagrams use PlantUML syntax for easy version control and text-based editing
- The diagrams reflect the current implementation as of the project state
- Services use Angular signals for reactive state management
- Authentication is currently using mock accounts stored in the models
- The system supports three user roles: admin, gestionnaire_de_stock, and operateur
- All timestamps use JavaScript Date objects
- IDs are generated using various strategies (timestamps, random strings)

---

**Last Updated**: February 1, 2026  
**Project**: PFE - Inventory Management System  
**Author**: UML Documentation
