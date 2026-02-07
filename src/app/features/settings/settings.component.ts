import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Permission, Role } from '../../core/models/role.model';
import { AuthorizationService } from '../../core/services/auth-authorization.service';

interface PermissionGroup {
  label: string;
  icon: string;
  permissions: { key: Permission; label: string }[];
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  private authorizationService = inject(AuthorizationService);

  /** Roles derived from the reactive signal */
  roles = computed(() => Object.values(this.authorizationService.rolesSignal()));

  /** Permissions grouped by module */
  permissionGroups: PermissionGroup[] = [
    {
      label: 'Tableau de Bord',
      icon: 'dashboard',
      permissions: [
        { key: 'view_dashboard', label: 'Voir' }
      ]
    },
    {
      label: 'Produits',
      icon: 'inventory_2',
      permissions: [
        { key: 'view_products', label: 'Voir' },
        { key: 'manage_products', label: 'Gestion' }
      ]
    },
    {
      label: 'Mouvements',
      icon: 'swap_vert',
      permissions: [
        { key: 'view_movements', label: 'Voir' },
        { key: 'manage_movements', label: 'Gestion' }
      ]
    },
    {
      label: 'Sites',
      icon: 'store',
      permissions: [
        { key: 'view_sites', label: 'Voir' },
        { key: 'manage_sites', label: 'Gestion' }
      ]
    },
    {
      label: 'Alertes',
      icon: 'notifications',
      permissions: [
        { key: 'view_alerts', label: 'Voir' },
        { key: 'manage_alerts', label: 'Gestion' }
      ]
    },
    {
      label: 'Scanner',
      icon: 'qr_code_scanner',
      permissions: [
        { key: 'scan_barcode', label: 'Utiliser' }
      ]
    },
    {
      label: 'Utilisateurs',
      icon: 'people',
      permissions: [
        { key: 'manage_users', label: 'Gestion Utilisateurs' },
        { key: 'manage_roles', label: 'Gestion Rôles' }
      ]
    },
    {
      label: 'Autres',
      icon: 'more_horiz',
      permissions: [
        { key: 'basic_entry_exit', label: 'Entrée/Sortie basique' },
        { key: 'view_reports', label: 'Voir Rapports' }
      ]
    }
  ];

  /** Track save feedback */
  saved = signal(false);

  /** Check if a role has a specific permission */
  hasPermission(role: Role, permission: Permission): boolean {
    return role.permissions.includes(permission);
  }

  /** Toggle a permission for a role - updates immediately via the reactive signal */
  togglePermission(roleName: string, permission: Permission): void {
    const roles = this.authorizationService.rolesSignal();
    const role = roles[roleName];
    if (!role) return;

    const has = role.permissions.includes(permission);
    const newPermissions = has
      ? role.permissions.filter(p => p !== permission)
      : [...role.permissions, permission];

    this.authorizationService.updateRolePermissions(roleName, newPermissions);

    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }

  /** Reset to default permissions */
  resetPermissions(): void {
    if (!confirm('Reinitialiser toutes les permissions aux valeurs par defaut ?')) return;

    const defaults: Record<string, Permission[]> = {
      admin: [
        'view_dashboard', 'manage_movements', 'view_movements',
        'manage_alerts', 'view_alerts', 'manage_products', 'view_products',
        'manage_sites', 'view_sites', 'scan_barcode', 'basic_entry_exit',
        'manage_users', 'manage_roles', 'view_reports'
      ],
      gestionnaire_de_stock: [
        'view_dashboard', 'manage_movements', 'view_movements',
        'manage_alerts', 'view_alerts', 'view_products', 'view_sites', 'view_reports'
      ],
      operateur: [
        'view_products', 'scan_barcode', 'basic_entry_exit'
      ]
    };

    for (const [roleName, permissions] of Object.entries(defaults)) {
      this.authorizationService.updateRolePermissions(roleName, permissions);
    }
  }

  /** Count permissions for a role */
  permissionCount(role: Role): number {
    return role.permissions.length;
  }

  /** Total available permissions */
  get totalPermissions(): number {
    return this.permissionGroups.reduce((sum, g) => sum + g.permissions.length, 0);
  }
}
