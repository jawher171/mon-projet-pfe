/**
 * Supplier Model
 * Represents supplier/vendor information for purchase orders.
 * Includes contact details, ratings, and order history.
 */

/** Supplier interface - vendor information */
export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  website?: string;
  taxId?: string;
  paymentTerms: string;
  rating: number;
  status: 'active' | 'inactive';
  productCount: number;
  totalOrders: number;
  createdAt: Date;
  updatedAt: Date;
}
