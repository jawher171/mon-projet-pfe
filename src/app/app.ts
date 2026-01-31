/**
 * Root Component of the Application
 * This is the main component that serves as the container for the entire application.
 * It provides the RouterOutlet where all routed components are rendered.
 */

import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  /** Application title/name */
  protected readonly title = signal('inventory-app');
}
