/**
 * Alerts Component
 * Manages system alerts and alert rules.
 * Displays alerts with filtering, allows resolution, and manages alert generation rules.
 */

import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { AlertService } from '../../core/services/alert.service';
import { SiteService } from '../../core/services/site.service';
import { AuthService } from '../../core/services/auth.service';
import { Alert, AlertFilter, AlertType, AlertSeverity, ALERT_TYPES, SEVERITY_CONFIG } from '../../core/models/alert.model';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss']
})
export class AlertsComponent implements OnInit, OnDestroy {
  private refreshSubscription?: Subscription;

  isRefreshing = signal(false);
  // Filter signals
  /** Filter by alert type */
  selectedType = signal<AlertType | 'all'>('all');
  
  /** Filter by severity level */
  selectedSeverity = signal<AlertSeverity | 'all'>('all');
  
  /** Filter by site location */
  selectedSite = signal('');
  
  /** Filter by date (YYYY-MM-DD string, empty = all) */
  selectedDate = signal('');
  
  /** Filter by product name */
  selectedProduct = signal('');
  
  /** Show resolved alerts */
  showResolved = signal(true);

  // Modal state
  /** Show alert detail modal */
  showModal = signal(false);
  
  /** Currently selected alert */
  selectedAlert = signal<Alert | null>(null);

  // Delete confirmation modal
  showDeleteConfirmModal = signal(false);
  alertToDelete = signal<Alert | null>(null);
  deleting = signal(false);

  /** Alert type configuration */
  alertTypes = ALERT_TYPES;
  
  /** Severity level configuration */
  severityConfig = SEVERITY_CONFIG;

  /** Available sites */
  sites = computed(() => this.siteService.getActiveSites()());
  canManageAlerts = computed(() => this.authService.hasPermission('manage_alerts'));

  /** Unique product names from all alerts */
  productNames = computed(() => {
    const names = this.alertService.getAlerts()().map(a => a.produitNom).filter((n): n is string => !!n);
    return [...new Set(names)].sort();
  });

  /** Computed filter object */
  filter = computed<AlertFilter>(() => ({
    type: this.selectedType() === 'all' ? undefined : this.selectedType(),
    resolue: this.showResolved() ? undefined : false,
    severity: this.selectedSeverity() === 'all' ? undefined : this.selectedSeverity(),
    date: this.selectedDate() || undefined,
    produitNom: this.selectedProduct() || undefined
  }));

  /** Filtered alerts */
  alerts = computed(() => this.alertService.getFilteredAlerts(this.filter())());
  
  /** Alert statistics */
  stats = computed(() => this.alertService.getAlertStats());
  
  /** Count of unread alerts */
  unreadCount = computed(() => this.alertService.getUnreadAlerts()().length);

  constructor(
    private alertService: AlertService,
    private siteService: SiteService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    void this.refreshAlerts();

    // Keep alerts list in sync with backend-generated alerts.
    this.refreshSubscription = interval(10000).subscribe(() => {
      void this.refreshAlerts();
    });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  async refreshAlerts(): Promise<void> {
    if (this.isRefreshing()) return;

    this.isRefreshing.set(true);
    try {
      await this.alertService.fetchAlerts();
    } finally {
      this.isRefreshing.set(false);
    }
  }

  /**
   * Filter by alert type
   * @param type Selected alert type
   */
  onTypeChange(type: AlertType | 'all') {
    this.selectedType.set(type);
  }

  /**
   * Filter by severity level
   * @param severity Selected severity
   */
  onSeverityChange(severity: AlertSeverity | 'all') {
    this.selectedSeverity.set(severity);
  }

  /**
   * Handle site filter change
   * @param event Select change event
   */
  onSiteChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedSite.set(select.value);
  }

  /**
   * Handle date filter change
   */
  onDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedDate.set(input.value);
  }

  /**
   * Open alert modal and mark as read
   * @param alert Alert to display
   */

  openAlertModal(alert: Alert) {
    this.selectedAlert.set(alert);
    this.showModal.set(true);
    this.alertService.markAsRead(alert.id);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedAlert.set(null);
  }

  async resolveAlert() {
    if (!this.canManageAlerts()) return;

    const alert = this.selectedAlert();
    if (alert) {
      await this.alertService.resolveAlertApi(alert.id);
      this.closeModal();
    }
  }

  deleteAlert(alert: Alert) {
    if (!this.canManageAlerts()) return;

    this.alertToDelete.set(alert);
    this.showDeleteConfirmModal.set(true);
  }

  cancelDeleteAlert() {
    this.showDeleteConfirmModal.set(false);
    this.alertToDelete.set(null);
  }

  async confirmDeleteAlert() {
    if (!this.canManageAlerts()) return;

    const alert = this.alertToDelete();
    if (!alert) return;
    this.deleting.set(true);
    try {
      await this.alertService.deleteAlertApi(alert.id);
    } finally {
      this.deleting.set(false);
      this.cancelDeleteAlert();
    }
  }

  markAllAsRead() {
    this.alertService.markAllAsRead();
  }

  getAlertTypeConfig(type: AlertType) {
    return this.alertService.getAlertTypeConfig(type);
  }

  getSeverityConfig(severity: string | AlertSeverity) {
    return this.alertService.getSeverityConfig(severity);
  }

  /** Return severity string for CSS class and config lookup (already lowercase from dtoToAlert) */
  getSeverityForAlert(alert: Alert): string {
    return alert.severity ?? 'info';
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
