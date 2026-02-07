/**
 * Authorization Service
 * Manages role-based access control, permissions, and user management.
 * Allows admins to create members, assign roles, and manage permissions.
 */

import { Injectable, signal, computed } from '@angular/core';
import { User } from '../models/user.model';
import { UserRole, Permission, ROLES, Role } from '../models/role.model';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {
  /** Reactive roles signal - source of truth for permissions */
  rolesSignal = signal<Record<string, Role>>(
    JSON.parse(JSON.stringify(ROLES))
  );

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
  addMember(member: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): User {
    const newMember: User = {
      ...member,
      id: this.generateId(),
      createdAt: new Date()
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
   * Update permissions for a role
   * @param roleName Role to update
   * @param permissions New permissions array
   */
  updateRolePermissions(roleName: UserRole, permissions: Permission[]): void {
    this.rolesSignal.update(roles => {
      const updated = { ...roles };
      if (updated[roleName]) {
        updated[roleName] = { ...updated[roleName], permissions: [...permissions] };
      }
      return updated;
    });
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
      {
        id: 'user_001',
        email: 'admin@inventaire.ma',
        firstName: 'Ahmed',
        lastName: 'Admin',
        role: 'admin',
        avatar: 'https://i.pravatar.cc/150?img=1',
        department: 'Management',
        phone: '+212 661 123 456',
        status: 'active',
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date()
      },
      {
        id: 'user_002',
        email: 'stock@inventaire.ma',
        firstName: 'Fatima',
        lastName: 'Zahra',
        role: 'gestionnaire_de_stock',
        avatar: 'https://i.pravatar.cc/150?img=2',
        department: 'Warehouse',
        phone: '+212 661 234 567',
        status: 'active',
        createdAt: new Date('2024-02-01'),
        lastLogin: new Date('2026-01-30')
      },
      {
        id: 'user_003',
        email: 'operator@inventaire.ma',
        firstName: 'Mohammed',
        lastName: 'Salah',
        role: 'operateur',
        avatar: 'https://i.pravatar.cc/150?img=3',
        department: 'Warehouse',
        phone: '+212 661 345 678',
        status: 'active',
        createdAt: new Date('2024-03-01'),
        lastLogin: new Date('2026-01-29')
      },
      {
        id: 'user_004',
        email: 'stock2@inventaire.ma',
        firstName: 'Youssef',
        lastName: 'Amrani',
        role: 'gestionnaire_de_stock',
        avatar: 'https://i.pravatar.cc/150?img=4',
        department: 'Warehouse',
        phone: '+212 661 456 789',
        status: 'active',
        createdAt: new Date('2024-04-01'),
        lastLogin: new Date('2026-01-28')
      },
      {
        id: 'user_005',
        email: 'operator2@inventaire.ma',
        firstName: 'Leila',
        lastName: 'Khaldi',
        role: 'operateur',
        avatar: 'https://i.pravatar.cc/150?img=5',
        department: 'Warehouse',
        phone: '+212 661 567 890',
        status: 'inactive',
        createdAt: new Date('2024-05-01')
      }
    ];
  }
}
