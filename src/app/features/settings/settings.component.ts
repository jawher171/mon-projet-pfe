import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Permission, Role } from '../../core/models/role.model';
import { AuthorizationService } from '../../core/services/auth-authorization.service';
import { PermissionCatalogItem, RolesService } from '../../core/services/roles.service';

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
  private initialPermissionsSnapshot = signal<Record<string, Permission[]>>({});

  private readonly moduleConfig: Record<string, { label: string; icon: string }> = {
    dashboard: { label: 'Tableau de Bord', icon: 'space_dashboard' },
    products: { label: 'Produits', icon: 'inventory_2' },
    movements: { label: 'Mouvements', icon: 'sync_alt' },
    sites: { label: 'Sites', icon: 'apartment' },
    stocks: { label: 'Stocks', icon: 'inventory_2' },
    alerts: { label: 'Alertes', icon: 'notifications_active' },
    scanner: { label: 'Scanner', icon: 'qr_code_scanner' },
    reports: { label: 'Rapports', icon: 'bar_chart' },
    reapprovisionnement: { label: 'Réapprovisionnement', icon: 'local_shipping' },
    users: { label: 'Utilisateurs', icon: 'manage_accounts' },
    misc: { label: 'Autres', icon: 'extension' }
  };

  private readonly moduleOrder: Record<string, number> = {
    dashboard: 1,
    products: 2,
    movements: 3,
    sites: 4,
    stocks: 5,
    alerts: 6,
    scanner: 7,
    reports: 8,
    reapprovisionnement: 9,
    users: 10,
    misc: 99
  };

  private readonly actionLabelMap: Record<string, string> = {
    view: 'Voir',
    manage: 'Gérer',
    scan: 'Utiliser'
  };

  private readonly moduleLabelMap: Record<string, string> = {
    dashboard: 'Tableau de Bord',
    products: 'Produits',
    movements: 'Mouvements',
    sites: 'Sites',
    stocks: 'Stocks',
    alerts: 'Alertes',
    scanner: 'Scanner',
    reports: 'Rapports',
    reapprovisionnement: 'Réapprovisionnement',
    users: 'Utilisateurs',
    roles: 'Rôles'
  };

  private readonly dynamicCatalog = computed(() => this.rolesService.permissionCatalog());

  /** Permissions grouped by module */
  permissionGroups = computed<PermissionGroup[]>(() => {
    const catalog = this.dynamicCatalog();
    if (!catalog.length) return [];

    const grouped = new Map<string, PermissionGroup>();

    for (const item of catalog) {
      const parsed = this.parsePermission(item);
      const config = this.moduleConfig[parsed.moduleKey] ?? this.moduleConfig['misc'];
      const current = grouped.get(parsed.moduleKey) ?? {
        label: config.label,
        icon: config.icon,
        permissions: []
      };

      current.permissions.push({
        key: item.code,
        label: parsed.label
      });

      grouped.set(parsed.moduleKey, current);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => (this.moduleOrder[a[0]] ?? 999) - (this.moduleOrder[b[0]] ?? 999))
      .map(([, group]) => ({
        ...group,
        permissions: [...group.permissions].sort((a, b) => a.key.localeCompare(b.key))
      }));
  });

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

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.rolesService.fetchRoles(),
      this.rolesService.fetchPermissionCatalog()
    ]);

    const snapshot: Record<string, Permission[]> = {};
    for (const role of this.roles()) {
      snapshot[role.nom.toLowerCase()] = [...role.permissions];
    }
    this.initialPermissionsSnapshot.set(snapshot);
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
    if (!confirm('Revenir aux permissions chargées au démarrage de cette page ?')) return;

    const defaults = this.initialPermissionsSnapshot();
    if (!Object.keys(defaults).length) {
      return;
    }

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
    return this.permissionGroups().reduce((sum, g) => sum + g.permissions.length, 0);
  }

  private parsePermission(item: PermissionCatalogItem): { moduleKey: string; label: string } {
    const code = (item.code ?? '').trim().toLowerCase();
    const description = (item.description ?? '').trim();
    const preferredDescription = this.getPreferredDescription(code, description);

    if (!code) {
      return { moduleKey: 'misc', label: description || 'Permission' };
    }

    if (code === 'scan_barcode' || code.startsWith('scan_')) {
      return { moduleKey: 'scanner', label: preferredDescription || 'Utiliser' };
    }

    const [action, ...rest] = code.split('_');
    const suffix = rest.join('_');

    if ((action === 'view' || action === 'manage') && suffix) {
      const moduleKey = this.normalizeModuleKey(suffix);
      const actionLabel = this.actionLabelMap[action] ?? this.capitalize(action);
      const moduleLabel = this.moduleLabelMap[suffix] ?? this.capitalize(suffix.replace(/_/g, ' '));
      return {
        moduleKey,
        label: preferredDescription || `${actionLabel} ${moduleLabel}`
      };
    }

    const moduleKey = this.normalizeModuleKey(code);
    return {
      moduleKey,
      label: preferredDescription || this.capitalize(code.replace(/_/g, ' '))
    };
  }

  private getPreferredDescription(code: string, description: string): string {
    if (!description) return '';

    const normalizedDescription = description.trim().toLowerCase();

    // Ignore machine-like descriptions so labels are rendered as readable French actions.
    if (
      normalizedDescription === code ||
      normalizedDescription.startsWith('view_') ||
      normalizedDescription.startsWith('manage_') ||
      normalizedDescription.startsWith('scan_')
    ) {
      return '';
    }

    return description;
  }

  private normalizeModuleKey(raw: string): string {
    const key = raw.toLowerCase();
    if (key.includes('scanner') || key.includes('barcode')) return 'scanner';
    if (key.includes('user') || key.includes('role')) return 'users';
    if (this.moduleConfig[key]) return key;
    return 'misc';
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
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
