/**
 * StocksOverviewComponent — All stocks across all sites with rich filtering.
 * Route: /stocks
 */
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { StockService } from '../../core/services/stock.service';
import { SiteService } from '../../core/services/site.service';
import { AlertService } from '../../core/services/alert.service';
import { Stock } from '../../core/models/stock.model';
import { Site, SITE_TYPES, SiteType } from '../../core/models/site.model';

type StockStatus = 'all' | 'ok' | 'warning' | 'critical' | 'rupture' | 'overstock';

@Component({
  selector: 'app-stocks-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './stocks-overview.component.html',
  styleUrls: ['./stocks-overview.component.scss']
})
export class StocksOverviewComponent implements OnInit {
  private router = inject(Router);
  private stockService = inject(StockService);
  private siteService = inject(SiteService);
  private alertService = inject(AlertService);

  loading = signal(true);
  allStocks = signal<Stock[]>([]);

  // Filters
  searchTerm = signal('');
  selectedSiteType = signal<SiteType | 'all'>('all');
  selectedSiteId = signal('');
  selectedStatus = signal<StockStatus>('all');

  siteTypes = SITE_TYPES;

  // All sites from service
  sites = computed(() => this.siteService.getSites()());

  // Sites filtered by type
  filteredSites = computed(() => {
    const type = this.selectedSiteType();
    if (type === 'all') return this.sites();
    return this.sites().filter(s => s.type === type);
  });

  // Filtered stocks
  filteredStocks = computed(() => {
    let stocks = this.allStocks();
    const search = this.searchTerm().toLowerCase();
    const siteType = this.selectedSiteType();
    const siteId = this.selectedSiteId();
    const status = this.selectedStatus();

    // Filter by site type
    if (siteType !== 'all') {
      const siteIdsOfType = new Set(
        this.sites().filter(s => s.type === siteType).map(s => String(s.id))
      );
      stocks = stocks.filter(s => siteIdsOfType.has(String(s.siteId)));
    }

    // Filter by specific site
    if (siteId) {
      stocks = stocks.filter(s => String(s.siteId) === siteId);
    }

    // Filter by search term (product name)
    if (search) {
      stocks = stocks.filter(s =>
        (s.produitNom ?? '').toLowerCase().includes(search) ||
        (s.siteNom ?? '').toLowerCase().includes(search)
      );
    }

    // Filter by status
    if (status !== 'all') {
      stocks = stocks.filter(s => this.getStockStatus(s) === status);
    }

    return stocks;
  });

  // Stats
  stats = computed(() => {
    const stocks = this.filteredStocks();
    const totalQty = stocks.reduce((sum, s) => sum + s.quantiteDisponible, 0);
    const rupture = stocks.filter(s => this.getStockStatus(s) === 'rupture').length;
    const critical = stocks.filter(s => this.getStockStatus(s) === 'critical').length;
    const warning = stocks.filter(s => this.getStockStatus(s) === 'warning').length;
    const overstock = stocks.filter(s => this.getStockStatus(s) === 'overstock').length;
    return { total: stocks.length, totalQty, rupture, critical, warning, overstock };
  });

  // Edit modal state
  showEditModal = signal(false);
  editingStock = signal<Stock | null>(null);
  editForm = signal({ seuilAlerte: 0, seuilSecurite: 0, seuilMinimum: 0, seuilMaximum: 0 });
  saving = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  private async loadData() {
    this.loading.set(true);
    try {
      await this.siteService.fetchSites();
      const stocks = await this.stockService.fetchStocks();
      this.allStocks.set(stocks);
    } catch (err) {
      console.error('Failed to load stocks', err);
    } finally {
      this.loading.set(false);
    }
  }

  // Filter handlers
  onSearch(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onSiteTypeChange(type: SiteType | 'all') {
    this.selectedSiteType.set(type);
    // Reset specific site if it doesn't match the new type
    if (type !== 'all' && this.selectedSiteId()) {
      const site = this.sites().find(s => String(s.id) === this.selectedSiteId());
      if (site && site.type !== type) {
        this.selectedSiteId.set('');
      }
    }
  }

  onSiteChange(event: Event) {
    this.selectedSiteId.set((event.target as HTMLSelectElement).value);
  }

  onStatusChange(status: StockStatus) {
    this.selectedStatus.set(status);
  }

  clearFilters() {
    this.searchTerm.set('');
    this.selectedSiteType.set('all');
    this.selectedSiteId.set('');
    this.selectedStatus.set('all');
  }

  hasActiveFilters(): boolean {
    return this.searchTerm() !== '' ||
      this.selectedSiteType() !== 'all' ||
      this.selectedSiteId() !== '' ||
      this.selectedStatus() !== 'all';
  }

  // Stock status logic
  getStockStatus(stock: Stock): 'rupture' | 'critical' | 'warning' | 'overstock' | 'ok' {
    const qty = stock.quantiteDisponible;
    if (qty === 0) return 'rupture';
    if (stock.seuilMinimum > 0 && qty <= stock.seuilMinimum) return 'critical';
    if (stock.seuilAlerte > 0 && qty <= stock.seuilAlerte) return 'warning';
    if (stock.seuilMaximum > 0 && qty > stock.seuilMaximum) return 'overstock';
    return 'ok';
  }

  getStockStatusLabel(stock: Stock): string {
    switch (this.getStockStatus(stock)) {
      case 'rupture': return 'Rupture';
      case 'critical': return 'Critique';
      case 'warning': return 'Alerte';
      case 'overstock': return 'Surstock';
      default: return 'Normal';
    }
  }

  getSiteName(siteId: string | number): string {
    const site = this.sites().find(s => String(s.id) === String(siteId));
    return site?.nom ?? String(siteId);
  }

  getSiteType(siteId: string | number): string {
    const site = this.sites().find(s => String(s.id) === String(siteId));
    return site ? this.siteService.getSiteTypeLabel(site.type) : '';
  }

  getSiteTypeIcon(siteId: string | number): string {
    const site = this.sites().find(s => String(s.id) === String(siteId));
    return site ? this.siteService.getSiteTypeIcon(site.type) : 'domain';
  }

  // Navigation
  openMovement(stock: Stock, mode: 'entry' | 'exit') {
    this.router.navigate(['/movements'], {
      queryParams: {
        stockId: stock.id,
        siteId: stock.siteId,
        productId: stock.produitId,
        productName: stock.produitNom ?? '',
        mode
      }
    });
  }

  goToSiteStocks(siteId: string | number) {
    this.router.navigate(['/sites', siteId, 'stocks']);
  }

  // Edit thresholds modal
  openEdit(stock: Stock) {
    this.editingStock.set(stock);
    this.editForm.set({
      seuilAlerte: (stock.seuilMinimum ?? 0) + (stock.seuilSecurite ?? 0),
      seuilSecurite: stock.seuilSecurite,
      seuilMinimum: stock.seuilMinimum,
      seuilMaximum: stock.seuilMaximum
    });
    this.showEditModal.set(true);
  }

  updateSeuilSecurite(value: number) {
    const form = this.editForm();
    const seuilSecurite = Number.isFinite(value) ? Math.max(0, value) : 0;
    const seuilAlerte = (form.seuilMinimum ?? 0) + seuilSecurite;
    this.editForm.set({ ...form, seuilSecurite, seuilAlerte });
  }

  updateSeuilMinimum(value: number) {
    const form = this.editForm();
    const seuilMinimum = Number.isFinite(value) ? Math.max(0, value) : 0;
    const seuilAlerte = seuilMinimum + (form.seuilSecurite ?? 0);
    this.editForm.set({ ...form, seuilMinimum, seuilAlerte });
  }

  closeEdit() {
    this.showEditModal.set(false);
    this.editingStock.set(null);
  }

  async saveEdit() {
    const stock = this.editingStock();
    if (!stock) return;
    this.saving.set(true);
    try {
      const form = this.editForm();
      const updated: Stock = {
        ...stock,
        seuilAlerte: form.seuilAlerte,
        seuilSecurite: form.seuilSecurite,
        seuilMinimum: form.seuilMinimum,
        seuilMaximum: form.seuilMaximum
      };
      await this.stockService.updateStock(updated);
      await this.alertService.fetchAlerts();
      const freshStocks = await this.stockService.fetchStocks();
      this.allStocks.set(freshStocks);
      this.closeEdit();
    } catch (err) {
      console.error('Failed to update stock seuils', err);
    } finally {
      this.saving.set(false);
    }
  }
}
