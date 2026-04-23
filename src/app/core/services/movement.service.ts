/**
 * Stock Movement Service
 * Tracks all inventory movements including purchases, sales, transfers, and adjustments.
 * Provides filtering and summary statistics for stock movements.
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MouvementStock, MouvementFilter, MovementSummary, MovementReason, MOVEMENT_REASONS } from '../models/movement.model';
import { API_BASE_URL } from '../../app.config';

interface MovementDto {
  id_sm?: string;
  id?: string;
  dateMouvement: string | Date;
  raison: string;
  quantite: number;
  type?: 'entry' | 'exit' | 'transfer' | string;
  note?: string;
  Id_s?: string;
  Id_u?: string;
  productId?: string;
  siteId?: string;
  produitNom?: string;
  siteNom?: string;
  utilisateurNom?: string;
  destination?: string;
}

interface MovementReasonDto {
  value: string;
  label: string;
  type: 'entry' | 'exit' | 'transfer' | string;
}

@Injectable({
  providedIn: 'root'
})
export class MovementService {
  private readonly http = inject(HttpClient);
  /** All stock movements */
  private movementsSignal = signal<MouvementStock[]>([]);
  
  /** Custom reasons added by users */
  private customReasonsSignal = signal<{ value: string; label: string; type: 'entry' | 'exit' | 'transfer' }[]>([]);

  /**
   * Get all movements signal
   * @returns Signal containing all stock movements
   */
  getMovements() {
    return this.movementsSignal;
  }

  private normalizeReasonType(type: string | undefined): 'entry' | 'exit' | 'transfer' {
    if (type === 'exit') return 'exit';
    if (type === 'transfer') return 'transfer';
    return 'entry';
  }

  private async fetchCustomReasonsFromBackend(): Promise<void> {
    const reasons = await firstValueFrom(
      this.http.get<MovementReasonDto[]>(`${API_BASE_URL}/api/StockMovements/GetMovementReasons`)
    );

    const normalized = (reasons ?? [])
      .filter(r => !!r?.value && !!r?.label)
      .map(r => ({
        value: r.value,
        label: r.label,
        type: this.normalizeReasonType(r.type)
      }));

    this.customReasonsSignal.set(normalized);
  }

  private dtoToMovement(dto: MovementDto): MouvementStock {
    let type: 'entry' | 'exit' | 'transfer' = 'entry';
    if (dto.type === 'exit') type = 'exit';
    else if (dto.type === 'transfer') type = 'transfer';
    return {
      id: dto.id ?? dto.id_sm ?? '',
      dateMouvement: new Date(dto.dateMouvement),
      raison: dto.raison,
      quantite: Number(dto.quantite ?? 0),
      type,
      note: dto.note,
      stockId: dto.Id_s,
      userId: dto.Id_u,
      productId: dto.productId,
      siteId: dto.siteId,
      produitNom: dto.produitNom,
      siteNom: dto.siteNom,
      utilisateurNom: dto.utilisateurNom,
      destination: dto.destination
    };
  }

  async fetchMovements(): Promise<MouvementStock[]> {
    const [dtos] = await Promise.all([
      firstValueFrom(this.http.get<MovementDto[]>(`${API_BASE_URL}/api/StockMovements/GetStockMovements`)),
      this.fetchCustomReasonsFromBackend().catch(() => {
        this.customReasonsSignal.set([]);
      })
    ]);

    const mapped = (dtos ?? []).map(d => this.dtoToMovement(d));
    this.movementsSignal.set(mapped);
    return mapped;
  }

  /**
   * Filtre les mouvements de stock selon plusieurs critères (recherche texte, type, date).
   * Retourne un "computed" Angular pour que la grille UI se mette à jour toute seule.
   * Trie toujours du plus récent au plus ancien.
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
   * Crée un nouveau mouvement de stock (Entrée, Sortie, Transfert)
   * Formate la date et convertit les IDs en chaîne de caractères pour l'API C#.
   */
  async addMovement(movement: Omit<MouvementStock, 'id'>): Promise<MouvementStock> {
    const dto: Partial<MovementDto> = {
      dateMouvement: movement.dateMouvement instanceof Date ? movement.dateMouvement.toISOString() as unknown as Date : movement.dateMouvement,
      raison: movement.raison,
      quantite: movement.quantite,
      type: movement.type ?? 'entry',
      note: movement.note,
      Id_s: movement.stockId ? String(movement.stockId) : undefined,
      Id_u: movement.userId ? String(movement.userId) : undefined,
      productId: movement.productId ? String(movement.productId) : undefined,
      siteId: movement.siteId ? String(movement.siteId) : undefined,
      destination: movement.destination
    };
    const result = await firstValueFrom(
      this.http.post<MovementDto>(`${API_BASE_URL}/api/StockMovements/AddStockMovement`, dto)
    );
    const created = this.dtoToMovement(result);
    this.movementsSignal.update(movements => [created, ...movements]);
    return created;
  }

  /**
   * Update an existing movement
   * @param id Movement identifier
   * @param updates Partial movement data to update
   * @returns true if successful, false if movement not found
   */
  async updateMovement(id: string, updates: Partial<MouvementStock>): Promise<boolean> {
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

  /**
   * Delete a movement record
   * @param id Movement identifier
   * @returns true if successful
   */
  async deleteMovement(id: string): Promise<boolean> {
    await firstValueFrom(
      this.http.delete(`${API_BASE_URL}/api/StockMovements/DeleteStockMovement/${id}`)
    );
    this.movementsSignal.update(movements => movements.filter(m => m.id !== id));
    return true;
  }

  /**
   * Get movement summary statistics
   * @param siteId Optional site filter
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @returns Movement summary object
   */
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
    const transfers = movements.filter(m => m.type === 'transfer');

    const productMap = new Map<string, { productName: string; entries: number; exits: number }>();
    movements.forEach(m => {
      const pid = String(m.productId ?? '');
      const existing = productMap.get(pid) || { productName: m.produitNom ?? '', entries: 0, exits: 0 };
      const qty = m.quantite ?? 0;
      if (m.type === 'exit') {
        existing.exits += qty;
      } else if (m.type === 'entry') {
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
      .sort((a, b) => (b.entries + b.exits) - (a.entries + a.exits))
      .slice(0, 5);

    return {
      totalEntries: entries.length,
      totalExits: exits.length,
      totalTransfers: transfers.length,
      entriesQuantity: entries.reduce((sum, m) => sum + (m.quantite ?? 0), 0),
      exitsQuantity: exits.reduce((sum, m) => sum + (m.quantite ?? 0), 0),
      transfersQuantity: transfers.reduce((sum, m) => sum + (m.quantite ?? 0), 0),
      netChange: entries.reduce((sum, m) => sum + (m.quantite ?? 0), 0) - exits.reduce((sum, m) => sum + (m.quantite ?? 0), 0),
      topMovingProducts
    };
  }

  getReasonLabel(reason: MovementReason): string {
    const baseReason = MOVEMENT_REASONS.find(r => r.value === reason);
    if (baseReason) return baseReason.label;

    const normalizedReason = String(reason ?? '').trim().toLowerCase();
    if (
      normalizedReason === 'transfer_magasin' ||
      normalizedReason === 'transfert_magasin' ||
      normalizedReason === 'transfer_between_stores' ||
      normalizedReason === 'transfert_entre_magasins'
    ) {
      return 'Transfert entre magasins';
    }
    
    const customReason = this.customReasonsSignal().find(r => r.value === reason);
    return customReason?.label || reason;
  }

  getReasonsByType(type: 'entry' | 'exit' | 'transfer') {
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
  async addCustomReason(label: string, type: 'entry' | 'exit' | 'transfer'): Promise<string> {
    const created = await firstValueFrom(
      this.http.post<MovementReasonDto>(`${API_BASE_URL}/api/StockMovements/AddMovementReason`, {
        label,
        type
      })
    );

    const normalized = {
      value: created.value,
      label: created.label,
      type: this.normalizeReasonType(created.type)
    };

    this.customReasonsSignal.update(reasons => {
      const idx = reasons.findIndex(r => r.value === normalized.value);
      if (idx === -1) return [...reasons, normalized];
      const copy = [...reasons];
      copy[idx] = normalized;
      return copy;
    });

    return normalized.value;
  }

  /**
   * Delete a custom reason by value
   */
  async deleteCustomReason(value: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${API_BASE_URL}/api/StockMovements/DeleteMovementReason/${encodeURIComponent(value)}`)
    );

    this.customReasonsSignal.update(reasons => reasons.filter(r => r.value !== value));
  }

  /**
   * Update a custom reason's label
   */
  async updateCustomReason(value: string, newLabel: string): Promise<void> {
    const existing = this.customReasonsSignal().find(r => r.value === value);
    if (!existing) return;

    const updated = await firstValueFrom(
      this.http.put<MovementReasonDto>(`${API_BASE_URL}/api/StockMovements/UpdateMovementReason/${encodeURIComponent(value)}`, {
        value,
        label: newLabel,
        type: existing.type
      })
    );

    const normalized = {
      value: updated.value,
      label: updated.label,
      type: this.normalizeReasonType(updated.type)
    };

    this.customReasonsSignal.update(reasons =>
      reasons.map(r => (r.value === value ? normalized : r))
    );
  }

  /**
   * Check if a reason label already exists for the given type
   */
  isDuplicateReason(label: string, type: 'entry' | 'exit' | 'transfer', excludeValue?: string): boolean {
    const normalizedLabel = label.trim().toLowerCase();
    // Check base reasons
    const baseMatch = MOVEMENT_REASONS.some(r => r.type === type && r.label.toLowerCase() === normalizedLabel);
    if (baseMatch) return true;
    // Check custom reasons
    return this.customReasonsSignal().some(r =>
      r.type === type && r.label.toLowerCase() === normalizedLabel && r.value !== excludeValue
    );
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
}
