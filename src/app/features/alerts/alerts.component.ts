/**
 * Alerts Component
 * Manages system alerts and alert rules.
 * Displays alerts with filtering, allows resolution, and manages alert generation rules.
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../core/services/alert.service';
import { SiteService } from '../../core/services/site.service';
import { Alert, AlertFilter, AlertType, AlertSeverity, ALERT_TYPES, SEVERITY_CONFIG } from '../../core/models/alert.model';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss']
})
export class AlertsComponent implements OnInit {
  // Filter signals
  /** Filter by alert type */
  selectedType = signal<AlertType | 'all'>('all');
  
  /** Filter by severity level */
  selectedSeverity = signal<AlertSeverity | 'all'>('all');
  
  /** Filter by site location */
  selectedSite = signal('');
  
  /** Show resolved alerts */
  showResolved = signal(false);

  // View controls
  /** Active tab (alerts or rules) */
  activeTab = signal<'alerts' | 'rules'>('alerts');

  // Modal state
  /** Show alert detail modal */
  showModal = signal(false);
  
  /** Currently selected alert */
  selectedAlert = signal<Alert | null>(null);
  
  /** Resolution notes for closing alert */
  resolveNotes = signal('');

  /** Alert type configuration */
  alertTypes = ALERT_TYPES;
  
  /** Severity level configuration */
  severityConfig = SEVERITY_CONFIG;

  /** Available sites */
  sites = computed(() => this.siteService.getActiveSites()());

  /** Computed filter object */
  filter = computed<AlertFilter>(() => ({
    type: this.selectedType() === 'all' ? undefined : this.selectedType(),
    resolue: this.showResolved() ? undefined : false
  }));

  /** Filtered alerts */
  alerts = computed(() => this.alertService.getFilteredAlerts(this.filter())());
  
  /** Alert statistics */
  stats = computed(() => this.alertService.getAlertStats());
  
  /** Alert rules (diagram: no AlertRule) */
  rules = computed(() => this.alertService.getRules());
  
  /** Count of unread alerts */
  unreadCount = computed(() => this.alertService.getUnreadAlerts()().length);

  constructor(
    private alertService: AlertService,
    private siteService: SiteService
  ) {}

  ngOnInit(): void {}

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
   * Switch active tab
   * @param tab Tab to activate (alerts or rules)
   */
  setActiveTab(tab: 'alerts' | 'rules') {
    this.activeTab.set(tab);
  }

  /**
   * Open alert modal and mark as read
   * @param alert Alert to display
   */

  openAlertModal(alert: Alert) {
    this.selectedAlert.set(alert);
    this.resolveNotes.set('');
    this.showModal.set(true);
    this.alertService.markAsRead(alert.id);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedAlert.set(null);
    this.resolveNotes.set('');
  }

  resolveAlert() {
    const alert = this.selectedAlert();
    if (alert) {
      this.alertService.resolveAlert(alert.id);
      this.closeModal();
    }
  }

  deleteAlert(alert: Alert) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette alerte ?')) {
      this.alertService.deleteAlert(alert.id);
    }
  }

  markAllAsRead() {
    this.alertService.markAllAsRead();
  }

  toggleRule(ruleId: string) {
    this.alertService.toggleRule(ruleId);
  }

  getAlertTypeConfig(type: AlertType) {
    return this.alertService.getAlertTypeConfig(type);
  }

  getSeverityConfig(severity: string | AlertSeverity) {
    return this.alertService.getSeverityConfig(severity);
  }

  /** Derive severity from alert type (diagram has type only) */
  getSeverityForAlert(alert: Alert): string {
    const typeToSeverity: Record<string, string> = {
      out_of_stock: 'critical',
      low_stock: 'high',
      reorder_point: 'medium',
      overstock: 'low'
    };
    return typeToSeverity[alert.type] || 'info';
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
