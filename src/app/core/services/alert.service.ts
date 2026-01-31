/**
 * Alert Service
 * Manages system alerts and notifications for inventory management.
 * Handles alert creation, filtering, resolution, and alert rules.
 */

import { Injectable, signal, computed } from '@angular/core';
import { Alert, AlertFilter, AlertStats, AlertType, AlertSeverity, AlertRule, ALERT_TYPES, SEVERITY_CONFIG } from '../models/alert.model';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  /** All system alerts */
  private alertsSignal = signal<Alert[]>([]);
  
  /** Alert rules for automatic alert generation */
  private rulesSignal = signal<AlertRule[]>([]);

  /**
   * Get all alerts signal
   * @returns Signal containing all alerts
   */
  getAlerts() {
    return this.alertsSignal;
  }

  /**
   * Get unread alerts that are not yet resolved
   * @returns Computed signal of unread active alerts
   */
  getUnreadAlerts() {
    return computed(() => this.alertsSignal().filter(a => !a.isRead && !a.isResolved));
  }

  /**
   * Get all unresolved alerts
   * @returns Computed signal of active (unresolved) alerts
   */
  /**
   * Get alerts filtered by multiple criteria
   * Sorts by severity (critical first) and then by date
   * @param filter Alert filter criteria
   * @returns Computed signal of filtered and sorted alerts
   */
  getActiveAlerts() {
    return computed(() => this.alertsSignal().filter(a => !a.isResolved));
  }

  getFilteredAlerts(filter: AlertFilter) {
    return computed(() => {
      let alerts = this.alertsSignal();

      if (filter.type && filter.type !== 'all') {
        alerts = alerts.filter(a => a.type === filter.type);
      }

      if (filter.severity && filter.severity !== 'all') {
        alerts = alerts.filter(a => a.severity === filter.severity);
      }

      if (filter.siteId) {
        alerts = alerts.filter(a => a.siteId === filter.siteId);
      }

      if (filter.isRead !== undefined) {
        alerts = alerts.filter(a => a.isRead === filter.isRead);
      }

      if (filter.isResolved !== undefined) {
        alerts = alerts.filter(a => a.isResolved === filter.isResolved);
      }

      if (filter.startDate) {
        alerts = alerts.filter(a => new Date(a.createdAt) >= filter.startDate!);
      }

      if (filter.endDate) {
        alerts = alerts.filter(a => new Date(a.createdAt) <= filter.endDate!);
      }

      return alerts.sort((a, b) => {
        // Sort by severity first, then by date
        const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
        const severityDiff = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
  /**
   * Get specific alert by ID
   * @param id Alert identifier
   * @returns Alert object or undefined if not found
   */
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });
  }
/**
   * Get summary statistics of active alerts
   * Counts by severity and type
   * @returns Alert statistics object
   */
  
  getAlertById(id: string): Alert | undefined {
    return this.alertsSignal().find(a => a.id === id);
  }

  getAlertStats(): AlertStats {
    const alerts = this.alertsSignal().filter(a => !a.isResolved);
    const byType = {} as Record<AlertType, number>;
    
    ALERT_TYPES.forEach(t => {
      byType[t.value] = alerts.filter(a => a.type === t.value).length;
    });

    return {
  /**
   * Create a new alert
   * @param alert Alert data without auto-generated fields
   * @returns Created alert object
   */
      total: alerts.length,
      unread: alerts.filter(a => !a.isRead).length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length,
      byType
    };
  }

  createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'isRead' | 'isResolved'>): Alert {
    const newAlert: Alert = {
      ...alert,
  /**
   * Mark alert as read
   * @param id Alert identifier
   * @returns true if successful, false if alert not found
   */
      id: this.generateId(),
      isRead: false,
      isResolved: false,
      createdAt: new Date()
    };

    this.alertsSignal.update(alerts => [newAlert, ...alerts]);
    return newAlert;
  }

  markAsRead(id: string): boolean {
    const index = this.alertsSignal().findIndex(a => a.id === id);
  /**
   * Mark all alerts as read
   */
    if (index === -1) return false;

    this.alertsSignal.update(alerts => {
  /**
   * Resolve an alert with resolution details
   * @param id Alert identifier
   * @param resolvedBy User who resolved the alert
   * @param notes Optional resolution notes
   * @returns true if successful, false if alert not found
   */
      const updated = [...alerts];
      updated[index] = { ...updated[index], isRead: true };
      return updated;
    });
    return true;
  }

  markAllAsRead(): void {
    this.alertsSignal.update(alerts => 
      alerts.map(a => ({ ...a, isRead: true }))
    );
  }

  resolveAlert(id: string, resolvedBy: string, notes?: string): boolean {
    const index = this.alertsSignal().findIndex(a => a.id === id);
    if (index === -1) return false;

  /**
   * Delete an alert
   * @param id Alert identifier
   * @returns true if successful, false if alert not found
   */
    this.alertsSignal.update(alerts => {
      const updated = [...alerts];
      updated[index] = {
  /**
   * Get all alert rules signal
   * @returns Signal containing all alert rules
   */
        ...updated[index],
        isResolved: true,
        isRead: true,
        resolvedBy,
        resolvedAt: new Date(),
  /**
   * Update an alert rule
   * @param id Rule identifier
   * @param updates Partial rule data to update
   * @returns true if successful, false if rule not found
   */
        resolutionNotes: notes
      };
      return updated;
    });
    return true;
  }

  deleteAlert(id: string): boolean {
    const index = this.alertsSignal().findIndex(a => a.id === id);
  /**
   * Toggle rule enabled/disabled status
   * @param id Rule identifier
   * @returns true if successful, false if rule not found
   */
    if (index === -1) return false;

    this.alertsSignal.update(alerts => alerts.filter(a => a.id !== id));
    return true;
  }

  getRules() {
    return this.rulesSignal;
  /**
   * Get configuration for a specific alert type
   * @param type Alert type
   * @returns Alert type configuration with label and severity
   */
  }

  updateRule(id: string, updates: Partial<AlertRule>): boolean {
    const index = this.rulesSignal().findIndex(r => r.id === id);
  /**
   * Get UI configuration for a severity level
   * @param severity Alert severity
   * @returns Severity configuration with colors and labels
   */
    if (index === -1) return false;

    this.rulesSignal.update(rules => {
      const updated = [...rules];
      updated[index] = { ...updated[index], ...updates, updatedAt: new Date() };
      return updated;
    });
    return true;
  }

  toggleRule(id: string): boolean {
    const rule = this.rulesSignal().find(r => r.id === id);
    if (!rule) return false;
    return this.updateRule(id, { isEnabled: !rule.isEnabled });
  }

  getAlertTypeConfig(type: AlertType) {
    return ALERT_TYPES.find(t => t.value === type);
  }

  getSeverityConfig(severity: AlertSeverity) {
    return SEVERITY_CONFIG[severity];
  }

  private generateId(): string {
    return 'alert_' + Math.random().toString(36).substring(2, 11);
  }
}
