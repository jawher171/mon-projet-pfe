import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Category } from '../models/category.model';
import { API_BASE_URL, USE_BACKEND } from '../../app.config';

interface CategoryDto {
  id?: string | number;
  libelle: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private categories = signal<Category[]>([
    { id: 1, libelle: 'Électronique' },
    { id: 2, libelle: 'Consommables' },
    { id: 3, libelle: 'Pièces de rechange' }
  ]);

  getCategories() {
    return this.categories;
  }

  private dtoToCategory(dto: CategoryDto): Category {
    return {
      id: dto.id ?? this.generateId(),
      libelle: dto.libelle
    };
  }

  async fetchCategories(): Promise<Category[]> {
    if (USE_BACKEND) {
      const dtos = await firstValueFrom(this.http.get<CategoryDto[]>(`${API_BASE_URL}/api/Categories/GetCategories`));
      const mapped = (dtos ?? []).map(d => this.dtoToCategory(d));
      this.categories.set(mapped);
      return mapped;
    }

    await this.delay(300);
    return this.categories();
  }

  async getCategory(id: string | number): Promise<Category | undefined> {
    if (USE_BACKEND) {
      const dto = await firstValueFrom(this.http.get<CategoryDto>(`${API_BASE_URL}/api/Categories/GetCategory/${id}`));
      return dto ? this.dtoToCategory(dto) : undefined;
    }

    await this.delay(200);
    return this.categories().find(c => String(c.id) === String(id));
  }

  addCategorySync(libelle: string): Category {
    const normalized = libelle.trim();
    const existing = this.categories().find(
      c => c.libelle.toLowerCase() === normalized.toLowerCase()
    );

    if (existing) {
      return existing;
    }

    const newCategory: Category = {
      id: this.generateId(),
      libelle: normalized
    };

    this.categories.update(categories => [...categories, newCategory]);
    return newCategory;
  }

  async addCategoryApi(libelle: string): Promise<Category> {
    const normalized = libelle.trim();
    const existing = this.categories().find(
      c => c.libelle.toLowerCase() === normalized.toLowerCase()
    );
    if (existing) return existing;

    if (USE_BACKEND) {
      const dto = { libelle: normalized };
      const result = await firstValueFrom(
        this.http.post<CategoryDto>(`${API_BASE_URL}/api/Categories/AddCategory`, dto)
      );
      const created = this.dtoToCategory(result);
      this.categories.update(categories => [...categories, created]);
      return created;
    }
    return this.addCategorySync(normalized);
  }

  /** Update an existing category */
  async updateCategoryApi(id: string | number, libelle: string): Promise<Category> {
    const normalized = libelle.trim();
    if (USE_BACKEND) {
      const dto = { id: String(id), libelle: normalized };
      const result = await firstValueFrom(
        this.http.put<CategoryDto>(`${API_BASE_URL}/api/Categories/UpdateCategory`, dto)
      );
      const updated = this.dtoToCategory(result);
      this.categories.update(cats => cats.map(c => String(c.id) === String(id) ? updated : c));
      return updated;
    }
    // Local mode
    const updated: Category = { id, libelle: normalized };
    this.categories.update(cats => cats.map(c => String(c.id) === String(id) ? updated : c));
    return updated;
  }

  /** Delete a category */
  async deleteCategoryApi(id: string | number): Promise<boolean> {
    if (USE_BACKEND) {
      await firstValueFrom(
        this.http.delete(`${API_BASE_URL}/api/Categories/DeleteCategory/${id}`)
      );
    }
    this.categories.update(cats => cats.filter(c => String(c.id) !== String(id)));
    return true;
  }

  private generateId(): number {
    const maxId = this.categories().reduce((max, category) => {
      const numericId = Number(category.id);
      return Number.isFinite(numericId) ? Math.max(max, numericId) : max;
    }, 0);

    return maxId + 1;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
