/**
 * Stock Movement Service
 * Tracks all inventory movements including purchases, sales, transfers, and adjustments.
 * Provides filtering and summary statistics for stock movements.
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MouvementStock, MouvementFilter, MovementSummary, MovementReason, MOVEMENT_REASONS } from '../models/movement.model';
import { API_BASE_URL, USE_BACKEND } from '../../app.config';

interface MovementDto {
  id_sm?: string;
  id?: string;
  dateMouvement: string | Date;
  raison: string;
  quantite: number;
  type?: 'entry' | 'exit' | string;
  note?: string;
  Id_s?: string;
  Id_u?: string;
  productId?: string;
  siteId?: string;
  produitNom?: string;
  siteNom?: string;
  utilisateurNom?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MovementService {
  private readonly http = inject(HttpClient);
  /** All stock movements */
  private movementsSignal = signal<MouvementStock[]>([]);
  
  /** Custom reasons added by users */
  private customReasonsSignal = signal<{ value: string; label: string; type: 'entry' | 'exit' }[]>([]);

  /**
   * Get all movements signal
   * @returns Signal containing all stock movements
   */
  getMovements() {
    return this.movementsSignal;
  }

  private dtoToMovement(dto: MovementDto): MouvementStock {
    return {
      id: dto.id ?? dto.id_sm ?? '',
      dateMouvement: new Date(dto.dateMouvement),
      raison: dto.raison,
      quantite: Number(dto.quantite ?? 0),
      type: dto.type === 'exit' ? 'exit' : 'entry',
      note: dto.note,
      stockId: dto.Id_s,
      userId: dto.Id_u,
      productId: dto.productId,
      siteId: dto.siteId,
      produitNom: dto.produitNom,
      siteNom: dto.siteNom,
      utilisateurNom: dto.utilisateurNom
    };
  }

  async fetchMovements(): Promise<MouvementStock[]> {
    if (!USE_BACKEND) {
      return this.movementsSignal();
    }

    const dtos = await firstValueFrom(this.http.get<MovementDto[]>(`${API_BASE_URL}/api/StockMovements/GetStockMovements`));
    const mapped = (dtos ?? []).map(d => this.dtoToMovement(d));
    this.movementsSignal.set(mapped);
    return mapped;
  }

  /**
   * Get movements filtered by multiple criteria
   * Sorts by most recent date first
   * @param filter Movement filter criteria
   * @returns Computed signal of filtered and sorted movements
   */
  getFilteredMovements(filter: MouvementFilter) {
    return computed(() => {
      let movements = this.movementsSignal();

      if (filter.search) {
        const search = filter.search.toLowerCase();
        movements = movements.filter(m =>
          (m.produitNom ?? m.raison ?? '').toLowerCase().includes(search)
        );
      }

      if (filter.type && filter.type !== 'all') {
        movements = movements.filter(m => m.type === filter.type);
      }

      if (filter.raison) {
        movements = movements.filter(m => m.raison === filter.raison);
      }

      if (filter.siteId) {
        movements = movements.filter(m => m.siteId === filter.siteId);
      }

      if (filter.productId) {
        movements = movements.filter(m => m.productId === filter.productId);
      }

      const getDate = (m: MouvementStock) => m.dateMouvement ?? 0;
      if (filter.startDate) {
        movements = movements.filter(m => new Date(getDate(m)).getTime() >= filter.startDate!.getTime());
      }

      if (filter.endDate) {
        movements = movements.filter(m => new Date(getDate(m)).getTime() <= filter.endDate!.getTime());
      }

      return movements.sort((a, b) => 
        new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime()
      );
    });
  }

  /**
   * Get a specific movement by ID
   * @param id Movement identifier
   * @returns Movement object or undefined if not found
   */
  getMovementById(id: string): MouvementStock | undefined {
    return this.movementsSignal().find(m => m.id === id);
  }

  /**
   * Record a new stock movement
   * @param movement Movement data without auto-generated fields
   * @returns Created movement object
   */
  async addMovement(movement: Omit<MouvementStock, 'id'>): Promise<MouvementStock> {
    if (USE_BACKEND) {
      const dto: Partial<MovementDto> = {
        dateMouvement: movement.dateMouvement instanceof Date ? movement.dateMouvement.toISOString() as unknown as Date : movement.dateMouvement,
        raison: movement.raison,
        quantite: movement.quantite,
        type: movement.type ?? 'entry',
        note: movement.note,
        Id_s: movement.stockId ? String(movement.stockId) : undefined,
        Id_u: movement.userId ? String(movement.userId) : undefined,
        productId: movement.productId ? String(movement.productId) : undefined,
        siteId: movement.siteId ? String(movement.siteId) : undefined
      };
      const result = await firstValueFrom(
        this.http.post<MovementDto>(`${API_BASE_URL}/api/StockMovements/AddStockMovement`, dto)
      );
      const created = this.dtoToMovement(result);
      this.movementsSignal.update(movements => [created, ...movements]);
      return created;
    }

    const newMovement: MouvementStock = {
      ...movement,
      id: this.generateId(),
      type: movement.type ?? 'entry'
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
  async updateMovement(id: string, updates: Partial<MouvementStock>): Promise<boolean> {
    if (USE_BACKEND) {
      const current = this.movementsSignal().find(m => m.id === id);
      if (!current) return false;
      const merged = { ...current, ...updates };
      const dto: Partial<MovementDto> = {
        id_sm: String(id),
        dateMouvement: merged.dateMouvement instanceof Date ? merged.dateMouvement.toISOString() as unknown as Date : merged.dateMouvement,
        raison: merged.raison,
        quantite: merged.quantite,
        type: merged.type ?? 'entry',
        note: merged.note,
        Id_u: merged.userId ? String(merged.userId) : undefined
      };
      const result = await firstValueFrom(
        this.http.put<MovementDto>(`${API_BASE_URL}/api/StockMovements/UpdateStockMovement`, dto)
      );
      const updated = this.dtoToMovement(result);
      this.movementsSignal.update(movements => {
        const idx = movements.findIndex(m => m.id === id);
        if (idx === -1) return movements;
        const copy = [...movements];
        copy[idx] = updated;
        return copy;
      });
      return true;
    }

    const index = this.movementsSignal().findIndex(m => m.id === id);
    if (index === -1) return false;

    this.movementsSignal.update(movements => {
      const updated = [...movements];
  /**
   * Delete a movement record
   * @param id Movement identifier
   * @returns true if successful, false if movement not found
   */
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
    return true;
  }

  async deleteMovement(id: string): Promise<boolean> {
    if (USE_BACKEND) {
      await firstValueFrom(
        this.http.delete(`${API_BASE_URL}/api/StockMovements/DeleteStockMovement/${id}`)
      );
      this.movementsSignal.update(movements => movements.filter(m => m.id !== id));
      return true;
    }

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
      movements = movements.filter(m => String(m.siteId) === String(siteId));
    }

    const getDate = (m: MouvementStock) => m.dateMouvement ?? 0;
    if (startDate) {
      movements = movements.filter(m => new Date(getDate(m)).getTime() >= startDate.getTime());
    }

    if (endDate) {
      movements = movements.filter(m => new Date(getDate(m)).getTime() <= endDate.getTime());
    }

    const entries = movements.filter(m => (m.type ?? 'entry') === 'entry');
    const exits = movements.filter(m => m.type === 'exit');

    const productMap = new Map<string, { productName: string; entries: number; exits: number }>();
    movements.forEach(m => {
      const pid = String(m.productId ?? '');
      const existing = productMap.get(pid) || { productName: m.produitNom ?? '', entries: 0, exits: 0 };
      const qty = m.quantite ?? 0;
      if (m.type === 'exit') {
        existing.exits += qty;
      } else {
        existing.entries += qty;
      }
      productMap.set(String(pid), existing);
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
      entriesQuantity: entries.reduce((sum, m) => sum + (m.quantite ?? 0), 0),
      exitsQuantity: exits.reduce((sum, m) => sum + (m.quantite ?? 0), 0),
      netChange: entries.reduce((sum, m) => sum + (m.quantite ?? 0), 0) - exits.reduce((sum, m) => sum + (m.quantite ?? 0), 0),
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
      m => String(m.productId) === String(productId) && String(m.siteId) === String(siteId)
    );

    return movements.reduce((total, movement) => {
      const qty = movement.quantite ?? 0;
      return (movement.type ?? 'entry') === 'entry' ? total + qty : total - qty;
    }, 0);
  }

  /**
   * Calculate total stock quantity for a product across all sites
   * @param productId Product identifier
   * @returns Total stock quantity
   */
  getTotalStock(productId: string): number {
    const movements = this.movementsSignal().filter(m => String(m.productId) === String(productId));

    return movements.reduce((total, movement) => {
      const qty = movement.quantite ?? 0;
      return (movement.type ?? 'entry') === 'entry' ? total + qty : total - qty;
    }, 0);
  }

  /**
   * Get stock breakdown by site for a product
   * @param productId Product identifier
   * @returns Array of stock by site
   */
  getStockBySite(productId: string): { siteId: string; siteName: string; quantity: number }[] {
    const movements = this.movementsSignal().filter(m => String(m.productId) === String(productId));
    const siteMap = new Map<string, { siteName: string; quantity: number }>();

    movements.forEach(movement => {
      const sid = String(movement.siteId ?? '');
      const existing = siteMap.get(sid) || { siteName: movement.siteNom ?? '', quantity: 0 };
      const qty = movement.quantite ?? 0;
      existing.quantity = (movement.type ?? 'entry') === 'entry' ? existing.quantity + qty : existing.quantity - qty;
      siteMap.set(sid, existing);
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
