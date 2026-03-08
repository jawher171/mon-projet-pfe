/**
 * ScanSessionService
 * Manages phone-to-PC barcode relay via a lightweight HTTP polling relay.
 * The PC polls for new scans; the phone POSTs scanned barcodes.
 */

import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface ScanEvent {
  purpose: string;
  code: string;
}

@Injectable({ providedIn: 'root' })
export class ScanSessionService {
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  /** Observable stream of incoming scan events */
  private scanSubject = new Subject<ScanEvent>();
  scan$ = this.scanSubject.asObservable();

  /** Connection status */
  connected = signal(false);

  /** Generate a unique session id */
  generateSessionId(): string {
    return crypto.randomUUID();
  }

  /** Start polling for scan events (PC side) */
  async joinSession(sessionId: string): Promise<void> {
    this.stopPolling();

    this.pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`/relay/poll/${encodeURIComponent(sessionId)}`);
        if (!res.ok) return;
        const scans: ScanEvent[] = await res.json();
        for (const scan of scans) {
          this.scanSubject.next(scan);
        }
      } catch { /* ignore poll errors */ }
    }, 1000);

    this.connected.set(true);
  }

  /** Send a scanned barcode to the relay (Phone side) */
  async sendScan(sessionId: string, purpose: string, code: string): Promise<void> {
    const res = await fetch('/relay/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, purpose, code })
    });
    if (!res.ok) throw new Error(`Relay send failed: ${res.status}`);
  }

  /** Stop polling */
  async stop(): Promise<void> {
    this.stopPolling();
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.connected.set(false);
  }
}
