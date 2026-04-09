/**
 * Dashboard Data Models
 * Centralized interfaces for the replenishment dashboard KPIs.
 */

export interface DashboardFilter {
  siteType?: 'warehouse' | 'store' | string;
  siteId?: string;
  categoryId?: string;
  productId?: string;
  dateRange?: 'today' | '7days' | '30days' | 'thisMonth' | 'all';
}

export interface ChartDataset {
  data: number[];
  label?: string;
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  fill?: boolean;
  tension?: number;
  borderRadius?: number;
  borderWidth?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

/** A single stock item needing replenishment or in alert state */
export interface ReplenishmentItem {
  stockId: string | number;
  produitNom: string;
  siteNom: string;
  quantiteDisponible: number;
  seuilMinimum: number;
  seuilAlerte: number;
  seuilMaximum: number;
  qteAReapprovisionner: number;
  status: 'rupture' | 'critique' | 'alerte' | 'surstock' | 'normal';
  prix?: number;
}

/** Full dashboard KPIs */
export interface DashboardData {
  // 1. Global stats
  totalStockDisponible: number;
  valeurTotaleStock: number;
  nombreProduits: number;
  nombreSitesActifs: number;
  nombreUtilisateursActifs: number;

  // 2. Movements
  totalMouvements: number;
  totalMouvementsBruts: number;
  totalMouvementsIgnores: number;
  totalEntrees: number;
  totalSorties: number;
  totalTransferts: number;
  entreesQuantite: number;
  sortiesQuantite: number;
  transfertsQuantite: number;
  netVariationQuantite: number;

  // 3. Alerts
  totalAlertesActives: number;
  totalAlertesCritiques: number;
  tauxAlertesResolues: number;
  topAlertProducts: { name: string; count: number }[];
  topAlertSites: { name: string; count: number }[];

  // 4. Stock analysis
  produitsEnRupture: number;
  produitsCritiques: number;
  produitsEnAlerte: number;
  produitsSousSeuil: number;
  produitsSurStock: number;
  produitsNormaux: number;

  // 5. Replenishment table
  replenishmentItems: ReplenishmentItem[];

  // 6. Recent movements
  recentMovements: {
    id: string | number;
    date: Date;
    type: 'entry' | 'exit' | 'transfer' | 'unknown';
    produitNom: string;
    siteNom: string;
    quantite: number;
    raison: string;
    utilisateur: string;
  }[];

  // 7. Charts
  stockHealthChart: ChartData;
  productStockChart: ChartData;
  movementTrendChart: ChartData;

  // Metadata
  lastRefresh: Date;
  activeFilter: DashboardFilter;
}
