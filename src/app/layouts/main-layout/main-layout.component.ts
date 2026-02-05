/**
 * Main Layout Component
 * Provides the main application shell with navigation sidebar, header, and user menu.
 * Serves as the wrapper for all authenticated pages.
 */

import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Permission } from '../../core/models/role.model';

/** Menu item structure for navigation */
interface MenuItem {
  icon: string;
  label: string;
  route: string;
  badge?: number;
  permission?: Permission;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
  /** Track sidebar collapsed state */
  isSidebarCollapsed = signal(false);
  
  /** Track user menu visibility */
  showUserMenu = signal(false);
  
  /** Current authenticated user */
  currentUser = computed(() => this.authService.currentUser());

  /** All navigation menu items with permissions */
  private allMenuItems: MenuItem[] = [
    { icon: 'dashboard', label: 'Tableau de Bord', route: '/dashboard' },
    { icon: 'inventory_2', label: 'Produits', route: '/products', permission: 'view_products' },
    { icon: 'swap_vert', label: 'Mouvements', route: '/movements', permission: 'manage_movements' },
    { icon: 'qr_code_scanner', label: 'Scanner', route: '/scanner', permission: 'scan_barcode' },
    { icon: 'store', label: 'Sites', route: '/sites', permission: 'view_sites' },
    { icon: 'notifications', label: 'Alertes', route: '/alerts', permission: 'manage_alerts' },
    { icon: 'people', label: 'Gestion Utilisateurs', route: '/user-management', adminOnly: true },
    { icon: 'settings', label: 'Paramètres', route: '/settings' },
  ];

  /** Filtered menu items based on user permissions */
  menuItems = computed(() => {
    const user = this.currentUser();
    if (!user) return [];

    return this.allMenuItems.filter(item => {
      // Dashboard is always visible
      if (item.route === '/dashboard') return true;
      
      // Check admin-only items
      if (item.adminOnly) {
        return user.role === 'admin';
      }
      
      // Check permission-based items
      if (item.permission) {
        return this.authService.hasPermission(item.permission);
      }
      
      return true;
    });
  });

  /** User dropdown menu items */
  userMenuItems = [
    { icon: 'person', label: 'Profile', action: () => this.navigateTo('/profile') },
    { icon: 'logout', label: 'Logout', action: () => this.logout() }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Toggle sidebar collapsed/expanded state
   */
  toggleSidebar() {
    this.isSidebarCollapsed.update(value => !value);
  }

  /**
   * Toggle user dropdown menu visibility
   */
  toggleUserMenu() {
    this.showUserMenu.update(value => !value);
  }

  /**
   * Log out current user and redirect to login page
   */
  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Navigate to a specific route and close user menu
   * @param route Target route path
   */
  navigateTo(route: string) {
    this.router.navigate([route]);
    this.showUserMenu.set(false);
  }

  /** Display name for the current user */
  get userName() {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'User';
  }

  /** Email for the current user */
  get userEmail() {
    return this.currentUser()?.email || '';
  }
}
