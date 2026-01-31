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
  private alertsSignal = signal<Alert[]>(this.getMockAlerts());
  
  /** Alert rules for automatic alert generation */
  private rulesSignal = signal<AlertRule[]>(this.getMockRules());

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

  private getMockAlerts(): Alert[] {
    const now = new Date();
    return [
      {
        id: 'alert_001',
        type: 'out_of_stock',
        severity: 'critical',
        title: 'Rupture de Stock',
        message: 'Le produit "Câble USB-C 1m" est en rupture de stock au Magasin Centre Ville',
        productId: 'prod_010',
        productName: 'Câble USB-C 1m',
        productSku: 'CBL-USBC-1M',
        siteId: 'site_002',
        siteName: 'Magasin Centre Ville',
        currentValue: 0,
        thresholdValue: 10,
        isRead: false,
        isResolved: false,
        createdAt: new Date(now.getTime() - 30 * 60 * 1000)
      },
      {
        id: 'alert_002',
        type: 'low_stock',
        severity: 'high',
        title: 'Stock Bas',
        message: 'Le stock de "Souris Sans Fil Logitech" est en dessous du seuil minimum',
        productId: 'prod_002',
        productName: 'Souris Sans Fil Logitech',
        productSku: 'LOG-MX-001',
        siteId: 'site_001',
        siteName: 'Entrepôt Principal',
        currentValue: 8,
        thresholdValue: 20,
        isRead: false,
        isResolved: false,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
      },
      {
        id: 'alert_003',
        type: 'reorder_point',
        severity: 'medium',
        title: 'Point de Réapprovisionnement',
        message: 'Le produit "Clavier Mécanique RGB" a atteint son point de réapprovisionnement',
        productId: 'prod_003',
        productName: 'Clavier Mécanique RGB',
        productSku: 'KB-MECH-001',
        siteId: 'site_003',
        siteName: 'Centre Distribution Nord',
        currentValue: 25,
        thresholdValue: 30,
        isRead: true,
        isResolved: false,
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000)
      },
      {
        id: 'alert_004',
        type: 'expiring_soon',
        severity: 'high',
        title: 'Expiration Proche',
        message: '15 unités de "Pile Lithium CR2032" expirent dans 30 jours',
        productId: 'prod_015',
        productName: 'Pile Lithium CR2032',
        productSku: 'BAT-CR2032',
        siteId: 'site_001',
        siteName: 'Entrepôt Principal',
        currentValue: 15,
        isRead: false,
        isResolved: false,
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'alert_005',
        type: 'overstock',
        severity: 'low',
        title: 'Surstock',
        message: 'Le stock de "Écran 27" 4K Samsung" dépasse la capacité optimale',
        productId: 'prod_004',
        productName: 'Écran 27" 4K Samsung',
        productSku: 'SAM-MON27-001',
        siteId: 'site_001',
        siteName: 'Entrepôt Principal',
        currentValue: 150,
        thresholdValue: 100,
        isRead: true,
        isResolved: false,
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000)
      },
      {
        id: 'alert_006',
        type: 'transfer_required',
        severity: 'medium',
        title: 'Transfert Requis',
        message: 'Déséquilibre de stock détecté pour "Laptop Dell XPS 15" entre sites',
        productId: 'prod_001',
        productName: 'Laptop Dell XPS 15',
        productSku: 'DELL-XPS15-001',
        isRead: false,
        isResolved: false,
        createdAt: new Date(now.getTime() - 18 * 60 * 60 * 1000)
      },
      {
        id: 'alert_007',
        type: 'unusual_movement',
        severity: 'medium',
        title: 'Mouvement Inhabituel',
        message: 'Volume de sortie anormalement élevé pour "Casque Audio Bose" (+150%)',
        productId: 'prod_005',
        productName: 'Casque Audio Bose',
        productSku: 'BOSE-QC45-001',
        siteId: 'site_002',
        siteName: 'Magasin Centre Ville',
        isRead: true,
        isResolved: true,
        resolvedBy: 'Ahmed Ben Ali',
        resolvedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        resolutionNotes: 'Vente promotionnelle planifiée - mouvement normal',
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
      },
      {
        id: 'alert_008',
        type: 'pending_order',
        severity: 'medium',
        title: 'Commande en Attente',
        message: 'La commande PO-2026-015 du fournisseur Dell est en retard de 3 jours',
        isRead: false,
        isResolved: false,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      }
    ];
  }

  private getMockRules(): AlertRule[] {
    return [
      {
        id: 'rule_001',
        name: 'Alerte Stock Bas',
        type: 'low_stock',
        isEnabled: true,
        conditions: [
          { field: 'quantity', operator: 'less_than', value: 'minQuantity' }
        ],
        actions: [
          { type: 'notification', recipients: ['manager', 'admin'] }
        ],
        appliesTo: 'all',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2026-01-01')
      },
      {
        id: 'rule_002',
        name: 'Alerte Rupture',
        type: 'out_of_stock',
        isEnabled: true,
        conditions: [
          { field: 'quantity', operator: 'equals', value: 0 }
        ],
        actions: [
          { type: 'notification', recipients: ['all'] },
          { type: 'email', recipients: ['purchasing@company.com'] }
        ],
        appliesTo: 'all',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2026-01-01')
      },
      {
        id: 'rule_003',
        name: 'Point de Réapprovisionnement',
        type: 'reorder_point',
        isEnabled: true,
        conditions: [
          { field: 'quantity', operator: 'less_than', value: 'reorderPoint' }
        ],
        actions: [
          { type: 'notification', recipients: ['purchasing'] },
          { type: 'auto_order' }
        ],
        appliesTo: 'all',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2026-01-01')
      },
      {
        id: 'rule_004',
        name: 'Expiration Proche',
        type: 'expiring_soon',
        isEnabled: true,
        conditions: [
          { field: 'expiryDate', operator: 'less_than', value: 30 }
        ],
        actions: [
          { type: 'notification', recipients: ['warehouse'] }
        ],
        appliesTo: 'category',
        targetIds: ['cat_perishable'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2026-01-01')
      }
    ];
  }
}
