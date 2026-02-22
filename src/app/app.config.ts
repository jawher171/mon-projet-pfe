/**
 * Application Configuration
 * Defines the core providers and settings for the Angular application,
 * including routing and error handling.
 */

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

/** API base URL - set when backend is ready */
export const API_BASE_URL = 'http://localhost:5000';

/** When false, app uses mock data and works without backend */
export const USE_BACKEND = false;

/** 
 * Application configuration object that contains all providers.
 * - provideBrowserGlobalErrorListeners: Captures and logs uncaught errors
 * - provideRouter: Configures the application routing system
 * - provideHttpClient: Enables HTTP requests to the API
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
