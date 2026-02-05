/**
 * Products Component
 * Displays and manages the product inventory.
 * Allows searching, filtering by status, and switching between grid and list views.
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
        p.name.toLowerCase().includes(search)
      );
    }
    
    const status = this.selectedStatus();
    if (status !== 'all') {
      filtered = filtered.filter(p => p.status === status);
    }
    
    return filtered;
  });

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  /**
   * Initialize product form
   */
  initForm() {
    this.productForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      description: [''],
      categoryId: ['', Validators.required],
      category: [''],
      supplier: [''],
      supplierId: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      cost: [0, [Validators.required, Validators.min(0)]],
      location: [''],
      barcode: [''],
      imageUrl: [''],
      status: ['active', Validators.required]
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
      price: 0,
      cost: 0,
      status: 'active'
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
   * Close modal
   */
  closeModal() {
    this.showModal.set(false);
    this.productForm.reset();
  }

  /**
   * Handle form submission
   */
  onSubmit() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const formValue = this.productForm.value;
    
    // Get category name from categoryId
    const category = this.categories().find(c => c.id === formValue.categoryId);
    if (category) {
      formValue.category = category.name;
    }

    if (this.isEditMode()) {
      // Update existing product
      this.productService.updateProductSync(formValue.id, formValue);
    } else {
      // Add new product
      const newProduct: Product = {
        ...formValue,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.productService.addProduct(newProduct);
    }

    this.closeModal();
  }

  /**
   * Delete product
   * @param productId Product ID to delete
   */
  deleteProduct(productId: string) {
    if (confirm('Are you sure you want to delete this product?')) {
      this.productService.deleteProductSync(productId);
    }
  }

  /**
   * Generate unique ID for new product
   */
  private generateId(): string {
    return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
