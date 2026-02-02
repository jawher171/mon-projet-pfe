/**
 * Dashboard Component
 * Main overview page showing key metrics, alerts, and recent activities.
 * Displays inventory statistics and critical alerts at a glance.
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AlertService } from '../../core/services/alert.service';
import { MovementService } from '../../core/services/movement.service';
import { SiteService } from '../../core/services/site.service';
import { Alert, SEVERITY_CONFIG } from '../../core/models/alert.model';

/** Statistics card structure */
interface StatCard {
  title: string;
  value: number | string;
  change: number;
  icon: string;
  color: string;
  trend: 'up' | 'down';
}

/** Recent activity structure */
interface RecentActivity {
  id: string;
  type: 'order' | 'stock' | 'alert';
  message: string;
  timestamp: Date;
  icon: string;
  color: string;
}

/** Low stock item structure */
interface LowStockItem {
  id: string;
  name: string;
  sku?: string;
  currentStock: number;
  minStock: number;
  status: 'critical' | 'warning' | 'reorder';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Computed signals from services
  /** All active (unresolved) alerts */
  activeAlerts = computed(() => this.alertService.getActiveAlerts()());
  
  /** Alert statistics */
  alertStats = computed(() => this.alertService.getAlertStats());
  
  /** Movement summary data */
  movementSummary = computed(() => this.movementService.getMovementSummary());
  
  /** Site statistics */
  siteStats = computed(() => this.siteService.getSiteStats()());
  
  /** Top 5 critical and high-severity alerts */
  criticalAlerts = computed(() => 
    this.activeAlerts().filter(a => a.severity === 'critical' || a.severity === 'high').slice(0, 5)
  );

  /** Severity configuration for alert styling */
  severityConfig = SEVERITY_CONFIG;
  
  /** Dashboard statistics cards */
  stats = signal<StatCard[]>([]);

  /** Recent activities timeline */
  recentActivities = signal<RecentActivity[]>([]);

  topProducts = signal<{ name: string; sales: number; revenue: string; trend: 'up' | 'down' }[]>([]);

  // Low stock items for replenishment
  lowStockItems = signal<LowStockItem[]>([]);

  constructor(
    private alertService: AlertService,
    private movementService: MovementService,
    private siteService: SiteService
  ) {}

  ngOnInit(): void {}

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  getStockStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'critical': 'status-critical',
      'warning': 'status-warning',
      'reorder': 'status-reorder'
    };
    return classes[status] || '';
  }

  getStockStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'critical': 'Critique',
      'warning': 'Attention',
      'reorder': 'À commander'
    };
    return labels[status] || status;
  }

  getAlertIcon(type: string): string {
    const icons: Record<string, string> = {
      'out_of_stock': 'error',
      'low_stock': 'warning',
      'reorder_point': 'shopping_cart',
      'expiring_soon': 'schedule',
      'overstock': 'inventory'
    };
    return icons[type] || 'info';
  }
}
