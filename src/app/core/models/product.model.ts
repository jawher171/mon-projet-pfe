/**
 * Product Model
 * Represents products in the inventory management system.
 * Includes product details, pricing, stock levels, and status information.
 */

/** Product interface - core product data */
export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  categoryId: string;
  supplier: string;
  supplierId: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  price: number;
  cost: number;
  unit: string;
  location: string;
  barcode?: string;
  imageUrl?: string;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: Date;
  updatedAt: Date;
  lastRestocked?: Date;
}

export interface ProductFilter {
  search?: string;
  categoryId?: string;
  supplierId?: string;
  status?: string;
  minQuantity?: number;
  maxQuantity?: number;
}
