export type Role = 'ADMIN' | 'WAREHOUSE_MANAGER' | 'SALES_EXECUTIVE' | 'SUPPLIER' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  warehouseId?: string | null;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  capacity: number;
  usedCapacity: number;
  utilizationPct?: number;
  managerName?: string | null;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  rating: number;
  onTimeRate: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  reorderPoint: number;
  reorderQuantity: number;
  leadTimeDays: number;
  isActive: boolean;
  categoryId: string;
  category?: Category;
  supplier?: Supplier | null;
  inventory?: InventoryRecord[];
}

export interface InventoryRecord {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reservedQty: number;
  product?: Product;
  warehouse?: Warehouse;
}

export type OrderStatus = 'PENDING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'RETURNED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product?: Product;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  warehouseId: string;
  warehouse?: Warehouse;
  status: OrderStatus;
  totalAmount: number;
  invoiceUrl?: string | null;
  items: OrderItem[];
  createdAt: string;
}

export type PurchaseStatus = 'PENDING' | 'APPROVED' | 'DISPATCHED' | 'DELIVERED' | 'REJECTED';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier?: Supplier;
  warehouseId: string;
  warehouse?: Warehouse;
  status: PurchaseStatus;
  totalAmount: number;
  expectedDate?: string | null;
  deliveredDate?: string | null;
  items: { id: string; productId: string; quantity: number; unitCost: number; product?: Product }[];
  createdAt: string;
}

export type TransferStatus = 'REQUESTED' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface Transfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouse?: Warehouse;
  destWarehouseId: string;
  destWarehouse?: Warehouse;
  status: TransferStatus;
  distanceKm?: number | null;
  carbonScore?: number | null;
  items: { id: string; productId: string; quantity: number; product?: Product }[];
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardKpis {
  revenue: number;
  ordersToday: number;
  inventoryValue: number;
  potentialProfit: number;
  activeWarehouses: number;
  totalProducts: number;
  stockAlerts: number;
  totalOrders: number;
}

export interface ForecastPoint {
  date: string;
  predictedDemand?: number;
  value?: number;
  confidenceScore?: number;
  confidence?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}
