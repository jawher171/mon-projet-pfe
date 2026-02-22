import { Injectable, signal } from '@angular/core';
import { Category } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private categories = signal<Category[]>([
    { id: 1, libelle: 'Électronique' },
    { id: 2, libelle: 'Consommables' },
    { id: 3, libelle: 'Pièces de rechange' }
  ]);

  getCategories() {
    return this.categories;
  }

  async fetchCategories(): Promise<Category[]> {
    await this.delay(300);
    return this.categories();
  }

  async getCategory(id: string | number): Promise<Category | undefined> {
    await this.delay(200);
    return this.categories().find(c => String(c.id) === String(id));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
