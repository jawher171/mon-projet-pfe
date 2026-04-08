/**
 * Movements Component
 * Manages stock movements (entries and exits).
 * Allows recording, viewing, and filtering inventory transactions.
 */

import { Component, signal, computed, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MovementService } from '../../core/services/movement.service';
import { SiteService } from '../../core/services/site.service';
import { ProductService } from '../../core/services/product.service';
import { StockService } from '../../core/services/stock.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { ScanSessionService } from '../../core/services/scan-session.service';
import { QrScanModalComponent } from '../../shared/components/qr-scan-modal.component';
import { Product } from '../../core/models/product.model';
import { MouvementStock, MouvementFilter, MovementReason } from '../../core/models/movement.model';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [CommonModule, FormsModule, QrScanModalComponent],
  templateUrl: './movements.component.html',
  styleUrls: ['./movements.component.scss']
})
export class MovementsComponent implements OnInit, OnDestroy {
  // Filter signals
  searchTerm = signal('');
  selectedType = signal<'all' | 'entry' | 'exit' | 'transfer'>('all');
  selectedSite = signal('');
  selectedReason = signal<MovementReason | ''>('');
  selectedDate = signal('');
  onDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedDate.set(input.value);}
  // Modal states
  showModal = signal(false);
  modalMode = signal<'add' | 'view'>('add');
  selectedMovement = signal<MouvementStock | null>(null);
  movementType = signal<'entry' | 'exit' | 'transfer'>('entry');

  // Transfer modal
  showTransferModal = signal(false);
  transferFormSubmitted = signal(false);
  transferSaving = signal(false);
  transferProductSearch = signal('');
  showTransferProductDropdown = signal(false);
  transferSelectedProduct = signal<Product | null>(null);
  transferFormData = signal({
    sourceSiteId: '',
    destSiteId: '',
    productId: '',
    productName: '',
    quantity: 0,
    notes: ''
  });
  
  // Form data
  formData = signal({
    stockId: '',
    productId: '',
    productName: '',
    quantity: 0,
    reason: '' as MovementReason | '',
    siteId: '',
    reference: '',
    barcode: '',
    notes: '',
    destination: ''
  });
  
  // Custom reason modal
  showAddReasonModal = signal(false);
  reasonType = signal<'entry' | 'exit' | 'transfer'>('entry');
  newCustomReason = signal('');
  editingReasonValue = signal<string | null>(null);
  editingReasonLabel = signal('');
  reasonError = signal('');

  // Form UX states
  isSaving = signal(false);
  formSubmitted = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');
  showToast = signal(false);
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  // QR scan for product field
  showQrScanModal = signal(false);
  scanUrl = signal('');
  scanConnected = signal(false);
  private scanSub?: Subscription;

  // Product selection
  productSearch = signal('');
  showProductDropdown = signal(false);
  selectedProduct = signal<Product | null>(null);
  allProducts = computed(() => this.productService.getProducts()());

  /** For exit: only products that have stock at the selected site */
  availableProducts = computed(() => {
    const products = this.allProducts();
    if (this.movementType() !== 'exit') return products;
    const siteId = this.formData().siteId;
    if (!siteId) return [];
    const date = this.selectedDate();
    if (date) {
      return [];
    }
    const siteStocks = this.stockService.getStocksBySite(siteId).filter(s => s.quantiteDisponible > 0);
    const productIdsInStock = new Set(siteStocks.map(s => String(s.produitId)));
    return products.filter(p => productIdsInStock.has(String(p.id_p)));
  });

  /** Store sites only (no warehouses) for transfer */
  transferStoreSites = computed(() => {
    return this.sites().filter(s => s.type === 'store');
  });

  /** Destination stores for transfer (exclude source) */
  transferDestSites = computed(() => {
    const sourceId = this.transferFormData().sourceSiteId;
    return this.transferStoreSites().filter(s => String(s.id) !== String(sourceId));
  });

  /** Products available at the transfer source store */
  transferAvailableProducts = computed(() => {
    const sourceId = this.transferFormData().sourceSiteId;
    if (!sourceId) return [];
    const siteStocks = this.stockService.getStocksBySite(sourceId).filter(s => s.quantiteDisponible > 0);
    const productIdsInStock = new Set(siteStocks.map(s => String(s.produitId)));
    return this.allProducts().filter(p => productIdsInStock.has(String(p.id_p)));
  });

  /** Filtered transfer products based on search */
  filteredTransferProducts = computed(() => {
    const search = this.transferProductSearch().toLowerCase();
    const products = this.transferAvailableProducts();
    if (!search) return products;
    return products.filter(p =>
      p.nom.toLowerCase().includes(search) ||
      (p.codeBarre?.toLowerCase().includes(search) ?? false) ||
      (p.categorieLibelle?.toLowerCase().includes(search) ?? false)
    );
  });

  /** Available stock for transfer product at source */
  transferAvailableStock = computed(() => {
    const product = this.transferSelectedProduct();
    const sourceId = this.transferFormData().sourceSiteId;
    if (!product || !sourceId) return null;
    const stock = this.stockService.getStockForProductSite(String(product.id_p), sourceId);
    return stock?.quantiteDisponible ?? 0;
  });

  /** Transfer form validation errors */
  transferFormErrors = computed(() => {
    if (!this.transferFormSubmitted()) return {};
    const form = this.transferFormData();
    const errors: Record<string, string> = {};
    if (!form.sourceSiteId) errors['source'] = 'Veuillez sélectionner un magasin source';
    if (!form.destSiteId) errors['dest'] = 'Veuillez sélectionner un magasin destination';
    if (form.sourceSiteId && form.destSiteId && form.sourceSiteId === form.destSiteId) {
      errors['dest'] = 'Le magasin source et destination doivent être différents';
    }
    if (!this.transferSelectedProduct()) errors['product'] = 'Veuillez sélectionner un produit';
    if (!form.quantity || form.quantity <= 0) errors['quantity'] = 'La quantité doit être supérieure à 0';
    if (this.transferAvailableStock() !== null && form.quantity > this.transferAvailableStock()!) {
      errors['quantity'] = `Stock insuffisant sur le magasin source (disponible: ${this.transferAvailableStock()})`;
    }
    return errors;
  });

  isTransferFormValid = computed(() => Object.keys(this.transferFormErrors()).length === 0);

  filteredProducts = computed(() => {
    const search = this.productSearch().toLowerCase();
    const products = this.availableProducts();
    if (!search) return products;
    return products.filter(p =>
      p.nom.toLowerCase().includes(search) ||
      (p.codeBarre?.toLowerCase().includes(search) ?? false) ||
      (p.categorieLibelle?.toLowerCase().includes(search) ?? false)
    );
  });

  /** Available stock for the selected product at the selected site (exit only) */
  availableStock = computed(() => {
    if (this.movementType() !== 'exit') return null;
    const product = this.selectedProduct();
    const siteId = this.formData().siteId;
    if (!product || !siteId) return null;
    const stock = this.stockService.getStockForProductSite(String(product.id_p), siteId);
    return stock?.quantiteDisponible ?? 0;
  });

  entryCapacityLeft = computed(() => {
    if (this.movementType() !== 'entry') return null;
    const product = this.selectedProduct();
    const siteId = this.formData().siteId;
    if (!product || !siteId) return null;
    const stock = this.stockService.getStockForProductSite(String(product.id_p), siteId);
    if (!stock || !stock.seuilMaximum || stock.seuilMaximum <= 0) return null;
    return Math.max(0, stock.seuilMaximum - stock.quantiteDisponible);
  });

  // Get data from services
  sites = computed(() => this.siteService.getActiveSites()());

  formSites = computed(() => {
    if (this.movementType() === 'entry') {
      return this.sites().filter(s => s.type === 'warehouse');
    }
    return this.sites();
  });

  destinationSites = computed(() => {
    const originId = this.formData().siteId;
    if (!originId) return this.sites();
    return this.sites().filter(s => String(s.id) !== String(originId));
  });
  
  filter = computed<MouvementFilter>(() => {
    const date = this.selectedDate();
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (date) {
      startDate = new Date(date + 'T00:00:00');
      endDate = new Date(date + 'T23:59:59');
    }
    return {
      search: this.searchTerm(),
      type: this.selectedType() === 'all' ? undefined : this.selectedType(),
      siteId: this.selectedSite() || undefined,
      raison: this.selectedReason() || undefined,
      startDate,
      endDate
    };
  });

  movements = computed(() => this.movementService.getFilteredMovements(this.filter())());
  summary = computed(() => this.movementService.getMovementSummary());
  canManageMovements = computed(() => this.authService.hasPermission('manage_movements'));

  showAllMovements = signal(false);

  displayedMovements = computed(() => {
    const all = this.movements();
    return this.showAllMovements() ? all : all.slice(0, 7);
  });

  toggleMovements() {
    this.showAllMovements.update(v => !v);
  }

  // Validation: computed errors based on current form state
  formErrors = computed(() => {
    if (!this.formSubmitted()) return {};
    const form = this.formData();
    const errors: Record<string, string> = {};
    if (!this.selectedProduct()) errors['product'] = 'Veuillez sélectionner un produit';
    if (!form.quantity || form.quantity <= 0) errors['quantity'] = 'La quantité doit être supérieure à 0';
    if (this.movementType() === 'exit' && this.availableStock() !== null && form.quantity > this.availableStock()!) {
      errors['quantity'] = `Quantité insuffisante en stock (disponible: ${this.availableStock()})`;
    }
    if (this.movementType() === 'entry') {
      const remaining = this.entryCapacityLeft();
      if (remaining !== null && form.quantity > remaining) {
        errors['quantity'] = `La quantité dépasse le seuil maximum (capacité restante: ${remaining})`;
      }
    }
    if (!form.reason) errors['reason'] = 'Veuillez sélectionner une raison';
    if (!form.siteId) errors['siteId'] = 'Veuillez sélectionner un site';
    if (this.movementType() === 'exit' && !form.destination) errors['destination'] = 'Veuillez sélectionner une destination';
    return errors;
  });

  isFormValid = computed(() => Object.keys(this.formErrors()).length === 0);

  constructor(
    public movementService: MovementService,
    private siteService: SiteService,
    private productService: ProductService,
    private stockService: StockService,
    private authService: AuthService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private scanSessionService: ScanSessionService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.scanSub?.unsubscribe();
    void this.scanSessionService.stop();
  }

  /** Open QR scan modal for product barcode scanning */
  async openProductScan() {
    const mobileUi = this.isMobileUi();
    const sessionId = this.scanSessionService.generateSessionId();
    const baseUrl = this.resolveScanBaseUrl();
    this.scanUrl.set(`${baseUrl}/scan-relay?sessionId=${sessionId}&purpose=MOVEMENT_PRODUCT&scanOnly=1`);
    this.showQrScanModal.set(!mobileUi);

    this.scanSub?.unsubscribe();
    this.scanSub = this.scanSessionService.scan$.subscribe(async (event) => {
      if (event.purpose === 'MOVEMENT_PRODUCT') {
        // Lookup product by barcode
        const product = await this.productService.getProductByBarcode(event.code);
        if (product) {
          this.selectProduct(product);
          this.showQrScanModal.set(false);
          this.scanConnected.set(false);
          void this.scanSessionService.stop();
          // Focus quantity input
          setTimeout(() => {
            const qtyInput = document.getElementById('movement-quantity') as HTMLInputElement;
            qtyInput?.focus();
          }, 100);
        } else {
          this.displayToast('Produit non trouvé pour le code-barres: ' + event.code, 'error');
        }
      }
    });

    try {
      await this.scanSessionService.joinSession(sessionId);
      this.scanConnected.set(true);

      if (mobileUi) {
        const opened = this.openMobileScannerTab(this.scanUrl());
        if (!opened) {
          this.displayToast('Impossible d\'ouvrir le scanner. Autorisez les popups puis réessayez.', 'error');
        }
      }
    } catch (err) {
      console.error('[Movements] SignalR connection failed', err);
      // QR modal is already shown — user can still scan
    }
  }

  /**
   * Build a phone-reachable base URL for QR links.
   * If app is opened on localhost, we ask once for the LAN URL and remember it.
   */
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

  closeQrScanModal() {
    this.showQrScanModal.set(false);
    this.scanConnected.set(false);
    this.scanSub?.unsubscribe();
    void this.scanSessionService.stop();
  }

  private async loadData(): Promise<void> {
    await Promise.all([
      this.movementService.fetchMovements(),
      this.siteService.fetchSites(),
      this.productService.fetchProducts(),
      this.stockService.fetchStocks()
    ]);

    const params = this.route.snapshot.queryParams;
    const barcode = String(params['barcode'] ?? '').trim();

    if (params['mode'] === 'transfer') {
      this.openTransferModal();
      if (barcode) {
        const transferProduct = await this.productService.getProductByBarcode(barcode);
        if (transferProduct) {
          this.selectTransferProduct(transferProduct);
        }
      }
      return;
    }

    if (params['mode'] && (params['mode'] === 'entry' || params['mode'] === 'exit')) {
      const mode = params['mode'] as 'entry' | 'exit';
      this.movementType.set(mode);
      this.modalMode.set('add');

      const stockId = params['stockId'] ?? '';
      const siteId = params['siteId'] ?? '';
      const productId = params['productId'] ?? '';
      const productName = params['productName'] ?? '';

      this.formData.update(f => ({
        ...f,
        stockId,
        siteId,
        productId,
        productName
      }));

      if (productId) {
        const product = this.allProducts().find(p => String(p.id_p) === String(productId));
        if (product) {
          this.selectedProduct.set(product);
          this.productSearch.set(product.nom);
          this.formData.update(fd => ({
            ...fd,
            productName: product.nom,
            barcode: product.codeBarre || ''
          }));
        } else if (productName) {
          this.productSearch.set(productName);
        }
      } else if (barcode) {
        const scannedProduct = await this.productService.getProductByBarcode(barcode);
        if (scannedProduct) {
          this.selectProduct(scannedProduct);
        }
      }

      this.showModal.set(true);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.product-search-group')) {
      this.showProductDropdown.set(false);
      this.showTransferProductDropdown.set(false);
    }
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  onTypeChange(type: 'all' | 'entry' | 'exit' | 'transfer') {
    this.selectedType.set(type);
  }

  onSiteChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedSite.set(select.value);
  }
  
  openAddModal(type: 'entry' | 'exit') {
    if (!this.canManageMovements()) return;

    this.modalMode.set('add');
    this.movementType.set(type);
    this.resetForm();
    this.showModal.set(true);
  }

  openViewModal(movement: MouvementStock) {
    this.modalMode.set('view');
    this.selectedMovement.set(movement);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedMovement.set(null);
    this.resetForm();
  }

  resetForm() {
    this.formData.set({
      stockId: '',
      productId: '',
      productName: '',
      quantity: 0,
      reason: '',
      siteId: '',
      reference: '',
      barcode: '',
      notes: '',
      destination: ''
    });
    this.selectedProduct.set(null);
    this.productSearch.set('');
    this.showProductDropdown.set(false);
    this.formSubmitted.set(false);
    this.isSaving.set(false);
  }

  // ── Transfer Modal Methods ──

  openTransferModal() {
    if (!this.canManageMovements()) return;

    this.resetTransferForm();
    this.showTransferModal.set(true);
  }

  closeTransferModal() {
    this.showTransferModal.set(false);
    this.resetTransferForm();
  }

  resetTransferForm() {
    this.transferFormData.set({
      sourceSiteId: '',
      destSiteId: '',
      productId: '',
      productName: '',
      quantity: 0,
      notes: ''
    });
    this.transferSelectedProduct.set(null);
    this.transferProductSearch.set('');
    this.showTransferProductDropdown.set(false);
    this.transferFormSubmitted.set(false);
    this.transferSaving.set(false);
  }

  /** Open QR scan modal for transfer product barcode scanning */
  async openTransferProductScan() {
    const mobileUi = this.isMobileUi();
    const sessionId = this.scanSessionService.generateSessionId();
    const baseUrl = this.resolveScanBaseUrl();
    this.scanUrl.set(`${baseUrl}/scan-relay?sessionId=${sessionId}&purpose=TRANSFER_PRODUCT&scanOnly=1`);
    this.showQrScanModal.set(!mobileUi);

    this.scanSub?.unsubscribe();
    this.scanSub = this.scanSessionService.scan$.subscribe(async (event) => {
      if (event.purpose === 'TRANSFER_PRODUCT') {
        const product = await this.productService.getProductByBarcode(event.code);
        if (product) {
          this.selectTransferProduct(product);
          this.showQrScanModal.set(false);
          this.scanConnected.set(false);
          void this.scanSessionService.stop();
          setTimeout(() => {
            const qtyInput = document.getElementById('transfer-quantity') as HTMLInputElement;
            qtyInput?.focus();
          }, 100);
        } else {
          this.displayToast('Produit non trouvé pour le code-barres: ' + event.code, 'error');
        }
      }
    });

    try {
      await this.scanSessionService.joinSession(sessionId);
      this.scanConnected.set(true);

      if (mobileUi) {
        const opened = this.openMobileScannerTab(this.scanUrl());
        if (!opened) {
          this.displayToast('Impossible d\'ouvrir le scanner. Autorisez les popups puis réessayez.', 'error');
        }
      }
    } catch (err) {
      console.error('[Transfer] SignalR connection failed', err);
    }
  }

  private isMobileUi(): boolean {
    const viewportMobile = window.matchMedia('(max-width: 1024px)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const touchCapable = (navigator.maxTouchPoints ?? 0) > 0;
    const ua = navigator.userAgent || '';
    const uaMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i.test(ua);
    return viewportMobile || uaMobile || coarsePointer || touchCapable;
  }

  private openMobileScannerTab(scanUrl: string): boolean {
    const opened = window.open(scanUrl, '_blank', 'noopener,noreferrer');
    return !!opened;
  }

  updateTransferField(field: string, value: string | number) {
    this.transferFormData.update(data => {
      const updated = { ...data, [field]: value };
      // When source changes, clear product (may not be in stock at new source)
      if (field === 'sourceSiteId') {
        this.clearTransferProduct();
        // Also clear dest if it matches source
        if (String(data.destSiteId) === String(value)) {
          updated.destSiteId = '';
        }
      }
      return updated;
    });
  }

  onTransferProductSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.transferProductSearch.set(input.value);
    this.showTransferProductDropdown.set(true);
    if (this.transferSelectedProduct() && input.value !== this.transferSelectedProduct()!.nom) {
      this.transferSelectedProduct.set(null);
      this.updateTransferField('productId', '');
      this.updateTransferField('productName', '');
    }
  }

  selectTransferProduct(product: Product) {
    this.transferSelectedProduct.set(product);
    this.transferProductSearch.set(product.nom);
    this.showTransferProductDropdown.set(false);
    this.updateTransferField('productId', String(product.id_p));
    this.updateTransferField('productName', product.nom);
  }

  clearTransferProduct() {
    this.transferSelectedProduct.set(null);
    this.transferProductSearch.set('');
    this.transferFormData.update(d => ({ ...d, productId: '', productName: '' }));
  }

  async saveTransfer() {
    if (!this.canManageMovements()) return;

    this.transferFormSubmitted.set(true);

    if (!this.isTransferFormValid()) return;
    if (this.transferSaving()) return;

    this.transferSaving.set(true);

    try {
      const form = this.transferFormData();
      const sourceSite = this.sites().find(s => String(s.id) === String(form.sourceSiteId));
      const destSite = this.sites().find(s => String(s.id) === String(form.destSiteId));
      const product = this.transferSelectedProduct()!;
      const currentUser = this.authService.currentUser();

      await this.movementService.addMovement({
        dateMouvement: new Date(),
        raison: 'transfer_magasin',
        quantite: form.quantity,
        note: form.notes || undefined,
        produitNom: product.nom,
        siteNom: sourceSite?.nom || '',
        productId: String(product.id_p),
        siteId: form.sourceSiteId,
        userId: currentUser?.id ? String(currentUser.id) : undefined,
        type: 'transfer',
        utilisateurNom: currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Utilisateur courant',
        destination: form.destSiteId
      });

      this.closeTransferModal();
      await this.movementService.fetchMovements();
      await this.stockService.fetchStocks();

      // Check source stock thresholds after transfer and create alerts
      const sourceStock = this.stockService.getStockForProductSite(String(product.id_p), form.sourceSiteId);
      if (sourceStock) {
        const qty = sourceStock.quantiteDisponible;
        const stockId = String(sourceStock.id);
        if (qty <= 0) {
          await this.alertService.createAlertApi({
            type: 'OUT_OF_STOCK',
            message: `Rupture de stock: "${product.nom}" au magasin "${sourceSite?.nom}" suite à un transfert`,
            dateCreation: new Date(),
            resolue: false,
            severity: 'critical',
            stockId,
            produitNom: product.nom,
            siteNom: sourceSite?.nom
          });
        } else if (sourceStock.seuilMinimum && qty <= sourceStock.seuilMinimum) {
          await this.alertService.createAlertApi({
            type: 'MIN_STOCK',
            message: `Stock minimum atteint: "${product.nom}" au magasin "${sourceSite?.nom}" (${qty} unités) suite à un transfert`,
            dateCreation: new Date(),
            resolue: false,
            severity: 'warning',
            stockId,
            produitNom: product.nom,
            siteNom: sourceSite?.nom
          });
        } else if (sourceStock.seuilAlerte && qty <= sourceStock.seuilAlerte) {
          await this.alertService.createAlertApi({
            type: 'STOCK_ALERTE',
            message: `Seuil d'alerte atteint: "${product.nom}" au magasin "${sourceSite?.nom}" (${qty} unités) suite à un transfert`,
            dateCreation: new Date(),
            resolue: false,
            severity: 'warning',
            stockId,
            produitNom: product.nom,
            siteNom: sourceSite?.nom
          });
        }
      }

      await this.alertService.fetchAlerts();

      this.displayToast('Transfert entre magasins effectué avec succès', 'success');
    } catch (err: any) {
      this.transferSaving.set(false);
      const backendMessage = err?.error?.message;
      this.displayToast(backendMessage || 'Erreur lors du transfert', 'error');
    }
  }

  onProductSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.productSearch.set(input.value);
    this.showProductDropdown.set(true);
    if (this.selectedProduct() && input.value !== this.selectedProduct()!.nom) {
      this.selectedProduct.set(null);
      this.updateFormField('productId', '');
      this.updateFormField('productName', '');
      this.updateFormField('barcode', '');
    }
  }

  selectProduct(product: Product) {
    this.selectedProduct.set(product);
    this.productSearch.set(product.nom);
    this.showProductDropdown.set(false);
    this.updateFormField('productId', String(product.id_p));
    this.updateFormField('productName', product.nom);
    this.updateFormField('barcode', product.codeBarre || '');
  }

  clearSelectedProduct() {
    this.selectedProduct.set(null);
    this.productSearch.set('');
    this.updateFormField('productId', '');
    this.updateFormField('productName', '');
    this.updateFormField('barcode', '');
  }

  updateFormField(field: string, value: string | number) {
    this.formData.update(data => {
      const updated = { ...data, [field]: value };
      if (field === 'siteId' && String(data.destination) === String(value)) {
        updated.destination = '';
      }
      // When site changes in exit mode, clear selected product (it may not be in stock at new site)
      if (field === 'siteId' && this.movementType() === 'exit') {
        this.clearSelectedProduct();
      }
      return updated;
    });
  }
  
  openAddReasonModal(type?: 'entry' | 'exit' | 'transfer') {
    if (!this.canManageMovements()) return;

    this.reasonType.set(type || 'entry');
    this.newCustomReason.set('');
    this.editingReasonValue.set(null);
    this.editingReasonLabel.set('');
    this.reasonError.set('');
    this.showAddReasonModal.set(true);
  }
  
  closeAddReasonModal() {
    this.showAddReasonModal.set(false);
    this.newCustomReason.set('');
    this.editingReasonValue.set(null);
    this.editingReasonLabel.set('');
    this.reasonError.set('');
  }
  
  async saveCustomReason() {
    if (!this.canManageMovements()) return;

    const reason = this.newCustomReason().trim();
    if (!reason) return;

    // Check for duplicates
    if (this.movementService.isDuplicateReason(reason, this.reasonType())) {
      this.reasonError.set('Cette raison existe déjà pour ce type de mouvement.');
      return;
    }
    
    try {
      await this.movementService.addCustomReason(reason, this.reasonType());
      this.newCustomReason.set('');
      this.reasonError.set('');
      this.displayToast('Raison ajoutée avec succès', 'success');
    } catch (err: any) {
      const backendMessage = err?.error?.message;
      this.reasonError.set(backendMessage || 'Erreur lors de l\'ajout de la raison.');
    }
  }

  startEditReason(value: string, label: string) {
    this.editingReasonValue.set(value);
    this.editingReasonLabel.set(label);
    this.reasonError.set('');
  }

  cancelEditReason() {
    this.editingReasonValue.set(null);
    this.editingReasonLabel.set('');
    this.reasonError.set('');
  }

  async saveEditReason() {
    if (!this.canManageMovements()) return;

    const value = this.editingReasonValue();
    const newLabel = this.editingReasonLabel().trim();
    if (!value || !newLabel) return;

    // Check for duplicates (exclude current)
    if (this.movementService.isDuplicateReason(newLabel, this.reasonType(), value)) {
      this.reasonError.set('Cette raison existe déjà pour ce type de mouvement.');
      return;
    }

    try {
      await this.movementService.updateCustomReason(value, newLabel);
      this.editingReasonValue.set(null);
      this.editingReasonLabel.set('');
      this.reasonError.set('');
      this.displayToast('Raison modifiée avec succès', 'success');
    } catch (err: any) {
      const backendMessage = err?.error?.message;
      this.reasonError.set(backendMessage || 'Erreur lors de la modification de la raison.');
    }
  }

  async deleteCustomReason(value: string) {
    if (!this.canManageMovements()) return;

    try {
      await this.movementService.deleteCustomReason(value);
      this.displayToast('Raison supprimée', 'success');
    } catch (err: any) {
      const backendMessage = err?.error?.message;
      this.reasonError.set(backendMessage || 'Erreur lors de la suppression de la raison.');
    }
  }

  async saveMovement() {
    if (!this.canManageMovements()) return;

    this.formSubmitted.set(true);

    if (!this.isFormValid()) return;
    if (this.isSaving()) return;

    this.isSaving.set(true);

    try {
      const form = this.formData();
      const remainingCapacity = this.entryCapacityLeft();
      if (this.movementType() === 'entry' && remainingCapacity !== null && form.quantity > remainingCapacity) {
        this.isSaving.set(false);
        this.displayToast(`Quantité invalide: capacité restante ${remainingCapacity} avant seuil maximum`, 'error');
        return;
      }
      const site = this.sites().find(s => String(s.id) === String(form.siteId));
      const product = this.selectedProduct()!;
      const productId = String(product.id_p);
      const currentUser = this.authService.currentUser();

      await this.movementService.addMovement({
        dateMouvement: new Date(),
        raison: form.reason as MovementReason,
        quantite: form.quantity,
        note: form.notes || undefined,
        produitNom: form.productName,
        siteNom: site?.nom || '',
        productId: productId,
        siteId: form.siteId,
        stockId: form.stockId || undefined,
        userId: currentUser?.id ? String(currentUser.id) : undefined,
        type: this.movementType(),
        utilisateurNom: currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Utilisateur courant',
        destination: this.movementType() === 'exit' ? form.destination || undefined : undefined
      });

      this.closeModal();
      await this.movementService.fetchMovements();
      await this.stockService.fetchStocks();
      await this.alertService.fetchAlerts();

      this.displayToast(
        this.movementType() === 'entry'
          ? 'Entrée de stock enregistrée avec succès'
          : 'Sortie de stock enregistrée avec succès',
        'success'
      );
    } catch (err: any) {
      this.isSaving.set(false);
      const backendMessage = err?.error?.message;
      this.displayToast(backendMessage || 'Erreur lors de l\'enregistrement du mouvement', 'error');
    }
  }

  private displayToast(message: string, type: 'success' | 'error') {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.showToast.set(true);
    this.toastTimeout = setTimeout(() => this.showToast.set(false), 4000);
  }

  dismissToast() {
    this.showToast.set(false);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  formatMovementRef(movement: MouvementStock): string {
    const typeCode = movement.type === 'entry' ? 'ENT' : movement.type === 'transfer' ? 'TRF' : 'SOR';
    const d = new Date(movement.dateMouvement);
    const dateCode = d.getFullYear().toString().substring(2) + 
                     (d.getMonth() + 1).toString().padStart(2, '0') +
                     d.getDate().toString().padStart(2, '0');
    const idStr = String(movement.id).replace(/[^a-zA-Z0-9]/g, '');
    const idHash = idStr.substring(0, 4).toUpperCase();
    return `${typeCode}-${dateCode}-${idHash}`;
  }

  getSiteTypeLabel(type: string): string {
    return this.siteService.getSiteTypeLabel(type);
  }

  getSiteName(siteId: string | undefined): string {
    if (!siteId) return '-';
    const needle = String(siteId).toLowerCase();
    const allSites = this.sites();
    // Try to match by site ID
    const byId = allSites.find(s => String(s.id).toLowerCase() === needle);
    if (byId) return byId.nom;
    // Try to match by site name (for values already stored as names)
    const byName = allSites.find(s => s.nom.toLowerCase() === needle);
    if (byName) return byName.nom;
    // Check if value looks like a GUID (deleted site) vs a plain name
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (guidPattern.test(siteId)) {
      return 'Site supprimé';
    }
    // It's a plain name stored directly — return as-is
    return siteId;
  }

  getSiteType(siteId: string | undefined): string {
    if (!siteId) return '';
    const site = this.sites().find(s => String(s.id) === String(siteId));
    return site ? this.getSiteTypeLabel(site.type) : '';
  }

  getReasonLabel(reason: MovementReason): string {
    return this.movementService.getReasonLabel(reason);
  }

  getReasonsByType(type: 'entry' | 'exit' | 'transfer') {
    return this.movementService.getReasonsByType(type);
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

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
