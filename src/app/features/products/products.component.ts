/**
 * Products Component
 * Displays and manages the product inventory.
 * Allows searching, filtering by status, and switching between grid and list views.
 */

import { Component, OnInit, OnDestroy, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { ScanSessionService } from '../../core/services/scan-session.service';
import { QrScanModalComponent } from '../../shared/components/qr-scan-modal.component';
import { Product } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, QrScanModalComponent],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit, OnDestroy {
  /** Search input value */
  searchTerm = signal('');
  
  /** Selected category filter */
  selectedCategory = signal('all');
  
  /** Current view mode (grid or list) */
  viewMode = signal<'grid' | 'list'>('grid');
  
  /** Modal state */
  showModal = signal(false);
  
  /** Edit mode flag */
  isEditMode = signal(false);

  /** Details modal state */
  showDetailsModal = signal(false);

  /** Selected product for details */
  selectedProduct = signal<Product | null>(null);

  // Delete confirmation modal
  showDeleteModal = signal(false);
  productToDelete = signal<Product | null>(null);
  categoryToDelete = signal<{ id: string | number; name: string } | null>(null);
  deleting = signal(false);

  /** Inline add category state */
  isAddingCategory = signal(false);

  /** New category input value */
  newCategoryName = signal('');

  /** QR scan modal for barcode field */
  showQrScanModal = signal(false);
  scanSessionId = signal('');
  scanUrl = signal('');
  scanConnected = signal(false);
  private scanSub?: Subscription;
  private scanSessionService: ScanSessionService;

  /** Product form */
  productForm!: FormGroup;
  
  /** All categories */
  categories = computed(() => this.categoryService.getCategories()());
  
  /** All products from service */
  products = computed(() => this.productService.getProducts()());
  
  /** Filtered and searched products */
  filteredProducts = computed(() => {
    let filtered = this.productsList();
    
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(p => 
        p.nom.toLowerCase().includes(search)
      );
    }
    
    const category = this.selectedCategory();
    if (category !== 'all') {
      filtered = filtered.filter(p => String(p.id_c) === category);
    }
    
    return filtered;
  });

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    scanSessionService: ScanSessionService
  ) {
    this.scanSessionService = scanSessionService;
  }
  listCategories: Category[] = [];
  listProducts: Product[] = [];
  productsList = signal<Product[]>([]);

  ngOnInit(): void {
    this.initForm();
    this.getCategories(); 
    this.getproducts();
    console.log('ProductsComponent initialized',this.listProducts.length);
   }

  ngOnDestroy(): void {
    this.scanSub?.unsubscribe();
    void this.scanSessionService.stop();
  }

  /** Open QR modal to scan barcode from phone */
  async openBarcodeScan() {
    const sessionId = this.scanSessionService.generateSessionId();
    this.scanSessionId.set(sessionId);
    const baseUrl = this.resolveScanBaseUrl();
    this.scanUrl.set(`${baseUrl}/scan?sessionId=${sessionId}&purpose=PRODUCT_BARCODE`);
    this.showQrScanModal.set(true);

    // Listen for scan events
    this.scanSub?.unsubscribe();
    this.scanSub = this.scanSessionService.scan$.subscribe(event => {
      if (event.purpose === 'PRODUCT_BARCODE') {
        this.productForm.patchValue({ codeBarre: event.code });
        this.showQrScanModal.set(false);
        void this.scanSessionService.stop();
        this.cdr.detectChanges();
      }
    });

    try {
      await this.scanSessionService.joinSession(sessionId);
      this.scanConnected.set(true);
    } catch (err) {
      console.error('[Products] SignalR connection failed', err);
    }
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

  closeQrScanModal() {
    this.showQrScanModal.set(false);
    this.scanConnected.set(false);
    this.scanSub?.unsubscribe();
    void this.scanSessionService.stop();
  }

getCategories() {
     this.categoryService.getCtegories().subscribe(categories => {
      this.listCategories = categories as Category[];
      this.cdr.detectChanges();
     });
}
getproducts() {
     this.productService.getProduit().subscribe(products => {
      this.listProducts = products as Product[];
      this.productsList.set(this.listProducts);
      this.cdr.detectChanges();
     });
}
  /**
   * Initialize product form
   */
  static noNumbers(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    return /\d/.test(control.value) ? { noNumbers: true } : null;
  }

  initForm() {
    this.productForm = this.fb.group({
      id_p: [''],
      nom: ['', [Validators.required, ProductsComponent.noNumbers]],
      description: [''],
      id_c: [null, Validators.required],
      prix: [0, [Validators.required, Validators.min(0)]],
      codeBarre: [''],
      imageUrl: ['']
    });
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
   * Handle status filter change
   * @param event Select change event
   */
  onCategoryChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedCategory.set(select.value);
  }

  /**
   * Toggle between grid and list view modes
   */
  toggleViewMode() {
    this.viewMode.update(mode => mode === 'grid' ? 'list' : 'grid');
  }

  /**
   * Open modal to add new product
   */
  openAddModal() {
    this.isEditMode.set(false);
    this.productForm.reset({
      id_p: '',
      prix: 0,
      nom: '',
      description: '',
      id_c: null,
      codeBarre: '',
      imageUrl: ''
    });
    this.showModal.set(true);
  }

  /**
   * Open modal to edit existing product
   * @param product Product to edit
   */
  openEditModal(product: Product) {
    this.isEditMode.set(true);
    this.productForm.patchValue({
      ...product,
      imageUrl: (product as { imageUrl?: string }).imageUrl ?? ''
    });
    this.showModal.set(true);
  }

  /**
   * Open details modal for a product
   */
  openDetailsModal(product: Product) {
    this.selectedProduct.set(product);
    this.showDetailsModal.set(true);
  }

  /**
   * Close modal
   */
  closeModal() {
    this.showModal.set(false);
    this.productForm.reset();
    this.cancelAddCategory();
  }

  /**
   * Close details modal
   */
  closeDetailsModal() {
    this.showDetailsModal.set(false);
    this.selectedProduct.set(null);
  }

  startAddCategory() {
    this.isAddingCategory.set(true);
    this.newCategoryName.set('');
  }

  onNewCategoryInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.newCategoryName.set(input.value);
  }

  cancelAddCategory() {
    this.isAddingCategory.set(false);
    this.newCategoryName.set('');
  }

  async addCategoryFromForm() {
    const libelle = this.newCategoryName().trim();
    if (!libelle) {
      return;
    }

    const category = await this.categoryService.addCategoryApi(libelle);
    this.productForm.patchValue({ id_c: category.id_c });
    this.productForm.get('id_c')?.markAsTouched();
    this.getCategories();
    this.cancelAddCategory();
  }

  deleteCategory(id: string | number) {
    if (!id) return;
    const category = this.listCategories.find(c => String(c.id_c) === String(id));
    const name = category?.categorieLibelle ?? 'cette catégorie';
    this.categoryToDelete.set({ id, name });
    this.showDeleteModal.set(true);
  }

  /**
   * Handle form submission
   */
  async onSubmit() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const formValue = this.productForm.value;
    const category = this.categories().find(c => String(c.id_c) === String(formValue.id_c));
    const categorieLibelle = category?.categorieLibelle ?? 'Unknown';

    const imageUrl = formValue.imageUrl || undefined;
    if (this.isEditMode()) {
      await this.productService.updateProduct(formValue.id_p, {
        nom: formValue.nom,
        description: formValue.description ?? '',
        codeBarre: formValue.codeBarre,
        prix: formValue.prix,
        id_c: formValue.id_c,
        categorieLibelle,
        ...(imageUrl && { imageUrl })
      } as Partial<Product>);
    } else {
      const newProduct: Omit<Product, 'id_p'> & { imageUrl?: string } = {
        nom: formValue.nom,
        description: formValue.description ?? '',
        codeBarre: formValue.codeBarre,
        prix: formValue.prix,
        id_c: formValue.id_c,
        categorieLibelle
      };
      if (imageUrl) (newProduct as { imageUrl?: string }).imageUrl = imageUrl;
      await this.productService.addProduct(newProduct);
    }

    this.closeModal();
    this.getproducts();
  }

  /**
   * Delete product
   * @param productId Product ID to delete
   */
  deleteProduct(productId: string | number) {
    const product = this.listProducts.find(p => String(p.id_p) === String(productId))
      ?? this.products().find(p => String(p.id_p) === String(productId));
    if (product) {
      this.productToDelete.set(product);
      this.showDeleteModal.set(true);
    }
  }

  cancelDelete() {
    this.showDeleteModal.set(false);
    this.productToDelete.set(null);
    this.categoryToDelete.set(null);
  }

  async confirmDelete() {
    this.deleting.set(true);
    try {
      const product = this.productToDelete();
      const category = this.categoryToDelete();
      if (product) {
        await this.productService.deleteProduct(product.id_p);
        this.getproducts();
      } else if (category) {
        await this.categoryService.deleteCategoryApi(category.id);
        this.productForm.patchValue({ id_c: null });
        this.getCategories();
      }
    } finally {
      this.deleting.set(false);
      this.cancelDelete();
    }
  }

  getProductImage(product: Product): string | null {
    return (product as { imageUrl?: string }).imageUrl ?? null;
  }

  /** Handle image file selection from PC */
  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5 Mo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.productForm.patchValue({ imageUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  /** Clear selected image */
  clearImage(event: Event, input?: HTMLInputElement) {
    event.preventDefault();
    event.stopPropagation();
    this.productForm.patchValue({ imageUrl: '' });
    if (input) input.value = '';
  }

  /**
   * Generate unique ID for new product
   */
  private generateId(): string {
    return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
