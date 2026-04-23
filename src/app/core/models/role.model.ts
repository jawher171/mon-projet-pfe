/**
 * Role and Permission Models - Diagram alignment
 * Role: idRole, nom
 * Permission: idPermission, code, description
 * RolePermission: idRole, idPermission, createdAt
 */

/** Permission codes are backend-driven (dynamic catalog). */
export type Permission = string;

/** User role names (backend nom values) */
export type UserRole = 'admin' | 'gestionnaire_de_stock' | 'operateur' | string;

/** Role with permissions - Diagram Role + UI auth */
export interface Role {
  idRole: number;
  nom: string;
  description?: string;
  permissions: Permission[];
}

/** Backward compatibility: Role with label for UI */
export interface RoleWithLabel extends Role {
  label: string;
  color?: string;
  icon?: string;
}

export const ROLES: Record<UserRole, RoleWithLabel> = {
  admin: {
    idRole: 1,
    nom: 'admin',
    label: 'Administrateur',
    description: 'Accès complet au système',
    color: '#f44336',
    icon: 'admin_panel_settings',
    permissions: ['view_dashboard', 'manage_movements', 'view_movements', 'manage_alerts', 'view_alerts', 'manage_products', 'view_products', 'manage_sites', 'view_sites', 'manage_stocks', 'view_stocks', 'scan_barcode', 'manage_users', 'manage_roles', 'view_reports', 'view_reapprovisionnement', 'manage_reapprovisionnement']
  },
  gestionnaire_de_stock: {
    idRole: 2,
    nom: 'gestionnaire_de_stock',
    label: 'Gestionnaire de Stock',
    description: 'Gestion de l\'inventaire',
    color: '#2196f3',
    icon: 'inventory_2',
    permissions: ['view_dashboard', 'manage_movements', 'view_movements', 'manage_alerts', 'view_alerts', 'view_products', 'view_sites', 'manage_stocks', 'view_stocks', 'view_reports', 'view_reapprovisionnement', 'manage_reapprovisionnement']
  },
  operateur: {
    idRole: 3,
    nom: 'operateur',
    label: 'Opérateur',
    description: 'Opérations de base (scan + entrées)',
    color: '#4caf50',
    icon: 'engineering',
    permissions: ['view_products', 'scan_barcode', 'view_reapprovisionnement']
  }
};

