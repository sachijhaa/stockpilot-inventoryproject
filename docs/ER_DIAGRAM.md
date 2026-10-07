# Entity-Relationship Diagram

Rendered from `backend/prisma/schema.prisma`. Paste into [mermaid.live](https://mermaid.live) to view interactively, or view directly in any Markdown renderer that supports Mermaid (GitHub does this natively).

```mermaid
erDiagram
    USER ||--o{ ORDER : creates
    USER ||--o{ PURCHASE_ORDER : creates
    USER ||--o{ TRANSFER : requests
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ ACTIVITY_LOG : performs
    USER }o--|| WAREHOUSE : "assigned to"

    WAREHOUSE ||--o{ INVENTORY : stores
    WAREHOUSE ||--o{ INVENTORY_LOG : records
    WAREHOUSE ||--o{ ORDER : fulfills
    WAREHOUSE ||--o{ PURCHASE_ORDER : receives
    WAREHOUSE ||--o{ TRANSFER : "source/dest"
    WAREHOUSE ||--o{ FORECAST : has
    WAREHOUSE ||--o{ EXPIRY_BATCH : holds

    CATEGORY ||--o{ PRODUCT : classifies
    CATEGORY ||--o{ CATEGORY : "parent of"

    SUPPLIER ||--o{ PRODUCT : supplies
    SUPPLIER ||--o{ PURCHASE_ORDER : fulfills

    PRODUCT ||--o{ INVENTORY : "stocked as"
    PRODUCT ||--o{ INVENTORY_LOG : "logged for"
    PRODUCT ||--o{ PURCHASE_ITEM : "ordered as"
    PRODUCT ||--o{ ORDER_ITEM : "sold as"
    PRODUCT ||--o{ TRANSFER_ITEM : "moved as"
    PRODUCT ||--o{ FORECAST : forecasted
    PRODUCT ||--o{ EXPIRY_BATCH : "batched as"
    PRODUCT ||--o{ INVENTORY_HEALTH : scored

    PURCHASE_ORDER ||--o{ PURCHASE_ITEM : contains
    ORDER ||--o{ ORDER_ITEM : contains
    TRANSFER ||--o{ TRANSFER_ITEM : contains

    USER {
        string id PK
        string name
        string email UK
        string passwordHash
        enum role
        string warehouseId FK
    }

    WAREHOUSE {
        string id PK
        string name
        string code UK
        float latitude
        float longitude
        int capacity
        int usedCapacity
    }

    CATEGORY {
        string id PK
        string name UK
        string parentId FK
    }

    SUPPLIER {
        string id PK
        string name
        float rating
        float onTimeRate
    }

    PRODUCT {
        string id PK
        string sku UK
        string barcode UK
        decimal costPrice
        decimal sellingPrice
        int reorderPoint
        int reorderQuantity
        int leadTimeDays
        string categoryId FK
        string supplierId FK
    }

    INVENTORY {
        string id PK
        string productId FK
        string warehouseId FK
        int quantity
        int reservedQty
    }

    INVENTORY_LOG {
        string id PK
        string productId FK
        string warehouseId FK
        enum action
        int quantity
        int balanceAfter
    }

    PURCHASE_ORDER {
        string id PK
        string poNumber UK
        string supplierId FK
        string warehouseId FK
        enum status
        decimal totalAmount
    }

    PURCHASE_ITEM {
        string id PK
        string purchaseOrderId FK
        string productId FK
        int quantity
        decimal unitCost
    }

    ORDER {
        string id PK
        string orderNumber UK
        string warehouseId FK
        enum status
        decimal totalAmount
    }

    ORDER_ITEM {
        string id PK
        string orderId FK
        string productId FK
        int quantity
        decimal unitPrice
    }

    TRANSFER {
        string id PK
        string transferNumber UK
        string sourceWarehouseId FK
        string destWarehouseId FK
        enum status
        float distanceKm
        float carbonScore
    }

    TRANSFER_ITEM {
        string id PK
        string transferId FK
        string productId FK
        int quantity
    }

    NOTIFICATION {
        string id PK
        string userId FK
        enum type
        boolean isRead
    }

    FORECAST {
        string id PK
        string productId FK
        string warehouseId FK
        datetime forecastDate
        float predictedDemand
        float confidenceScore
    }

    INVENTORY_HEALTH {
        string id PK
        string productId FK
        string warehouseId FK
        int score
    }

    EXPIRY_BATCH {
        string id PK
        string productId FK
        string warehouseId FK
        datetime expiryDate
    }

    ACTIVITY_LOG {
        string id PK
        string userId FK
        string action
        string entity
    }
```

## Notes on design choices

- **Soft deletes** (`deletedAt`) on Users, Warehouses, Categories, Suppliers, Products, Orders, PurchaseOrders, and Transfers so records can be restored (Recycle Bin) rather than destroyed.
- **`Inventory` is per (product, warehouse) pair** — a unique composite index on `(productId, warehouseId)` means stock levels are always looked up/updated atomically per location, which is what makes multi-warehouse sync correct.
- **`InventoryLog` is append-only** and is the audit trail every stock-level number is derived from; `Inventory.quantity` is a materialized/cached current total for fast reads.
- **`AuditLog` vs `ActivityLog`**: `ActivityLog` is a lightweight "who did what" feed for the UI's activity timeline; `AuditLog` stores before/after JSON snapshots for compliance-grade change tracking.
