# API Reference

Full interactive docs (Swagger/OpenAPI) are served at `http://localhost:4000/api-docs` (or `http://localhost/api-docs` behind the Nginx proxy) once the backend is running.

Base URL: `/api`. All routes except `/auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, and `/auth/reset-password` require an `Authorization: Bearer <accessToken>` header (or the `accessToken` cookie, set automatically on login).

## Auth

| Method | Path                     | Roles | Description |
|--------|--------------------------|-------|--------------|
| POST   | `/auth/signup`           | Public | Register a new user |
| POST   | `/auth/login`            | Public | Log in, returns access + refresh tokens (also set as httpOnly cookies) |
| POST   | `/auth/refresh`          | Public (refresh cookie required) | Exchange refresh token for a new access token |
| POST   | `/auth/logout`           | Authenticated | Invalidate refresh token |
| POST   | `/auth/forgot-password`  | Public | Sends password reset email (no-op if SMTP unset, logs instead) |
| POST   | `/auth/reset-password`   | Public | Reset password using emailed token |
| GET    | `/auth/me`               | Authenticated | Returns decoded JWT payload |

## Products

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/products` | Any | Paginated list, `?page&limit&search&categoryId&sortBy&sortOrder` |
| GET | `/products/:id` | Any | Single product with inventory across warehouses |
| POST | `/products` | ADMIN, WAREHOUSE_MANAGER | Create (auto-generates SKU if omitted) |
| PATCH | `/products/:id` | ADMIN, WAREHOUSE_MANAGER | Update |
| DELETE | `/products/:id` | ADMIN, WAREHOUSE_MANAGER | Soft delete (recycle bin) |
| POST | `/products/:id/restore` | ADMIN | Restore from recycle bin |
| GET | `/products/export/csv` | ADMIN, WAREHOUSE_MANAGER | Export catalog as CSV |
| POST | `/products/import/csv` | ADMIN, WAREHOUSE_MANAGER | Bulk import (multipart `file`) |
| POST | `/products/:id/image` | ADMIN, WAREHOUSE_MANAGER | Upload + compress product image (multipart `image`) |
| GET | `/products/:id/qrcode` | Any | Returns a base64 QR code data URL |
| GET | `/products/:id/barcode` | Any | Returns a Code128 barcode PNG |

## Categories / Suppliers / Warehouses

Standard CRUD under `/categories`, `/suppliers`, `/warehouses`. Notable extras:
- `GET /suppliers/:id/performance` — on-time %, avg delivery days, total spend
- `GET /warehouses/:fromId/distance/:toId` — haversine distance in km

## Inventory

| Method | Path | Description |
|---|---|---|
| GET | `/inventory?warehouseId=` | Current stock across (or filtered to) warehouses |
| GET | `/inventory/snapshot` | Aggregate totals (units, value, warehouse/product counts) |
| GET | `/inventory/low-stock?warehouseId=` | Items at/below reorder point |
| GET | `/inventory/logs?productId=&warehouseId=` | Movement history (last 200) |
| POST | `/inventory/adjust` | Manual adjustment `{ productId, warehouseId, delta, reason }` (ADMIN, WAREHOUSE_MANAGER) |
| POST | `/inventory/logs/:logId/undo` | Reverses a specific log entry (ADMIN, WAREHOUSE_MANAGER) |

## Orders (sales)

| Method | Path | Description |
|---|---|---|
| GET | `/orders?status=&warehouseId=` | Paginated list |
| GET | `/orders/:id` | Detail with items |
| POST | `/orders` | Create — auto-deducts inventory per line item |
| PATCH | `/orders/:id/status` | Transition status; CANCELLED/RETURNED auto-restocks |
| POST | `/orders/:id/invoice` | Generates a PDF invoice, returns its URL |

## Purchase Orders

| Method | Path | Description |
|---|---|---|
| GET / POST | `/purchase-orders` | List / create |
| PATCH | `/purchase-orders/:id/approve` \| `/reject` | ADMIN only |
| PATCH | `/purchase-orders/:id/dispatch` | ADMIN, SUPPLIER |
| PATCH | `/purchase-orders/:id/deliver` | ADMIN, WAREHOUSE_MANAGER — auto-increments inventory |

## Transfers

| Method | Path | Description |
|---|---|---|
| GET / POST | `/transfers` | List / create (validates source stock availability, computes distance + carbon score) |
| GET | `/transfers/suggestions` | AI-style rebalancing suggestions between over/under-stocked warehouses |
| PATCH | `/transfers/:id/approve` \| `/ship` \| `/complete` \| `/cancel` | Workflow transitions |

## Dashboard & Analytics

`GET /dashboard/kpis`, `/sales-trend?days=30`, `/warehouse-distribution`, `/top-products?limit=5`, `/category-performance`, `/inventory-heatmap`.

## Reports

`GET /reports/:type/csv|excel|pdf` where `:type` is one of `sales`, `inventory`, `suppliers`, `warehouse`, `profit`. (ADMIN, WAREHOUSE_MANAGER)

## AI

| Method | Path | Description |
|---|---|---|
| POST | `/ai/forecast/:productId/:warehouseId` | Runs a fresh forecast via the AI service, persists it |
| GET | `/ai/forecast/:productId/:warehouseId` | Returns previously stored forecast points |
| GET | `/ai/reorder/:productId/:warehouseId` | Smart reorder quantity recommendation |
| GET | `/ai/health/:productId/:warehouseId` | Inventory health score (0-100) + recommendation |
| GET | `/ai/insights` | Natural-language business insight cards |
| GET | `/ai/anomalies?warehouseId=` | Isolation-Forest anomaly flags on recent inventory logs |
| POST | `/ai/chat` | `{ message }` → rule-based NL assistant reply |
| GET | `/ai/expiry?warehouseId=` | Expiry batches with days-left and suggested discount |
| GET | `/ai/carbon` | Carbon footprint dashboard across all transfers |

## Notifications

`GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`.

## Realtime (Socket.io)

Connect to the same origin with `path: '/socket.io'` and `auth: { token: accessToken }`. Events emitted by the server:

| Event | Payload | Trigger |
|---|---|---|
| `inventory:updated` | `{ productId, warehouseId, quantity, action }` | Any stock adjustment |
| `inventory:low-stock` | `{ productId, productName, warehouseId, quantity, reorderPoint }` | Stock crosses reorder point |
| `order:status-changed` | `{ orderId, status }` | Order created or status updated |
| `transfer:updated` | `{ transferId, status }` | Transfer completed |
| `notification:new` | Notification object | Targeted at `user:{id}` room |
| `presence:online` / `presence:offline` | `{ userId, onlineCount }` | Connection lifecycle |
