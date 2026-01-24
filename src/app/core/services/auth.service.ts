import { Injectable, signal } from '@angular/core';
import { User, AuthResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';
  
  currentUser = signal<User | null>(this.loadUser());
  isAuthenticated = signal<boolean>(this.hasToken());

  constructor() {}

  private loadUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

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
    
    this.currentUser.set(mockUser);
    this.isAuthenticated.set(true);
    
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
