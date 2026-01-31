/**
 * Site Model
 * Represents physical locations like warehouses, stores, and distribution centers.
 * Manages site information, zones, and inventory locations.
 */

/** Site interface - warehouse or store location */
export interface Site {
  id: string;
  code: string;
  name: string;
  type: SiteType;
  address: Address;
  phone?: string;
  email?: string;
  manager?: string;
  managerId?: string;
  capacity?: number;
  currentOccupancy?: number;
  zones: WarehouseZone[];
  isActive: boolean;
  isMain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SiteType = 'warehouse' | 'store' | 'distribution_center' | 'production';

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface WarehouseZone {
  id: string;
  code: string;
  name: string;
  type: 'storage' | 'receiving' | 'shipping' | 'quarantine' | 'cold';
  capacity?: number;
  currentStock?: number;
}

export interface SiteFilter {
  search?: string;
  type?: SiteType | 'all';
  isActive?: boolean;
}

export interface SiteStock {
  siteId: string;
  siteName: string;
  productId: string;
  productName: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  zone?: string;
}

export interface TransferRequest {
  id: string;
  transferNumber: string;
  fromSiteId: string;
  fromSiteName: string;
  toSiteId: string;
  toSiteName: string;
  items: TransferItem[];
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  requestedBy: string;
  requestedAt: Date;
  completedAt?: Date;
  notes?: string;
}

export interface TransferItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  receivedQuantity?: number;
}

export const SITE_TYPES: { value: SiteType; label: string; icon: string }[] = [
  { value: 'warehouse', label: 'Entrepôt', icon: 'warehouse' },
  { value: 'store', label: 'Magasin', icon: 'store' },
  { value: 'distribution_center', label: 'Centre de Distribution', icon: 'local_shipping' },
  { value: 'production', label: 'Site de Production', icon: 'factory' }
];
