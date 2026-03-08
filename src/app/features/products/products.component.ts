/**
 * Products Component
 * Displays and manages the product inventory.
 * Allows searching, filtering by status, and switching between grid and list views.
 */

import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { Product } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {
  /** Search input value */
  searchTerm = signal('');
  
  /** Selected status filter */
  selectedStatus = signal('all');
  
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

  /** Inline add category state */
  isAddingCategory = signal(false);

  /** New category input value */
  newCategoryName = signal('');
  
  /** Product form */
  productForm!: FormGroup;
  
  /** All categories */
  categories = computed(() => this.categoryService.getCategories()());
  
  /** All products from service */
  products = computed(() => this.productService.getProducts()());
  
  /** Filtered and searched products */
  filteredProducts = computed(() => {
    let filtered = this.products();
    
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(p => 
        p.nom.toLowerCase().includes(search)
      );
    }
    
    const status = this.selectedStatus();
    if (status !== 'all') {
      filtered = filtered.filter(p => (p as any).status === status);
    }
    
    return filtered;
  });

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}
  listCategories: Category[] = [];
  listProducts: Product[] = [];

  ngOnInit(): void {
    this.initForm();
    this.getCategories(); 
    this.getproducts();
    console.log('ProductsComponent initialized',this.listProducts.length);
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
      codeBarre: ['']
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
  onStatusChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedStatus.set(select.value);
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
      codeBarre: ''
    });
    this.showModal.set(true);
  }

  /**
   * Open modal to edit existing product
   * @param product Product to edit
   */
  openEditModal(product: Product) {
    this.isEditMode.set(true);
    this.productForm.patchValue(product);
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

  async deleteCategory(id: string | number) {
    if (!id) return;
    const category = this.listCategories.find(c => String(c.id_c) === String(id));
    const name = category?.categorieLibelle ?? 'cette catégorie';
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${name}" ?`)) return;

    await this.categoryService.deleteCategoryApi(id);
    this.productForm.patchValue({ id_c: null });
    this.getCategories();
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

    if (this.isEditMode()) {
      await this.productService.updateProduct(formValue.id_p, {
        nom: formValue.nom,
        description: formValue.description ?? '',
        codeBarre: formValue.codeBarre,
        prix: formValue.prix,
        id_c: formValue.id_c,
        categorieLibelle
      });
    } else {
      const newProduct: Omit<Product, 'id_p'> = {
        nom: formValue.nom,
        description: formValue.description ?? '',
        codeBarre: formValue.codeBarre,
        prix: formValue.prix,
        id_c: formValue.id_c,
        categorieLibelle
      };
      await this.productService.addProduct(newProduct);
    }

    this.closeModal();
    this.getproducts();
  }

  /**
   * Delete product
   * @param productId Product ID to delete
   */
  async deleteProduct(productId: string | number) {
    if (confirm('Are you sure you want to delete this product?')) {
      await this.productService.deleteProduct(productId);
      this.getproducts();
    }
  }

  getProductImage(product: Product): string | null {
    return (product as { imageUrl?: string }).imageUrl ?? null;
  }

  /**
   * Generate unique ID for new product
   */
  private generateId(): string {
    return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
