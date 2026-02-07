/**
 * Authentication Service
 * Manages user authentication, login/logout operations, and current user state.
 * Stores authentication tokens and user information in localStorage.
 * Supports role-based access with admin, gestionnaire_de_stock, and operateur roles.
 */

import { Injectable, inject, signal } from '@angular/core';
import { User } from '../models/user.model';
import { UserRole, Permission } from '../models/role.model';
import { getMockUserByRole, getMockAccount } from '../models/mock-accounts';
import { AuthorizationService } from './auth-authorization.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Storage keys for authentication data
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';

  private authorizationService = inject(AuthorizationService);

  // Signal-based reactive state
  /** Currently authenticated user (null if not logged in) */
  currentUser = signal<User | null>(this.loadUser());
  
  /** Authentication status indicator */
  isAuthenticated = signal<boolean>(this.hasToken());

  constructor() {}

  /**
   * Load user from localStorage
   * @returns User object or null if not stored
   */
  private loadUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Check if authentication token exists
   * @returns true if token is present in storage
   */
  private hasToken(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Authenticate user with email and password
   * Validates against predefined mock accounts
   * @param email User email address
   * @param password User password
   * @returns Promise resolving to true on successful login
   */
  async login(email: string, password: string): Promise<boolean> {
    // Check if credentials match any mock account
    const mockAccount = getMockAccount(email);
    
    if (!mockAccount || mockAccount.password !== password) {
      return false; // Invalid credentials
    }

    // Get user data for the role
    const userData = getMockUserByRole(mockAccount.role);

    const mockUser: User = {
      id: 'user_' + Math.random().toString(36).substring(2, 9),
      email: email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: mockAccount.role,
      avatar: userData.avatar,
      department: userData.department,
      phone: userData.phone,
      status: 'active',
      createdAt: new Date(),
      lastLogin: new Date()
    };

    const mockToken = 'mock-jwt-token-' + Date.now() + '-' + mockAccount.role;
    
    localStorage.setItem(this.TOKEN_KEY, mockToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(mockUser));
    
    this.currentUser.set(mockUser);
    this.isAuthenticated.set(true);
    
    return true;
  }

  /**
   * Log out current user
   * Removes authentication data and clears current user state
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }

  /**
   * Get the stored authentication token
   * @returns JWT token or null if not authenticated
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Check if current user has a specific role
   * @param role Role to check
   * @returns true if current user has this role
   */
  hasRole(role: UserRole): boolean {
    return this.currentUser()?.role === role;
  }

  /**
   * Check if current user is an admin
   * @returns true if current user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Check if current user is a stock manager
   * @returns true if current user is gestionnaire_de_stock
   */
  isStockManager(): boolean {
    return this.hasRole('gestionnaire_de_stock');
  }

  /**
   * Check if current user is an operator
   * @returns true if current user is operateur
   */
  isOperator(): boolean {
    return this.hasRole('operateur');
  }

  /**
   * Check if current user has a specific permission
   * @param permission Permission to check
   * @returns true if user has the permission
   */
  hasPermission(permission: Permission): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return this.authorizationService.hasPermission(user.role, permission);
  }
}
