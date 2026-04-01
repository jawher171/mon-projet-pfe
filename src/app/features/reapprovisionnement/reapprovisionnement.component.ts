import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StockService } from '../../core/services/stock.service';
import { SiteService } from '../../core/services/site.service';
import { Stock } from '../../core/models/stock.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reapprovisionnement',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reapprovisionnement.component.html',
  styleUrls: ['./reapprovisionnement.component.scss']
})
export class ReapprovisionnementComponent implements OnInit {
  private stockService = inject(StockService);
  private siteService = inject(SiteService);
  private authService = inject(AuthService);

  stocks = computed(() => this.stockService.getStocks()());

  suggestions = computed(() => {
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

  ngOnInit(): void {
    void this.siteService.fetchSites();
    void this.stockService.fetchStocks();
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
