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
  // Filters
  selectedType = signal<AlertType | 'all'>('all');
  selectedSeverity = signal<AlertSeverity | 'all'>('all');
  selectedSite = signal('');
  showResolved = signal(false);

  // Tabs
  activeTab = signal<'alerts' | 'rules'>('alerts');

  // Modal
  showModal = signal(false);
  selectedAlert = signal<Alert | null>(null);
  resolveNotes = signal('');

  alertTypes = ALERT_TYPES;
  severityConfig = SEVERITY_CONFIG;

  sites = computed(() => this.siteService.getActiveSites()());

  filter = computed<AlertFilter>(() => ({
    type: this.selectedType() === 'all' ? undefined : this.selectedType(),
    severity: this.selectedSeverity() === 'all' ? undefined : this.selectedSeverity(),
    siteId: this.selectedSite() || undefined,
    isResolved: this.showResolved() ? undefined : false
  }));

  alerts = computed(() => this.alertService.getFilteredAlerts(this.filter())());
  stats = computed(() => this.alertService.getAlertStats());
  rules = computed(() => this.alertService.getRules()());
  unreadCount = computed(() => this.alertService.getUnreadAlerts()().length);

  constructor(
    private alertService: AlertService,
    private siteService: SiteService
  ) {}

  ngOnInit(): void {}

  onTypeChange(type: AlertType | 'all') {
    this.selectedType.set(type);
  }

  onSeverityChange(severity: AlertSeverity | 'all') {
    this.selectedSeverity.set(severity);
  }

  onSiteChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedSite.set(select.value);
  }

  setActiveTab(tab: 'alerts' | 'rules') {
    this.activeTab.set(tab);
  }

  openAlertModal(alert: Alert) {
    this.selectedAlert.set(alert);
    this.resolveNotes.set('');
    this.showModal.set(true);
    
    // Mark as read
    if (!alert.isRead) {
      this.alertService.markAsRead(alert.id);
    }
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedAlert.set(null);
    this.resolveNotes.set('');
  }

  resolveAlert() {
    const alert = this.selectedAlert();
    if (alert) {
      this.alertService.resolveAlert(alert.id, 'Current User', this.resolveNotes());
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

  getSeverityConfig(severity: AlertSeverity) {
    return this.alertService.getSeverityConfig(severity);
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
