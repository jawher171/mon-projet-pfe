/**
 * Application Configuration
 * Defines the core providers and settings for the Angular application,
 * including routing and error handling.
 */

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

/** 
 * Application configuration object that contains all providers.
 * - provideBrowserGlobalErrorListeners: Captures and logs uncaught errors
 * - provideRouter: Configures the application routing system
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};
