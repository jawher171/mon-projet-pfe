/**
 * Role and Permission Models
 * Defines user roles, permissions, and access control for the inventory system
 */

/** Permission types available in the system */
export type Permission = 
  | 'view_dashboard'
  | 'manage_movements'
  | 'view_movements'
  | 'manage_alerts'
  | 'view_alerts'
  | 'manage_products'
  | 'view_products'
  | 'manage_sites'
  | 'view_sites'
  | 'scan_barcode'
  | 'basic_entry_exit'
  | 'manage_users'
  | 'manage_roles'
  | 'view_reports';

/** User role types */
export type UserRole = 'admin' | 'gestionnaire_de_stock' | 'operateur' | string;

/** Role definition with permissions */
export interface Role {
  id: string;
  name: UserRole;
  label: string;
  description: string;
  permissions: Permission[];
  color?: string;
  icon?: string;
}

/** Pre-defined roles with their permissions */
export const ROLES: Record<UserRole, Role> = {
  admin: {
    id: 'role_admin',
    name: 'admin',
    label: 'Administrator',
    description: 'Full system access and user management',
    color: '#f44336',
    icon: 'admin_panel_settings',
    permissions: [
      'view_dashboard',
      'manage_movements',
      'view_movements',
      'manage_alerts',
      'view_alerts',
      'manage_products',
      'view_products',
      'manage_sites',
      'view_sites',
      'scan_barcode',
      'basic_entry_exit',
      'manage_users',
      'manage_roles',
      'view_reports'
    ]
  },

  gestionnaire_de_stock: {
    id: 'role_stock_manager',
    name: 'gestionnaire_de_stock',
    label: 'Stock Manager',
    description: 'Manages inventory movements, alerts, and dashboard access',
    color: '#2196f3',
    icon: 'inventory_2',
    permissions: [
      'view_dashboard',
      'manage_movements',
      'view_movements',
      'manage_alerts',
      'view_alerts',
      'view_products',
      'view_sites',
      'view_reports'
    ]
  },

  operateur: {
    id: 'role_operator',
    name: 'operateur',
    label: 'Operator',
    description: 'Performs basic inventory operations and barcode scanning',
    color: '#4caf50',
    icon: 'construction_worker',
    permissions: [
      'view_products',
      'scan_barcode',
      'basic_entry_exit'
    ]
  }
};
