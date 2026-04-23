/**
 * Scanner Component
 * Barcode/QR code scanning feature for inventory management.
 * Supports camera scanning, phone-to-PC relay via QR pairing, and manual entry.
 */

import { Component, OnInit, OnDestroy, signal, computed, EventEmitter, Output, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { MovementService } from '../../core/services/movement.service';
import { SiteService } from '../../core/services/site.service';
import { StockService } from '../../core/services/stock.service';
import { ScanSessionService } from '../../core/services/scan-session.service';
import { AuthService } from '../../core/services/auth.service';
import { QrScanModalComponent } from '../../shared/components/qr-scan-modal.component';
import { Product } from '../../core/models/product.model';
import { MovementReason, MOVEMENT_REASONS } from '../../core/models/movement.model';
import { API_BASE_URL } from '../../app.config';
import { environment } from '../../../environments/environment';
import { firstValueFrom, Subscription } from 'rxjs';

/** Result structure for a barcode scan */
interface ScanResult {
  barcode: string;
  product: Product | null;
  timestamp: Date;
  status: 'found' | 'not_found' | 'pending';
  createdByUserName?: string;
}

interface SiteStockRow {
  siteId: string;
  siteName: string;
  quantity: number;
  threshold: number;
  isLow: boolean;
}

interface ScanHistoryDto {
  id?: string;
  barcode: string;
  productId?: string;
  productName?: string;
  status: 'found' | 'not_found' | 'pending';
  timestamp: string;
  createdByUserId?: string;
  createdByUserName?: string;
}

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule, QrScanModalComponent],
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.scss']
})
export class ScannerComponent implements OnInit, OnDestroy {
  // Component mode
  @Input() mode: 'standalone' | 'embedded' = 'standalone';
  
  // Output events
  @Output() productScanned = new EventEmitter<Product>();
  @Output() barcodeScanned = new EventEmitter<string>();

  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);
  private categoryService = inject(CategoryService);
  private scanSession = inject(ScanSessionService);
  private scanSub?: Subscription;
  private readonly desktopScanPurpose = 'SCANNER_LOOKUP';
  private readonly historyStorageKey = 'scanner_scan_history_v1';
  private readonly scanHistoryMaxEntries = 20;
  private lastProcessedCode = '';
  private lastProcessedAt = 0;

  /** Phone scan mode: when sessionId + purpose are in query params */
  phoneMode = signal(false);
  relayOnlyMode = signal(false);
  phonePurpose = signal('');
  phoneSessionId = signal('');
  phoneScanSent = signal(false);
  phoneScanError = signal('');
  lastRelayedCode = signal('');
  lastRelayedAt = signal<Date | null>(null);

  isPhoneAuthenticated = computed(() => this.hasAuthToken());

  /** PC mode: generated session shared with phone via QR */
  showQrPairingModal = signal(false);
  pairingScanUrl = signal('');
  pairingConnected = signal(false);
  pairingError = signal('');

  // Scanner state
  /** Is scanning active */
  isScanning = signal(false);
  
  /** Manual barcode input */
  manualInput = signal('');
  
  /** History of scanned items */
  scanHistory = signal<ScanResult[]>([]);

  showAllHistory = signal(false);

  displayedHistory = computed(() => {
    const all = this.scanHistory();
    return this.showAllHistory() ? all : all.slice(0, 7);
  });
  
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

  /** Stock by site for the latest scanned product */
  scannedSiteStocks = computed<SiteStockRow[]>(() => {
    const product = this.lastScan()?.product;
    if (!product) return [];

    const stocks = this.stockService.getStocksByProduct(product.id_p);
    return stocks
      .map(stock => {
        const siteId = String(stock.siteId);
        const siteName = this.siteService.getSiteById(siteId)?.nom ?? stock.siteNom ?? `Site ${siteId}`;
        const quantity = Number(stock.quantiteDisponible ?? 0);
        const threshold = Number(stock.seuilAlerte ?? 0);
        return {
          siteId,
          siteName,
          quantity,
          threshold,
          isLow: threshold > 0 && quantity <= threshold
        };
      })
      .sort((a, b) => a.siteName.localeCompare(b.siteName, 'fr', { sensitivity: 'base' }));
  });

  totalStockForLastScan = computed(() =>
    this.scannedSiteStocks().reduce((sum, row) => sum + row.quantity, 0)
  );
  
  /** All products */
  products = computed(() => this.productService.getProducts()());
  
  /** Entry movement reasons */
  entryReasons = MOVEMENT_REASONS.filter(r => r.type === 'entry');
  
  /** Exit movement reasons */
  exitReasons = MOVEMENT_REASONS.filter(r => r.type === 'exit');

  constructor(
    private productService: ProductService,
    private movementService: MovementService,
    private siteService: SiteService,
    private stockService: StockService
  ) {}

  ngOnInit(): void {
    this.restoreHistoryFromStorage();

    // Check for phone scan mode via query params
    const params = this.route.snapshot.queryParams;
    const routePath = String(this.route.snapshot.routeConfig?.path ?? '').trim().toLowerCase();
    const isRelayRoute = routePath === 'scan-relay';
    const sessionIdParam = String(params['sessionId'] ?? '').trim();
    const purposeParam = String(params['purpose'] ?? '').trim();
    const scanOnlyParam = String(params['scanOnly'] ?? '').trim().toLowerCase();
    const isRelayPurpose = ['PRODUCT_BARCODE', 'MOVEMENT_PRODUCT', 'TRANSFER_PRODUCT'].includes(purposeParam);
    const hasToken = this.hasAuthToken();
    const isScanOnly = isRelayRoute || scanOnlyParam === '1' || scanOnlyParam === 'true' || isRelayPurpose || (!!sessionIdParam && !hasToken);
    if (sessionIdParam && purposeParam) {
      this.phoneMode.set(true);
      this.relayOnlyMode.set(isScanOnly);
      this.phoneSessionId.set(sessionIdParam);
      this.phonePurpose.set(purposeParam);
    }

    // Avoid protected API calls on unauthenticated phone scan pages to prevent forced login redirects.
    if (!this.phoneMode() || hasToken) {
      void this.productService.fetchProducts().catch(() => undefined);
      void this.categoryService.fetchCategories().catch(() => undefined);
      void this.siteService.fetchSites().catch(() => undefined);
      void this.stockService.fetchStocks().catch(() => undefined);
    }

    if (hasToken) {
      void this.loadHistoryFromBackend();
    }
  }

  ngOnDestroy(): void {
    this.scanSub?.unsubscribe();
    this.stopCamera();
    void this.scanSession.stop();
  }

  // Manual barcode entry
  /**
   * Process manually entered barcode
   */
  onManualSubmit() {
    const barcode = this.normalizeBarcode(this.manualInput());
    if (!barcode || this.isScanning()) return;
    void this.processBarcode(barcode);
    this.manualInput.set('');
  }

  /** Handle enter key press in manual input field */
  onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onManualSubmit();
    }
  }

  /** 
   * RELAIS SANS FIL (QR) :
   * Génère un code QR unique sur l'ordinateur. 
   * Si ce QR est scanné par un mobile, les deux appareils sont "pairés".
   * Le mobile agit alors comme une douchette sans fil pour envoyer les codes à ce PC.
   */
  async openQrPairing(): Promise<void> {
    if (this.phoneMode()) return;

    const sessionId = this.scanSession.generateSessionId();
    const baseUrl = this.resolveScanBaseUrl();
    this.pairingScanUrl.set(
      `${baseUrl}/scan?sessionId=${encodeURIComponent(sessionId)}&purpose=${encodeURIComponent(this.desktopScanPurpose)}`
    );
    this.showQrPairingModal.set(true);
    this.pairingError.set('');
    this.pairingConnected.set(false);

    this.scanSub?.unsubscribe();
    this.scanSub = this.scanSession.scan$.subscribe(event => {
      if (event.purpose !== this.desktopScanPurpose) return;
      void this.processBarcode(event.code);
    });

    try {
      await this.scanSession.joinSession(sessionId);
      this.pairingConnected.set(true);
    } catch (error) {
      console.error('[Scanner] JoinSession failed', error);
      this.pairingError.set('Connexion de session impossible. Vérifiez le réseau et réessayez.');
    }
  }

  closeQrPairing() {
    this.showQrPairingModal.set(false);
    this.pairingConnected.set(false);
    this.pairingError.set('');
    this.scanSub?.unsubscribe();
    void this.scanSession.stop();
  }

  // Traitement principal d'un code scanné (via douchette USB, Camera, ou Relais Phone)
  async processBarcode(barcode: string) {
    if (this.isScanning()) return;

    // Normalisation du texte scanné pour éviter les erreurs d'espace ou d'URL
    const normalizedBarcode = this.extractScannedCode(barcode);
    
    // Anti-rebond (Debounce) : évite de scanner le même produit 5 fois de suite en 1 seconde
    if (!normalizedBarcode || this.isRecentlyProcessed(normalizedBarcode)) return;

    this.lastProcessedCode = normalizedBarcode;
    this.lastProcessedAt = Date.now();
    this.isScanning.set(true);

    try {
      if (this.phoneMode()) {
        await this.sendPhoneScan(normalizedBarcode);

        if (this.relayOnlyMode() || !this.hasAuthToken()) {
          this.lastRelayedCode.set(normalizedBarcode);
          this.lastRelayedAt.set(new Date());
          return;
        }
      }

      // Keep stock cache fresh so stocks by site are accurate in scan details.
      await this.stockService.fetchStocks().catch(() => undefined);

      const product = await this.productService.getProductByBarcode(normalizedBarcode);
      this.registerScanResult(normalizedBarcode, product);

      // On phone UX, bring the result card into view so product info and stock by site are visible immediately.
      if (this.phoneMode()) {
        this.scrollToLastScanResult();
        if (this.cameraActive()) {
          this.stopCamera();
        }
      }

      if (product) {
        this.productScanned.emit(product);
        if (this.quickActionMode()) {
          this.showResultModal.set(true);
        }
      } else {
        this.barcodeScanned.emit(normalizedBarcode);
      }
    } finally {
      this.isScanning.set(false);
    }
  }

  private async sendPhoneScan(code: string): Promise<void> {
    try {
      this.phoneScanError.set('');
      await this.scanSession.sendScan(this.phoneSessionId(), this.phonePurpose(), code);
      this.phoneScanSent.set(true);
      setTimeout(() => this.phoneScanSent.set(false), 3000);
    } catch (error) {
      console.error('[Scanner] SendScan failed', error);
      this.phoneScanError.set('Échec de l\'envoi — vérifiez la connexion');
      setTimeout(() => this.phoneScanError.set(''), 5000);
    }
  }

  private registerScanResult(barcode: string, product: Product | null): void {
    const result: ScanResult = {
      barcode,
      product,
      timestamp: new Date(),
      status: product ? 'found' : 'not_found',
      createdByUserName: this.getCurrentUserDisplayName()
    };

    this.lastScan.set(result);
    this.scanHistory.update(history => [result, ...history].slice(0, this.scanHistoryMaxEntries));
    this.persistHistoryToStorage();
    void this.saveScanToBackend(result);
  }

  private async loadHistoryFromBackend(): Promise<void> {
    if (!this.hasAuthToken()) return;

    try {
      const dtos = await firstValueFrom(
        this.http.get<ScanHistoryDto[]>(`${API_BASE_URL}/api/StockMovements/GetScanHistory?maxResults=${this.scanHistoryMaxEntries}`)
      );

      const restored = (dtos ?? [])
        .map(dto => this.fromScanHistoryDto(dto))
        .filter((item): item is ScanResult => item !== null)
        .slice(0, this.scanHistoryMaxEntries);

      this.scanHistory.set(restored);
      this.lastScan.set(restored.length > 0 ? restored[0] : null);
      this.persistHistoryToStorage();
    } catch {
      // Keep local cached history when backend is unreachable.
    }
  }

  private async saveScanToBackend(result: ScanResult): Promise<void> {
    if (!this.hasAuthToken()) return;

    const payload: ScanHistoryDto = {
      barcode: result.barcode,
      productId: result.product ? String(result.product.id_p) : undefined,
      productName: result.product?.nom,
      status: result.status,
      timestamp: result.timestamp.toISOString()
    };

    try {
      await firstValueFrom(this.http.post(`${API_BASE_URL}/api/StockMovements/AddScanHistory`, payload));
    } catch {
      // Keep local history even if backend write fails.
    }
  }

  private fromScanHistoryDto(dto: ScanHistoryDto): ScanResult | null {
    const barcode = typeof dto.barcode === 'string' ? dto.barcode.trim() : '';
    if (!barcode) return null;

    const timestamp = new Date(dto.timestamp);
    if (Number.isNaN(timestamp.getTime())) return null;

    const status = dto.status === 'found' || dto.status === 'not_found' || dto.status === 'pending'
      ? dto.status
      : 'pending';

    let product: Product | null = null;
    if (status === 'found' && dto.productName) {
      product = {
        id_p: dto.productId ?? '',
        nom: dto.productName,
        description: '',
        codeBarre: barcode,
        prix: 0,
        id_c: ''
      };
    }

    return {
      barcode,
      product,
      timestamp,
      status,
      createdByUserName: dto.createdByUserName?.trim() || undefined
    };
  }

  private restoreHistoryFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.historyStorageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Array<{
        barcode?: unknown;
        product?: unknown;
        timestamp?: unknown;
        status?: unknown;
      }>;

      if (!Array.isArray(parsed)) return;

      const restored: ScanResult[] = parsed
        .map((item): ScanResult | null => {
          const barcode = typeof item.barcode === 'string' ? item.barcode.trim() : '';
          if (!barcode) return null;

          const timestamp = new Date(item.timestamp as string);
          if (Number.isNaN(timestamp.getTime())) return null;

          const product = item.product && typeof item.product === 'object'
            ? (item.product as Product)
            : null;

          const status = item.status === 'found' || item.status === 'not_found' || item.status === 'pending'
            ? item.status
            : (product ? 'found' : 'not_found');

          return {
            barcode,
            product,
            timestamp,
            status,
            createdByUserName: typeof (item as { createdByUserName?: unknown }).createdByUserName === 'string'
              ? ((item as { createdByUserName?: string }).createdByUserName?.trim() || undefined)
              : undefined
          };
        })
        .filter((item): item is ScanResult => item !== null)
        .slice(0, this.scanHistoryMaxEntries);

      if (restored.length === 0) return;

      this.scanHistory.set(restored);
      this.lastScan.set(restored[0]);
    } catch {
      localStorage.removeItem(this.historyStorageKey);
    }
  }

  private persistHistoryToStorage(): void {
    try {
      const serializable = this.scanHistory().map(item => ({
        ...item,
        timestamp: item.timestamp.toISOString()
      }));
      localStorage.setItem(this.historyStorageKey, JSON.stringify(serializable));
    } catch {
      // Ignore storage failures (private mode or quota exceeded).
    }
  }

  private normalizeBarcode(raw: string): string {
    return raw.trim().replace(/\s+/g, '');
  }

  private extractScannedCode(raw: string): string {
    const normalizedRaw = this.normalizeBarcode(raw);
    if (!normalizedRaw) return '';

    try {
      const parsed = new URL(raw.trim());
      const queryKeys = ['barcode', 'codeBarre', 'code', 'ean', 'upc'];
      for (const key of queryKeys) {
        const queryValue = this.normalizeBarcode(parsed.searchParams.get(key) ?? '');
        if (queryValue) return queryValue;
      }

      const pathSegments = parsed.pathname.split('/').filter(Boolean);
      const lastSegment = pathSegments.length ? this.normalizeBarcode(pathSegments[pathSegments.length - 1]) : '';
      if (lastSegment && /[A-Za-z0-9]{6,}/.test(lastSegment)) {
        return lastSegment;
      }
    } catch {
      // Not a URL payload; use raw scanner text.
    }

    return normalizedRaw;
  }

  private scrollToLastScanResult(): void {
    setTimeout(() => {
      document.getElementById('sc-last-scan')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 80);
  }

  private hasAuthToken(): boolean {
    return !!this.authService.getToken();
  }

  private getCurrentUserDisplayName(): string | undefined {
    const user = this.authService.currentUser();
    if (!user) return undefined;

    const fullName = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim();
    if (fullName) return fullName;
    return user.email?.trim() || undefined;
  }

  async openPhoneLogin(): Promise<void> {
    await this.router.navigate(['/auth/login']);
  }

  async openAddProductOnPhone(): Promise<void> {
    const code = this.normalizeBarcode(this.lastRelayedCode() || this.lastScan()?.barcode || '');
    if (!code) return;
    await this.router.navigate(['/products'], {
      queryParams: {
        add: '1',
        barcode: code
      }
    });
  }

  async openMovementOnPhone(mode: 'entry' | 'exit'): Promise<void> {
    const code = this.normalizeBarcode(this.lastRelayedCode() || this.lastScan()?.barcode || '');
    if (!code) return;
    await this.router.navigate(['/movements'], {
      queryParams: {
        mode,
        barcode: code
      }
    });
  }

  async openTransferOnPhone(): Promise<void> {
    const code = this.normalizeBarcode(this.lastRelayedCode() || this.lastScan()?.barcode || '');
    if (!code) return;
    await this.router.navigate(['/movements'], {
      queryParams: {
        mode: 'transfer',
        barcode: code
      }
    });
  }

  private isRecentlyProcessed(code: string): boolean {
    return this.lastProcessedCode === code && Date.now() - this.lastProcessedAt < 1500;
  }

  private resolveScanBaseUrl(): string {
    const configured = environment.scanPublicBaseUrl?.trim();
    if (configured && !this.isLocalhostUrl(configured)) return configured.replace(/\/+$/, '');

    const remembered = localStorage.getItem('scan_public_base_url')?.trim();
    if (remembered && !this.isLocalhostUrl(remembered)) return remembered.replace(/\/+$/, '');
    if (remembered && this.isLocalhostUrl(remembered)) {
      localStorage.removeItem('scan_public_base_url');
    }

    const { origin, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'https://uncontingent-nongeographically-wilma.ngrok-free.dev';
    }

    return origin;
  }

  private isLocalhostUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      return url.includes('localhost') || url.includes('127.0.0.1');
    }
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
    const previousStock = this.movementService.getCurrentStock(String(scan.product.id_p), String(site.id));
    
    this.movementService.addMovement({
      dateMouvement: new Date(),
      raison: this.selectedReason() as MovementReason,
      quantite: this.quantity(),
      produitNom: scan.product.nom,
      siteNom: site.nom,
      productId: scan.product.id_p,
      siteId: site.id,
      type: mode,
      utilisateurNom: 'Utilisateur courant'
    });
    
    this.closeResultModal();
    this.resetQuickAction();
  }

  closeResultModal() {
    this.showResultModal.set(false);
  }

  // Camera controls - real camera via ZXing
  private codeReader: any = null;

  toggleCamera() {
    if (this.cameraActive()) {
      this.stopCamera();
    } else {
      void this.startCamera();
    }
  }

  // ── SCANNER CAMÉRA ──
  // Utilise la librairie ZXing pour lire les codes-barres directement depuis la webcam
  async startCamera() {
    this.cameraError.set('');
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      this.codeReader = new BrowserMultiFormatReader();
      this.cameraActive.set(true);

      // Wait for video element to appear in DOM
      setTimeout(() => {
        const videoEl = document.getElementById('scanner-video') as HTMLVideoElement;
        if (!videoEl) {
          this.cameraError.set('Élément vidéo introuvable');
          this.cameraActive.set(false);
          return;
        }
        this.codeReader.decodeFromVideoDevice(undefined, videoEl, (result: any, err: any) => {
          if (result) {
            const text = String(result.getText() ?? '');
            if (text && !this.isScanning()) {
              void this.processBarcode(text);
            }
          }
        });
      }, 100);
    } catch (err: any) {
      this.cameraError.set(err?.message || 'Impossible d\'accéder à la caméra');
      this.cameraActive.set(false);
    }
  }

  stopCamera() {
    if (this.codeReader) {
      // BrowserMultiFormatReader doesn't have a reset for this API, stop tracks manually
      const videoEl = document.getElementById('scanner-video') as HTMLVideoElement;
      if (videoEl?.srcObject) {
        (videoEl.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        videoEl.srcObject = null;
      }
      this.codeReader = null;
    }
    this.cameraActive.set(false);
  }

  // Clear history
  clearHistory() {
    this.scanHistory.set([]);
    this.showAllHistory.set(false);
    this.lastScan.set(null);
    localStorage.removeItem(this.historyStorageKey);
    void this.clearHistoryInBackend();
  }

  private async clearHistoryInBackend(): Promise<void> {
    if (!this.hasAuthToken()) return;
    try {
      const clearAllSuffix = this.authService.isAdmin() ? '?all=true' : '';
      await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/StockMovements/ClearScanHistory${clearAllSuffix}`));
    } catch {
      // Local clear already applied.
    }
  }

  toggleHistory() {
    this.showAllHistory.update(v => !v);
  }

  getStockBadgeClass(row: SiteStockRow): 'low' | 'ok' {
    return row.isLow ? 'low' : 'ok';
  }

  getProductCategoryLabel(product: Product): string {
    const directLabel = (product.categorieLibelle ?? '').trim();
    if (directLabel) return directLabel;

    const codeBarre = (product.codeBarre ?? '').trim().toLowerCase();
    const cachedProduct = this.products().find(p =>
      String(p.id_p) === String(product.id_p) ||
      (!!codeBarre && (p.codeBarre ?? '').trim().toLowerCase() === codeBarre)
    );
    const cachedLabel = (cachedProduct?.categorieLibelle ?? '').trim();
    if (cachedLabel) return cachedLabel;

    const categoryId = String(product.id_c ?? '').trim();
    if (categoryId) {
      const category = this.categoryService.getCategories()().find(c => String(c.id_c) === categoryId);
      const categoryLabel = (category?.categorieLibelle ?? '').trim();
      if (categoryLabel) return categoryLabel;
    }

    return '—';
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
    return site?.nom || 'Non sélectionné';
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

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  }

  formatHistoryDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
