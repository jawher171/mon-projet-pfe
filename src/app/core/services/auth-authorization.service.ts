/**
 * Authorization Service
 * Manages role-based access control and permissions.
 * Uses RolesService for roles (synced from backend).
 */

import { Injectable, inject } from '@angular/core';
import { UserRole, Permission } from '../models/role.model';
import { RolesService } from './roles.service';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {
  private rolesService = inject(RolesService);

  /** Reactive roles from RolesService (backend API). */
  rolesSignal = this.rolesService.roles;

  /**
   * Vérifie si le rôle actuel possède une permission donnée (ex: "manage_users").
   * Cette méthode est critique pour cacher des boutons et interdire des pages (Gards).
   */
  hasPermission(userRole: UserRole, permission: Permission): boolean {
    const roles = this.rolesSignal();
    const role = roles[userRole];
    return role ? role.permissions.includes(permission) : false;
  }

  /**
   * Update permissions for a role (persists to backend via RolesService)
   * @param roleName Role to update
   * @param permissions New permissions array
   */
  async updateRolePermissions(roleName: UserRole, permissions: Permission[]): Promise<void> {
    const ok = await this.rolesService.updateRolePermissions(roleName, permissions);
    if (!ok) {
      throw new Error('Failed to update role permissions');
    }
  }
}
