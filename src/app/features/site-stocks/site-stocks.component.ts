/**
 * SiteStocksComponent — Displays the stock list for a specific site.
 * Route: /sites/:siteId/stocks
 * From each stock row the user can navigate to the existing movement UI
 * in "entry" or "exit" mode, passing stockId + siteId as query params.
 */
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StockService } from '../../core/services/stock.service';
import { SiteService } from '../../core/services/site.service';
import { Stock } from '../../core/models/stock.model';
import { Site } from '../../core/models/site.model';

@Component({
  selector: 'app-site-stocks',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './site-stocks.component.html',
  styleUrls: ['./site-stocks.component.scss']
})
export class SiteStocksComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private stockService = inject(StockService);
  private siteService = inject(SiteService);

  siteId = signal<string>('');
  site = signal<Site | null>(null);
  stocks = signal<Stock[]>([]);
  loading = signal(false);

  // Edit modal state
  showEditModal = signal(false);
  editingStock = signal<Stock | null>(null);
  editForm = signal({
    seuilAlerte: 0,
    seuilSecurite: 0,
    seuilMinimum: 0,
    seuilMaximum: 0
  });
  saving = signal(false);

  siteName = computed(() => this.site()?.nom ?? 'Site');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('siteId') ?? '';
    this.siteId.set(id);
    this.loadData(id);
  }

  private async loadData(siteId: string) {
    this.loading.set(true);

    // Load site info
    const siteInfo = this.siteService.getSiteById(siteId);
    if (siteInfo) {
      this.site.set(siteInfo);
    }

    // Load stocks for this site
    try {
      const stocks = await this.stockService.fetchStocksBySite(siteId);
      this.stocks.set(stocks);
    } catch (err) {
      console.error('Failed to load stocks for site', siteId, err);
    } finally {
      this.loading.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/sites']);
  }

  openMovement(stock: Stock, mode: 'entry' | 'exit') {
    this.router.navigate(['/movements'], {
      queryParams: {
        stockId: stock.id,
        siteId: this.siteId(),
        productId: stock.produitId,
        productName: stock.produitNom ?? '',
        siteName: this.siteName(),
        mode
      }
    });
  }

  getStockStatus(stock: Stock): 'critical' | 'warning' | 'ok' {
    if (stock.quantiteDisponible === 0) return 'critical';
    if (stock.seuilAlerte > 0 && stock.quantiteDisponible <= stock.seuilAlerte) return 'warning';
    return 'ok';
  }

  getStockStatusLabel(stock: Stock): string {
    const status = this.getStockStatus(stock);
    if (status === 'critical') return 'Rupture';
    if (status === 'warning') return 'Stock bas';
    return 'Normal';
  }

  // ── Edit seuils ─────────────────────────────────
  openEdit(stock: Stock) {
    this.editingStock.set(stock);
    this.editForm.set({
      seuilAlerte: stock.seuilAlerte,
      seuilSecurite: stock.seuilSecurite,
      seuilMinimum: stock.seuilMinimum,
      seuilMaximum: stock.seuilMaximum
    });
    this.showEditModal.set(true);
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
      // Refresh list
      const freshStocks = await this.stockService.fetchStocksBySite(this.siteId());
      this.stocks.set(freshStocks);
      this.closeEdit();
    } catch (err) {
      console.error('Failed to update stock seuils', err);
    } finally {
      this.saving.set(false);
    }
  }
}
