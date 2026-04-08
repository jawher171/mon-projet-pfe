/**
 * Authorization Route Guards
 * Protects routes based on user roles and permissions
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole, Permission } from '../models/role.model';

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
    router.navigate([authService.getDefaultAuthorizedRoute()]);
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
    router.navigate([authService.getDefaultAuthorizedRoute()]);
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
      router.navigate([authService.getDefaultAuthorizedRoute()]);
    }
    return false;
  };
};

/**
 * Guard to check if user has a specific permission.
 * In backend mode, permission checks come from dynamic API role permissions.
 */
export const permissionGuard = (requiredPermission: Permission): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const currentUser = authService.currentUser();

    if (authService.isAuthenticated() && currentUser &&
        authService.hasPermission(requiredPermission)) {
      return true;
    }

    if (!authService.isAuthenticated()) {
      router.navigate(['/auth/login']);
    } else {
      router.navigate([authService.getDefaultAuthorizedRoute()]);
    }
    return false;
  };
};

/**
 * Guard for scanner standalone routes:
 * - allow unauthenticated access only for phone relay sessions (sessionId + purpose)
 * - otherwise require authenticated user with scan_barcode permission
 */
export const scannerAccessGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const sessionId = route.queryParamMap.get('sessionId')?.trim() ?? '';
  const purpose = route.queryParamMap.get('purpose')?.trim() ?? '';
  if (sessionId && purpose) {
    return true;
  }

  if (authService.isAuthenticated() && authService.hasPermission('scan_barcode')) {
    return true;
  }

  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login']);
  } else {
    router.navigate([authService.getDefaultAuthorizedRoute()]);
  }

  return false;
};
