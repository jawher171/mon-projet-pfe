/**
 * Products Component
 * Displays and manages the product inventory.
 * Allows searching, filtering by status, and switching between grid and list views.
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
  
  /** All products from service */
  products = computed(() => this.productService.getProducts()());
  
  /** Filtered and searched products */
  filteredProducts = computed(() => {
    let filtered = this.products();
    
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.sku.toLowerCase().includes(search)
      );
    }
    
    const status = this.selectedStatus();
    if (status !== 'all') {
      filtered = filtered.filter(p => p.status === status);
    }
    
    return filtered;
  });

  constructor(private productService: ProductService) {}

  ngOnInit(): void {}

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
   * Determine stock status based on quantity vs min/max thresholds
   * @param product Product to check
   * @returns Stock status: 'low', 'medium', or 'good'
   */
  getStockStatus(product: Product): 'low' | 'medium' | 'good' {
    if (product.quantity <= product.minQuantity) return 'low';
    if (product.quantity <= product.minQuantity * 1.5) return 'medium';
    return 'good';
  }

  getStockLabel(product: Product): string {
    const status = this.getStockStatus(product);
    if (status === 'low') return 'Low Stock';
    if (status === 'medium') return 'Medium Stock';
    return 'In Stock';
  }
}
