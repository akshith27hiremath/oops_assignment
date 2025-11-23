/**
 * Order Types
 * Type definitions for orders and transactions
 */

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export interface OrderItem {
  product: {
    _id: string;
    name: string;
    images: string[];
  };
  quantity: number;
  price: number;
  subtotal: number;
}

export interface TrackingInfo {
  currentStatus: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    notes?: string;
  }[];
}

export interface SubOrder {
  subOrderId: string;
  retailerId: {
    _id: string;
    profile?: {
      name: string;
    };
    businessName?: string;
  };
  items: OrderItem[];
  subtotalBeforeProductDiscounts: number;
  productDiscountSavings: number;
  subtotalAfterProductDiscounts: number;
  tierCodeDiscountShare: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  trackingInfo: TrackingInfo;
  deliveryEstimate?: {
    distanceMeters: number;
    distanceText: string;
    durationSeconds: number;
    durationText: string;
    calculatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  _id: string;
  orderId: string;
  orderNumber?: string; // Legacy field
  customerId?: any;
  retailerId?: any; // Deprecated - kept for backward compatibility
  customer?: {
    _id: string;
    name: string;
    email: string;
  };
  retailer?: {
    _id: string;
    businessName: string;
  };
  items?: OrderItem[]; // Deprecated - kept for backward compatibility
  orderType?: string;
  totalAmount: number;
  status?: OrderStatus; // Deprecated - kept for backward compatibility
  masterStatus?: OrderStatus; // New: Aggregate status across all sub-orders
  paymentStatus: PaymentStatus;
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  trackingInfo?: any; // Deprecated - kept for backward compatibility
  subOrders?: SubOrder[]; // New: Array of sub-orders, one per retailer
  deliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  success: boolean;
  message: string;
  data: {
    orders: Order[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface CreateOrderRequest {
  items: {
    productId: string;
    quantity: number;
  }[];
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod?: string;
  notes?: string;
}
