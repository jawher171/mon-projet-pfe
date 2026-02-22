/**
 * Authorization Service
 * Manages role-based access control, permissions, and user management.
 * Uses RolesService for roles (synced from backend when available).
 */

import { Injectable, inject, computed, signal } from '@angular/core';
import { User } from '../models/user.model';
import { UserRole, Permission, ROLES, Role } from '../models/role.model';
import { RolesService } from './roles.service';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {
  private rolesService = inject(RolesService);

  /** Reactive roles - from RolesService (backend) or local ROLES default */
  rolesSignal = this.rolesService.roles;

  /** List of all system members */
  private membersSignal = signal<User[]>(this.getMockMembers());

  /**
   * Get all members signal
   * @returns Signal containing all members
   */
  getMembers() {
    return this.membersSignal;
  }

  /**
   * Get members by role
   * @param role User role to filter
   * @returns Computed signal of members with specified role
   */
  getMembersByRole(role: UserRole) {
    return computed(() => this.membersSignal().filter(m => m.role === role));
  }

  /**
   * Get active members
   * @returns Computed signal of active members
   */
  getActiveMembers() {
    return computed(() => this.membersSignal().filter(m => m.status === 'active'));
  }

  /**
   * Add a new member (admin only)
   * @param member User data without auto-generated fields
   * @returns Created user object
   */
  addMember(member: Omit<User, 'id' | 'lastLogin'>): User {
    const newMember: User = {
      ...member,
      id: this.generateId()
    };

    this.membersSignal.update(members => [...members, newMember]);
    return newMember;
  }

  /**
   * Update member details
   * @param id Member identifier
   * @param updates Partial user data
   * @returns true if successful, false if member not found
   */
  updateMember(id: string, updates: Partial<User>): boolean {
    const index = this.membersSignal().findIndex(m => m.id === id);
    if (index === -1) return false;

    this.membersSignal.update(members => {
      const updated = [...members];
      updated[index] = { ...updated[index], ...updates, lastLogin: new Date() };
      return updated;
    });
    return true;
  }

  /**
   * Delete a member
   * @param id Member identifier
   * @returns true if successful, false if member not found or is last admin
   */
  deleteMember(id: string): boolean {
    const members = this.membersSignal();
    const adminCount = members.filter(m => m.role === 'admin' && m.status === 'active').length;
    const member = members.find(m => m.id === id);

    if (!member || (member.role === 'admin' && adminCount <= 1)) {
      return false;
    }

    this.membersSignal.update(m => m.filter(u => u.id !== id));
    return true;
  }

  /**
   * Change member role
   * @param id Member identifier
   * @param role New role to assign
   * @returns true if successful, false if member not found
   */
  changeRole(id: string, role: UserRole): boolean {
    return this.updateMember(id, { role });
  }

  /**
   * Toggle member active/inactive status
   * @param id Member identifier
   * @returns true if successful, false if member not found or last active admin
   */
  toggleMemberStatus(id: string): boolean {
    const members = this.membersSignal();
    const member = members.find(m => m.id === id);
    if (!member) return false;

    const isActivatingAdmin = member.status === 'inactive' && member.role === 'admin';
    if (!isActivatingAdmin) {
      return this.updateMember(id, { status: member.status === 'active' ? 'inactive' : 'active' });
    }

    return this.updateMember(id, { status: 'active' });
  }

  /**
   * Check if user has specific permission
   * @param userRole User role to check
   * @param permission Permission to verify
   * @returns true if user role has this permission
   */
  hasPermission(userRole: UserRole, permission: Permission): boolean {
    const roles = this.rolesSignal();
    const role = roles[userRole];
    return role ? role.permissions.includes(permission) : false;
  }

  /**
   * Check if user has any of multiple permissions
   * @param userRole User role to check
   * @param permissions Array of permissions
   * @returns true if user has at least one of the permissions
   */
  hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(userRole, p));
  }

  /**
   * Check if user has all of multiple permissions
   * @param userRole User role to check
   * @param permissions Array of permissions
   * @returns true if user has all permissions
   */
  hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(userRole, p));
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

  /**
   * Get user statistics
   * @returns Computed signal with member statistics by role
   */
  getMemberStats() {
    return computed(() => {
      const members = this.membersSignal();
      return {
        total: members.length,
        active: members.filter(m => m.status === 'active').length,
        admins: members.filter(m => m.role === 'admin').length,
        stockManagers: members.filter(m => m.role === 'gestionnaire_de_stock').length,
        operators: members.filter(m => m.role === 'operateur').length
      };
    });
  }

  /**
   * Get role label
   * @param role User role
   * @returns Human-readable role label
   */
  getRoleLabel(role: UserRole): string {
    return ROLES[role]?.label || role;
  }

  /**
   * Get role color
   * @param role User role
   * @returns Hex color code for role
   */
  getRoleColor(role: UserRole): string {
    return ROLES[role]?.color || '#757575';
  }

  /**
   * Get role icon
   * @param role User role
   * @returns Material icon name
   */
  getRoleIcon(role: UserRole): string {
    return ROLES[role]?.icon || 'person';
  }

  private generateId(): string {
    return 'user_' + Math.random().toString(36).substring(2, 11);
  }

  private getMockMembers(): User[] {
    return [
      { id: 'user_001', email: 'admin@inventaire.ma', nom: 'Admin', prenom: 'Ahmed', role: 'admin', status: 'active', lastLogin: new Date() },
      { id: 'user_002', email: 'stock@inventaire.ma', nom: 'Zahra', prenom: 'Fatima', role: 'gestionnaire_de_stock', status: 'active', lastLogin: new Date() },
      { id: 'user_003', email: 'operator@inventaire.ma', nom: 'Salah', prenom: 'Mohammed', role: 'operateur', status: 'active', lastLogin: new Date() },
      { id: 'user_004', email: 'stock2@inventaire.ma', nom: 'Amrani', prenom: 'Youssef', role: 'gestionnaire_de_stock', status: 'active', lastLogin: new Date() },
      { id: 'user_005', email: 'operator2@inventaire.ma', nom: 'Khaldi', prenom: 'Leila', role: 'operateur', status: 'inactive', lastLogin: new Date() }
    ];
  }
}
