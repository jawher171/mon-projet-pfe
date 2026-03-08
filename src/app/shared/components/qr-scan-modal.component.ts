/**
 * QrScanModalComponent
 * Displays a QR code containing a scan URL. The phone scans this QR to open the
 * scanner page with sessionId + purpose query params for real-time barcode relay.
 */

import { Component, Input, Output, EventEmitter, OnInit, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-qr-scan-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" (click)="close.emit()">
      <div class="bg-card border border-border rounded-2xl w-full max-w-[400px]" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span class="material-symbols-rounded text-primary text-xl">qr_code_2</span>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-foreground">Scanner avec le téléphone</h2>
              <p class="text-xs text-muted-foreground">Scannez ce QR code avec votre téléphone</p>
            </div>
          </div>
          <button class="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors" (click)="close.emit()">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
        <div class="p-6 flex flex-col items-center gap-4">
          <div class="bg-white p-4 rounded-xl border border-border">
            <canvas #qrCanvas></canvas>
          </div>
          <div class="text-center space-y-1">
            <p class="text-sm text-muted-foreground">Ouvrez la caméra de votre téléphone et scannez le QR code ci-dessus.</p>
            @if (connected()) {
              <p class="text-sm font-medium text-emerald-600 flex items-center justify-center gap-1">
                <span class="material-symbols-rounded text-lg">wifi</span> Connecté — en attente du scan...
              </p>
            } @else {
              <p class="text-sm text-muted-foreground">Connexion en cours...</p>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class QrScanModalComponent implements AfterViewInit {
  @Input() scanUrl = '';
  @Input() connected = signal(false);
  @Output() close = new EventEmitter<void>();
  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;

  async ngAfterViewInit() {
    try {
      const QRCode = await import('qrcode');
      QRCode.toCanvas(this.qrCanvas.nativeElement, this.scanUrl, { width: 220, margin: 1 });
    } catch (err) {
      console.error('QR code generation failed', err);
    }
  }
}
