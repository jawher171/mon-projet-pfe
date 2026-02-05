/**
 * Stock Movement Model
 * Tracks all inventory movements (entries and exits) including purchases,
 * transfers, adjustments, sales, and damage logs.
 */

/** Stock movement record - logs all inventory transactions */
export interface StockMovement {
  id: string;
  movementNumber: string;
  type: 'entry' | 'exit';
  reason: MovementReason;
  productId: string;
  productName: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  siteId: string;
  siteName: string;
  reference?: string;
  barcode?: string;
  notes?: string;
  performedBy: string;
  performedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type MovementReason = 
  | 'return_supplier'    // Entrée - Retour fournisseur
  | 'return_customer'    // Sortie - Retour client (négatif)
  | 'transfer_out'       // Sortie - Transfert sortant
  | string              // Custom reasons

export interface MovementFilter {
  search?: string;
  type?: 'entry' | 'exit' | 'all';
  reason?: MovementReason;
  siteId?: string;
  productId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface MovementSummary {
  totalEntries: number;
  totalExits: number;
  entriesQuantity: number;
  exitsQuantity: number;
  netChange: number;
  topMovingProducts: {
    productId: string;
    productName: string;
    entries: number;
    exits: number;
  }[];
}

export const MOVEMENT_REASONS: { value: MovementReason; label: string; type: 'entry' | 'exit' }[] = [
  { value: 'return_supplier', label: 'livraison Fournisseur', type: 'entry' },
  { value: 'return_customer', label: 'retour de site', type: 'entry' },
  { value: 'transfer_out', label: 'Transfert Sortant', type: 'exit' },
];
