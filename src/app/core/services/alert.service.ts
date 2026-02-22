/**
 * Alert Service - Diagram: type, message, dateCreation, resolue
 * Sujet PFE: alertes automatiques selon règles métier
 */
import { Injectable, signal, computed } from '@angular/core';
import { Alert, AlertFilter, AlertStats, AlertSeverity, ALERT_TYPES, SEVERITY_CONFIG } from '../models/alert.model';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private alertsSignal = signal<Alert[]>([]);

  getAlerts() {
    return this.alertsSignal;
  }

  getActiveAlerts() {
    return computed(() => this.alertsSignal().filter(a => !a.resolue));
  }

  getUnreadAlerts() {
    return computed(() => this.alertsSignal().filter(a => !(a.isRead ?? false)));
  }

  getFilteredAlerts(filter: AlertFilter) {
    return computed(() => {
      let alerts = this.alertsSignal();
      if (filter.resolue !== undefined) {
        alerts = alerts.filter(a => a.resolue === filter.resolue);
      }
      if (filter.type) {
        alerts = alerts.filter(a => a.type === filter.type);
      }
      return alerts.sort((a, b) =>
        new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()
      );
    });
  }

  getAlertById(id: string | number): Alert | undefined {
    return this.alertsSignal().find(a => String(a.id) === String(id));
  }

  getAlertStats(): AlertStats {
    const alerts = this.alertsSignal().filter(a => !a.resolue);
    const unread = this.alertsSignal().filter(a => !(a.isRead ?? false));
    const byType: Record<string, number> = {};
    ALERT_TYPES.forEach(t => { byType[t.value] = alerts.filter(a => a.type === t.value).length; });
    const critical = alerts.filter(a => a.type === 'out_of_stock').length;
    const high = alerts.filter(a => a.type === 'low_stock').length;
    const medium = alerts.filter(a => a.type === 'reorder_point').length;
    return { total: alerts.length, unread: unread.length, critical, high, medium, byType };
  }

  createAlert(alert: Omit<Alert, 'id'>): Alert {
    const newAlert: Alert = { ...alert, id: 'alert_' + Date.now(), resolue: false, isRead: false };
    this.alertsSignal.update(alerts => [newAlert, ...alerts]);
    return newAlert;
  }

  resolveAlert(id: string | number, _user?: string, _notes?: string): boolean {
    const index = this.alertsSignal().findIndex(a => String(a.id) === String(id));
    if (index === -1) return false;
    this.alertsSignal.update(alerts => {
      const updated = [...alerts];
      updated[index] = { ...updated[index], resolue: true };
      return updated;
    });
    return true;
  }

  deleteAlert(id: string | number): boolean {
    this.alertsSignal.update(alerts => alerts.filter(a => String(a.id) !== String(id)));
    return true;
  }

  getAlertTypeConfig(type: string) {
    return ALERT_TYPES.find(t => t.value === type);
  }

  getSeverityConfig(severity: string | AlertSeverity | undefined) {
    return severity ? SEVERITY_CONFIG[severity] : undefined;
  }

  markAsRead(id: string | number): void {
    const index = this.alertsSignal().findIndex(a => String(a.id) === String(id));
    if (index === -1) return;
    this.alertsSignal.update(alerts => {
      const updated = [...alerts];
      updated[index] = { ...updated[index], isRead: true };
      return updated;
    });
  }

  markAllAsRead(): void {
    this.alertsSignal.update(alerts =>
      alerts.map(a => ({ ...a, isRead: true }))
    );
  }

  getRules(): { id: string; name: string; type: string; isEnabled: boolean; conditions: unknown[]; actions: unknown[]; appliesTo: string }[] {
    return [];
  }

  toggleRule(ruleId: string): void {
    void ruleId;
  }
}
