import { Injectable, signal } from '@angular/core';
import { Category, CategoryTree } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private categories = signal<Category[]>(this.getMockCategories());

  constructor() {}

  getCategories() {
    return this.categories;
  }

  async fetchCategories(): Promise<Category[]> {
    await this.delay(300);
    return this.categories();
  }

  async getCategory(id: string): Promise<Category | undefined> {
    await this.delay(200);
    return this.categories().find(c => c.id === id);
  }

  getCategoryTree(): CategoryTree[] {
    const categories = this.categories();
    const categoryMap = new Map<string, CategoryTree>();
    const roots: CategoryTree[] = [];

    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    categoryMap.forEach(cat => {
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children!.push(cat);
        }
      } else {
        roots.push(cat);
      }
    });

    return roots;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getMockCategories(): Category[] {
    return [
      {
        id: '1',
        name: 'Electronics',
        description: 'Electronic devices and accessories',
        icon: 'devices',
        color: '#2196F3',
        productCount: 45,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: '2',
        name: 'Furniture',
        description: 'Office and home furniture',
        icon: 'chair',
        color: '#4CAF50',
        productCount: 23,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: '3',
        name: 'Office Supplies',
        description: 'Stationery and office materials',
        icon: 'inventory',
        color: '#FF9800',
        productCount: 67,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15')
      }
    ];
  }
}
