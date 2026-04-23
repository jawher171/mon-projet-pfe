/**
 * Stock Service - Diagram: quantiteDisponible, seuilAlerte
 * Bridge between Product and Site (multi-magasin).
 * Backend manages Stock entity.
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Stock } from '../models/stock.model';
import { API_BASE_URL } from '../../app.config';

interface StockDto {
  id_s?: string;
  id?: string;
  quantiteDisponible: number;
  seuilAlerte: number;
  seuilSecurite?: number;
  seuilMinimum?: number;
  seuilMaximum?: number;
  id_p?: string;
  produitId?: string;
  id_site?: string;
  siteId?: string;
  produitNom?: string;
  siteNom?: string;
}

@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly http = inject(HttpClient);
  private stocksSignal = signal<Stock[]>([]);

  getStocks() {
    return this.stocksSignal;
  }

  private dtoToStock(dto: StockDto): Stock {
    return {
      id: dto.id ?? dto.id_s ?? '',
      quantiteDisponible: dto.quantiteDisponible ?? 0,
      seuilAlerte: dto.seuilAlerte ?? 0,
      seuilSecurite: dto.seuilSecurite ?? 0,
      seuilMinimum: dto.seuilMinimum ?? 0,
      seuilMaximum: dto.seuilMaximum ?? 0,
      produitId: dto.produitId ?? dto.id_p ?? '',
      siteId: dto.siteId ?? dto.id_site ?? '',
      produitNom: dto.produitNom,
      siteNom: dto.siteNom
    };
  }

  async fetchStocks(): Promise<Stock[]> {
    const dtos = await firstValueFrom(
      this.http.get<StockDto[]>(`${API_BASE_URL}/api/Stocks/GetStocks`)
    );
    const mapped = (dtos ?? []).map(d => this.dtoToStock(d));
    this.stocksSignal.set(mapped);
    return mapped;
  }

  async fetchStocksBySite(siteId: string): Promise<Stock[]> {
    const dtos = await firstValueFrom(
      this.http.get<StockDto[]>(`${API_BASE_URL}/api/Stocks/GetStocksBySite/${siteId}`)
    );
    const mapped = (dtos ?? []).map(d => this.dtoToStock(d));
    return mapped;
  }


  /** Update a stock entry (seuils, etc.) via PUT */
  async updateStock(stock: Stock): Promise<Stock> {
    const computedSeuilAlerte = (stock.seuilMinimum ?? 0) + (stock.seuilSecurite ?? 0);
    const normalizedStock: Stock = { ...stock, seuilAlerte: computedSeuilAlerte };
    const body = {
      id_s: String(normalizedStock.id),
      quantiteDisponible: normalizedStock.quantiteDisponible,
      seuilAlerte: normalizedStock.seuilAlerte,
      seuilSecurite: normalizedStock.seuilSecurite,
      seuilMinimum: normalizedStock.seuilMinimum,
      seuilMaximum: normalizedStock.seuilMaximum,
      id_p: String(normalizedStock.produitId),
      id_site: String(normalizedStock.siteId)
    };
    const dto = await firstValueFrom(
      this.http.put<StockDto>(`${API_BASE_URL}/api/Stocks/UpdateStock`, body)
    );
    const mapped = this.dtoToStock(dto);
    // Update local cache
    const current = this.stocksSignal();
    const idx = current.findIndex(s => String(s.id) === String(mapped.id));
    if (idx >= 0) {
      const updated = [...current];
      updated[idx] = mapped;
      this.stocksSignal.set(updated);
    }
    return mapped;
  }

  /** Add a new stock entry via POST */
  async addStock(stock: Omit<Stock, 'id'>): Promise<Stock> {
    const computedSeuilAlerte = (stock.seuilMinimum ?? 0) + (stock.seuilSecurite ?? 0);
    const normalizedStock = { ...stock, seuilAlerte: computedSeuilAlerte };
    const body = {
      quantiteDisponible: normalizedStock.quantiteDisponible,
      seuilAlerte: normalizedStock.seuilAlerte,
      seuilSecurite: normalizedStock.seuilSecurite,
      seuilMinimum: normalizedStock.seuilMinimum,
      seuilMaximum: normalizedStock.seuilMaximum,
      id_p: String(normalizedStock.produitId),
      id_site: String(normalizedStock.siteId)
    };
    const dto = await firstValueFrom(
      this.http.post<StockDto>(`${API_BASE_URL}/api/Stocks/AddStock`, body)
    );
    const mapped = this.dtoToStock(dto);
    this.stocksSignal.update(list => [mapped, ...list]);
    return mapped;
  }

  /** Delete a stock entry via DELETE */
  async deleteStock(id: string): Promise<boolean> {
    await firstValueFrom(
      this.http.delete(`${API_BASE_URL}/api/Stocks/DeleteStock/${id}`)
    );
    this.stocksSignal.update(list => list.filter(s => String(s.id) !== id));
    return true;
  }

  /** Get stock for a specific product at a specific site */
  getStockForProductSite(productId: string | number, siteId: string | number): Stock | undefined {
    return this.stocksSignal().find(
      s => String(s.produitId) === String(productId) && String(s.siteId) === String(siteId)
    );
  }

  /** Get all stock entries for a product (across all sites) */
  getStocksByProduct(productId: string | number): Stock[] {
    return this.stocksSignal().filter(s => String(s.produitId) === String(productId));
  }

  /** Get all stock entries for a site */
  getStocksBySite(siteId: string | number): Stock[] {
    return this.stocksSignal().filter(s => String(s.siteId) === String(siteId));
  }

  /** Low stock items (quantiteDisponible <= seuilAlerte) */
  getLowStockItems = computed(() => {
    return this.stocksSignal().filter(s => s.quantiteDisponible <= s.seuilAlerte && s.seuilAlerte > 0);
  });

  /** Total stock quantity across all entries */
  getTotalQuantity = computed(() => {
    return this.stocksSignal().reduce((sum, s) => sum + s.quantiteDisponible, 0);
  });

  /** Stock statistics */
  getStockStats = computed(() => {
    const stocks = this.stocksSignal();
    const lowStock = stocks.filter(s => s.quantiteDisponible <= s.seuilAlerte && s.seuilAlerte > 0);
    const outOfStock = stocks.filter(s => s.quantiteDisponible === 0);
    return {
      totalEntries: stocks.length,
      totalQuantity: stocks.reduce((sum, s) => sum + s.quantiteDisponible, 0),
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length
    };
  });
}
