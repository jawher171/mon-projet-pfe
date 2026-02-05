/**
 * Scanner Component
 * Barcode/QR code scanning feature for inventory management.
 * Supports manual entry and simulated scanning with quick action modes.
 */

import { Component, OnInit, signal, computed, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { MovementService } from '../../core/services/movement.service';
import { SiteService } from '../../core/services/site.service';
import { Product } from '../../core/models/product.model';
import { MovementReason, MOVEMENT_REASONS } from '../../core/models/movement.model';

/** Result structure for a barcode scan */
interface ScanResult {
  barcode: string;
  product: Product | null;
  timestamp: Date;
  status: 'found' | 'not_found' | 'pending';
}

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.scss']
})
export class ScannerComponent implements OnInit {
  // Component mode
  @Input() mode: 'standalone' | 'embedded' = 'standalone';
  
  // Output events
  @Output() productScanned = new EventEmitter<Product>();
  @Output() barcodeScanned = new EventEmitter<string>();

  // Scanner state
  /** Is scanning active */
  isScanning = signal(false);
  
  /** Manual barcode input */
  manualInput = signal('');
  
  /** History of scanned items */
  scanHistory = signal<ScanResult[]>([]);
  
  // Quick action mode
  /** Current quick action mode */
  quickActionMode = signal<'entry' | 'exit' | 'view' | null>(null);
  
  /** Selected site for quick action */
  selectedSite = signal('');
  
  /** Selected movement reason */
  selectedReason = signal<MovementReason | ''>('');
  
  /** Quantity for quick action */
  quantity = signal(1);
  
  // Camera state (simulated for now)
  /** Camera device active */
  cameraActive = signal(false);
  
  /** Camera error message */
  cameraError = signal('');
  
  // Last scan result
  /** Most recent scan result */
  lastScan = signal<ScanResult | null>(null);
  
  /** Show result modal */
  showResultModal = signal(false);

  /** Available sites */
  sites = computed(() => this.siteService.getActiveSites()());
  
  /** All products */
  products = computed(() => this.productService.getProducts()());
  
  /** Entry movement reasons */
  entryReasons = MOVEMENT_REASONS.filter(r => r.type === 'entry');
  
  /** Exit movement reasons */
  exitReasons = MOVEMENT_REASONS.filter(r => r.type === 'exit');

  constructor(
    private productService: ProductService,
    private movementService: MovementService,
    private siteService: SiteService
  ) {}

  ngOnInit(): void {}

  // Simulate barcode scanning
  /**
   * Simulate a random barcode scan
   */
  simulateScan() {
    const barcodes = ['1234567890123', '2345678901234', '3456789012345', '9999999999999'];
    const randomBarcode = barcodes[Math.floor(Math.random() * barcodes.length)];
    this.processBarcode(randomBarcode);
  }

  // Manual barcode entry
  /**
   * Process manually entered barcode
   */
  onManualSubmit() {
    const barcode = this.manualInput().trim();
    if (barcode) {
      this.processBarcode(barcode);
      this.manualInput.set('');
  /**
   * Handle enter key press in manual input field
   * @param event Keyboard event
   */
    }
  }

  onInputKeypress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onManualSubmit();
    }
  }

  // Process scanned barcode
  processBarcode(barcode: string) {
    this.isScanning.set(true);
    
    // Simulate API delay
    setTimeout(() => {
      const product = this.findProductByBarcode(barcode);
      
      const result: ScanResult = {
        barcode,
        product,
        timestamp: new Date(),
        status: product ? 'found' : 'not_found'
      };
      
      this.lastScan.set(result);
      this.scanHistory.update(history => [result, ...history].slice(0, 20));
      this.isScanning.set(false);
      
      if (product) {
        this.productScanned.emit(product);
        
        // If in quick action mode, process the action
        if (this.quickActionMode()) {
          this.showResultModal.set(true);
        }
      } else {
        this.barcodeScanned.emit(barcode);
      }
    }, 500);
  }

  findProductByBarcode(barcode: string): Product | null {
    return this.products().find(p => p.barcode === barcode) || null;
  }

  // Quick actions
  setQuickActionMode(mode: 'entry' | 'exit' | 'view' | null) {
    this.quickActionMode.set(mode);
    if (!mode) {
      this.resetQuickAction();
    }
  }

  resetQuickAction() {
    this.selectedSite.set('');
    this.selectedReason.set('');
    this.quantity.set(1);
  }

  executeQuickAction() {
    const scan = this.lastScan();
    const mode = this.quickActionMode();
    
    if (!scan?.product || !mode || mode === 'view') return;
    
    const site = this.sites().find(s => s.id === this.selectedSite());
    if (!site || !this.selectedReason()) return;
    
    // Calculate current stock from movement history
    const previousStock = this.movementService.getCurrentStock(scan.product.id, site.id);
    
    // Calculate new stock after this movement
    const newStock = mode === 'entry' 
      ? previousStock + this.quantity() 
      : previousStock - this.quantity();
    
    this.movementService.addMovement({
      type: mode,
      reason: this.selectedReason() as MovementReason,
      productId: scan.product.id,
      productName: scan.product.name,
      quantity: this.quantity(),
      previousStock: previousStock,
      newStock: newStock,
      siteId: site.id,
      siteName: site.name,
      barcode: scan.barcode,
      performedBy: 'Current User',
      performedAt: new Date()
    });
    
    this.closeResultModal();
    this.resetQuickAction();
  }

  closeResultModal() {
    this.showResultModal.set(false);
  }

  // Camera controls (simulated)
  toggleCamera() {
    if (this.cameraActive()) {
      this.stopCamera();
    } else {
      this.startCamera();
    }
  }

  startCamera() {
    this.cameraError.set('');
    // In a real app, this would access the device camera
    // For now, we'll simulate camera functionality
    this.cameraActive.set(true);
  }

  stopCamera() {
    this.cameraActive.set(false);
  }

  // Clear history
  clearHistory() {
    this.scanHistory.set([]);
    this.lastScan.set(null);
  }

  getReasonsByMode() {
    const mode = this.quickActionMode();
    if (mode === 'entry') return this.entryReasons;
    if (mode === 'exit') return this.exitReasons;
    return [];
  }

  getReasonLabel(reason: MovementReason): string {
    return MOVEMENT_REASONS.find(r => r.value === reason)?.label || reason;
  }

  getSelectedSiteName(): string {
    const siteId = this.selectedSite();
    if (!siteId) return 'Non sélectionné';
    const site = this.sites().find(s => s.id === siteId);
    return site?.name || 'Non sélectionné';
  }

  getSelectedReasonLabel(): string {
    const reason = this.selectedReason();
    if (!reason) return 'Non sélectionnée';
    return this.getReasonLabel(reason);
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}
