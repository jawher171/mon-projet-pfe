import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
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
  private readonly siteService = inject(SiteService);
  private readonly categoryService = inject(CategoryService);
  private readonly productService = inject(ProductService);
  private readonly stockService = inject(StockService);

  private sub?: Subscription;

  // We hold the full dashboard data in a signal
  readonly data = signal<DashboardData | null>(null);
  readonly isLoading = signal<boolean>(true);

  // Arrays for filter dropdowns
  sites = signal<Site[]>([]);
  categories = signal<Category[]>([]);
  products = signal<Product[]>([]);
  stocks = signal<Stock[]>([]);

  // Bound to the form
  currentFilter: DashboardFilter = { dateRange: 'thisMonth' };

  showAllMovements = signal<boolean>(false);

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
    this.isLoading.set(true);
    await this.dashboardService.refresh();
  }

  onFilterChange() {
    this.isLoading.set(true);
    this.dashboardService.setFilter(this.currentFilter);
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(val);
  }

  formatDate(d: Date): string {
    return new Intl.DateTimeFormat('fr-TN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date(d));
  }
}
