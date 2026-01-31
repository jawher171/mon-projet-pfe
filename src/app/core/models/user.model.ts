/**
 * User Model
 * Represents application users with authentication and role information.
 * Supports different user roles: admin, manager, and regular users.
 */

/** User interface - application user profile */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'user';
  avatar?: string;
  department?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  lastLogin?: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}
