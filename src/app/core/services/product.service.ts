import { Injectable, signal } from '@angular/core';
import { Product, ProductFilter } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private products = signal<Product[]>([]);
  
  constructor() {}

  getProducts() {
    return this.products;
  }

  async fetchProducts(filter?: ProductFilter): Promise<Product[]> {
    // Simulate API call
    await this.delay(500);
    let filtered = this.products();
    
    if (filter?.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.sku.toLowerCase().includes(search)
      );
    }
    
    if (filter?.categoryId) {
      filtered = filtered.filter(p => p.categoryId === filter.categoryId);
    }
    
    if (filter?.status) {
      filtered = filtered.filter(p => p.status === filter.status);
    }
    
    return filtered;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    await this.delay(300);
    return this.products().find(p => p.id === id);
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    await this.delay(500);
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.products.update(products => [...products, newProduct]);
    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    await this.delay(500);
    this.products.update(products => 
      products.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p)
    );
    return (await this.getProduct(id))!;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.delay(500);
    this.products.update(products => products.filter(p => p.id !== id));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
