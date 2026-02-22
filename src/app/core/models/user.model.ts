/**
 * Utilisateur - Diagram: nom, prenom, email, motDePasse, status
 */
import type { UserRole } from './role.model';
import type { Permission } from './role.model';

export interface User {
  id: string | number;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  lastLogin?: Date;
  /** Permissions from API (when using backend auth) */
  permissions?: string[];
}
