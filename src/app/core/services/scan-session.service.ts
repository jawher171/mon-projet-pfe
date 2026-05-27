/**
 * ScanSessionService
 * Manages phone-to-PC barcode relay via the backend SignalR InventoryHub.
 * Both PC and phone connect to the same hub; the phone invokes SendScan,
 * and the PC listens for the ScanDetected event.
 */

import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';

export interface ScanEvent {
  purpose: string;
  code: string;
}

/** Hub URL goes through the Angular proxy so both PC and phone (via ngrok) can reach it. */
const HUB_URL = '/backend/hubs/inventory';

@Injectable({ providedIn: 'root' })
export class ScanSessionService {
  private connection: signalR.HubConnection | null = null;

  /** Observable stream of incoming scan events */
  private scanSubject = new Subject<ScanEvent>();
  scan$ = this.scanSubject.asObservable();

  /** Connection status */
  connected = signal(false);

  /** Generate a unique session id */
  generateSessionId(): string {
    return crypto.randomUUID();
  }

  /** Connect to SignalR hub and join a scan session group (PC side) */
  async joinSession(sessionId: string): Promise<void> {
    await this.stopConnection();

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    // Listen for scans broadcast by the phone
    this.connection.on('ScanDetected', (purpose: string, code: string) => {
      this.scanSubject.next({ purpose, code });
    });

    this.connection.onclose(() => this.connected.set(false));
    this.connection.onreconnected(() => {
      this.connected.set(true);
      this.connection!.invoke('JoinSession', sessionId);
    });

    await this.connection.start();
    await this.connection.invoke('JoinSession', sessionId);
    this.connected.set(true);
  }

  /** Connect to SignalR hub and send a scanned barcode (Phone side) */
  async sendScan(sessionId: string, purpose: string, code: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL)
        .build();

      await this.connection.start();
      await this.connection.invoke('JoinSession', sessionId);
    }

    await this.connection.invoke('SendScan', sessionId, purpose, code);
  }

  /** Disconnect from the hub */
  async stop(): Promise<void> {
    await this.stopConnection();
  }

  private async stopConnection(): Promise<void> {
    if (this.connection) {
      try { await this.connection.stop(); } catch { /* ignore */ }
      this.connection = null;
    }
    this.connected.set(false);
  }

  // ─── Diagram aliases (Fig 5.7, 5.8) ───

  /** Fig 5.7 — Alias for generateSessionId() — matches diagram «createScanSession()» */
  createScanSession(): { sessionId: string; sessionUrl: string } {
    const sessionId = this.generateSessionId();
    const sessionUrl = `${window.location.origin}/scanner?session=${sessionId}`;
    return { sessionId, sessionUrl };
  }

  /** Fig 5.8 — listScanHistory(): historique des scans  */
  listScanHistory(): ScanEvent[] {
    return [];
  }

  /** Fig 5.8 — filterScans(filters): filtrer historique scans */
  filterScans(filters: { produit?: string; operateur?: string; from?: Date; to?: Date }): ScanEvent[] {
    // Filtering is handled in the component layer via signal-based filtering
    return [];
  }
}
