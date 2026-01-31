/**
 * Alert Model
 * Represents system alerts and notifications for inventory management.
 * Covers low stock, expiration, movements, and other critical events.
 */

/** Main alert interface - represents an individual alert notification */
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  productId?: string;
  productName?: string;
  productSku?: string;
  siteId?: string;
  siteName?: string;
  currentValue?: number;
  thresholdValue?: number;
  isRead: boolean;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export type AlertType = 
  | 'low_stock'           // Stock bas
  | 'out_of_stock'        // Rupture de stock
  | 'overstock'           // Surstock
  | 'expiring_soon'       // Expiration proche
  | 'expired'             // Produit expiré
  | 'reorder_point'       // Point de réapprovisionnement
  | 'unusual_movement'    // Mouvement inhabituel
  | 'pending_order'       // Commande en attente
  | 'transfer_required'   // Transfert requis
  | 'inventory_variance'; // Écart d'inventaire

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  isEnabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  appliesTo: 'all' | 'category' | 'product' | 'site';
  targetIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  field: string;
  operator: 'less_than' | 'greater_than' | 'equals' | 'between';
  value: number | string;
  value2?: number | string;
}

export interface AlertAction {
  type: 'notification' | 'email' | 'auto_order' | 'transfer';
  recipients?: string[];
  config?: Record<string, unknown>;
}

export interface AlertFilter {
  type?: AlertType | 'all';
  severity?: AlertSeverity | 'all';
  siteId?: string;
  isRead?: boolean;
  isResolved?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface AlertStats {
  total: number;
  unread: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<AlertType, number>;
}

export const ALERT_TYPES: { value: AlertType; label: string; icon: string; defaultSeverity: AlertSeverity }[] = [
  { value: 'out_of_stock', label: 'Rupture de Stock', icon: 'error', defaultSeverity: 'critical' },
  { value: 'low_stock', label: 'Stock Bas', icon: 'warning', defaultSeverity: 'high' },
  { value: 'reorder_point', label: 'Point de Réapprovisionnement', icon: 'shopping_cart', defaultSeverity: 'medium' },
  { value: 'overstock', label: 'Surstock', icon: 'inventory', defaultSeverity: 'low' },
  { value: 'expired', label: 'Produit Expiré', icon: 'delete_forever', defaultSeverity: 'critical' },
  { value: 'expiring_soon', label: 'Expiration Proche', icon: 'schedule', defaultSeverity: 'high' },
  { value: 'unusual_movement', label: 'Mouvement Inhabituel', icon: 'trending_up', defaultSeverity: 'medium' },
  { value: 'pending_order', label: 'Commande en Attente', icon: 'hourglass_empty', defaultSeverity: 'medium' },
  { value: 'transfer_required', label: 'Transfert Requis', icon: 'swap_horiz', defaultSeverity: 'medium' },
  { value: 'inventory_variance', label: 'Écart d\'Inventaire', icon: 'difference', defaultSeverity: 'high' }
];

export const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; bgColor: string; icon: string }> = {
  critical: { label: 'Critique', color: '#d32f2f', bgColor: '#ffebee', icon: 'error' },
  high: { label: 'Élevée', color: '#f57c00', bgColor: '#fff3e0', icon: 'warning' },
  medium: { label: 'Moyenne', color: '#fbc02d', bgColor: '#fffde7', icon: 'info' },
  low: { label: 'Basse', color: '#388e3c', bgColor: '#e8f5e9', icon: 'check_circle' },
  info: { label: 'Info', color: '#1976d2', bgColor: '#e3f2fd', icon: 'info' }
};
