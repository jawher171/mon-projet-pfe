import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Product, ProductFilter } from '../models/product.model';
import { API_BASE_URL, USE_BACKEND } from '../../app.config';

interface ProductDto {
  id_p?: string;
  id?: string;
  nom: string;
  description: string;
  codeBarre?: string;
  prix: number;
  id_c?: number | string;
  categorieId?: number | string;
  categorieLibelle?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private products = signal<Product[]>([]);

  private dtoToProduct(d: ProductDto): Product {
    const categoryId = d.categorieId ?? d.id_c ?? '';
    return {
      id: d.id ?? d.id_p ?? '',
      nom: d.nom,
      description: d.description,
      codeBarre: d.codeBarre,
      prix: Number(d.prix ?? 0),
      categorieId: categoryId,
      categorieLibelle: d.categorieLibelle
    };
  }

  private productToDto(p: Partial<Product> & { id?: string | number }): ProductDto {
    return {
      id_p: p.id ? String(p.id) : undefined,
      nom: p.nom ?? '',
      description: p.description ?? '',
      codeBarre: p.codeBarre,
      prix: p.prix ?? 0,
      id_c: p.categorieId,
      categorieLibelle: p.categorieLibelle
    };
  }

  getProducts() {
    return this.products;
  }

  async fetchProducts(filter?: ProductFilter): Promise<Product[]> {
    if (USE_BACKEND) {
      const dtos = await firstValueFrom(this.http.get<ProductDto[]>(`${API_BASE_URL}/api/Products/GetProducts`));
      const mapped = (dtos ?? []).map(d => this.dtoToProduct(d));
      this.products.set(mapped);
    } else {
      await this.delay(500);
    }

    let filtered = this.products();
    if (filter?.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.nom.toLowerCase().includes(search) ||
        (p.codeBarre?.toLowerCase().includes(search) ?? false)
      );
    }
    if (filter?.categorieId != null) {
      filtered = filtered.filter(p => String(p.categorieId) === String(filter.categorieId));
    }
    return filtered;
  }

  async getProduct(id: string | number): Promise<Product | undefined> {
    if (USE_BACKEND) {
      const dto = await firstValueFrom(this.http.get<ProductDto>(`${API_BASE_URL}/api/Products/GetProduct/${id}`));
      return dto ? this.dtoToProduct(dto) : undefined;
    }

    await this.delay(300);
    return this.products().find(p => String(p.id) === String(id));
  }

  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    if (USE_BACKEND) {
      const dto = this.productToDto(product as Product);
      const result = await firstValueFrom(this.http.post<ProductDto>(`${API_BASE_URL}/api/Products/AddProduct`, dto));
      const created = this.dtoToProduct(result);
      this.products.update(products => [...products, created]);
      return created;
    }
    const newProduct: Product = {
      ...product,
      id: Date.now().toString()
    };
    this.products.update(products => [...products, newProduct]);
    return newProduct;
  }

  async updateProduct(id: string | number, updates: Partial<Product>): Promise<void> {
    if (USE_BACKEND) {
      const current = this.products().find(p => String(p.id) === String(id));
      const merged = { ...current, ...updates, id };
      const dto = this.productToDto(merged as Product);
      const result = await firstValueFrom(this.http.put<ProductDto>(`${API_BASE_URL}/api/Products/UpdateProduct`, dto));
      const updated = this.dtoToProduct(result);
      this.products.update(products =>
        products.map(p => (String(p.id) === String(id) ? updated : p))
      );
      return;
    }
    this.products.update(products =>
      products.map(p => (String(p.id) === String(id) ? { ...p, ...updates } : p))
    );
  }

  /** Synchronous local update (kept for offline/local mode compatibility) */
  updateProductSync(id: string | number, updates: Partial<Product>): void {
    this.products.update(products =>
      products.map(p => (String(p.id) === String(id) ? { ...p, ...updates } : p))
    );
  }

  async deleteProduct(id: string | number): Promise<void> {
    if (USE_BACKEND) {
      await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/Products/DeleteProduct/${id}`));
    }
    this.products.update(products => products.filter(p => String(p.id) !== String(id)));
  }

  /** Synchronous local delete (kept for offline/local mode compatibility) */
  deleteProductSync(id: string | number): void {
    this.products.update(products => products.filter(p => String(p.id) !== String(id)));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
