/**
 * Roles Service - Roles and permissions management.
 * Uses backend API when USE_BACKEND=true, otherwise local ROLES only.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL, USE_BACKEND } from '../../app.config';
import { Permission, RoleWithLabel, ROLES } from '../models/role.model';

interface RoleDto {
  nom: string;
  description?: string;
  permissions: string[];
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly rolesSignal = signal<Record<string, RoleWithLabel>>(JSON.parse(JSON.stringify(ROLES)) as Record<string, RoleWithLabel>);
  private readonly loadingSignal = signal(false);

  roles = this.rolesSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();

  /** Fetch roles - from backend when USE_BACKEND, else use local */
  async fetchRoles(): Promise<void> {
    if (!USE_BACKEND) {
      this.rolesSignal.set(JSON.parse(JSON.stringify(ROLES)) as Record<string, RoleWithLabel>);
      return;
    }
    this.loadingSignal.set(true);
    try {
      const dtos = await this.http.get<RoleDto[]>(`${API_BASE_URL}/api/Roles`).toPromise();
      if (dtos?.length) {
        const merged: Record<string, RoleWithLabel> = {};
        for (const dto of dtos) {
          const key = dto.nom?.toLowerCase() || '';
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
      }
    } catch {
      // Keep local defaults on error
    } finally {
      this.loadingSignal.set(false);
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
      await this.http.put(`${API_BASE_URL}/api/Roles/${encodeURIComponent(roleName)}/permissions`, {
        permissions
      }).toPromise();
      this.rolesSignal.update(roles => {
        const updated = { ...roles };
        const key = roleName.toLowerCase();
        if (updated[key]) {
          updated[key] = { ...updated[key], permissions: [...permissions] };
        }
        return updated;
      });
      return true;
    } catch {
      return false;
    }
  }
}
