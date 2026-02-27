/**
 * MouvementStock - Diagram: dateMouvement, raison, quantite, note
 */
export interface MouvementStock {
  id: number | string;
  dateMouvement: Date;
  raison: string;
  quantite: number;
  note?: string;
  produitNom?: string;
  siteNom?: string;
  productId?: string | number;
  siteId?: string | number;
  stockId?: string | number;
  userId?: string | number;
  utilisateurNom?: string;
  type?: 'entry' | 'exit';
}

export interface MouvementFilter {
  search?: string;
  startDate?: Date;
  endDate?: Date;
  type?: 'entry' | 'exit' | 'all';
  raison?: string;
  siteId?: string;
  productId?: string;
}

export interface MovementSummary {
  totalEntries: number;
  totalExits: number;
  entriesQuantity: number;
  exitsQuantity: number;
  netChange: number;
  topMovingProducts?: { productId: string; productName: string; entries: number; exits: number }[];
}

export type MovementReason = 'return_supplier' | 'return_customer' | 'transfer_out' | string;

export const MOVEMENT_REASONS: { value: MovementReason; label: string; type: 'entry' | 'exit' }[] = [
  { value: 'return_supplier', label: 'Livraison Fournisseur', type: 'entry' },
  { value: 'return_customer', label: 'Retour client', type: 'entry' },
  { value: 'transfer_out', label: 'Transfert Sortant', type: 'exit' },
];
