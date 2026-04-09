import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { SiteService } from '../../core/services/site.service';
import { CategoryService } from '../../core/services/category.service';
import { ProductService } from '../../core/services/product.service';
import { DashboardData, DashboardFilter } from '../../core/models/dashboard.model';
import { Site } from '../../core/models/site.model';
import { Category } from '../../core/models/category.model';
import { Product } from '../../core/models/product.model';
import { StockService } from '../../core/services/stock.service';
import { Stock } from '../../core/models/stock.model';
import { BaseChartDirective } from 'ng2-charts';
import { ChartOptions } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly siteService = inject(SiteService);
  private readonly categoryService = inject(CategoryService);
  private readonly productService = inject(ProductService);
  private readonly stockService = inject(StockService);

  private sub?: Subscription;

  // We hold the full dashboard data in a signal
  readonly data = signal<DashboardData | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly canExportReports = computed(() => this.authService.hasPermission('view_reports'));

  // Arrays for filter dropdowns
  sites = signal<Site[]>([]);
  categories = signal<Category[]>([]);
  products = signal<Product[]>([]);
  stocks = signal<Stock[]>([]);

  // Bound to the form
  currentFilter: DashboardFilter = { dateRange: 'thisMonth' };

  showAllMovements = signal<boolean>(false);
  isExportMenuOpen = signal<boolean>(false);

  // Chart Global Options
  readonly pieOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Inter, sans-serif' } } }
    },
    cutout: '70%'
  };

  readonly barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, border: { dash: [4, 4] } } }
  };

  readonly lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Inter, sans-serif' } } } 
    },
    scales: { 
      x: { grid: { display: false } },
      y: { beginAtZero: true, border: { dash: [4, 4] } }
    },
    interaction: { mode: 'index', intersect: false }
  };

  ngOnInit() {
    // Load options for filters
    this.siteService.fetchSites().then(s => this.sites.set(s));
    this.categoryService.fetchCategories().then(c => this.categories.set(c));
    this.productService.fetchProducts().then(p => this.products.set(p));
    this.stockService.fetchStocks().then(s => this.stocks.set(s));

    // Subscribe to the polling observable.
    this.sub = this.dashboardService.dashboardData$.subscribe(res => {
      this.data.set(res);
      this.currentFilter = { ...res.activeFilter };
      this.isLoading.set(false);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // Returns sites filtered by the selected siteType
  filteredSites() {
    if (this.currentFilter.siteType) {
      return this.sites().filter(s => s.type === this.currentFilter.siteType);
    }
    return this.sites();
  }

  onSiteTypeChange() {
    this.currentFilter.siteId = undefined; // Reset siteId when switching type
    this.onFilterChange();
  }

  // Returns products filtered by the selected category and site
  filteredProducts() {
    let prods = this.products();
    if (this.currentFilter.categoryId) {
      prods = prods.filter(p => String(p.id_c) === String(this.currentFilter.categoryId));
    }
    if (this.currentFilter.siteId) {
      const siteStocks = this.stocks().filter(s => String(s.siteId) === String(this.currentFilter.siteId));
      const stockedProductIds = new Set(siteStocks.map(s => String(s.produitId)));
      prods = prods.filter(p => stockedProductIds.has(String(p.id_p)));
    }
    return prods;
  }

  onSiteChange() {
    this.currentFilter.productId = undefined; // Reset productId when switching site
    this.onFilterChange();
  }

  onCategoryChange() {
    this.currentFilter.productId = undefined; // Reset productId when switching category
    this.onFilterChange();
  }

  async forceRefresh() {
    this.isExportMenuOpen.set(false);
    this.isLoading.set(true);
    await this.dashboardService.refresh();
  }

  onFilterChange() {
    this.isExportMenuOpen.set(false);
    this.isLoading.set(true);
    this.dashboardService.setFilter(this.currentFilter);
  }

  toggleExportMenu(): void {
    if (!this.canExportReports() || this.isLoading()) return;
    this.isExportMenuOpen.update(open => !open);
  }

  exportReport(format: 'csv' | 'pdf'): void {
    if (!this.canExportReports() || this.isLoading()) return;

    this.isExportMenuOpen.set(false);
    if (format === 'csv') {
      this.exportCsv();
      return;
    }

    this.exportPdf();
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(val);
  }

  formatDate(d: Date): string {
    return new Intl.DateTimeFormat('fr-TN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date(d));
  }

  exportCsv(): void {
    if (!this.canExportReports()) return;

    const report = this.data();
    if (!report) return;

    const user = this.authService.currentUser();
    const generatedAt = new Date();
    const filterSummary = this.getFilterSummary(report.activeFilter);
    const recommendationSummary = this.getRecommendationSummary(report);

    const lines: string[] = [];
    lines.push('Rapport Inventaire - Dashboard');
    lines.push('Version rapport,1.0');
    lines.push(`Genere le,${this.escapeCsv(generatedAt.toISOString())}`);
    lines.push(`Genere par,${this.escapeCsv(user ? `${user.prenom} ${user.nom}` : 'Utilisateur inconnu')}`);
    lines.push(`Role generateur,${this.escapeCsv(user?.role ?? 'inconnu')}`);
    lines.push(`Periode,${this.escapeCsv(this.getDateRangeLabel(report.activeFilter.dateRange))}`);
    lines.push(`Filtres appliques,${this.escapeCsv(filterSummary)}`);
    lines.push('');

    lines.push('DEFINITION KPI');
    lines.push('Indicateur,Definition,Formule');
    lines.push('Valorisation du stock,Montant theorique global du stock,Somme(quantite_disponible * prix_unitaire)');
    lines.push('Mouvements reconnus,Flux identifies en entree/sortie/transfert,entrees + sorties + transferts');
    lines.push('Variation nette,Impact direct sur le stock global,quantite_entree - quantite_sortie');
    lines.push('Taux alertes resolues,Part des alertes cloturees,(alertes_resolues / alertes_totales) * 100');
    lines.push('');

    lines.push('KPI,Valeur');
    lines.push(`Valorisation du stock,${report.valeurTotaleStock}`);
    lines.push(`Unites en stock,${report.totalStockDisponible}`);
    lines.push(`Produits geres,${report.nombreProduits}`);
    lines.push(`Mouvements reconnus,${report.totalMouvements}`);
    lines.push(`Mouvements bruts lus,${report.totalMouvementsBruts}`);
    lines.push(`Mouvements ignores (type inconnu),${report.totalMouvementsIgnores}`);
    lines.push(`Mouvements entree,${report.totalEntrees}`);
    lines.push(`Mouvements sortie,${report.totalSorties}`);
    lines.push(`Mouvements transfert,${report.totalTransferts}`);
    lines.push(`Quantite entree,${report.entreesQuantite}`);
    lines.push(`Quantite sortie,${report.sortiesQuantite}`);
    lines.push(`Quantite transfert,${report.transfertsQuantite}`);
    lines.push(`Variation nette quantite,${report.netVariationQuantite}`);
    lines.push(`Alertes actives,${report.totalAlertesActives}`);
    lines.push(`Alertes critiques,${report.totalAlertesCritiques}`);
    lines.push(`Taux alertes resolues,${report.tauxAlertesResolues}%`);
    lines.push('');

    lines.push('ANALYSE ALERTES - TOP PRODUITS');
    lines.push('Produit,Nombre alertes actives');
    if (report.topAlertProducts.length === 0) {
      lines.push('Aucune donnee,0');
    } else {
      report.topAlertProducts.forEach(item => lines.push(`${this.escapeCsv(item.name)},${item.count}`));
    }
    lines.push('');

    lines.push('ANALYSE ALERTES - TOP SITES');
    lines.push('Site,Nombre alertes actives');
    if (report.topAlertSites.length === 0) {
      lines.push('Aucune donnee,0');
    } else {
      report.topAlertSites.forEach(item => lines.push(`${this.escapeCsv(item.name)},${item.count}`));
    }
    lines.push('');

    lines.push('RECOMMANDATIONS PAR PRIORITE');
    lines.push('Priorite,Nombre lignes');
    lines.push(`Rupture,${recommendationSummary.rupture}`);
    lines.push(`Critique,${recommendationSummary.critique}`);
    lines.push(`Alerte,${recommendationSummary.alerte}`);
    lines.push(`Surstock,${recommendationSummary.surstock}`);
    lines.push('');

    lines.push('DETAIL REAPPROVISIONNEMENT');
    lines.push('Produit,Site,Stock actuel,Seuil minimum,Seuil alerte,Seuil maximum,Statut,Qte recommandee');
    report.replenishmentItems.forEach(item => {
      lines.push([
        this.escapeCsv(item.produitNom),
        this.escapeCsv(item.siteNom),
        item.quantiteDisponible,
        item.seuilMinimum,
        item.seuilAlerte,
        item.seuilMaximum,
        this.escapeCsv(item.status),
        item.qteAReapprovisionner
      ].join(','));
    });

    lines.push('');
    lines.push('TRACABILITE');
    lines.push('Source,DashboardService (filtres reactifs + polling)');
    lines.push('Compatibilite export,CSV UTF-8');
    lines.push(`Signature,${this.escapeCsv(`Inventory Pro - ${generatedAt.toISOString()}`)}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-inventaire-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    if (!this.canExportReports()) return;

    const report = this.data();
    if (!report) return;

    const user = this.authService.currentUser();
    const generatedAt = new Date();
    const filterSummary = this.getFilterSummary(report.activeFilter);
    const recommendationSummary = this.getRecommendationSummary(report);

    const rows = report.replenishmentItems.slice(0, 40).map(item => `
      <tr>
        <td>${this.escapeHtml(item.produitNom)}</td>
        <td>${this.escapeHtml(item.siteNom)}</td>
        <td>${item.quantiteDisponible}</td>
        <td>${item.seuilMinimum}</td>
        <td>${this.escapeHtml(item.status.toUpperCase())}</td>
        <td>${item.qteAReapprovisionner}</td>
      </tr>
    `).join('');

    const topProductsRows = (report.topAlertProducts.length === 0
      ? '<tr><td>Aucune donnee</td><td>0</td></tr>'
      : report.topAlertProducts.map(item => `<tr><td>${this.escapeHtml(item.name)}</td><td>${item.count}</td></tr>`).join(''));

    const topSitesRows = (report.topAlertSites.length === 0
      ? '<tr><td>Aucune donnee</td><td>0</td></tr>'
      : report.topAlertSites.map(item => `<tr><td>${this.escapeHtml(item.name)}</td><td>${item.count}</td></tr>`).join(''));

    const popup = window.open('', '_blank', 'width=1100,height=800');
    if (!popup) return;

    popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Rapport Inventaire</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    p { margin: 0 0 14px; color: #4b5563; }
    h2 { margin: 18px 0 8px; font-size: 16px; color: #1f2937; }
    .kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
    .kpi > div { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
    .kpi span { display: block; color: #6b7280; font-size: 12px; }
    .kpi strong { font-size: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; }
    th { background: #f3f4f6; }
    .meta { font-size: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
    .small { font-size: 11px; color: #6b7280; }
  </style>
</head>
<body>
  <h1>Rapport Inventaire</h1>
  <p>Genere le ${generatedAt.toLocaleString('fr-TN')}</p>
  <div class="meta">
    <div><strong>Genere par:</strong> ${this.escapeHtml(user ? `${user.prenom} ${user.nom}` : 'Utilisateur inconnu')} (${this.escapeHtml(user?.role ?? 'inconnu')})</div>
    <div><strong>Filtres appliques:</strong> ${this.escapeHtml(filterSummary)}</div>
    <div><strong>Periode:</strong> ${this.escapeHtml(this.getDateRangeLabel(report.activeFilter.dateRange))}</div>
  </div>

  <h2>KPI Principaux</h2>
  <div class="kpi">
    <div><span>Valorisation stock</span><strong>${this.formatCurrency(report.valeurTotaleStock)}</strong></div>
    <div><span>Unites stock</span><strong>${report.totalStockDisponible}</strong></div>
    <div><span>Mouvements reconnus</span><strong>${report.totalMouvements}</strong></div>
    <div><span>Mouvements ignores</span><strong>${report.totalMouvementsIgnores}</strong></div>
    <div><span>Entrees / Sorties</span><strong>${report.totalEntrees} / ${report.totalSorties}</strong></div>
    <div><span>Transferts</span><strong>${report.totalTransferts}</strong></div>
    <div><span>Variation nette</span><strong>${report.netVariationQuantite}</strong></div>
    <div><span>Alertes critiques</span><strong>${report.totalAlertesCritiques}</strong></div>
  </div>

  <h2>Definitions KPI</h2>
  <table>
    <thead>
      <tr><th>Indicateur</th><th>Definition</th><th>Formule</th></tr>
    </thead>
    <tbody>
      <tr><td>Valorisation du stock</td><td>Montant theorique global du stock</td><td>Somme(quantite * prix)</td></tr>
      <tr><td>Mouvements reconnus</td><td>Flux identifies en entree/sortie/transfert</td><td>entrees + sorties + transferts</td></tr>
      <tr><td>Variation nette</td><td>Impact direct sur le stock global</td><td>quantite_entree - quantite_sortie</td></tr>
      <tr><td>Taux alertes resolues</td><td>Part des alertes cloturees</td><td>(resolues / total) * 100</td></tr>
    </tbody>
  </table>

  <h2>Analyse Alertes</h2>
  <table>
    <thead>
      <tr><th>Top Produits en alerte</th><th>Alertes actives</th></tr>
    </thead>
    <tbody>
      ${topProductsRows}
    </tbody>
  </table>

  <table style="margin-top:10px;">
    <thead>
      <tr><th>Top Sites en alerte</th><th>Alertes actives</th></tr>
    </thead>
    <tbody>
      ${topSitesRows}
    </tbody>
  </table>

  <h2>Decision Reapprovisionnement</h2>
  <div class="kpi">
    <div><span>Rupture</span><strong>${recommendationSummary.rupture}</strong></div>
    <div><span>Critique</span><strong>${recommendationSummary.critique}</strong></div>
    <div><span>Alerte</span><strong>${recommendationSummary.alerte}</strong></div>
    <div><span>Surstock</span><strong>${recommendationSummary.surstock}</strong></div>
  </div>

  <h2>Detail Reapprovisionnement</h2>
  <table>
    <thead>
      <tr>
        <th>Produit</th>
        <th>Site</th>
        <th>Stock</th>
        <th>Seuil Min</th>
        <th>Statut</th>
        <th>Qte Recommandee</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6">Aucune ligne disponible.</td></tr>'}
    </tbody>
  </table>
  <p class="small">Traceabilite: Inventory Pro - DashboardService - version rapport 1.0</p>
</body>
</html>`);

    popup.document.close();
    popup.focus();
    popup.print();
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getDateRangeLabel(dateRange?: DashboardFilter['dateRange']): string {
    if (dateRange === 'today') return "Aujourd'hui";
    if (dateRange === '7days') return '7 derniers jours';
    if (dateRange === '30days') return '30 derniers jours';
    if (dateRange === 'thisMonth') return 'Ce mois';
    return 'Historique complet';
  }

  private getFilterSummary(filter: DashboardFilter): string {
    const parts: string[] = [];
    parts.push(`Type site: ${filter.siteType ?? 'Tous'}`);
    parts.push(`Site: ${filter.siteId ?? 'Tous'}`);
    parts.push(`Categorie: ${filter.categoryId ?? 'Toutes'}`);
    parts.push(`Produit: ${filter.productId ?? 'Tous'}`);
    parts.push(`Periode: ${this.getDateRangeLabel(filter.dateRange)}`);
    return parts.join(' | ');
  }

  private getRecommendationSummary(report: DashboardData): { rupture: number; critique: number; alerte: number; surstock: number } {
    return report.replenishmentItems.reduce(
      (acc, item) => {
        if (item.status === 'rupture') acc.rupture += 1;
        else if (item.status === 'critique') acc.critique += 1;
        else if (item.status === 'alerte') acc.alerte += 1;
        else if (item.status === 'surstock') acc.surstock += 1;
        return acc;
      },
      { rupture: 0, critique: 0, alerte: 0, surstock: 0 }
    );
  }
}
