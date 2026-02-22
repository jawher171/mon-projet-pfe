import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.model';
import { UserRole, Permission } from '../models/role.model';
import { AuthorizationService } from './auth-authorization.service';
import { API_BASE_URL, USE_BACKEND } from '../../app.config';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    role: string;
    status: string;
    lastLogin?: string;
    permissions?: string[];
  };
}

const MOCK_ACCOUNTS: { email: string; password: string; user: User }[] = [
  { email: 'admin@inventaire.ma', password: 'admin123', user: { id: 'user_001', email: 'admin@inventaire.ma', nom: 'Admin', prenom: 'Ahmed', role: 'admin', status: 'active', lastLogin: new Date() } },
  { email: 'stock@inventaire.ma', password: 'stock123', user: { id: 'user_002', email: 'stock@inventaire.ma', nom: 'Zahra', prenom: 'Fatima', role: 'gestionnaire_de_stock', status: 'active', lastLogin: new Date() } },
  { email: 'operator@inventaire.ma', password: 'operator123', user: { id: 'user_003', email: 'operator@inventaire.ma', nom: 'Salah', prenom: 'Mohammed', role: 'operateur', status: 'active', lastLogin: new Date() } },
  { email: 'stock2@inventaire.ma', password: 'stock123', user: { id: 'user_004', email: 'stock2@inventaire.ma', nom: 'Amrani', prenom: 'Youssef', role: 'gestionnaire_de_stock', status: 'active', lastLogin: new Date() } },
  { email: 'operator2@inventaire.ma', password: 'operator123', user: { id: 'user_005', email: 'operator2@inventaire.ma', nom: 'Khaldi', prenom: 'Leila', role: 'operateur', status: 'inactive', lastLogin: new Date() } }
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';
  private readonly http = inject(HttpClient);
  private authorizationService = inject(AuthorizationService);

  currentUser = signal<User | null>(this.loadUser());
  isAuthenticated = signal<boolean>(this.hasToken());

  private loadUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  async login(email: string, password: string): Promise<boolean> {
    if (!USE_BACKEND) {
      return this.mockLogin(email, password);
    }
    try {
      const res = await this.http.post<LoginResponse>(`${API_BASE_URL}/api/Authentification/login`, {
        email,
        password
      }).toPromise();

      if (!res?.token || !res?.user) return false;

      const user: User = {
        id: res.user.id,
        nom: res.user.nom,
        prenom: res.user.prenom,
        email: res.user.email,
        role: res.user.role as UserRole,
        status: res.user.status as 'active' | 'inactive',
        lastLogin: res.user.lastLogin ? new Date(res.user.lastLogin) : undefined,
        permissions: res.user.permissions
      };

      localStorage.setItem(this.TOKEN_KEY, res.token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      this.currentUser.set(user);
      this.isAuthenticated.set(true);
      return true;
    } catch {
      return false;
    }
  }

  private mockLogin(email: string, password: string): boolean {
    const emailNorm = (email ?? '').trim().toLowerCase();
    const passwordNorm = (password ?? '').trim();
    const account = MOCK_ACCOUNTS.find(a => a.email.toLowerCase() === emailNorm);
    if (!account || account.user.status !== 'active') return false;
    if (passwordNorm !== account.password) return false;

    const userWithLogin: User = { ...account.user, lastLogin: new Date() };
    localStorage.setItem(this.TOKEN_KEY, 'mock_token_' + Date.now());
    localStorage.setItem(this.USER_KEY, JSON.stringify(userWithLogin));
    this.currentUser.set(userWithLogin);
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

  hasRole(role: UserRole): boolean {
    return this.currentUser()?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  isStockManager(): boolean {
    return this.hasRole('gestionnaire_de_stock');
  }

  isOperator(): boolean {
    return this.hasRole('operateur');
  }

  hasPermission(permission: Permission): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (user.permissions?.includes(permission)) return true;
    return this.authorizationService.hasPermission(user.role, permission);
  }

  /** Update stored current user (e.g. after profile edit) */
  updateCurrentUser(updated: Partial<User>): void {
    const user = this.currentUser();
    if (!user) return;
    const merged: User = { ...user, ...updated };
    localStorage.setItem(this.USER_KEY, JSON.stringify(merged));
    this.currentUser.set(merged);
  }
}
