/**
 * Alerte - Diagram: type, message, dateCreation, resolue
 */
export interface Alert {
  id: number | string;
  type: string;
  message: string;
  dateCreation: Date;
  resolue: boolean;
  /** Alert severity from backend: Critical, Warning, Info */
  severity?: string;
  /** Alert status from backend: Open, Closed */
  status?: string;
  /** Stock FK — required by backend */
  stockId?: string | number;
  /** Whether the user has read/viewed this alert */
  isRead?: boolean;
  produitNom?: string;
  siteNom?: string;
  utilisateurNom?: string;
}

export interface AlertFilter {
  resolue?: boolean;
  type?: string;
  severity?: string;
  /** Filter by date (YYYY-MM-DD) — only alerts from that day */
  date?: string;
  /** Filter by product name */
  produitNom?: string;
}

export type AlertType = 'OUT_OF_STOCK' | 'MIN_STOCK' | 'STOCK_SECURITE' | 'STOCK_ALERTE' | 'STOCK_MAXIMUM' | 'ENTRY_VALIDATED' | 'EXIT_VALIDATED' | string;
export type AlertSeverity = 'Critical' | 'Warning' | 'Info' | string;

export interface AlertStats {
  total: number;
  unread: number;
  critical: number;
  high: number;
  medium: number;
  byType: Record<string, number>;
}

export const ALERT_TYPES: { value: string; label: string; icon: string }[] = [
  { value: 'OUT_OF_STOCK', label: 'Rupture de Stock', icon: 'report_problem' },
  { value: 'MIN_STOCK', label: 'Stock Minimum', icon: 'production_quantity_limits' },
  { value: 'STOCK_SECURITE', label: 'Seuil de Sécurité', icon: 'shield' },
  { value: 'STOCK_ALERTE', label: 'Seuil d\'Alerte', icon: 'campaign' },
  { value: 'STOCK_MAXIMUM', label: 'Stock Maximum', icon: 'deployed_code_alert' },
  { value: 'ENTRY_VALIDATED', label: 'Entrée Validée', icon: 'input' },
  { value: 'EXIT_VALIDATED', label: 'Sortie Validée', icon: 'output' },
  { value: 'TRANSFER_VALIDATED', label: 'Transfert Validé', icon: 'sync_alt' },
];

export const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  critical: { label: 'Critique', color: '#d32f2f', bgColor: '#ffebee', icon: 'error' },
  warning: { label: 'Avertissement', color: '#f57c00', bgColor: '#fff3e0', icon: 'warning_amber' },
  info: { label: 'Info', color: '#1976d2', bgColor: '#e3f2fd', icon: 'info' }
};
