/**
 * Category Service
 * Manages product categories with support for hierarchical category structures.
 * Provides methods to fetch, organize, and manage product categories.
 */

import { Injectable, signal } from '@angular/core';
import { Category, CategoryTree } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  /** All product categories */
  private categories = signal<Category[]>([]);

  constructor() {}

  /**
   * Get all categories signal
   * @returns Signal containing all categories
   */
  /**
   * Fetch all categories (simulates API call)
   * @returns Promise resolving to array of categories
   */
  getCategories() {
    return this.categories;
  }

  async fetchCategories(): Promise<Category[]> {
  /**
   * Get category by ID
   * @param id Category identifier
   * @returns Promise resolving to category or undefined if not found
   */
    await this.delay(300);
    return this.categories();
  }

  /**
   * Get categories organized in hierarchical tree structure
   * Root categories (no parent) are at top level with children nested
   * @returns Array of root categories with nested children
   */
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
}
