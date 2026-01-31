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
  private movementsSignal = signal<StockMovement[]>(this.getMockMovements());

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
          m.productName.toLowerCase().includes(search) ||
          m.productSku.toLowerCase().includes(search)
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
    return MOVEMENT_REASONS.find(r => r.value === reason)?.label || reason;
  }

  getReasonsByType(type: 'entry' | 'exit') {
    return MOVEMENT_REASONS.filter(r => r.type === type);
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

  private getMockMovements(): StockMovement[] {
    const now = new Date();
    return [
      {
        id: 'mov_001',
        movementNumber: 'ENT-202601-0001',
        type: 'entry',
        reason: 'purchase',
        productId: 'prod_001',
        productName: 'Laptop Dell XPS 15',
        productSku: 'DELL-XPS15-001',
        quantity: 50,
        previousStock: 25,
        newStock: 75,
        siteId: 'site_001',
        siteName: 'Entrepôt Principal',
        warehouseZone: 'Zone A',
        reference: 'PO-2026-001',
        supplierId: 'sup_001',
        supplierName: 'Dell Technologies',
        barcode: '1234567890123',
        notes: 'Livraison commande mensuelle',
        performedBy: 'Ahmed Ben Ali',
        performedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
      },
      {
        id: 'mov_002',
        movementNumber: 'SOR-202601-0001',
        type: 'exit',
        reason: 'sale',
        productId: 'prod_002',
        productName: 'Souris Sans Fil Logitech',
        productSku: 'LOG-MX-001',
        quantity: 15,
        previousStock: 120,
        newStock: 105,
        siteId: 'site_002',
        siteName: 'Magasin Centre Ville',
        orderId: 'ord_001',
        orderNumber: 'SO-2026-045',
        barcode: '2345678901234',
        performedBy: 'Fatima Zahra',
        performedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000)
      },
      {
        id: 'mov_003',
        movementNumber: 'ENT-202601-0002',
        type: 'entry',
        reason: 'transfer_in',
        productId: 'prod_003',
        productName: 'Clavier Mécanique RGB',
        productSku: 'KB-MECH-001',
        quantity: 30,
        previousStock: 10,
        newStock: 40,
        siteId: 'site_002',
        siteName: 'Magasin Centre Ville',
        reference: 'TR-2026-001',
        notes: 'Transfert depuis entrepôt principal',
        performedBy: 'Mohamed Salah',
        performedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000)
      },
      {
        id: 'mov_004',
        movementNumber: 'SOR-202601-0002',
        type: 'exit',
        reason: 'damaged',
        productId: 'prod_004',
        productName: 'Écran 27" 4K Samsung',
        productSku: 'SAM-MON27-001',
        quantity: 2,
        previousStock: 45,
        newStock: 43,
        siteId: 'site_001',
        siteName: 'Entrepôt Principal',
        warehouseZone: 'Zone B',
        notes: 'Dommages lors du transport',
        performedBy: 'Karim Benzema',
        performedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000)
      },
      {
        id: 'mov_005',
        movementNumber: 'ENT-202601-0003',
        type: 'entry',
        reason: 'return_supplier',
        productId: 'prod_005',
        productName: 'Casque Audio Bose',
        productSku: 'BOSE-QC45-001',
        quantity: 5,
        previousStock: 30,
        newStock: 35,
        siteId: 'site_001',
        siteName: 'Entrepôt Principal',
        supplierId: 'sup_002',
        supplierName: 'Bose Corporation',
        reference: 'RET-2026-001',
        notes: 'Retour produits défectueux remplacés',
        performedBy: 'Leila Khaldi',
        performedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000)
      },
      {
        id: 'mov_006',
        movementNumber: 'SOR-202601-0003',
        type: 'exit',
        reason: 'internal_use',
        productId: 'prod_006',
        productName: 'Câble HDMI 2m',
        productSku: 'CBL-HDMI-2M',
        quantity: 10,
        previousStock: 200,
        newStock: 190,
        siteId: 'site_003',
        siteName: 'Centre Distribution Nord',
        notes: 'Usage bureaux administratifs',
        performedBy: 'Youssef Amrani',
        performedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }
    ];
  }
}
