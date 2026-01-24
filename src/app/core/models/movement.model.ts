export interface StockMovement {
  id: string;
  movementNumber: string;
  type: 'entry' | 'exit';
  reason: MovementReason;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  siteId: string;
  siteName: string;
  warehouseZone?: string;
  reference?: string;
  supplierId?: string;
  supplierName?: string;
  orderId?: string;
  orderNumber?: string;
  barcode?: string;
  notes?: string;
  performedBy: string;
  performedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type MovementReason = 
  | 'purchase'           // Entrée - Achat fournisseur
  | 'return_supplier'    // Entrée - Retour fournisseur
  | 'production'         // Entrée - Production
  | 'transfer_in'        // Entrée - Transfert entrant
  | 'adjustment_plus'    // Entrée - Ajustement positif
  | 'initial_stock'      // Entrée - Stock initial
  | 'sale'               // Sortie - Vente
  | 'return_customer'    // Sortie - Retour client (négatif)
  | 'damaged'            // Sortie - Produit endommagé
  | 'expired'            // Sortie - Produit expiré
  | 'transfer_out'       // Sortie - Transfert sortant
  | 'adjustment_minus'   // Sortie - Ajustement négatif
  | 'internal_use';      // Sortie - Usage interne

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
  { value: 'purchase', label: 'Achat Fournisseur', type: 'entry' },
  { value: 'return_supplier', label: 'Retour Fournisseur', type: 'entry' },
  { value: 'production', label: 'Production', type: 'entry' },
  { value: 'transfer_in', label: 'Transfert Entrant', type: 'entry' },
  { value: 'adjustment_plus', label: 'Ajustement Positif', type: 'entry' },
  { value: 'initial_stock', label: 'Stock Initial', type: 'entry' },
  { value: 'sale', label: 'Vente', type: 'exit' },
  { value: 'return_customer', label: 'Retour Client', type: 'exit' },
  { value: 'damaged', label: 'Produit Endommagé', type: 'exit' },
  { value: 'expired', label: 'Produit Expiré', type: 'exit' },
  { value: 'transfer_out', label: 'Transfert Sortant', type: 'exit' },
  { value: 'adjustment_minus', label: 'Ajustement Négatif', type: 'exit' },
  { value: 'internal_use', label: 'Usage Interne', type: 'exit' }
];
