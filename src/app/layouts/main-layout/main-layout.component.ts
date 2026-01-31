/**
 * Main Layout Component
 * Provides the main application shell with navigation sidebar, header, and user menu.
 * Serves as the wrapper for all authenticated pages.
 */

import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/** Menu item structure for navigation */
interface MenuItem {
  icon: string;
  label: string;
  route: string;
  badge?: number;
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

  /** Navigation menu items displayed in sidebar */
  menuItems: MenuItem[] = [
    { icon: 'dashboard', label: 'Tableau de Bord', route: '/dashboard' },
    { icon: 'inventory_2', label: 'Produits', route: '/products', badge: 125 },
    { icon: 'swap_vert', label: 'Mouvements', route: '/movements', badge: 12 },
    { icon: 'qr_code_scanner', label: 'Scanner', route: '/scanner' },
    { icon: 'store', label: 'Sites', route: '/sites' },
    { icon: 'notifications', label: 'Alertes', route: '/alerts', badge: 5 },
  ];

  /** User dropdown menu items */
  userMenuItems = [
    { icon: 'person', label: 'Profile', action: () => this.navigateTo('/profile') },
    { icon: 'settings', label: 'Settings', action: () => this.navigateTo('/settings') },
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
  /**
   * Toggle user dropdown menu visibility
   */
    this.isSidebarCollapsed.update(value => !value);
  }

  toggleUserMenu() {
  /**
   * Log out current user and redirect to login page
   */
    this.showUserMenu.update(value => !value);
  }

  logout() {
    this.authService.logout();
  /**
   * Navigate to a specific route and close user menu
   * @param route Target route path
   */
    this.router.navigate(['/auth/login']);
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
    this.showUserMenu.set(false);
  }

  get userName() {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'User';
  }

  get userEmail() {
    return this.currentUser()?.email || '';
  }
}
