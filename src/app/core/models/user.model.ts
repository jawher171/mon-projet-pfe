/**
 * User Model
 * Represents application users with authentication and role information.
 * Supports different user roles: admin, gestionnaire_de_stock, and operateur.
 */

import { UserRole } from './role.model';

/** User interface - application user profile */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  lastLogin?: Date;
}
