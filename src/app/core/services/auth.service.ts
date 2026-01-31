/**
 * Authentication Service
 * Manages user authentication, login/logout operations, and current user state.
 * Stores authentication tokens and user information in localStorage.
 */

import { Injectable, signal } from '@angular/core';
import { User, AuthResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Storage keys for authentication data
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';
  
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
  /**
   * Check if authentication token exists
   * @returns true if token is present in storage
   */
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Authenticate user with email and password
   * Creates mock user and token for demonstration
   * @param email User email address
   * @param password User password
   * @returns Promise resolving to true on successful login
   */
  private hasToken(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  async login(email: string, password: string): Promise<boolean> {
    // Simulate API call
    const mockUser: User = {
      id: '1',
      email: email,
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin',
      status: 'active',
      createdAt: new Date(),
      lastLogin: new Date()
    };

    const mockToken = 'mock-jwt-token-' + Date.now();
    
    localStorage.setItem(this.TOKEN_KEY, mockToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(mockUser));
  /**
   * Log out current user
   * Removes authentication data and clears current user state
   */
    
    this.currentUser.set(mockUser);
    this.isAuthenticated.set(true);
  /**
   * Get the stored authentication token
   * @returns JWT token or null if not authenticated
   */
    
    return true;
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
}
