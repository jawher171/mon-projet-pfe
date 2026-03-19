import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Permission, Role } from '../../core/models/role.model';
import { AuthorizationService } from '../../core/services/auth-authorization.service';
import { RolesService } from '../../core/services/roles.service';

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
export class SettingsComponent implements OnInit {
  private authorizationService = inject(AuthorizationService);
  private rolesService = inject(RolesService);

  /** Roles derived from the reactive signal */
  roles = computed(() => Object.values(this.authorizationService.rolesSignal()));

  /** Permissions grouped by module */
  permissionGroups: PermissionGroup[] = [
    {
      label: 'Tableau de Bord',
      icon: 'space_dashboard',
      permissions: [
        { key: 'view_dashboard', label: 'Voir' }
      ]
    },
    {
      label: 'Produits',
      icon: 'inventory_2',
      permissions: [
        { key: 'view_products', label: 'Voir' },
        { key: 'manage_products', label: 'Gérer' }
      ]
    },
    {
      label: 'Mouvements',
      icon: 'sync_alt',
      permissions: [
        { key: 'view_movements', label: 'Voir' },
        { key: 'manage_movements', label: 'Gérer' }
      ]
    },
    {
      label: 'Sites',
      icon: 'apartment',
      permissions: [
        { key: 'view_sites', label: 'Voir' },
        { key: 'manage_sites', label: 'Gérer' }
      ]
    },
    {
      label: 'Alertes',
      icon: 'notifications_active',
      permissions: [
        { key: 'view_alerts', label: 'Voir' },
        { key: 'manage_alerts', label: 'Gérer' }
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
      icon: 'manage_accounts',
      permissions: [
        { key: 'manage_users', label: 'Gérer les Utilisateurs' },
        { key: 'manage_roles', label: 'Gérer les Rôles' }
      ]
    },
   
  ];

  /** Track save feedback */
  saved = signal(false);

  /** Role management */
  showAddRoleModal = signal(false);
  newRoleName = signal('');
  newRoleDescription = signal('');
  roleError = signal('');
  savingRole = signal(false);

  showDeleteRoleModal = signal(false);
  roleToDelete = signal<Role | null>(null);
  deletingRole = signal(false);
  deleteRoleError = signal('');

  /** Built-in roles that cannot be deleted */
  readonly protectedRoles = ['admin', 'gestionnaire_de_stock', 'operateur'];

  ngOnInit(): void {
    void this.rolesService.fetchRoles();
  }

  /** Check if a role has a specific permission */
  hasPermission(role: Role, permission: Permission): boolean {
    return role.permissions.includes(permission);
  }

  /** Toggle a permission for a role - persists to backend */
  async togglePermission(roleName: string, permission: Permission, event: Event): Promise<void> {
    // Prevent native checkbox toggle — we control it via signal
    const cb = event.target as HTMLInputElement;
    const roles = this.authorizationService.rolesSignal();
    const key = roleName.toLowerCase();
    const role = roles[key];
    if (!role) {
      console.error('[Settings] Role not found for key:', key, 'available keys:', Object.keys(roles));
      cb.checked = !cb.checked; // revert
      return;
    }

    const has = role.permissions.includes(permission);
    const newPermissions = has
      ? role.permissions.filter(p => p !== permission)
      : [...role.permissions, permission];

    try {
      await this.authorizationService.updateRolePermissions(key, newPermissions);
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2000);
    } catch (err) {
      console.error('[Settings] togglePermission failed:', err);
      cb.checked = !cb.checked; // revert checkbox on failure
    }
  }

  /** Reset to default permissions */
  async resetPermissions(): Promise<void> {
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

    try {
      for (const [roleName, permissions] of Object.entries(defaults)) {
        await this.authorizationService.updateRolePermissions(roleName, permissions);
      }
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2000);
    } catch {
      // Error handled by service
    }
  }

  getRoleColor(role: Role): string {
    return (role as { color?: string }).color ?? '#666';
  }

  getRoleIcon(role: Role): string {
    return (role as { icon?: string }).icon ?? 'person';
  }

  getRoleLabel(role: Role): string {
    return (role as { label?: string }).label ?? role.nom;
  }

  /** Count permissions for a role */
  permissionCount(role: Role): number {
    return role.permissions.length;
  }

  /** Total available permissions */
  get totalPermissions(): number {
    return this.permissionGroups.reduce((sum, g) => sum + g.permissions.length, 0);
  }

  // ── Role CRUD ──────────────────────────────────
  openAddRoleModal() {
    this.newRoleName.set('');
    this.newRoleDescription.set('');
    this.roleError.set('');
    this.showAddRoleModal.set(true);
  }

  closeAddRoleModal() {
    this.showAddRoleModal.set(false);
  }

  async saveNewRole() {
    const name = this.newRoleName().trim();
    if (!name) {
      this.roleError.set('Le nom du rôle est obligatoire.');
      return;
    }
    if (!/^[A-Za-zÀ-ÿ0-9_\s\-]+$/.test(name)) {
      this.roleError.set('Le nom ne doit contenir que des lettres, chiffres, tirets ou underscores.');
      return;
    }
    this.savingRole.set(true);
    this.roleError.set('');
    const result = await this.rolesService.createRole(name, this.newRoleDescription().trim() || undefined);
    this.savingRole.set(false);
    if (result.success) {
      this.closeAddRoleModal();
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2000);
    } else {
      this.roleError.set(result.message ?? 'Erreur lors de la création.');
    }
  }

  openDeleteRoleModal(role: Role) {
    this.roleToDelete.set(role);
    this.deleteRoleError.set('');
    this.showDeleteRoleModal.set(true);
  }

  cancelDeleteRole() {
    this.showDeleteRoleModal.set(false);
    this.roleToDelete.set(null);
  }

  async confirmDeleteRole() {
    const role = this.roleToDelete();
    if (!role) return;
    this.deletingRole.set(true);
    this.deleteRoleError.set('');
    const result = await this.rolesService.deleteRole(role.nom);
    this.deletingRole.set(false);
    if (result.success) {
      this.cancelDeleteRole();
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2000);
    } else {
      this.deleteRoleError.set(result.message ?? 'Erreur lors de la suppression.');
    }
  }

  isProtectedRole(role: Role): boolean {
    return this.protectedRoles.includes(role.nom.toLowerCase());
  }
}
