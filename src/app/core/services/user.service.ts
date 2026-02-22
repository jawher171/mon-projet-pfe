/**
 * User Service - User management (admin).
 * Uses backend API when USE_BACKEND=true, otherwise mock data.
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.model';
import { UserRole } from '../models/role.model';
import { API_BASE_URL, USE_BACKEND } from '../../app.config';
import { ROLES } from '../models/role.model';
import { AuthorizationService } from './auth-authorization.service';
import { AuthService } from './auth.service';

interface UserDto {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  status: string;
  lastLogin?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly authorizationService = inject(AuthorizationService);
  private readonly authService = inject(AuthService);
  private readonly usersSignal = signal<User[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  users = this.usersSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();
  error = this.errorSignal.asReadonly();

  stats = computed(() => {
    const u = this.usersSignal();
    return {
      total: u.length,
      active: u.filter(m => m.status === 'active').length,
      admins: u.filter(m => m.role === 'admin').length,
      stockManagers: u.filter(m => m.role === 'gestionnaire_de_stock').length,
      operators: u.filter(m => m.role === 'operateur').length
    };
  });

  private dtoToUser(d: UserDto): User {
    return {
      id: d.id,
      nom: d.nom,
      prenom: d.prenom,
      email: d.email,
      role: d.role as UserRole,
      status: d.status as 'active' | 'inactive',
      lastLogin: d.lastLogin ? new Date(d.lastLogin) : undefined
    };
  }

  async fetchUsers(): Promise<User[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    if (!USE_BACKEND) {
      const members = this.authorizationService.getMembers()();
      this.usersSignal.set([...members]);
      this.loadingSignal.set(false);
      return members;
    }
    try {
      const dtos = await this.http.get<UserDto[]>(`${API_BASE_URL}/api/Users`).toPromise();
      const list = (dtos ?? []).map(d => this.dtoToUser(d));
      this.usersSignal.set(list);
      return list;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load users';
      this.errorSignal.set(msg);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createUser(data: {
    nom: string;
    prenom: string;
    email: string;
    password: string;
    role: UserRole;
    status?: 'active' | 'inactive';
  }): Promise<User | null> {
    this.errorSignal.set(null);
    if (!USE_BACKEND) {
      const user = this.authorizationService.addMember({
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        role: data.role,
        status: data.status ?? 'active'
      });
      this.usersSignal.update(u => [...u, user]);
      return user;
    }
    try {
      const d = await this.http.post<UserDto>(`${API_BASE_URL}/api/Users`, {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        password: data.password,
        role: data.role,
        status: data.status ?? 'active'
      }).toPromise();
      if (!d) return null;
      const user = this.dtoToUser(d);
      this.usersSignal.update(u => [...u, user]);
      return user;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create user';
      this.errorSignal.set(msg);
      throw new Error(msg);
    }
  }

  /** Update current user's profile (any authenticated user). */
  async updateProfile(updates: Partial<{
    nom: string;
    prenom: string;
    email: string;
    password: string;
  }>): Promise<User | null> {
    this.errorSignal.set(null);
    if (!USE_BACKEND) {
      const current = this.authService.currentUser();
      if (!current) return null;
      const updated: User = {
        ...current,
        nom: updates.nom ?? current.nom,
        prenom: updates.prenom ?? current.prenom,
        email: updates.email ?? current.email
      };
      this.authService.updateCurrentUser(updated);
      this.usersSignal.update(u => u.map(m => m.id === current.id || String(m.id) === current.id ? updated : m));
      return updated;
    }
    try {
      const d = await this.http.put<UserDto>(`${API_BASE_URL}/api/Profile`, updates).toPromise();
      if (!d) return null;
      const user = this.dtoToUser(d);
      this.usersSignal.update(u => u.map(m => m.id === user.id || String(m.id) === user.id ? user : m));
      return user;
    } catch (e: unknown) {
      const msg = this.getErrorMessage(e);
      this.errorSignal.set(msg);
      throw new Error(msg);
    }
  }

  /** Extract API error message from HTTP error */
  private getErrorMessage(e: unknown): string {
    if (e && typeof e === 'object' && 'error' in e) {
      const err = (e as { error?: { message?: string } }).error;
      if (err && typeof err === 'object' && err.message) return String(err.message);
    }
    if (e instanceof Error) return e.message;
    return 'Une erreur est survenue.';
  }

  async updateUser(id: string, updates: Partial<{
    nom: string;
    prenom: string;
    email: string;
    password: string;
    role: UserRole;
    status: 'active' | 'inactive';
  }>): Promise<User | null> {
    this.errorSignal.set(null);
    if (!USE_BACKEND) {
      const ok = this.authorizationService.updateMember(id, updates);
      if (!ok) return null;
      const members = this.authorizationService.getMembers()();
      const user = members.find(m => String(m.id) === id);
      this.usersSignal.set([...members]);
      return user ?? null;
    }
    try {
      const d = await this.http.put<UserDto>(`${API_BASE_URL}/api/Users/${id}`, updates).toPromise();
      if (!d) return null;
      const user = this.dtoToUser(d);
      this.usersSignal.update(u => u.map(m => m.id === id || String(m.id) === id ? user : m));
      return user;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update user';
      this.errorSignal.set(msg);
      throw new Error(msg);
    }
  }

  async changeRole(id: string, role: UserRole): Promise<User | null> {
    this.errorSignal.set(null);
    if (!USE_BACKEND) {
      const ok = this.authorizationService.changeRole(id, role);
      if (!ok) return null;
      const members = this.authorizationService.getMembers()();
      const user = members.find(m => String(m.id) === id);
      this.usersSignal.set([...members]);
      return user ?? null;
    }
    try {
      const d = await this.http.put<UserDto>(`${API_BASE_URL}/api/Users/${id}/role`, { role }).toPromise();
      if (!d) return null;
      const user = this.dtoToUser(d);
      this.usersSignal.update(u => u.map(m => m.id === id || String(m.id) === id ? user : m));
      return user;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to change role';
      this.errorSignal.set(msg);
      throw new Error(msg);
    }
  }

  async toggleStatus(id: string, currentStatus: 'active' | 'inactive'): Promise<User | null> {
    this.errorSignal.set(null);
    if (!USE_BACKEND) {
      const ok = this.authorizationService.toggleMemberStatus(id);
      if (!ok) return null;
      const members = this.authorizationService.getMembers()();
      const user = members.find(m => String(m.id) === id);
      this.usersSignal.set([...members]);
      return user ?? null;
    }
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    return this.updateUser(id, { status: newStatus });
  }

  async deleteUser(id: string): Promise<boolean> {
    this.errorSignal.set(null);
    if (!USE_BACKEND) {
      const ok = this.authorizationService.deleteMember(id);
      if (ok) this.usersSignal.update(u => u.filter(m => m.id !== id && String(m.id) !== id));
      return ok;
    }
    try {
      await this.http.delete(`${API_BASE_URL}/api/Users/${id}`).toPromise();
      this.usersSignal.update(u => u.filter(m => m.id !== id && String(m.id) !== id));
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete user';
      this.errorSignal.set(msg);
      throw new Error(msg);
    }
  }

  getRoleLabel(role: UserRole): string {
    return ROLES[role]?.label ?? role;
  }

  getRoleColor(role: UserRole): string {
    return ROLES[role]?.color ?? '#757575';
  }

  getRoleIcon(role: UserRole): string {
    return ROLES[role]?.icon ?? 'person';
  }
}
