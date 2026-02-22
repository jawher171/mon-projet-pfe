import { Injectable, signal } from '@angular/core';
import { Product, ProductFilter } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private products = signal<Product[]>([]);

  getProducts() {
    return this.products;
  }

  async fetchProducts(filter?: ProductFilter): Promise<Product[]> {
    await this.delay(500);
    let filtered = this.products();
    if (filter?.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.nom.toLowerCase().includes(search) ||
        (p.codeBarre?.toLowerCase().includes(search) ?? false)
      );
    }
    if (filter?.categorieId != null) {
      filtered = filtered.filter(p => p.categorieId === filter.categorieId);
    }
    return filtered;
  }

  async getProduct(id: string | number): Promise<Product | undefined> {
    await this.delay(300);
    return this.products().find(p => String(p.id) === String(id));
  }

  addProduct(product: Omit<Product, 'id'>): Product {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString()
    };
    this.products.update(products => [...products, newProduct]);
    return newProduct;
  }

  updateProductSync(id: string | number, updates: Partial<Product>): void {
    this.products.update(products =>
      products.map(p => (String(p.id) === String(id) ? { ...p, ...updates } : p))
    );
  }

  deleteProductSync(id: string | number): void {
    this.products.update(products => products.filter(p => String(p.id) !== String(id)));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
