import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_BASE_URL } from '../../app.config';

function isBackendApiRequest(url: string): boolean {
  if (url.startsWith(API_BASE_URL)) return true;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      return parsed.pathname === API_BASE_URL || parsed.pathname.startsWith(`${API_BASE_URL}/`);
    } catch {
      return false;
    }
  }

  return false;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();
  let request = req;
  if (token && isBackendApiRequest(req.url)) {
    request = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(request).pipe(
    tap({
      error: (err) => {
        if (err.status === 401) {
          auth.logout();
          router.navigate(['/auth/login']);
        }
      }
    })
  );
};
