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
  selectedType = signal<'all' | 'entry' | 'exit'>('all');
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
  movementType = signal<'entry' | 'exit'>('entry');
  
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
  reasonType = signal<'entry' | 'exit'>('entry');
  newCustomReason = signal('');

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
    private movementService: MovementService,
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
    const sessionId = this.scanSessionService.generateSessionId();
    const baseUrl = this.resolveScanBaseUrl();
    this.scanUrl.set(`${baseUrl}/scan?sessionId=${sessionId}&purpose=MOVEMENT_PRODUCT`);
    this.showQrScanModal.set(true);

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
      }

      this.showModal.set(true);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.product-search-group')) {
      this.showProductDropdown.set(false);
    }
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  onTypeChange(type: 'all' | 'entry' | 'exit') {
    this.selectedType.set(type);
  }

  onSiteChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedSite.set(select.value);
  }
  
  openAddModal(type: 'entry' | 'exit') {
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
  
  openAddReasonModal(type?: 'entry' | 'exit') {
    this.reasonType.set(type || this.movementType());
    this.newCustomReason.set('');
    this.showAddReasonModal.set(true);
  }
  
  closeAddReasonModal() {
    this.showAddReasonModal.set(false);
    this.newCustomReason.set('');
  }
  
  saveCustomReason() {
    const reason = this.newCustomReason().trim();
    if (!reason) return;
    
    this.movementService.addCustomReason(reason, this.reasonType());
    this.closeAddReasonModal();
  }

  async saveMovement() {
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

  truncateId(id: string | number): string {
    const str = String(id);
    if (str.length <= 8) return str;
    return str.substring(0, 8) + '…';
  }

  getSiteTypeLabel(type: string): string {
    return this.siteService.getSiteTypeLabel(type);
  }

  getSiteName(siteId: string | undefined): string {
    if (!siteId) return '-';
    return this.sites().find(s => String(s.id) === String(siteId))?.nom ?? siteId;
  }

  getSiteType(siteId: string | undefined): string {
    if (!siteId) return '';
    const site = this.sites().find(s => String(s.id) === String(siteId));
    return site ? this.getSiteTypeLabel(site.type) : '';
  }

  getReasonLabel(reason: MovementReason): string {
    return this.movementService.getReasonLabel(reason);
  }

  getReasonsByType(type: 'entry' | 'exit') {
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
