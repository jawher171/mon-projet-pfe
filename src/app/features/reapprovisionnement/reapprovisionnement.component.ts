import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StockService } from '../../core/services/stock.service';
import { SiteService } from '../../core/services/site.service';
import { Stock } from '../../core/models/stock.model';
import { AuthService } from '../../core/services/auth.service';
import { CategoryService } from '../../core/services/category.service';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-reapprovisionnement',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reapprovisionnement.component.html',
  styleUrls: ['./reapprovisionnement.component.scss']
})
export class ReapprovisionnementComponent implements OnInit {
  private readonly stockService = inject(StockService);
  private readonly siteService = inject(SiteService);
  private readonly categoryService = inject(CategoryService);
  private readonly productService = inject(ProductService);
  private readonly authService = inject(AuthService);

  readonly selectedSiteId = signal<string | undefined>(undefined);
  readonly selectedCategoryId = signal<string | undefined>(undefined);
  readonly selectedProductId = signal<string | undefined>(undefined);

  readonly stocks = computed(() => this.stockService.getStocks()());
  readonly sites = computed(() => this.siteService.getSites()());
  readonly categories = computed(() => this.categoryService.getCategories()());
  readonly products = computed(() => this.productService.getProducts()());

  private readonly baseSuggestions = computed(() => {
    return this.stocks()
      .map(stock => ({
        stock,
        status: this.getStockStatus(stock),
        recommendedQty: this.getRecommendedQty(stock)
      }))
      .filter(item => {
        const seuilAlerte = item.stock.seuilAlerte ?? 0;
        return seuilAlerte > 0
          && item.stock.quantiteDisponible <= seuilAlerte
          && item.status !== 'overstock'
          && item.recommendedQty > 0;
      })
      .sort((a, b) => b.recommendedQty - a.recommendedQty);
  });

  readonly filteredProducts = computed(() => {
    let products = this.products();

    const selectedCategoryId = this.selectedCategoryId();
    if (selectedCategoryId) {
      products = products.filter(p => String(p.id_c) === selectedCategoryId);
    }

    const selectedSiteId = this.selectedSiteId();
    if (selectedSiteId) {
      const stockedProductIds = new Set(
        this.stocks()
          .filter(s => String(s.siteId) === selectedSiteId)
          .map(s => String(s.produitId))
      );
      products = products.filter(p => stockedProductIds.has(String(p.id_p)));
    }

    return products;
  });

  readonly suggestions = computed(() => {
    const selectedSiteId = this.selectedSiteId();
    const selectedCategoryId = this.selectedCategoryId();
    const selectedProductId = this.selectedProductId();

    const productCategoryById = new Map(
      this.products().map(product => [String(product.id_p), String(product.id_c)])
    );

    return this.baseSuggestions().filter(item => {
      if (selectedSiteId && String(item.stock.siteId) !== selectedSiteId) {
        return false;
      }

      if (selectedProductId && String(item.stock.produitId) !== selectedProductId) {
        return false;
      }

      if (selectedCategoryId) {
        const productCategoryId = productCategoryById.get(String(item.stock.produitId));
        if (productCategoryId !== selectedCategoryId) {
          return false;
        }
      }

      return true;
    });
  });

  hasActiveFilters(): boolean {
    return !!(this.selectedSiteId() || this.selectedCategoryId() || this.selectedProductId());
  }

  ngOnInit(): void {
    void this.siteService.fetchSites();
    void this.categoryService.fetchCategories();
    void this.productService.fetchProducts();
    void this.stockService.fetchStocks();
  }

  clearFilters(): void {
    this.selectedSiteId.set(undefined);
    this.selectedCategoryId.set(undefined);
    this.selectedProductId.set(undefined);
  }

  onSiteChange(value: string | undefined): void {
    this.selectedSiteId.set(value || undefined);

    const selectedProductId = this.selectedProductId();
    if (selectedProductId) {
      const productStillVisible = this.filteredProducts().some(p => String(p.id_p) === selectedProductId);
      if (!productStillVisible) {
        this.selectedProductId.set(undefined);
      }
    }
  }

  onCategoryChange(value: string | undefined): void {
    this.selectedCategoryId.set(value || undefined);

    const selectedProductId = this.selectedProductId();
    if (selectedProductId) {
      const productStillVisible = this.filteredProducts().some(p => String(p.id_p) === selectedProductId);
      if (!productStillVisible) {
        this.selectedProductId.set(undefined);
      }
    }
  }

  onProductChange(value: string | undefined): void {
    this.selectedProductId.set(value || undefined);
  }

  getStockStatus(stock: Stock): 'rupture' | 'critical' | 'low' | 'warning' | 'overstock' | 'ok' {
    const qty = stock.quantiteDisponible;
    if (qty === 0) return 'rupture';
    if (stock.seuilMinimum > 0 && qty <= stock.seuilMinimum) return 'critical';
    if (stock.seuilSecurite > 0 && qty <= stock.seuilSecurite) return 'low';
    if (stock.seuilAlerte > 0 && qty <= stock.seuilAlerte) return 'warning';
    if (stock.seuilMaximum > 0 && qty > stock.seuilMaximum) return 'overstock';
    return 'ok';
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'rupture': return 'Rupture';
      case 'critical': return 'Critique';
      case 'low': return 'Securite';
      case 'warning': return 'Alerte';
      case 'overstock': return 'Surstock';
      default: return 'Normal';
    }
  }

  getRecommendedQty(stock: Stock): number {
    const target = stock.seuilMaximum > 0 ? stock.seuilMaximum : stock.seuilAlerte;
    return Math.max(0, target - stock.quantiteDisponible);
  }

  getSiteName(siteId: string | number): string {
    return this.siteService.getSiteById(siteId)?.nom ?? String(siteId);
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'rupture': return 'dangerous';
      case 'critical': return 'warning';
      case 'low': return 'shield';
      case 'warning': return 'notifications_active';
      default: return 'check_circle';
    }
  }

  canManageReapprovisionnement(): boolean {
    return this.authService.hasPermission('manage_reapprovisionnement');
  }
}
