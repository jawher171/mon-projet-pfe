import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Product, ProductFilter } from '../models/product.model';
import { API_BASE_URL } from '../../app.config';

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
  imageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  // Signal Angular réactif : contient tous les produits mis en cache localement
  private products = signal<Product[]>([]);

  private dtoToProduct(d: ProductDto): Product {
    const categoryId = d.categorieId ?? d.id_c ?? '';
    return {
      id_p: d.id ?? d.id_p ?? '',
      nom: d.nom,
      description: d.description,
      codeBarre: d.codeBarre,
      prix: Number(d.prix ?? 0),
      id_c: categoryId,
      categorieLibelle: d.categorieLibelle,
      imageUrl: d.imageUrl
    };
  }

  private productToDto(p: Partial<Product> & { imageUrl?: string }): ProductDto {
    const dto: ProductDto = {
      id_p: p.id_p ? String(p.id_p) : undefined,
      nom: p.nom ?? '',
      description: p.description ?? '',
      codeBarre: p.codeBarre,
      prix: p.prix ?? 0,
      id_c: p.id_c,
      categorieLibelle: p.categorieLibelle
    };
    if (p.imageUrl !== undefined) dto.imageUrl = p.imageUrl;
    return dto;
  }

  getProducts() {
    return this.products;
  }
  getProduit() {
    return this.http.get<Product[]>(`${API_BASE_URL}/api/Products/GetProducts`);
  }

  // Importe les produits depuis l'API et met à jour le Signal local
  async fetchProducts(filter?: ProductFilter): Promise<Product[]> {
    const dtos = await firstValueFrom(this.http.get<ProductDto[]>(`${API_BASE_URL}/api/Products/GetProducts`));
    const mapped = (dtos ?? []).map(d => this.dtoToProduct(d));
    this.products.set(mapped);

    let filtered = this.products();
    if (filter?.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.nom.toLowerCase().includes(search) ||
        (p.codeBarre?.toLowerCase().includes(search) ?? false)
      );
    }
    if (filter?.id_c != null) {
      filtered = filtered.filter(p => String(p.id_c) === String(filter.id_c));
    }
    return filtered;
  }

  async getProduct(id: string | number): Promise<Product | undefined> {
    const dto = await firstValueFrom(this.http.get<ProductDto>(`${API_BASE_URL}/api/Products/GetProduct/${id}`));
    return dto ? this.dtoToProduct(dto) : undefined;
  }

  async addProduct(product: Omit<Product, 'id_p'>): Promise<Product> {
    const dto = this.productToDto(product as Product);
    const result = await firstValueFrom(this.http.post<ProductDto>(`${API_BASE_URL}/api/Products/AddProduct`, dto));
    const created = this.dtoToProduct(result);
    this.products.update(products => [...products, created]);
    return created;
  }

  async updateProduct(id: string | number, updates: Partial<Product>): Promise<void> {
    const current = this.products().find(p => String(p.id_p) === String(id));
    const merged = { ...current, ...updates, id_p: id };
    const dto = this.productToDto(merged as Product);
    const result = await firstValueFrom(this.http.put<ProductDto>(`${API_BASE_URL}/api/Products/UpdateProduct`, dto));
    const updated = this.dtoToProduct(result);
    this.products.update(products =>
      products.map(p => (String(p.id_p) === String(id) ? updated : p))
    );
  }

  async deleteProduct(id: string | number): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/Products/DeleteProduct/${id}`));
    this.products.update(products => products.filter(p => String(p.id_p) !== String(id)));
  }

  /**
   * Recherche un produit via son Code-Barre.
   * Optimisation (Cache-First) : regarde d'abord en mémoire locale (très rapide).
   * Fallback : interroge l'API si le code barre n'est pas dans le cache.
   */
  async getProductByBarcode(code: string): Promise<Product | null> {
    // 1. Cherche dans le Signal local
    const local = this.products().find(
      p => p.codeBarre != null && p.codeBarre.trim().toLowerCase() === code.trim().toLowerCase()
    );
    if (local) return local;

    // 2. Cherche en base de données si inconnu
    try {
      const dto = await firstValueFrom(
        this.http.get<ProductDto>(`${API_BASE_URL}/api/Products/by-barcode/${encodeURIComponent(code)}`)
      );
      return dto ? this.dtoToProduct(dto) : null;
    } catch {
      return null;
    }
  }
}
