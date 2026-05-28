/**
 * InventorySignalRService
 * Fig 6.3 — Connects to /hubs/inventory and listens for real-time alert broadcasts.
 * - BroadcastAlert: new alert created → pushes into AlertService
 * - BroadcastAlertResolved: alert resolved → marks resolved in AlertService
 */

import { Injectable, inject, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { AlertService } from './alert.service';

const HUB_URL = '/backend/hubs/inventory';

@Injectable({ providedIn: 'root' })
export class InventorySignalRService implements OnDestroy {
  private connection: signalR.HubConnection | null = null;
  private readonly alertService = inject(AlertService);

  /** Connect to the SignalR InventoryHub and register listeners */
  async connect(): Promise<void> {
    if (this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    // Fig 6.3 — BroadcastAlert → Notification temps réel (badge mis à jour)
    this.connection.on('BroadcastAlert', (data: {
      type: string;
      severity: string;
      message: string;
      stockId: string;
      dateCreation: string;
    }) => {
      this.alertService.pushRealtimeAlert(data);
    });

    // Fig 6.3 — BroadcastAlertResolved → Mise à jour temps réel (badge décrémenté)
    this.connection.on('BroadcastAlertResolved', (data: { alertId: string }) => {
      this.alertService.markAlertResolved(data.alertId);
    });

    try {
      await this.connection.start();
    } catch (err) {
      console.error('[InventorySignalR] Connection failed', err);
      this.connection = null;
    }
  }

  /** Disconnect from the hub */
  async disconnect(): Promise<void> {
    if (this.connection) {
      try { await this.connection.stop(); } catch { /* ignore */ }
      this.connection = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
