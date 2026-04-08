/**
 * Application Routes Configuration
 * Defines all routes for the inventory management application.
 * Uses lazy loading for all feature components to optimize performance.
 * Includes role-based access control guards for protected routes.
 */

import { Routes } from '@angular/router';
import { permissionGuard, authGuard, scannerAccessGuard } from './core/guards/auth.guard';

/**
 * Route definitions for the application:
 * - Root path redirects to dashboard
 * - Login route is publicly accessible
 * - All other routes are wrapped in the main layout with role-based auth protection
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

  // Phone scan route - accessible without auth for phone barcode scanning via QR code
  {
    path: 'scan',
    loadComponent: () => import('./features/scanner/scanner.component').then(m => m.ScannerComponent),
    canActivate: [scannerAccessGuard]
  },

  // Phone relay-only scan route for Product/Movement QR flows
  {
    path: 'scan-relay',
    loadComponent: () => import('./features/scanner/scanner.component').then(m => m.ScannerComponent),
    canActivate: [scannerAccessGuard]
  },

  // Protected routes wrapped in main layout
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      // Dashboard - main overview page (all authenticated users)
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [permissionGuard('view_dashboard')]
      },
      
      // Products - manage inventory products (all users except basic operators)
      {
        path: 'products',
        loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent),
        canActivate: [permissionGuard('view_products')]
      },
      
      // Movements - track stock movements (admin and stock managers only)
      {
        path: 'movements',
        loadComponent: () => import('./features/movements/movements.component').then(m => m.MovementsComponent),
        canActivate: [permissionGuard('view_movements')]
      },
      
      // Sites - manage warehouse/site locations (admin and stock managers)
      {
        path: 'sites',
        loadComponent: () => import('./features/sites/sites.component').then(m => m.SitesComponent),
        canActivate: [permissionGuard('view_sites')]
      },

      // Site Stocks - stock list for a specific site
      {
        path: 'sites/:siteId/stocks',
        loadComponent: () => import('./features/site-stocks/site-stocks.component').then(m => m.SiteStocksComponent),
        canActivate: [permissionGuard('view_stocks')]
      },

      // Stocks Overview - all stocks across all sites
      {
        path: 'stocks',
        loadComponent: () => import('./features/stocks-overview/stocks-overview.component').then(m => m.StocksOverviewComponent),
        canActivate: [permissionGuard('view_stocks')]
      },
      
      // Alerts - view system alerts and notifications (admin and stock managers)
      {
        path: 'alerts',
        loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent),
        canActivate: [permissionGuard('view_alerts')]
      },

      // Replenishment suggestions based on stock thresholds
      {
        path: 'reapprovisionnement',
        loadComponent: () => import('./features/reapprovisionnement/reapprovisionnement.component').then(m => m.ReapprovisionnementComponent),
        canActivate: [permissionGuard('view_reapprovisionnement')]
      },
      
      // Scanner - barcode/QR code scanning feature (operators and admin)
      {
        path: 'scanner',
        loadComponent: () => import('./features/scanner/scanner.component').then(m => m.ScannerComponent),
        canActivate: [permissionGuard('scan_barcode')]
      },

      // Members management - admin only
      {
        path: 'members',
        loadComponent: () => import('./features/members/members.component').then(m => m.MembersComponent),
        canActivate: [permissionGuard('manage_users')]
      },

      // Profile - user profile page (all authenticated users)
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },

      // User Management - admin only
      {
        path: 'user-management',
        loadComponent: () => import('./features/user-management/user-management.component').then(m => m.UserManagementComponent),
        canActivate: [permissionGuard('manage_users')]
      },

      // Settings - admin only
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
        canActivate: [permissionGuard('manage_roles')]
      }
    ]
  },

  // Wildcard route - redirect to dashboard for undefined paths
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
