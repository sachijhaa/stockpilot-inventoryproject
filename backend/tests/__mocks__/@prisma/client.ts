/**
 * Manual Jest mock for @prisma/client.
 *
 * This lets lightweight integration tests (e.g. verifying Express route
 * wiring, middleware order, and error handling) run without needing a
 * fully generated Prisma client or live database connection. Tests that
 * exercise real data access should instead run against the test database
 * configured in CI (see .github/workflows/ci.yml), where the real
 * `npx prisma generate` output is used.
 */

export const Role = {
  ADMIN: 'ADMIN',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  SALES_EXECUTIVE: 'SALES_EXECUTIVE',
  SUPPLIER: 'SUPPLIER',
  VIEWER: 'VIEWER',
} as const;

export const OrderStatus = {
  PENDING: 'PENDING',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED',
} as const;

export const PurchaseStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DISPATCHED: 'DISPATCHED',
  DELIVERED: 'DELIVERED',
  REJECTED: 'REJECTED',
} as const;

export const TransferStatus = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  IN_TRANSIT: 'IN_TRANSIT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const NotificationType = {
  LOW_STOCK: 'LOW_STOCK',
  TRANSFER_COMPLETED: 'TRANSFER_COMPLETED',
  PURCHASE_DELIVERED: 'PURCHASE_DELIVERED',
  AI_ALERT: 'AI_ALERT',
  EXPIRY_ALERT: 'EXPIRY_ALERT',
  ANOMALY_ALERT: 'ANOMALY_ALERT',
  SYSTEM: 'SYSTEM',
} as const;

export const InventoryLogAction = {
  STOCK_IN: 'STOCK_IN',
  STOCK_OUT: 'STOCK_OUT',
  ADJUSTMENT: 'ADJUSTMENT',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
  RETURN: 'RETURN',
  DAMAGE: 'DAMAGE',
  UNDO: 'UNDO',
} as const;

class PrismaClientKnownRequestError extends Error {
  code: string;
  meta?: Record<string, unknown>;
  constructor(message: string, code = 'P2000', meta?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.meta = meta;
  }
}

export const Prisma = {
  PrismaClientKnownRequestError,
};

// A no-op PrismaClient stand-in. Individual tests can jest.mock specific
// methods as needed; for route-wiring tests, no methods are called before
// the request short-circuits (e.g. 404 handler, unauthenticated 401s).
export class PrismaClient {
  $connect = async () => undefined;
  $disconnect = async () => undefined;
  $transaction = async (fn: any) => (typeof fn === 'function' ? fn(this) : Promise.all(fn));

  private handler = {
    get: () => async () => {
      throw new Error('PrismaClient method called in a test without being mocked. Use jest.spyOn or mock the service layer instead.');
    },
  };

  constructor() {
    return new Proxy(this, {
      get: (target: any, prop: string) => {
        if (prop in target) return target[prop];
        // Any model accessor (e.g. prisma.user) returns a proxy of no-op methods
        return new Proxy(
          {},
          {
            get: () => async () => {
              throw new Error(
                `PrismaClient.${prop} method called in a test without being mocked. Use jest.spyOn or mock the service layer instead.`
              );
            },
          }
        );
      },
    });
  }
}
