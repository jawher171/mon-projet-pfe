/**
 * Service de gestion des Rôles.
 * Il sert de pont entre le Front-end Angular et le Backend (API C#).
 * Utilise les "Signals" Angular pour une réactivité optimale et synchronisée.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../app.config';
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
  
  // Signals : variables réactives contenant l'état centralisé (rôles, permissions, état de chargement)
  private readonly rolesSignal = signal<Record<string, RoleWithLabel>>({});
  private readonly permissionCatalogSignal = signal<PermissionCatalogItem[]>([]);
  private readonly loadingSignal = signal(false);

  // Versions en lecture seule exposées aux composants
  roles = this.rolesSignal.asReadonly();
  permissionCatalog = this.permissionCatalogSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();

  /** 
   * Récupère la liste de tous les rôles depuis le backend. 
   */
  async fetchRoles(): Promise<void> {
    this.loadingSignal.set(true); // Active le spinner
    try {
      const dtos = await firstValueFrom(this.http.get<RoleDto[]>(`${API_BASE_URL}/api/Roles`));
      
      const merged: Record<string, RoleWithLabel> = {};
      for (const dto of dtos ?? []) {
        const key = dto.nom?.toLowerCase() || '';
        if (!key) continue;
        
        // On récupère les couleurs/icones si c'est un rôle connu du front, sinon design par défaut
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

      this.rolesSignal.set(merged); // Sauvegarde globale
    } catch (err) {
      console.error('[RolesService] fetchRoles FAILED:', err);
      this.rolesSignal.set({});
    } finally {
      this.loadingSignal.set(false); // Coupe le spinner
    }
  }

  /** 
   * Récupère le catalogue officiel de toutes les permissions possibles. 
   */
  async fetchPermissionCatalog(): Promise<void> {
    try {
      const items = await firstValueFrom(
        this.http.get<PermissionCatalogItem[]>(`${API_BASE_URL}/api/Roles/permissions`)
      );

      // On nettoie et on trie alphabétiquement par code
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
    }
  }

  /** 
   * Active ou désactive des permissions pour un rôle.
   */
  async updateRolePermissions(roleName: string, permissions: Permission[]): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.http.put<RoleDto>(`${API_BASE_URL}/api/Roles/${encodeURIComponent(roleName)}/permissions`, {
        permissions
      }));
      
      const backendPermissions = (response?.permissions ?? permissions) as Permission[];
      
      // On met à jour le Signal manuellement pour que l'interface UI réagisse instantanément
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

  /** 
   * Demande au backend de créer un nouveau rôle. 
   */
  async createRole(nom: string, description?: string): Promise<{ success: boolean; message?: string }> {
    const key = nom.trim().toLowerCase().replace(/\s+/g, '_');

    // Sécurité Frontend: On empêche un double appel si on a déjà le rôle (Check d'unicité)
    const existing = this.rolesSignal();
    if (existing[key]) {
      return { success: false, message: `Le rôle "${nom.trim()}" existe déjà.` };
    }

    try {
      const dto = await firstValueFrom(this.http.post<RoleDto>(`${API_BASE_URL}/api/Roles`, { nom: nom.trim(), description }));
      const respKey = dto.nom?.toLowerCase() || key;
      
      // Ajout dans le Signal local pour affichage UI direct
      this.rolesSignal.update(r => ({
        ...r,
        [respKey]: {
          idRole: Date.now(),
          nom: dto.nom,
          label: dto.nom, // Le label par défaut est le nom saisi
          description: dto.description,
          permissions: (dto.permissions ?? []) as Permission[],
          color: '#9e9e9e', // Gris générique pour les rôles custom
          icon: 'badge'
        }
      }));
      return { success: true };
    } catch (err: any) {
      const msg = err?.error?.message ?? err?.error ?? 'Erreur lors de la création du rôle.';
      return { success: false, message: typeof msg === 'string' ? msg : 'Erreur lors de la création du rôle.' };
    }
  }

  /** 
   * Renommer ou modifier un rôle existant (Nom et Description). 
   */
  async updateRole(currentNom: string, newNom: string, description?: string): Promise<{ success: boolean; message?: string }> {
    const currentKey = currentNom.trim().toLowerCase();
    const newKey = newNom.trim().toLowerCase().replace(/\s+/g, '_');

    // Sécurité Frontend: Unicité lors du renommage
    if (currentKey !== newKey) {
      const existing = this.rolesSignal();
      if (existing[newKey]) {
        return { success: false, message: `Le rôle "${newNom.trim()}" existe déjà.` };
      }
    }

    try {
      const dto = await firstValueFrom(
        this.http.put<RoleDto>(`${API_BASE_URL}/api/Roles/${encodeURIComponent(currentKey)}`, {
          nom: newNom.trim(),
          description: description ?? ''
        })
      );

      const respKey = dto.nom?.toLowerCase() || newKey;

      // Logique pour remplacer l'ancienne clé (nom du rôle) par la nouvelle dans le Signal AngularJS
      this.rolesSignal.update(r => {
        const updated = { ...r };
        const old = updated[currentKey];
        if (currentKey !== respKey) {
          delete updated[currentKey]; // C'est un renommage, on supprime l'ancien
        }
        updated[respKey] = {
          idRole: old?.idRole ?? Date.now(),
          nom: dto.nom,
          label: dto.nom,
          description: dto.description,
          permissions: (dto.permissions ?? old?.permissions ?? []) as Permission[],
          color: old?.color ?? '#9e9e9e',
          icon: old?.icon ?? 'badge'
        };
        return updated;
      });
      return { success: true };
    } catch (err: any) {
       // On récupère précisément le message d'erreur (ex: conflit 409) retourné par C#
      const msg = err?.error?.message ?? err?.error ?? 'Erreur lors de la modification du rôle.';
      return { success: false, message: typeof msg === 'string' ? msg : 'Erreur lors de la modification du rôle.' };
    }
  }

  /** 
   * Supprimer définitivement un rôle. 
   */
  async deleteRole(roleName: string): Promise<{ success: boolean; message?: string }> {
    const key = roleName.trim().toLowerCase();
    try {
      await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/Roles/${encodeURIComponent(key)}`));
      
      // Suppression du Signal frontend
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
