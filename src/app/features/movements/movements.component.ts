/**
 * Movements Component
 * Manages stock movements (entries and exits).
 * Allows recording, viewing, and filtering inventory transactions.
 */

import { Component, signal, computed, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MovementService } from '../../core/services/movement.service';
import { SiteService } from '../../core/services/site.service';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';
import { MouvementStock, MouvementFilter, MovementReason } from '../../core/models/movement.model';

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movements.component.html',
  styleUrls: ['./movements.component.scss']
})
export class MovementsComponent implements OnInit {
  // Filter signals
  /** Search term for movement number or product name */
  searchTerm = signal('');
  
  /** Filter by movement type (entry/exit) */
  selectedType = signal<'all' | 'entry' | 'exit'>('all');
  
  /** Filter by site location */
  selectedSite = signal('');
  
  /** Filter by movement reason */
  selectedReason = signal<MovementReason | ''>('');
  
  // Modal states
  /** Show/hide new movement modal */
  showModal = signal(false);
  
  /** Modal mode: add new or view existing */
  modalMode = signal<'add' | 'view'>('add');
  
  /** Currently selected movement */
  selectedMovement = signal<MouvementStock | null>(null);
  
  /** Type for new movement */
  movementType = signal<'entry' | 'exit'>('entry');
  
  // Form data
  /** Form fields for new movement */
  formData = signal({
    stockId: '',
    productId: '',
    productName: '',
    quantity: 0,
    reason: '' as MovementReason | '',
    siteId: '',
    reference: '',
    barcode: '',
    notes: ''
  });
  
  /** Show add custom reason modal */
  showAddReasonModal = signal(false);
  
  /** Type of reason being added */
  reasonType = signal<'entry' | 'exit'>('entry');
  
  /** New custom reason input */
  newCustomReason = signal('');

  // Product selection
  /** Search term for product dropdown */
  productSearch = signal('');
  
  /** Whether the product dropdown is visible */
  showProductDropdown = signal(false);
  
  /** Currently selected product */
  selectedProduct = signal<Product | null>(null);
  
  /** All available products from service */
  allProducts = computed(() => this.productService.getProducts()());
  
  /** Filtered products based on search */
  filteredProducts = computed(() => {
    const search = this.productSearch().toLowerCase();
    const products = this.allProducts();
    if (!search) return products;
    return products.filter(p =>
      p.nom.toLowerCase().includes(search) ||
      (p.codeBarre?.toLowerCase().includes(search) ?? false) ||
      (p.categorieLibelle?.toLowerCase().includes(search) ?? false)
    );
  });

  // Get data from services
  sites = computed(() => this.siteService.getActiveSites()());
  
  filter = computed<MouvementFilter>(() => ({
    search: this.searchTerm(),
    type: this.selectedType() === 'all' ? undefined : this.selectedType(),
    siteId: this.selectedSite() || undefined,
    reason: this.selectedReason() || undefined
  }));

  movements = computed(() => this.movementService.getFilteredMovements(this.filter())());
  summary = computed(() => this.movementService.getMovementSummary());

  constructor(
    private movementService: MovementService,
    private siteService: SiteService,
    private productService: ProductService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Read query params from SiteStocksComponent navigation
    const params = this.route.snapshot.queryParams;
    if (params['mode'] && (params['mode'] === 'entry' || params['mode'] === 'exit')) {
      const mode = params['mode'] as 'entry' | 'exit';
      this.movementType.set(mode);
      this.modalMode.set('add');

      // Pre-fill form from query params
      const stockId = params['stockId'] ?? '';
      const siteId = params['siteId'] ?? '';
      const productId = params['productId'] ?? '';
      const productName = params['productName'] ?? '';
      const siteName = params['siteName'] ?? '';

      this.formData.update(f => ({
        ...f,
        stockId,
        siteId,
        productId,
        productName
      }));

      // Try to find the product to set selectedProduct
      if (productId) {
        const product = this.allProducts().find(p => String(p.id) === String(productId));
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

  /**
   * Handle search input changes
   * @param event Input change event
   */
  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  /**
   * Filter by movement type (entry/exit)
   * @param type Selected movement type
   */
  /**
   * Handle site filter change
   * @param event Select change event
   */
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
      notes: ''
    });
    this.selectedProduct.set(null);
    this.productSearch.set('');
    this.showProductDropdown.set(false);
  }

  /**
   * Handle product search input
   */
  onProductSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.productSearch.set(input.value);
    this.showProductDropdown.set(true);
    // Clear selection if user modifies the search
    if (this.selectedProduct() && input.value !== this.selectedProduct()!.nom) {
      this.selectedProduct.set(null);
      this.updateFormField('productId', '');
      this.updateFormField('productName', '');
      this.updateFormField('barcode', '');
    }
  }

  /**
   * Select a product from the dropdown
   */
  selectProduct(product: Product) {
    this.selectedProduct.set(product);
    this.productSearch.set(product.nom);
    this.showProductDropdown.set(false);
    this.updateFormField('productId', String(product.id));
    this.updateFormField('productName', product.nom);
    this.updateFormField('barcode', product.codeBarre || '');
  }

  /**
   * Remove the selected product
   */
  clearSelectedProduct() {
    this.selectedProduct.set(null);
    this.productSearch.set('');
    this.updateFormField('productId', '');
    this.updateFormField('productName', '');
    this.updateFormField('barcode', '');
  }

  updateFormField(field: string, value: string | number) {
    this.formData.update(data => ({ ...data, [field]: value }));
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

  saveMovement() {
    const form = this.formData();
    const site = this.sites().find(s => s.id === form.siteId);
    const product = this.selectedProduct();
    
    if (!product || !form.quantity || !form.reason || !form.siteId) {
      return;
    }

    const productId = String(product.id);
    
    // Calculate current stock from movement history
    const previousStock = this.movementService.getCurrentStock(productId, form.siteId);
    
    // Calculate new stock after this movement
    const newStock = this.movementType() === 'entry' 
      ? previousStock + form.quantity 
      : previousStock - form.quantity;

    this.movementService.addMovement({
      dateMouvement: new Date(),
      raison: form.reason as MovementReason,
      quantite: form.quantity,
      note: form.notes || undefined,
      produitNom: form.productName,
      siteNom: site?.nom || '',
      productId: productId,
      siteId: form.siteId,
      type: this.movementType(),
      utilisateurNom: 'Utilisateur courant'
    });

    this.closeModal();
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
