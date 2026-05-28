/**
 * Root Component of the Application
 * This is the main component that serves as the container for the entire application.
 * It provides the RouterOutlet where all routed components are rendered.
 * Connects to SignalR InventoryHub for real-time alert notifications (Fig 6.3).
 */

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule,HttpClient} from '@angular/common/http';
import { FormsModule,ReactiveFormsModule } from '@angular/forms';
import { InventorySignalRService } from './core/services/inventory-signalr.service';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, HttpClientModule, FormsModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  private readonly signalRService = inject(InventorySignalRService);

  ngOnInit(): void {
    this.signalRService.connect();
  }

  ngOnDestroy(): void {
    this.signalRService.disconnect();
  }
}
