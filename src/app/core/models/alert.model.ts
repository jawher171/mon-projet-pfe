/**
 * Alerte - Diagram: type, message, dateCreation, resolue
 */
export interface Alert {
  id: number | string;
  type: string;
  message: string;
  dateCreation: Date;
  resolue: boolean;
  /** Whether the user has read/viewed this alert */
  isRead?: boolean;
  produitNom?: string;
  siteNom?: string;
}

export interface AlertFilter {
  resolue?: boolean;
  type?: string;
}

export type AlertType = 'low_stock' | 'out_of_stock' | 'overstock' | 'reorder_point' | string;
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AlertStats {
  total: number;
  unread: number;
  critical: number;
  high: number;
  medium: number;
  byType: Record<string, number>;
}

export const ALERT_TYPES: { value: string; label: string; icon: string }[] = [
  { value: 'out_of_stock', label: 'Rupture de Stock', icon: 'error' },
  { value: 'low_stock', label: 'Stock Bas', icon: 'warning' },
  { value: 'reorder_point', label: 'Point de Réapprovisionnement', icon: 'shopping_cart' },
  { value: 'overstock', label: 'Surstock', icon: 'inventory' },
];

export const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  critical: { label: 'Critique', color: '#d32f2f', bgColor: '#ffebee', icon: 'error' },
  high: { label: 'Élevée', color: '#f57c00', bgColor: '#fff3e0', icon: 'warning' },
  medium: { label: 'Moyenne', color: '#fbc02d', bgColor: '#fffde7', icon: 'info' },
  low: { label: 'Basse', color: '#388e3c', bgColor: '#e8f5e9', icon: 'check_circle' },
  info: { label: 'Info', color: '#1976d2', bgColor: '#e3f2fd', icon: 'info' }
};
