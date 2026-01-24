import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

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
  isSidebarCollapsed = signal(false);
  showUserMenu = signal(false);
  currentUser = computed(() => this.authService.currentUser());

  menuItems: MenuItem[] = [
    { icon: 'dashboard', label: 'Tableau de Bord', route: '/dashboard' },
    { icon: 'inventory_2', label: 'Produits', route: '/products', badge: 125 },
    { icon: 'swap_vert', label: 'Mouvements', route: '/movements', badge: 12 },
    { icon: 'qr_code_scanner', label: 'Scanner', route: '/scanner' },
    { icon: 'store', label: 'Sites', route: '/sites' },
    { icon: 'notifications', label: 'Alertes', route: '/alerts', badge: 5 },
  ];

  userMenuItems = [
    { icon: 'person', label: 'Profile', action: () => this.navigateTo('/profile') },
    { icon: 'settings', label: 'Settings', action: () => this.navigateTo('/settings') },
    { icon: 'logout', label: 'Logout', action: () => this.logout() }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleSidebar() {
    this.isSidebarCollapsed.update(value => !value);
  }

  toggleUserMenu() {
    this.showUserMenu.update(value => !value);
  }

  logout() {
    this.authService.logout();
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
