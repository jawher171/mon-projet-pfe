/**
 * Order Model
 * Represents purchase and sales orders.
 * Tracks order status, payment information, and ordered items.
 */

/** Order interface - purchase or sales orders */
export interface Order {
  id: string;
  orderNumber: string;
  type: 'purchase' | 'sale';
  supplierId?: string;
  supplierName?: string;
  customerId?: string;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
}
