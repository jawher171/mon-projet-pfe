import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_BASE_URL, USE_BACKEND } from '../../app.config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!USE_BACKEND) return next(req);
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();
  let request = req;
  if (token && req.url.startsWith(API_BASE_URL)) {
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
