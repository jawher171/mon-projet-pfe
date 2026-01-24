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
