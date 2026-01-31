/**
 * Application Routes Configuration
 * Defines all routes for the inventory management application.
 * Uses lazy loading for all feature components to optimize performance.
 */

import { Routes } from '@angular/router';

/**
 * Route definitions for the application:
 * - Root path redirects to dashboard
 * - Login route is publicly accessible
 * - All other routes are wrapped in the main layout with auth protection
 */
export const routes: Routes = [
  // Redirect root path to dashboard
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },

  // Public login route - loads without layout
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },

  // Protected routes wrapped in main layout
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      // Dashboard - main overview page
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      
      // Products - manage inventory products
      {
        path: 'products',
        loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent)
      },
      
      // Movements - track stock movements
      {
        path: 'movements',
        loadComponent: () => import('./features/movements/movements.component').then(m => m.MovementsComponent)
      },
      
      // Sites - manage warehouse/site locations
      {
        path: 'sites',
        loadComponent: () => import('./features/sites/sites.component').then(m => m.SitesComponent)
      },
      
      // Alerts - view system alerts and notifications
      {
        path: 'alerts',
        loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent)
      },
      
      // Scanner - barcode/QR code scanning feature
      {
        path: 'scanner',
        loadComponent: () => import('./features/scanner/scanner.component').then(m => m.ScannerComponent)
      }
    ]
  },

  // Wildcard route - redirect to dashboard for undefined paths
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
