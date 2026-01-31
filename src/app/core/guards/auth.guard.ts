/**
 * Authorization Route Guards
 * Protects routes based on user roles and permissions
 */

import { Injectable } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole, Permission } from '../models/role.model';
import { AuthorizationService } from '../services/auth-authorization.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(
    private authService: AuthService,
    private authorizationService: AuthorizationService,
    private router: Router
  ) {}

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: UserRole): boolean {
    const currentUser = this.authService.currentUser();
    return currentUser?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: UserRole[]): boolean {
    const currentUser = this.authService.currentUser();
    return currentUser ? roles.includes(currentUser.role) : false;
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: Permission): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;
    return this.authorizationService.hasPermission(currentUser.role, permission);
  }
}

/**
 * Guard to check if user is authenticated
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = new AuthService();
  const router = new Router();
  
  if (authService.isAuthenticated()) {
    return true;
  }
  
  router.navigate(['/auth/login']);
  return false;
};

/**
 * Guard to check if user is admin
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = new AuthService();
  const router = new Router();
  
  if (authService.isAuthenticated() && authService.isAdmin()) {
    return true;
  }
  
  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login']);
  } else {
    router.navigate(['/']);
  }
  return false;
};

/**
 * Guard to check if user is stock manager or admin
 */
export const stockManagerGuard: CanActivateFn = (route, state) => {
  const authService = new AuthService();
  const router = new Router();
  const currentUser = authService.currentUser();
  
  if (authService.isAuthenticated() && currentUser && 
      (currentUser.role === 'admin' || currentUser.role === 'gestionnaire_de_stock')) {
    return true;
  }
  
  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login']);
  } else {
    router.navigate(['/']);
  }
  return false;
};

/**
 * Guard to check if user has a specific role
 */
export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return (route, state) => {
    const authService = new AuthService();
    const router = new Router();
    const currentUser = authService.currentUser();
    
    if (authService.isAuthenticated() && currentUser && allowedRoles.includes(currentUser.role)) {
      return true;
    }
    
    if (!authService.isAuthenticated()) {
      router.navigate(['/auth/login']);
    } else {
      router.navigate(['/']);
    }
    return false;
  };
};

/**
 * Guard to check if user has a specific permission
 */
export const permissionGuard = (requiredPermission: Permission): CanActivateFn => {
  return (route, state) => {
    const authService = new AuthService();
    const authorizationService = new AuthorizationService();
    const router = new Router();
    const currentUser = authService.currentUser();
    
    if (authService.isAuthenticated() && currentUser && 
        authorizationService.hasPermission(currentUser.role, requiredPermission)) {
      return true;
    }
    
    if (!authService.isAuthenticated()) {
      router.navigate(['/auth/login']);
    } else {
      router.navigate(['/']);
    }
    return false;
  };
};
