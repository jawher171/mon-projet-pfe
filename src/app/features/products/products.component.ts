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
  searchTerm = signal('');
  selectedStatus = signal('all');
  viewMode = signal<'grid' | 'list'>('grid');
  
  products = computed(() => this.productService.getProducts()());
  
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

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  onStatusChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedStatus.set(select.value);
  }

  toggleViewMode() {
    this.viewMode.update(mode => mode === 'grid' ? 'list' : 'grid');
  }

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
