/**
 * Stock Movement Service
 * Tracks all inventory movements including purchases, sales, transfers, and adjustments.
 * Provides filtering and summary statistics for stock movements.
 */

import { Injectable, signal, computed } from '@angular/core';
import { StockMovement, MovementFilter, MovementSummary, MovementReason, MOVEMENT_REASONS } from '../models/movement.model';

@Injectable({
  providedIn: 'root'
})
export class MovementService {
  /** All stock movements */
  private movementsSignal = signal<StockMovement[]>([]);
  
  /** Custom reasons added by users */
  private customReasonsSignal = signal<{ value: string; label: string; type: 'entry' | 'exit' }[]>([]);

  /**
   * Get all movements signal
   * @returns Signal containing all stock movements
   */
  getMovements() {
    return this.movementsSignal;
  }

  /**
   * Get movements filtered by multiple criteria
   * Sorts by most recent date first
   * @param filter Movement filter criteria
   * @returns Computed signal of filtered and sorted movements
   */
  getFilteredMovements(filter: MovementFilter) {
    return computed(() => {
      let movements = this.movementsSignal();

      if (filter.search) {
        const search = filter.search.toLowerCase();
        movements = movements.filter(m =>
          m.movementNumber.toLowerCase().includes(search) ||
          m.productName.toLowerCase().includes(search)
        );
      }

      if (filter.type && filter.type !== 'all') {
        movements = movements.filter(m => m.type === filter.type);
      }

      if (filter.reason) {
        movements = movements.filter(m => m.reason === filter.reason);
      }

      if (filter.siteId) {
        movements = movements.filter(m => m.siteId === filter.siteId);
      }

      if (filter.productId) {
        movements = movements.filter(m => m.productId === filter.productId);
      }

      if (filter.startDate) {
        movements = movements.filter(m => new Date(m.performedAt) >= filter.startDate!);
      }

      if (filter.endDate) {
        movements = movements.filter(m => new Date(m.performedAt) <= filter.endDate!);
      }

      return movements.sort((a, b) => 
        new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
      );
    });
  }

  /**
   * Get a specific movement by ID
   * @param id Movement identifier
   * @returns Movement object or undefined if not found
   */
  getMovementById(id: string): StockMovement | undefined {
    return this.movementsSignal().find(m => m.id === id);
  }

  /**
   * Record a new stock movement
   * @param movement Movement data without auto-generated fields
   * @returns Created movement object
   */
  addMovement(movement: Omit<StockMovement, 'id' | 'movementNumber' | 'createdAt' | 'updatedAt'>): StockMovement {
    const newMovement: StockMovement = {
      ...movement,
      id: this.generateId(),
      movementNumber: this.generateMovementNumber(movement.type),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.movementsSignal.update(movements => [newMovement, ...movements]);
    return newMovement;
  }

  /**
   * Update an existing movement
   * @param id Movement identifier
   * @param updates Partial movement data to update
   * @returns true if successful, false if movement not found
   */
  updateMovement(id: string, updates: Partial<StockMovement>): boolean {
    const index = this.movementsSignal().findIndex(m => m.id === id);
    if (index === -1) return false;

    this.movementsSignal.update(movements => {
      const updated = [...movements];
  /**
   * Delete a movement record
   * @param id Movement identifier
   * @returns true if successful, false if movement not found
   */
      updated[index] = { ...updated[index], ...updates, updatedAt: new Date() };
      return updated;
    });
    return true;
  }

  deleteMovement(id: string): boolean {
    const index = this.movementsSignal().findIndex(m => m.id === id);
    if (index === -1) return false;
/**
   * Get movement summary statistics
   * Includes entries/exits counts and top moving products
   * @param siteId Optional site filter
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @returns Movement summary object
   */
  
    this.movementsSignal.update(movements => movements.filter(m => m.id !== id));
    return true;
  }

  getMovementSummary(siteId?: string, startDate?: Date, endDate?: Date): MovementSummary {
    let movements = this.movementsSignal();

    if (siteId) {
      movements = movements.filter(m => m.siteId === siteId);
    }

    if (startDate) {
      movements = movements.filter(m => new Date(m.performedAt) >= startDate);
    }

    if (endDate) {
      movements = movements.filter(m => new Date(m.performedAt) <= endDate);
    }

    const entries = movements.filter(m => m.type === 'entry');
    const exits = movements.filter(m => m.type === 'exit');

    const productMap = new Map<string, { productName: string; entries: number; exits: number }>();
    movements.forEach(m => {
      const existing = productMap.get(m.productId) || { productName: m.productName, entries: 0, exits: 0 };
      if (m.type === 'entry') {
        existing.entries += m.quantity;
      } else {
        existing.exits += m.quantity;
      }
      productMap.set(m.productId, existing);
    });

    const topMovingProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.productName,
        entries: data.entries,
        exits: data.exits
      }))
  /**
   * Get user-friendly label for movement reason
   * @param reason Movement reason enum value
   * @returns Label string or reason if not found
   */
      .sort((a, b) => (b.entries + b.exits) - (a.entries + a.exits))
      .slice(0, 5);

    return {
  /**
   * Get movement reasons filtered by type
   * @param type Movement type (entry or exit)
   * @returns Array of reasons for the specified type
   */
      totalEntries: entries.length,
      totalExits: exits.length,
      entriesQuantity: entries.reduce((sum, m) => sum + m.quantity, 0),
      exitsQuantity: exits.reduce((sum, m) => sum + m.quantity, 0),
      netChange: entries.reduce((sum, m) => sum + m.quantity, 0) - exits.reduce((sum, m) => sum + m.quantity, 0),
      topMovingProducts
    };
  }

  getReasonLabel(reason: MovementReason): string {
    const baseReason = MOVEMENT_REASONS.find(r => r.value === reason);
    if (baseReason) return baseReason.label;
    
    const customReason = this.customReasonsSignal().find(r => r.value === reason);
    return customReason?.label || reason;
  }

  getReasonsByType(type: 'entry' | 'exit') {
    const baseReasons = MOVEMENT_REASONS.filter(r => r.type === type);
    const customReasons = this.customReasonsSignal().filter(r => r.type === type);
    
    return [...baseReasons, ...customReasons];
  }
  
  /**
   * Add a custom reason to the list
   * @param label Custom reason label
   * @param type Movement type (entry or exit)
   * @returns Generated reason value
   */
  addCustomReason(label: string, type: 'entry' | 'exit'): string {
    const value = `custom_${type}_${Date.now()}`;
    this.customReasonsSignal.update(reasons => [
      ...reasons,
      { value, label, type }
    ]);
    return value;
  }
  
  /**
   * Get all custom reasons
   * @returns Signal of custom reasons
   */
  getCustomReasons() {
    return this.customReasonsSignal;
  }

  /**
   * Calculate current stock quantity for a product at a specific site
   * Based on movement history only (entries - exits)
   * @param productId Product identifier
   * @param siteId Site identifier
   * @returns Current stock quantity
   */
  getCurrentStock(productId: string, siteId: string): number {
    const movements = this.movementsSignal().filter(
      m => m.productId === productId && m.siteId === siteId
    );

    return movements.reduce((total, movement) => {
      return movement.type === 'entry' 
        ? total + movement.quantity 
        : total - movement.quantity;
    }, 0);
  }

  /**
   * Calculate total stock quantity for a product across all sites
   * @param productId Product identifier
   * @returns Total stock quantity
   */
  getTotalStock(productId: string): number {
    const movements = this.movementsSignal().filter(m => m.productId === productId);

    return movements.reduce((total, movement) => {
      return movement.type === 'entry' 
        ? total + movement.quantity 
        : total - movement.quantity;
    }, 0);
  }

  /**
   * Get stock breakdown by site for a product
   * @param productId Product identifier
   * @returns Array of stock by site
   */
  getStockBySite(productId: string): { siteId: string; siteName: string; quantity: number }[] {
    const movements = this.movementsSignal().filter(m => m.productId === productId);
    const siteMap = new Map<string, { siteName: string; quantity: number }>();

    movements.forEach(movement => {
      const existing = siteMap.get(movement.siteId) || { siteName: movement.siteName, quantity: 0 };
      existing.quantity = movement.type === 'entry' 
        ? existing.quantity + movement.quantity 
        : existing.quantity - movement.quantity;
      siteMap.set(movement.siteId, existing);
    });

    return Array.from(siteMap.entries()).map(([siteId, data]) => ({
      siteId,
      siteName: data.siteName,
      quantity: data.quantity
    }));
  }

  private generateId(): string {
    return 'mov_' + Math.random().toString(36).substring(2, 11);
  }

  private generateMovementNumber(type: 'entry' | 'exit'): string {
    const prefix = type === 'entry' ? 'ENT' : 'SOR';
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${dateStr}-${random}`;
  }
}
