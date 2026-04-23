import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { Category } from '../models/category.model';
import { API_BASE_URL } from '../../app.config';

interface CategoryDto {
  id?: string | number;
  libelle: string;
}


@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private categories = signal<Category[]>([]);

  getCategories() {
    return this.categories;
  }

  private dtoToCategory(dto: CategoryDto): Category {
    return {
      id_c: dto.id ?? this.generateId(),
      categorieLibelle: dto.libelle
    };
  }
  getCtegories(): Observable<Category[]> {
    return this.http.get<CategoryDto[]>(`${API_BASE_URL}/api/Categories/GetCategories`).pipe(
      map(dtos => (dtos ?? []).map(dto => this.dtoToCategory(dto))),
      tap(categories => this.categories.set(categories))
    );
  }

  async fetchCategories(): Promise<Category[]> {
    const dtos = await firstValueFrom(this.http.get<CategoryDto[]>(`${API_BASE_URL}/api/Categories/GetCategories`));
    const mapped = (dtos ?? []).map(d => this.dtoToCategory(d));
    this.categories.set(mapped);
    return mapped;
  }

  async getCategory(id: string | number): Promise<Category | undefined> {
    const dto = await firstValueFrom(this.http.get<CategoryDto>(`${API_BASE_URL}/api/Categories/GetCategory/${id}`));
    return dto ? this.dtoToCategory(dto) : undefined;
  }

  async addCategoryApi(libelle: string): Promise<Category> {
    const normalized = libelle.trim();
    const existing = this.categories().find(
      c => c.categorieLibelle.toLowerCase() === normalized.toLowerCase()
    );
    if (existing) return existing;

    const dto = { libelle: normalized };
    const result = await firstValueFrom(
      this.http.post<CategoryDto>(`${API_BASE_URL}/api/Categories/AddCategory`, dto)
    );
    const created = this.dtoToCategory(result);
    this.categories.update(categories => [...categories, created]);
    return created;
  }

  /** Update an existing category */
  async updateCategoryApi(id: string | number, libelle: string): Promise<Category> {
    const normalized = libelle.trim();
    const dto = { id: String(id), libelle: normalized };
    const result = await firstValueFrom(
      this.http.put<CategoryDto>(`${API_BASE_URL}/api/Categories/UpdateCategory`, dto)
    );
    const updated = this.dtoToCategory(result);
    this.categories.update(cats => cats.map(c => String(c.id_c) === String(id) ? updated : c));
    return updated;
  }

  /** Delete a category */
  async deleteCategoryApi(id: string | number): Promise<boolean> {
    await firstValueFrom(
      this.http.delete(`${API_BASE_URL}/api/Categories/DeleteCategory/${id}`)
    );
    this.categories.update(cats => cats.filter(c => String(c.id_c) !== String(id)));
    return true;
  }

  private generateId(): number {
    const maxId = this.categories().reduce((max, category) => {
      const numericId = Number(category.id_c);
      return Number.isFinite(numericId) ? Math.max(max, numericId) : max;
    }, 0);

    return maxId + 1;
  }
}
