# Architecture Documentation

## Overview

Inventory Pro is a modern, professional inventory management system built with Angular 17+ using the latest web technologies and best practices.

## Technology Stack

### Frontend Framework
- **Angular 17+**: Latest version with standalone components
- **TypeScript 5+**: Strong typing and modern JavaScript features
- **RxJS**: Reactive programming (minimal usage, favoring Signals)
- **Angular Signals**: Modern reactive state management

### UI/UX
- **SCSS**: Advanced styling with variables and mixins
- **Material Icons**: Consistent iconography
- **Google Fonts**: Inter font family for modern typography
- **Custom CSS**: Gradient backgrounds and animations

### Build & Development Tools
- **Angular CLI**: Project scaffolding and build system
- **esbuild**: Fast JavaScript bundler
- **TypeScript Compiler**: Type checking and transpilation
- **Webpack**: Module bundling (via Angular CLI)

## Architecture Patterns

### 1. Modular Architecture

```
┌─────────────────────────────────────────┐
│           Application Root              │
│              (App Component)            │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐     ┌───────▼────────┐
│  Auth Layout   │     │  Main Layout   │
│  (Login, etc)  │     │  (Dashboard)   │
└────────────────┘     └────────┬───────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
            ┌───────▼────────┐      ┌──────▼─────┐
            │  Core Modules  │      │  Features  │
            │  (Services,    │      │  (Business │
            │   Models)      │      │   Logic)   │
            └────────────────┘      └────────────┘
```

### 2. Feature-Based Structure

Each feature module is self-contained with:
- Component files (TypeScript, HTML, SCSS)
- Feature-specific services (if needed)
- Models and interfaces
- Routes and guards

```
features/
├── dashboard/
│   ├── dashboard.component.ts
│   ├── dashboard.component.html
│   └── dashboard.component.scss
├── products/
│   ├── products.component.ts
│   ├── products.component.html
│   └── products.component.scss
└── [other features]
```

### 3. Core vs Shared vs Features

#### Core Module
- **Purpose**: Singleton services used throughout the app
- **Contents**: 
  - Authentication service
  - API services
  - Data models
  - Guards and interceptors
- **Loaded**: Once at application startup

#### Shared Module
- **Purpose**: Reusable components, directives, pipes
- **Contents**:
  - UI components (buttons, cards, etc.)
  - Utility directives
  - Custom pipes
  - Helper functions
- **Loaded**: Imported where needed

#### Features Module
- **Purpose**: Business logic and feature-specific code
- **Contents**:
  - Feature components
  - Feature routes
  - Feature-specific services
- **Loaded**: Lazy-loaded on demand

## State Management

### Angular Signals

The application uses Angular Signals for reactive state management:

```typescript
// Service with Signal
@Injectable({ providedIn: 'root' })
export class ProductService {
  private products = signal<Product[]>([]);
  
  getProducts() {
    return this.products;
  }
  
  updateProduct(id: string, data: Partial<Product>) {
    this.products.update(products => 
      products.map(p => p.id === id ? { ...p, ...data } : p)
    );
  }
}
```

```typescript
// Component using Signal
export class ProductsComponent {
  products = computed(() => this.productService.getProducts()());
  
  filteredProducts = computed(() => {
    // Automatically updates when products or filters change
    return this.products().filter(/* filtering logic */);
  });
}
```

### Benefits of Signals
- **Fine-grained reactivity**: Only affected components re-render
- **Automatic dependency tracking**: No manual subscriptions
- **Better performance**: Optimized change detection
- **Simpler code**: Less boilerplate than RxJS

## Routing Strategy

### Lazy Loading

All feature modules are lazy-loaded for optimal performance:

```typescript
export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(m => m.DashboardComponent)
  },
  // More routes...
];
```

### Route Structure

```
/                          → Redirect to /dashboard
/auth/login               → Login page (no layout)
/dashboard                → Dashboard (with main layout)
/products                 → Products list
/products/:id             → Product details (future)
/categories               → Categories management
/suppliers                → Suppliers management
/orders                   → Orders management
/reports                  → Reports and analytics
```

## Component Architecture

### Standalone Components

All components are standalone (Angular 17+ feature):

```typescript
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  // Component logic using Signals
}
```

### Component Types

1. **Layout Components**
   - Main Layout: Sidebar + Header + Content
   - Auth Layout: Centered card for login
   - Responsible for overall page structure

2. **Feature Components**
   - Dashboard: Overview and statistics
   - Products: List and management
   - Contains business logic

3. **Shared Components** (Future)
   - Buttons, Cards, Modals
   - Reusable across features

## Data Flow

```
┌─────────────────┐
│   Component     │
│   (UI Layer)    │
└────────┬────────┘
         │
         │ calls methods
         │
┌────────▼────────┐
│    Service      │
│ (Business Logic)│
└────────┬────────┘
         │
         │ manages
         │
┌────────▼────────┐
│  Signal State   │
│  (Data Store)   │
└────────┬────────┘
         │
         │ updates
         │
┌────────▼────────┐
│   Component     │
│  (Re-renders)   │
└─────────────────┘
```

### Example Flow

1. User clicks "Add Product" button
2. Component calls `productService.createProduct(data)`
3. Service updates the products Signal
4. All computed signals automatically update
5. Components automatically re-render with new data

## Services Architecture

### Service Types

1. **Data Services**
   - ProductService
   - CategoryService
   - OrderService
   - Manage business data using Signals

2. **Utility Services**
   - AuthService
   - Handle cross-cutting concerns

3. **API Services** (Future)
   - HttpService
   - Handle HTTP communication

### Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class ProductService {
  // Private state
  private products = signal<Product[]>([]);
  
  // Public read-only access
  getProducts() {
    return this.products;
  }
  
  // Public methods to modify state
  async createProduct(data: CreateProductDto): Promise<Product> {
    // Business logic
    const newProduct = { ...data, id: generateId() };
    this.products.update(products => [...products, newProduct]);
    return newProduct;
  }
}
```

## Security Architecture

### Current Implementation

1. **Client-side Authentication**
   - Login form with validation
   - Token stored in localStorage
   - User state managed via Signals

2. **Route Protection**
   - Auth guards (to be implemented)
   - Redirect to login if not authenticated

### Future Security Enhancements

1. **JWT Authentication**
   ```typescript
   // HTTP Interceptor
   intercept(req: HttpRequest<any>, next: HttpHandler) {
     const token = this.authService.getToken();
     if (token) {
       req = req.clone({
         setHeaders: { Authorization: `Bearer ${token}` }
       });
     }
     return next.handle(req);
   }
   ```

2. **Route Guards**
   ```typescript
   export const authGuard: CanActivateFn = () => {
     const authService = inject(AuthService);
     const router = inject(Router);
     
     if (authService.isAuthenticated()) {
       return true;
     }
     
     router.navigate(['/auth/login']);
     return false;
   };
   ```

## Performance Optimizations

### Already Implemented

1. **Lazy Loading**
   - Routes loaded on demand
   - Reduces initial bundle size

2. **Code Splitting**
   - Automatic chunk generation
   - Separate bundles per route

3. **Signal-based Change Detection**
   - Fine-grained updates
   - Only affected components re-render

4. **Production Build Optimization**
   - Minification
   - Tree-shaking
   - Dead code elimination

### Future Optimizations

1. **OnPush Change Detection**
   ```typescript
   @Component({
     changeDetection: ChangeDetectionStrategy.OnPush
   })
   ```

2. **Virtual Scrolling**
   ```typescript
   import { ScrollingModule } from '@angular/cdk/scrolling';
   ```

3. **Service Worker**
   ```bash
   ng add @angular/pwa
   ```

## Design Patterns Used

### 1. Singleton Pattern
- Services with `providedIn: 'root'`
- Single instance across the application

### 2. Observer Pattern
- Angular Signals for reactive updates
- Computed values for derived state

### 3. Component Pattern
- Standalone components
- Reusable UI building blocks

### 4. Service Layer Pattern
- Business logic separated from components
- Data access through services

### 5. Lazy Loading Pattern
- On-demand module loading
- Improved initial load time

## Testing Strategy

### Unit Testing
```typescript
describe('ProductService', () => {
  it('should create product', async () => {
    const service = new ProductService();
    const product = await service.createProduct(mockData);
    expect(product.id).toBeDefined();
  });
});
```

### Component Testing
```typescript
describe('DashboardComponent', () => {
  it('should display statistics', () => {
    const component = new DashboardComponent();
    expect(component.stats().length).toBeGreaterThan(0);
  });
});
```

## Scalability Considerations

### Horizontal Scaling
- Stateless frontend (state in backend)
- Can run multiple instances behind load balancer
- CDN for static assets

### Code Organization
- Feature modules can be extracted to libraries
- Nx monorepo for multi-app projects
- Micro-frontend architecture possible

### Performance at Scale
- Virtual scrolling for large lists
- Pagination for API requests
- Caching strategies
- Progressive loading

## Future Architecture Improvements

1. **State Management Library**
   - NgRx or Akita for complex state
   - Time-travel debugging
   - DevTools integration

2. **Component Library**
   - Storybook for component showcase
   - Shared UI components package
   - Design system implementation

3. **Micro-frontends**
   - Module Federation
   - Independent deployment
   - Team-based development

4. **Real-time Features**
   - WebSocket integration
   - Live inventory updates
   - Collaborative editing

5. **Offline Support**
   - Service Workers
   - IndexedDB for local storage
   - Sync on reconnection

## Development Workflow

### Local Development
```bash
npm start              # Development server
npm run build          # Production build
npm test               # Unit tests
npm run lint           # Code linting
```

### Code Quality
- TypeScript strict mode
- ESLint for code quality
- Prettier for formatting
- Husky for pre-commit hooks (to be added)

### CI/CD Pipeline (Future)
```yaml
# .github/workflows/ci.yml
- Lint code
- Run tests
- Build application
- Deploy to staging/production
```

## Monitoring & Observability

### Frontend Monitoring (Future)
- Error tracking (Sentry)
- Performance monitoring (Lighthouse CI)
- User analytics (Google Analytics)
- Real User Monitoring (RUM)

### Logging
- Console logs in development
- Structured logging in production
- Error reporting to backend

---

**Architecture Version**: 1.0.0
**Last Updated**: January 2024
**Framework**: Angular 17+
**Maintained By**: Development Team

---

## Backend Implementation Plan (Step-by-Step)

This plan maps the UML domain model (User, Product, StockMovement, Site, Category, Alert) to a .NET 8 CQRS backend as described in `UML_DIAGRAMS.md` and `CAHIER_DE_CHARGE.md`.

1. **Create the solution structure**
   - `Inventaire.API` (controllers, DI, middleware)
   - `Inventaire.Application` (CQRS commands/queries + handlers)
   - `Inventaire.Domain` (entities, enums, value objects)
   - `Inventaire.Infrastructure` (EF Core, repositories, external services)
2. **Define domain entities and enums**
   - Implement entities from the class diagram: `User`, `Product`, `StockMovement`, `Site`, `Category`, `Alert`, `Role`, `WarehouseZone`, `Address`.
   - Add enums: `UserRole`, `SiteType`, `AlertType`, `AlertSeverity`, `MovementReason`.
3. **Set up persistence with EF Core**
   - Map entities to tables with relationships (Product→Category, Site→Zones, Alert→Product/Site).
   - Add indices for SKU, movementNumber, and foreign keys.
   - Create migrations and a seed script for baseline data.
4. **Implement authentication + RBAC**
   - Add JWT auth, token issuance (`/api/auth/login`), and refresh tokens.
   - Persist roles/permissions aligned with `UserRole` and frontend guards.
   - Enforce authorization policies per route.
5. **Build CQRS pipeline**
   - Commands: create/update/delete for Products, Categories, Sites, Movements, Alerts, Users.
   - Queries: list/get by id, filtered lists, summaries (dashboard stats).
   - Use MediatR + AutoMapper for DTO mapping.
6. **Create core domain services**
   - `InventoryService`: apply stock movements and recompute quantities.
   - `AlertingService`: generate low/out-of-stock/overstock alerts.
   - `ValidationService`: enforce min/max rules and movement constraints.
7. **Design REST endpoints**
   - `/api/products`, `/api/categories`, `/api/sites`, `/api/movements`, `/api/alerts`, `/api/users`.
   - Include pagination/filtering for list endpoints (SKU, category, site, date range).
8. **Handle stock movement transactions**
   - Wrap movement creation + product stock updates in a transaction.
   - Emit alerts when thresholds are crossed.
9. **Add validation and error handling**
   - Use FluentValidation for request DTOs.
   - Return consistent problem details responses.
10. **Add auditing and logging**
    - Store `createdAt`, `updatedAt`, `performedBy` from the UML model.
    - Log critical operations (movement creation, alert resolution).
11. **Testing strategy**
    - Unit tests for handlers/services.
    - Integration tests for API endpoints and database behavior.
12. **API gateway + cross-cutting concerns**
    - Configure CORS, rate limiting, and request logging.
    - Add Swagger/OpenAPI with auth flows.
13. **Operational readiness**
    - Health checks, metrics, and Docker containerization.
    - CI pipeline steps: build, test, lint, deploy.

This sequence aligns backend deliverables with the UML class diagram and keeps the API ready for replacing the frontend mock services with real endpoints.
