/**
 * Roles Service - Roles and permissions management.
 * Uses backend API when USE_BACKEND=true, otherwise local ROLES only.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, USE_BACKEND } from '../../app.config';
import { Permission, RoleWithLabel, ROLES } from '../models/role.model';

interface RoleDto {
  nom: string;
  description?: string;
  permissions: string[];
}

export interface PermissionCatalogItem {
  code: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly rolesSignal = signal<Record<string, RoleWithLabel>>(
    USE_BACKEND
      ? {}
      : (JSON.parse(JSON.stringify(ROLES)) as Record<string, RoleWithLabel>)
  );
  private readonly permissionCatalogSignal = signal<PermissionCatalogItem[]>([]);
  private readonly loadingSignal = signal(false);

  roles = this.rolesSignal.asReadonly();
  permissionCatalog = this.permissionCatalogSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();

  /** Fetch roles - from backend when USE_BACKEND, else use local */
  async fetchRoles(): Promise<void> {
    if (!USE_BACKEND) {
      this.rolesSignal.set(JSON.parse(JSON.stringify(ROLES)) as Record<string, RoleWithLabel>);
      return;
    }
    this.loadingSignal.set(true);
    try {
      const dtos = await firstValueFrom(this.http.get<RoleDto[]>(`${API_BASE_URL}/api/Roles`));
      console.log('[RolesService] GET /api/Roles response:', dtos);
      const merged: Record<string, RoleWithLabel> = {};
      for (const dto of dtos ?? []) {
        const key = dto.nom?.toLowerCase() || '';
        if (!key) continue;
        const local = ROLES[key as keyof typeof ROLES];
        merged[key] = {
          idRole: local?.idRole ?? 0,
          nom: dto.nom,
          description: dto.description,
          permissions: (dto.permissions ?? []) as Permission[],
          label: local?.label ?? dto.nom,
          color: local?.color,
          icon: local?.icon
        };
      }

      this.rolesSignal.set(merged);
    } catch (err) {
      console.error('[RolesService] fetchRoles FAILED:', err);
      // In backend mode, never fall back to static role permissions.
      this.rolesSignal.set({});
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /** Fetch permission catalog dynamically from backend (or derive from local roles in offline mode). */
  async fetchPermissionCatalog(): Promise<void> {
    if (!USE_BACKEND) {
      const derived = Array.from(
        new Set(Object.values(ROLES).flatMap(r => r.permissions))
      )
        .sort((a, b) => a.localeCompare(b))
        .map(code => ({ code, description: code }));
      this.permissionCatalogSignal.set(derived);
      return;
    }

    try {
      const items = await firstValueFrom(
        this.http.get<PermissionCatalogItem[]>(`${API_BASE_URL}/api/Roles/permissions`)
      );

      const normalized = (items ?? [])
        .filter(x => !!x?.code)
        .map(x => ({
          code: x.code.trim(),
          description: x.description?.trim() || x.code.trim()
        }))
        .sort((a, b) => a.code.localeCompare(b.code));

      this.permissionCatalogSignal.set(normalized);
    } catch (err) {
      console.error('[RolesService] fetchPermissionCatalog FAILED:', err);
      // Keep previous catalog on failure.
    }
  }

  /** Update role permissions - local when USE_BACKEND=false */
  async updateRolePermissions(roleName: string, permissions: Permission[]): Promise<boolean> {
    if (!USE_BACKEND) {
      this.rolesSignal.update(roles => {
        const updated = { ...roles };
        const key = roleName.toLowerCase();
        if (updated[key]) {
          updated[key] = { ...updated[key], permissions: [...permissions] };
        }
        return updated;
      });
      return true;
    }
    try {
      console.log('[RolesService] PUT /api/Roles/' + roleName + '/permissions', permissions);
      const response = await firstValueFrom(this.http.put<RoleDto>(`${API_BASE_URL}/api/Roles/${encodeURIComponent(roleName)}/permissions`, {
        permissions
      }));
      console.log('[RolesService] PUT response:', response);
      // Use the response from the backend to ensure we're in sync
      const backendPermissions = (response?.permissions ?? permissions) as Permission[];
      this.rolesSignal.update(roles => {
        const updated = { ...roles };
        const key = roleName.toLowerCase();
        if (updated[key]) {
          updated[key] = { ...updated[key], permissions: [...backendPermissions] };
        }
        return updated;
      });
      return true;
    } catch (err) {
      console.error('[RolesService] updateRolePermissions FAILED:', err);
      return false;
    }
  }

  /** Create a new role via backend API */
  async createRole(nom: string, description?: string): Promise<{ success: boolean; message?: string }> {
    if (!USE_BACKEND) {
      const key = nom.trim().toLowerCase();
      const roles = this.rolesSignal();
      if (roles[key]) return { success: false, message: 'Ce rôle existe déjà.' };
      this.rolesSignal.update(r => ({
        ...r,
        [key]: {
          idRole: Date.now(),
          nom: key,
          label: nom.trim(),
          description: description ?? '',
          permissions: [] as Permission[],
          color: '#9e9e9e',
          icon: 'badge'
        }
      }));
      return { success: true };
    }
    try {
      const dto = await firstValueFrom(this.http.post<RoleDto>(`${API_BASE_URL}/api/Roles`, { nom: nom.trim(), description }));
      const key = dto.nom?.toLowerCase() || nom.trim().toLowerCase();
      this.rolesSignal.update(r => ({
        ...r,
        [key]: {
          idRole: Date.now(),
          nom: dto.nom,
          label: dto.nom,
          description: dto.description,
          permissions: (dto.permissions ?? []) as Permission[],
          color: '#9e9e9e',
          icon: 'badge'
        }
      }));
      return { success: true };
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Erreur lors de la création du rôle.';
      return { success: false, message: msg };
    }
  }

  /** Delete a role via backend API */
  async deleteRole(roleName: string): Promise<{ success: boolean; message?: string }> {
    const key = roleName.trim().toLowerCase();
    if (!USE_BACKEND) {
      this.rolesSignal.update(r => {
        const updated = { ...r };
        delete updated[key];
        return updated;
      });
      return { success: true };
    }
    try {
      await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/Roles/${encodeURIComponent(key)}`));
      this.rolesSignal.update(r => {
        const updated = { ...r };
        delete updated[key];
        return updated;
      });
      return { success: true };
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Erreur lors de la suppression du rôle.';
      return { success: false, message: msg };
    }
  }
}
