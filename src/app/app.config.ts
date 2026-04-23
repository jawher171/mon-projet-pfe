/**
 * Application Configuration
 * Defines the core providers and settings for the Angular application,
 * including routing and error handling.
 */

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

/** API base URL for the backend */
export const API_BASE_URL = '/backend';

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
    provideHttpClient(withInterceptors([authInterceptor])),
    provideCharts(withDefaultRegisterables())
  ]
};
