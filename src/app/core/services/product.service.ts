import { Injectable, signal } from '@angular/core';
import { Product, ProductFilter } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private products = signal<Product[]>(this.getMockProducts());
  
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

  private getMockProducts(): Product[] {
    return [
      {
        id: '1',
        name: 'Laptop Dell XPS 15',
        description: 'High-performance laptop for professionals',
        sku: 'DELL-XPS15-001',
        category: 'Electronics',
        categoryId: '1',
        supplier: 'Dell Inc.',
        supplierId: '1',
        quantity: 25,
        minQuantity: 5,
        maxQuantity: 50,
        price: 1499.99,
        cost: 1200.00,
        unit: 'piece',
        location: 'Warehouse A - Shelf 3',
        barcode: '1234567890123',
        status: 'active',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20')
      },
      {
        id: '2',
        name: 'Office Chair Ergonomic',
        description: 'Comfortable ergonomic office chair',
        sku: 'CHAIR-ERG-001',
        category: 'Furniture',
        categoryId: '2',
        supplier: 'Office Supplies Co.',
        supplierId: '2',
        quantity: 15,
        minQuantity: 10,
        maxQuantity: 40,
        price: 299.99,
        cost: 180.00,
        unit: 'piece',
        location: 'Warehouse B - Shelf 1',
        status: 'active',
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-18')
      },
      {
        id: '3',
        name: 'Wireless Mouse Logitech',
        description: 'Ergonomic wireless mouse',
        sku: 'LOGI-MX-001',
        category: 'Electronics',
        categoryId: '1',
        supplier: 'Logitech',
        supplierId: '3',
        quantity: 5,
        minQuantity: 15,
        maxQuantity: 100,
        price: 79.99,
        cost: 45.00,
        unit: 'piece',
        location: 'Warehouse A - Shelf 1',
        status: 'active',
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-22')
      }
    ];
  }
}
