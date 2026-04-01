/**
 * Main Layout Component
 * Provides the main application shell with navigation sidebar, header, and user menu.
 * Serves as the wrapper for all authenticated pages.
 */

import { Component, computed, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { Permission } from '../../core/models/role.model';

/** Menu item structure for navigation */
interface MenuItem {
  icon: string;
  label: string;
  route: string;
  badge?: number;
  permission?: Permission;
  adminOnly?: boolean;
  section?: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  /** Track sidebar collapsed state */
  isSidebarCollapsed = signal(false);
  
  /** Track user menu visibility */
  showUserMenu = signal(false);
  
  /** Current authenticated user */
  currentUser = computed(() => this.authService.currentUser());

  /** Unread alert count for notification bell */
  unreadAlertCount = computed(() => this.alertService.getUnreadAlerts()().length);

  /** Active (unresolved) alerts for the banner */
  activeAlertsBanner = computed(() => this.alertService.getActiveAlerts()());

  /** Whether user has dismissed the banner in this session */
  alertBannerDismissed = signal(false);

  /** Whether there are critical severity alerts */
  hasCriticalAlerts = computed(() =>
    this.activeAlertsBanner().some(a => a.severity === 'critical')
  );

  /** Count of critical alerts */
  criticalCount = computed(() =>
    this.activeAlertsBanner().filter(a => a.severity === 'critical').length
  );

  /** Count of warning alerts */
  warningCount = computed(() =>
    this.activeAlertsBanner().filter(a => a.severity === 'warning').length
  );

  /** Count of info alerts */
  infoCount = computed(() =>
    this.activeAlertsBanner().filter(a =>
      a.severity !== 'critical' && a.severity !== 'warning'
    ).length
  );

  /** Top product names from active alerts (max 3) */
  topAlertProducts = computed(() => {
    const names = [...new Set(
      this.activeAlertsBanner()
        .map(a => a.produitNom)
        .filter((n): n is string => !!n)
    )];
    if (names.length === 0) return 'Vérifiez vos stocks';
    if (names.length <= 3) return names.join(', ');
    return names.slice(0, 3).join(', ') + ` et ${names.length - 3} autre${names.length - 3 > 1 ? 's' : ''}`;
  });

  /** All navigation menu items with permissions */
  private allMenuItems: MenuItem[] = [
    { icon: 'dashboard', label: 'Tableau de Bord', route: '/dashboard' },
    { icon: 'package_2', label: 'Produits', route: '/products', permission: 'view_products' },
    { icon: 'swap_vert', label: 'Mouvements', route: '/movements', permission: 'manage_movements' },
    { icon: 'qr_code_2', label: 'Scanner', route: '/scanner', permission: 'scan_barcode' },
    { icon: 'domain', label: 'Sites', route: '/sites', permission: 'view_sites' },
    { icon: 'inventory_2', label: 'Stocks', route: '/stocks', permission: 'view_sites' },
    { icon: 'campaign', label: 'Alertes', route: '/alerts', permission: 'manage_alerts' },
    { icon: 'local_shipping', label: 'Reapprovisionnement', route: '/reapprovisionnement', permission: 'view_reapprovisionnement' },
    { icon: 'admin_panel_settings', label: 'Gestion Utilisateurs', route: '/user-management', adminOnly: true, section: 'Système' },
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
    { icon: 'person', label: 'Profil', action: () => this.navigateTo('/profile') },
    { icon: 'logout', label: 'Déconnexion', action: () => this.logout() }
  ];

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.alertService.fetchAlerts();
  }

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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.showUserMenu() && !target.closest('.relative')) {
      this.showUserMenu.set(false);
    }
  }

  /**
   * Log out current user and redirect to login page
   */
  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Dismiss the alert banner for the current session
   */
  dismissAlertBanner() {
    this.alertBannerDismissed.set(true);
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
    return user ? `${user.prenom} ${user.nom}` : 'User';
  }

  /** Email for the current user */
  get userEmail() {
    return this.currentUser()?.email || '';
  }
}
