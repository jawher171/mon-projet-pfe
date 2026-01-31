/**
 * Application Entry Point
 * Bootstraps the Angular application with the root component (App) 
 * and applies the configuration settings from appConfig.
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Initialize the Angular application with the root component and configuration
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
