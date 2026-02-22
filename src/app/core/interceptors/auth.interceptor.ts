import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { API_BASE_URL, USE_BACKEND } from '../../app.config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!USE_BACKEND) return next(req); // No API calls when backend disabled
  const auth = inject(AuthService);
  const token = auth.getToken();
  if (token && req.url.startsWith(API_BASE_URL)) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(cloned);
  }
  return next(req);
};
