/**
 * Authorization Route Guards
 * Protects routes based on user roles and permissions
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole, Permission } from '../models/role.model';
import { AuthorizationService } from '../services/auth-authorization.service';

/**
 * Guard to check if user is authenticated
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};

/**
 * Guard to check if user is admin
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

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
export const stockManagerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
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
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
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
 * Guard to check if user has a specific permission (uses API permissions or static mapping)
 */
export const permissionGuard = (requiredPermission: Permission): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const authorizationService = inject(AuthorizationService);
    const router = inject(Router);
    const currentUser = authService.currentUser();

    if (authService.isAuthenticated() && currentUser &&
        authService.hasPermission(requiredPermission)) {
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
