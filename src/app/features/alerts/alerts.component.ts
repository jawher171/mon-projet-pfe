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
  showResolved = signal(true);

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
    resolue: this.showResolved() ? undefined : false,
    severity: this.selectedSeverity() === 'all' ? undefined : this.selectedSeverity()
  }));

  /** Filtered alerts */
  alerts = computed(() => this.alertService.getFilteredAlerts(this.filter())());
  
  /** Alert statistics */
  stats = computed(() => this.alertService.getAlertStats());
  
  /** Count of unread alerts */
  unreadCount = computed(() => this.alertService.getUnreadAlerts()().length);

  constructor(
    private alertService: AlertService,
    private siteService: SiteService
  ) {}

  ngOnInit(): void {
    this.alertService.fetchAlerts();
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

  async resolveAlert() {
    const alert = this.selectedAlert();
    if (alert) {
      await this.alertService.resolveAlertApi(alert.id);
      this.closeModal();
    }
  }

  async deleteAlert(alert: Alert) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette alerte ?')) {
      await this.alertService.deleteAlertApi(alert.id);
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
