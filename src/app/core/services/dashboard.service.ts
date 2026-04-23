/**
 * Dashboard Service
 * Orchestrates all existing services to compute replenishment dashboard KPIs.
 * Applies filters (site, category, product, date) to all calculated data and builds Chart.js objects.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, from, of, BehaviorSubject, combineLatest, firstValueFrom } from 'rxjs';
import { switchMap, shareReplay, catchError } from 'rxjs/operators';
import { StockService } from './stock.service';
import { ProductService } from './product.service';
import { AlertService } from './alert.service';
import { MovementService } from './movement.service';
import { SiteService } from './site.service';
import { CategoryService } from './category.service';
import { UserService } from './user.service';
import { DashboardData, ReplenishmentItem, DashboardFilter, ChartData } from '../models/dashboard.model';
import { Stock } from '../models/stock.model';
import { API_BASE_URL } from '../../app.config';

const POLL_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly stockService = inject(StockService);
  private readonly productService = inject(ProductService);
  private readonly alertService = inject(AlertService);
  private readonly movementService = inject(MovementService);
  private readonly siteService = inject(SiteService);
  private readonly categoryService = inject(CategoryService);
  private readonly userService = inject(UserService);

  private readonly filterSubject = new BehaviorSubject<DashboardFilter>({
    dateRange: 'thisMonth'
  });

  private normalizeMovementType(type: string | undefined, reason: string | undefined): 'entry' | 'exit' | 'transfer' | 'unknown' {
    const normalizedType = (type ?? '').toLowerCase();
    if (normalizedType === 'entry' || normalizedType === 'exit' || normalizedType === 'transfer') {
      return normalizedType;
    }

    const normalizedReason = (reason ?? '').toLowerCase();
    if (normalizedReason.includes('transfer') || normalizedReason.includes('transfert')) {
      return 'transfer';
    }
    if (normalizedReason.includes('sortie') || normalizedReason.includes('exit')) {
      return 'exit';
    }
    if (normalizedReason.includes('entree') || normalizedReason.includes('entrée') || normalizedReason.includes('entry')) {
      return 'entry';
    }

    return 'unknown';
  }

  readonly dashboardData$: Observable<DashboardData> = combineLatest([
    timer(0, POLL_INTERVAL_MS),
    this.filterSubject.asObservable()
  ]).pipe(
    switchMap(([_, filter]) => from(this.fetchAllAndCompute(filter))),
    catchError((err) => {
      console.error('Dashboard error:', err);
      return of(this.emptyDashboard());
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  setFilter(filter: DashboardFilter) {
    this.filterSubject.next(filter);
  }

  getCurrentFilter(): DashboardFilter {
    return this.filterSubject.getValue();
  }

  async refresh(): Promise<void> {
    this.filterSubject.next(this.filterSubject.getValue());
  }

  private async fetchAllAndCompute(filter: DashboardFilter): Promise<DashboardData> {
    // VISUALIZATION source (preferred): consume backend ETL snapshot.
    const etlData = await this.fetchFromEtl(filter);
    if (etlData) {
      return etlData;
    }

    const [rawStocks, rawProducts, rawAlerts, rawMovements, rawSites, rawUsers, categories] = await Promise.all([
      this.stockService.fetchStocks(),
      this.productService.fetchProducts(),
      this.alertService.fetchAlerts(),
      this.movementService.fetchMovements(),
      this.siteService.fetchSites(),
      this.userService.fetchUsers(),
      this.categoryService.fetchCategories()
    ]);

    // Build lookup maps
    const priceMap = new Map<string, number>();
    const categoryMap = new Map<string, string>(); // productId -> categoryId
    rawProducts.forEach(p => {
      priceMap.set(String(p.id_p), p.prix ?? 0);
      if (p.id_c) {
        categoryMap.set(String(p.id_p), String(p.id_c));
      }
    });
    
    const categoryNameMap = new Map<string, string>();
    categories.forEach(c => categoryNameMap.set(String(c.id_c), c.categorieLibelle));

    // ─── APPLY FILTERS ───

    let filteredProducts = rawProducts;
    if (filter.categoryId) {
      filteredProducts = filteredProducts.filter(p => String(p.id_c) === filter.categoryId);
    }
    if (filter.productId) {
      filteredProducts = filteredProducts.filter(p => String(p.id_p) === filter.productId);
    }

    let filteredStocks = rawStocks;
    if (filter.siteType) {
      filteredStocks = filteredStocks.filter(s => {
        const site = rawSites.find(rs => String(rs.id) === String(s.siteId));
        return site?.type === filter.siteType;
      });
    }
    if (filter.siteId) {
      filteredStocks = filteredStocks.filter(s => String(s.siteId) === filter.siteId);
    }
    if (filter.productId) {
      filteredStocks = filteredStocks.filter(s => String(s.produitId) === filter.productId);
    }
    if (filter.categoryId) {
      filteredStocks = filteredStocks.filter(s => categoryMap.get(String(s.produitId)) === filter.categoryId);
    }

    const isWithinDateRange = (dateStr: Date | string) => {
      if (!filter.dateRange || filter.dateRange === 'all') return true;
      const d = new Date(dateStr);
      const now = new Date();
      if (filter.dateRange === 'today') {
        return d.toDateString() === now.toDateString();
      } else if (filter.dateRange === '7days') {
        const past = new Date();
        past.setDate(now.getDate() - 7);
        return d >= past;
      } else if (filter.dateRange === '30days') {
        const past = new Date();
        past.setDate(now.getDate() - 30);
        return d >= past;
      } else if (filter.dateRange === 'thisMonth') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    };

    let filteredMovements = rawMovements;
    if (filter.siteType) {
      filteredMovements = filteredMovements.filter(m => {
        const site = rawSites.find(rs => String(rs.id) === String(m.siteId));
        return site?.type === filter.siteType;
      });
    }
    if (filter.siteId) {
      filteredMovements = filteredMovements.filter(m => String(m.siteId) === filter.siteId);
    }
    if (filter.productId) {
      filteredMovements = filteredMovements.filter(m => String(m.productId) === filter.productId);
    }
    if (filter.categoryId) {
      filteredMovements = filteredMovements.filter(m => categoryMap.get(String(m.productId)) === filter.categoryId);
    }
    filteredMovements = filteredMovements.filter(m => isWithinDateRange(m.dateMouvement));

    let filteredAlerts = rawAlerts;
    if (filter.siteId || filter.siteType) {
      filteredAlerts = filteredAlerts.filter(a => {
         const st = rawStocks.find(s => String(s.id) === String(a.stockId));
         if (!st) return false;
         
         let matches = true;
         if (filter.siteType) {
            const site = rawSites.find(rs => String(rs.id) === String(st.siteId));
            if (site?.type !== filter.siteType) matches = false;
         }
         if (filter.siteId && String(st.siteId) !== filter.siteId) {
            matches = false;
         }
         return matches;
      });
    }
    filteredAlerts = filteredAlerts.filter(a => isWithinDateRange(a.dateCreation));

    // ─── COMPUTE KPIs ───

    const totalStockDisponible = filteredStocks.reduce((sum, s) => sum + s.quantiteDisponible, 0);
    const valeurTotaleStock = filteredStocks.reduce((sum, s) => {
      const prix = priceMap.get(String(s.produitId)) ?? 0;
      return sum + (s.quantiteDisponible * prix);
    }, 0);

    const normalizedMovements = filteredMovements.map(m => ({
      movement: m,
      normalizedType: this.normalizeMovementType(m.type, m.raison)
    }));

    const totalEntrees = normalizedMovements.filter(m => m.normalizedType === 'entry').map(m => m.movement);
    const totalSorties = normalizedMovements.filter(m => m.normalizedType === 'exit').map(m => m.movement);
    const totalTransferts = normalizedMovements.filter(m => m.normalizedType === 'transfer').map(m => m.movement);
    const totalMouvementsIgnores = normalizedMovements.filter(m => m.normalizedType === 'unknown').length;
    const totalMouvementsBruts = filteredMovements.length;

    const totalMouvements = totalEntrees.length + totalSorties.length + totalTransferts.length;
    const entreesQuantite = totalEntrees.reduce((sum, m) => sum + (m.quantite ?? 0), 0);
    const sortiesQuantite = totalSorties.reduce((sum, m) => sum + (m.quantite ?? 0), 0);
    const transfertsQuantite = totalTransferts.reduce((sum, m) => sum + (m.quantite ?? 0), 0);
    const netVariationQuantite = entreesQuantite - sortiesQuantite;

    const totalAlerts = filteredAlerts.length;
    const activeAlerts = filteredAlerts.filter(a => !a.resolue);
    const resolvedAlerts = filteredAlerts.filter(a => a.resolue);
    const criticalAlerts = filteredAlerts.filter(a => !a.resolue && (a.severity === 'critical' || a.severity === 'Critical'));
    const tauxResolues = totalAlerts > 0 ? Math.round((resolvedAlerts.length / totalAlerts) * 100) : (filter.dateRange === 'all' ? 100 : 0);

    const topAlertProducts = Array.from(
      activeAlerts.reduce((acc, a) => {
        const key = (a.produitNom ?? 'Produit inconnu').trim() || 'Produit inconnu';
        acc.set(key, (acc.get(key) ?? 0) + 1);
        return acc;
      }, new Map<string, number>())
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topAlertSites = Array.from(
      activeAlerts.reduce((acc, a) => {
        const key = (a.siteNom ?? 'Site inconnu').trim() || 'Site inconnu';
        acc.set(key, (acc.get(key) ?? 0) + 1);
        return acc;
      }, new Map<string, number>())
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const rupture = filteredStocks.filter(s => s.quantiteDisponible === 0);
    const critique = filteredStocks.filter(s => s.quantiteDisponible > 0 && s.quantiteDisponible <= s.seuilMinimum);
    const alerte = filteredStocks.filter(s => s.quantiteDisponible > s.seuilMinimum && s.quantiteDisponible <= s.seuilAlerte);
    const sousSeuil = filteredStocks.filter(s => s.quantiteDisponible <= s.seuilAlerte && s.seuilAlerte > 0);
    const surStock = filteredStocks.filter(s => s.seuilMaximum > 0 && s.quantiteDisponible > s.seuilMaximum);
    const normaux = filteredStocks.length - rupture.length - critique.length - alerte.length - surStock.length;

    const replenishmentItems: ReplenishmentItem[] = filteredStocks
      .map(s => this.stockToReplenishmentItem(s, priceMap))
      .sort((a, b) => {
        const order: Record<string, number> = { rupture: 0, critique: 1, alerte: 2, surstock: 3, normal: 4 };
        return (order[a.status] ?? 4) - (order[b.status] ?? 4);
      });

    const recentMovements = [...normalizedMovements]
      .sort((a, b) => new Date(b.movement.dateMouvement).getTime() - new Date(a.movement.dateMouvement).getTime())
      .slice(0, 10)
      .map(({ movement: m }) => ({
        id: m.id,
        date: new Date(m.dateMouvement),
        type: this.normalizeMovementType(m.type, m.raison),
        produitNom: m.produitNom ?? 'Produit inconnu',
        siteNom: m.siteNom ?? 'Site inconnu',
        quantite: m.quantite,
        raison: m.raison,
        utilisateur: m.utilisateurNom ?? '-'
      }));

    // ─── CHARTS DATA CONSTRUCTION ───
    
    // 1. Stock Health (Doughnut)
    const stockHealthChart: ChartData = {
      labels: ['En Rupture', 'Critiques', 'En Alerte', 'En Sur-stock', 'Normaux'],
      datasets: [{
        data: [rupture.length, critique.length, alerte.length, surStock.length, Math.max(0, normaux)],
        backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#8b5cf6', '#10b981'],
        borderWidth: 0
      }]
    };

    // 2. Stock by Product (Bar)
    const productTotals = new Map<string, number>();
    filteredStocks.forEach(s => {
      const prodName = s.produitNom ?? 'Inconnu';
      productTotals.set(prodName, (productTotals.get(prodName) || 0) + s.quantiteDisponible);
    });
    
    // Sort to show products with highest stock first, limit to top 15 so chart is readable
    const sortedProducts = Array.from(productTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
      
    const prodLabels = sortedProducts.map(item => item[0]);
    const prodData = sortedProducts.map(item => item[1]);
    
    const productStockChart: ChartData = {
      labels: prodLabels.length ? prodLabels : ['Aucune Donnée'],
      datasets: [{
        label: 'Quantité Totale en Stock',
        data: prodData.length ? prodData : [0],
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }]
    };

    // 3. Movement Trends (Line)
    // Build timeline from selected date range to align x-axis with active filter.
    const movementDates = normalizedMovements.map(({ movement }) => new Date(movement.dateMouvement));
    const { start: trendStart, end: trendEnd } = this.resolveMovementTrendBounds(filter.dateRange, movementDates);
    const trendTimeline = this.buildTrendTimeline(trendStart, trendEnd);
    const trendMap = new Map<string, { entries: number, exits: number, transfers: number }>();
    trendTimeline.forEach(point => {
      trendMap.set(point.key, { entries: 0, exits: 0, transfers: 0 });
    });

    normalizedMovements.forEach(({ movement, normalizedType }) => {
      const m = movement;
      const key = this.formatTrendDateKey(new Date(m.dateMouvement));
      if (trendMap.has(key)) {
        const stats = trendMap.get(key)!;
        const qty = Math.abs(m.quantite ?? 0);
        if (normalizedType === 'entry') stats.entries += qty;
        else if (normalizedType === 'exit') stats.exits += qty;
        else if (normalizedType === 'transfer') stats.transfers += qty;
      }
    });

    const trendLabels = trendTimeline.map(point => point.label);
    const entriesData = trendTimeline.map(point => trendMap.get(point.key)!.entries);
    const exitsData = trendTimeline.map(point => trendMap.get(point.key)!.exits);
    const transfersData = trendTimeline.map(point => trendMap.get(point.key)!.transfers);

    const movementTrendChart: ChartData = {
      labels: trendLabels,
      datasets: [
        {
          label: 'Entrées',
          data: entriesData,
          borderColor: '#059669',
          backgroundColor: 'transparent',
          borderWidth: 3,
          fill: false,
          tension: 0.4
        },
        {
          label: 'Sorties',
          data: exitsData,
          borderColor: '#dc2626',
          backgroundColor: 'transparent',
          borderWidth: 3,
          fill: false,
          tension: 0.4
        },
        {
          label: 'Transferts',
          data: transfersData,
          borderColor: '#7c3aed',
          backgroundColor: 'transparent',
          borderWidth: 3,
          fill: false,
          tension: 0.4
        }
      ]
    };

    return {
      totalStockDisponible,
      valeurTotaleStock,
      nombreProduits: filteredProducts.length,
      nombreSitesActifs: rawSites.length, 
      nombreUtilisateursActifs: rawUsers.filter(u => u.status === 'active').length,

      totalMouvements,
      totalMouvementsBruts,
      totalMouvementsIgnores,
      totalEntrees: totalEntrees.length,
      totalSorties: totalSorties.length,
      totalTransferts: totalTransferts.length,
      entreesQuantite,
      sortiesQuantite,
      transfertsQuantite,
      netVariationQuantite,

      totalAlertesActives: activeAlerts.length,
      totalAlertesCritiques: criticalAlerts.length,
      tauxAlertesResolues: totalAlerts === 0 ? 100 : tauxResolues,
      topAlertProducts,
      topAlertSites,

      produitsEnRupture: rupture.length,
      produitsCritiques: critique.length,
      produitsEnAlerte: alerte.length,
      produitsSousSeuil: sousSeuil.length,
      produitsSurStock: surStock.length,
      produitsNormaux: Math.max(0, normaux),

      replenishmentItems,
      recentMovements,

      stockHealthChart,
      productStockChart,
      movementTrendChart,

      lastRefresh: new Date(),
      activeFilter: filter
    };
  }

  private async fetchFromEtl(filter: DashboardFilter): Promise<DashboardData | null> {
    try {
      // VISUALIZATION handoff: request precomputed ETL payload used by charts and KPI cards.
      const params = new URLSearchParams();
      if (filter.siteType) params.set('siteType', filter.siteType);
      if (filter.siteId) params.set('siteId', filter.siteId);
      if (filter.categoryId) params.set('categoryId', filter.categoryId);
      if (filter.productId) params.set('productId', filter.productId);
      if (filter.dateRange) params.set('dateRange', filter.dateRange);

      const query = params.toString();
      const url = query
        ? `${API_BASE_URL}/api/DashboardEtl/GetDashboardEtl?${query}`
        : `${API_BASE_URL}/api/DashboardEtl/GetDashboardEtl`;

      const data = await firstValueFrom(this.http.get<DashboardData>(url));
      if (!data) {
        return null;
      }

      const normalizeText = (value: string | null | undefined): string | undefined => {
        const normalized = (value ?? '').trim();
        return normalized.length > 0 ? normalized : undefined;
      };

      const normalizedActiveFilter: DashboardFilter = {
        siteType: normalizeText((data.activeFilter as any)?.siteType),
        siteId: normalizeText((data.activeFilter as any)?.siteId),
        categoryId: normalizeText((data.activeFilter as any)?.categoryId),
        productId: normalizeText((data.activeFilter as any)?.productId),
        dateRange: (normalizeText((data.activeFilter as any)?.dateRange) as DashboardFilter['dateRange'])
          ?? filter.dateRange
          ?? 'thisMonth'
      };

      return {
        ...data,
        lastRefresh: data.lastRefresh ? new Date(data.lastRefresh) : new Date(),
        activeFilter: normalizedActiveFilter,
        recentMovements: (data.recentMovements ?? []).map(m => ({
          ...m,
          date: new Date(m.date)
        }))
      };
    } catch (error) {
      console.warn('Dashboard ETL endpoint unavailable, fallback to local compute.', error);
      return null;
    }
  }

  private resolveMovementTrendBounds(
    dateRange: DashboardFilter['dateRange'],
    movementDates: Date[]
  ): { start: Date; end: Date } {
    const today = this.startOfDay(new Date());

    if (dateRange === 'today') {
      return { start: today, end: today };
    }

    if (dateRange === '7days') {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start, end: today };
    }

    if (dateRange === '30days') {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start, end: today };
    }

    if (dateRange === 'thisMonth' || !dateRange) {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end: today };
    }

    if (movementDates.length === 0) {
      const start = new Date(today);
      start.setDate(start.getDate() - 9);
      return { start, end: today };
    }

    const minTime = Math.min(...movementDates.map(d => d.getTime()));
    const maxTime = Math.max(...movementDates.map(d => d.getTime()));
    return {
      start: this.startOfDay(new Date(minTime)),
      end: this.startOfDay(new Date(maxTime))
    };
  }

  private buildTrendTimeline(start: Date, end: Date): Array<{ key: string; label: string }> {
    const points: Array<{ key: string; label: string }> = [];
    const cursor = this.startOfDay(new Date(start));
    const endDay = this.startOfDay(new Date(end));

    while (cursor.getTime() <= endDay.getTime()) {
      points.push({
        key: this.formatTrendDateKey(cursor),
        label: this.formatTrendDateLabel(cursor)
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return points;
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatTrendDateKey(date: Date): string {
    const day = this.startOfDay(date);
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatTrendDateLabel(date: Date): string {
    const day = this.startOfDay(date);
    const d = String(day.getDate()).padStart(2, '0');
    const m = String(day.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}`;
  }

  private stockToReplenishmentItem(s: Stock, priceMap: Map<string, number>): ReplenishmentItem {
    let status: ReplenishmentItem['status'] = 'normal';
    if (s.quantiteDisponible === 0) {
      status = 'rupture';
    } else if (s.quantiteDisponible <= s.seuilMinimum) {
      status = 'critique';
    } else if (s.quantiteDisponible <= s.seuilAlerte && s.seuilAlerte > 0) {
      status = 'alerte';
    } else if (s.seuilMaximum > 0 && s.quantiteDisponible > s.seuilMaximum) {
      status = 'surstock';
    }

    const qteAReapprovisionner = s.seuilMaximum > 0
      ? Math.max(0, s.seuilMaximum - s.quantiteDisponible)
      : 0;

    return {
      stockId: s.id,
      produitNom: s.produitNom ?? 'Produit',
      siteNom: s.siteNom ?? 'Site',
      quantiteDisponible: s.quantiteDisponible,
      seuilMinimum: s.seuilMinimum,
      seuilAlerte: s.seuilAlerte,
      seuilMaximum: s.seuilMaximum,
      qteAReapprovisionner,
      status,
      prix: priceMap.get(String(s.produitId))
    };
  }

  private emptyDashboard(): DashboardData {
    return {
      totalStockDisponible: 0,
      valeurTotaleStock: 0,
      nombreProduits: 0,
      nombreSitesActifs: 0,
      nombreUtilisateursActifs: 0,
      totalMouvements: 0,
      totalMouvementsBruts: 0,
      totalMouvementsIgnores: 0,
      totalEntrees: 0,
      totalSorties: 0,
      totalTransferts: 0,
      entreesQuantite: 0,
      sortiesQuantite: 0,
      transfertsQuantite: 0,
      netVariationQuantite: 0,
      totalAlertesActives: 0,
      totalAlertesCritiques: 0,
      tauxAlertesResolues: 100,
      topAlertProducts: [],
      topAlertSites: [],
      produitsEnRupture: 0,
      produitsCritiques: 0,
      produitsEnAlerte: 0,
      produitsSousSeuil: 0,
      produitsSurStock: 0,
      produitsNormaux: 0,
      replenishmentItems: [],
      recentMovements: [],
      stockHealthChart: { labels: [], datasets: [] },
      productStockChart: { labels: [], datasets: [] },
      movementTrendChart: { labels: [], datasets: [] },
      lastRefresh: new Date(),
      activeFilter: {}
    };
  }
}
