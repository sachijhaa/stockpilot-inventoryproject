import { PrismaClient, Role, OrderStatus, PurchaseStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // ---------------- Warehouses ----------------
  const warehouseA = await prisma.warehouse.create({
    data: {
      name: 'Central Warehouse Mumbai',
      code: 'WH-MUM-01',
      address: 'Andheri East, MIDC',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      latitude: 19.1136,
      longitude: 72.8697,
      capacity: 50000,
      usedCapacity: 32000,
      managerName: 'Rohit Sharma',
    },
  });

  const warehouseB = await prisma.warehouse.create({
    data: {
      name: 'North Hub Delhi',
      code: 'WH-DEL-01',
      address: 'Okhla Industrial Area',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      latitude: 28.5535,
      longitude: 77.2588,
      capacity: 40000,
      usedCapacity: 36500,
      managerName: 'Neha Verma',
    },
  });

  const warehouseC = await prisma.warehouse.create({
    data: {
      name: 'South Hub Bengaluru',
      code: 'WH-BLR-01',
      address: 'Electronic City Phase 1',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.8452,
      longitude: 77.6602,
      capacity: 35000,
      usedCapacity: 18000,
      managerName: 'Arjun Rao',
    },
  });

  // ---------------- Users ----------------
  const admin = await prisma.user.create({
    data: {
      name: 'Ananya Iyer',
      email: 'admin@inventory.io',
      passwordHash,
      role: Role.ADMIN,
      isEmailVerified: true,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Rohit Sharma',
      email: 'manager@inventory.io',
      passwordHash,
      role: Role.WAREHOUSE_MANAGER,
      warehouseId: warehouseA.id,
      isEmailVerified: true,
    },
  });

  const sales = await prisma.user.create({
    data: {
      name: 'Priya Nair',
      email: 'sales@inventory.io',
      passwordHash,
      role: Role.SALES_EXECUTIVE,
      warehouseId: warehouseB.id,
      isEmailVerified: true,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Vikram Supplier',
      email: 'supplier@inventory.io',
      passwordHash,
      role: Role.SUPPLIER,
      isEmailVerified: true,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Guest Viewer',
      email: 'viewer@inventory.io',
      passwordHash,
      role: Role.VIEWER,
      isEmailVerified: true,
    },
  });

  // ---------------- Categories ----------------
  const [electronics, grocery, apparel, dairy] = await Promise.all([
    prisma.category.create({ data: { name: 'Electronics', description: 'Electronic devices and accessories' } }),
    prisma.category.create({ data: { name: 'Grocery', description: 'Packaged and staple foods' } }),
    prisma.category.create({ data: { name: 'Apparel', description: 'Clothing and accessories' } }),
    prisma.category.create({ data: { name: 'Dairy', description: 'Perishable dairy products' } }),
  ]);

  // ---------------- Suppliers ----------------
  const supplierElectro = await prisma.supplier.create({
    data: { name: 'TechSource Distributors', contactPerson: 'Karan Mehta', email: 'karan@techsource.com', phone: '+91-9820012345', rating: 4.5, onTimeRate: 92 },
  });
  const supplierFood = await prisma.supplier.create({
    data: { name: 'FreshFoods Wholesale', contactPerson: 'Sunita Rao', email: 'sunita@freshfoods.com', phone: '+91-9911223344', rating: 4.1, onTimeRate: 88 },
  });
  const supplierApparel = await prisma.supplier.create({
    data: { name: 'FabricWorld Pvt Ltd', contactPerson: 'Imran Khan', email: 'imran@fabricworld.com', phone: '+91-9871234567', rating: 3.9, onTimeRate: 81 },
  });

  // ---------------- Products ----------------
  const productDefs = [
    { sku: 'ELEC-1001', name: 'Wireless Mouse', categoryId: electronics.id, supplierId: supplierElectro.id, costPrice: 350, sellingPrice: 599, reorderPoint: 20, reorderQuantity: 100, leadTimeDays: 5 },
    { sku: 'ELEC-1002', name: 'USB-C Charger 65W', categoryId: electronics.id, supplierId: supplierElectro.id, costPrice: 650, sellingPrice: 1199, reorderPoint: 15, reorderQuantity: 60, leadTimeDays: 6 },
    { sku: 'ELEC-1003', name: 'Bluetooth Headphones', categoryId: electronics.id, supplierId: supplierElectro.id, costPrice: 1200, sellingPrice: 2299, reorderPoint: 10, reorderQuantity: 40, leadTimeDays: 8 },
    { sku: 'GROC-2001', name: 'Basmati Rice 5kg', categoryId: grocery.id, supplierId: supplierFood.id, costPrice: 380, sellingPrice: 520, reorderPoint: 50, reorderQuantity: 200, leadTimeDays: 3 },
    { sku: 'GROC-2002', name: 'Sunflower Oil 1L', categoryId: grocery.id, supplierId: supplierFood.id, costPrice: 120, sellingPrice: 165, reorderPoint: 60, reorderQuantity: 250, leadTimeDays: 3 },
    { sku: 'DAIRY-3001', name: 'Toned Milk 1L', categoryId: dairy.id, supplierId: supplierFood.id, costPrice: 45, sellingPrice: 58, reorderPoint: 80, reorderQuantity: 300, leadTimeDays: 1 },
    { sku: 'APPRL-4001', name: 'Cotton T-Shirt (M)', categoryId: apparel.id, supplierId: supplierApparel.id, costPrice: 220, sellingPrice: 499, reorderPoint: 30, reorderQuantity: 120, leadTimeDays: 10 },
    { sku: 'APPRL-4002', name: 'Denim Jeans (32)', categoryId: apparel.id, supplierId: supplierApparel.id, costPrice: 550, sellingPrice: 1299, reorderPoint: 20, reorderQuantity: 80, leadTimeDays: 12 },
  ];

  const products = [];
  for (const p of productDefs) {
    const product = await prisma.product.create({ data: { ...p, unit: 'pcs' } });
    products.push(product);
  }

  // ---------------- Inventory across warehouses ----------------
  const warehouses = [warehouseA, warehouseB, warehouseC];
  for (const product of products) {
    for (const wh of warehouses) {
      const qty = Math.floor(Math.random() * 300) + 10;
      await prisma.inventory.create({
        data: { productId: product.id, warehouseId: wh.id, quantity: qty, reservedQty: Math.floor(qty * 0.05) },
      });
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          warehouseId: wh.id,
          action: 'STOCK_IN',
          quantity: qty,
          balanceAfter: qty,
          reason: 'Initial stock seed',
        },
      });
    }
  }

  // ---------------- Sample Orders ----------------
  for (let i = 1; i <= 5; i++) {
    const product = products[i % products.length];
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-${1000 + i}`,
        customerName: `Customer ${i}`,
        customerEmail: `customer${i}@example.com`,
        warehouseId: warehouseB.id,
        status: i % 2 === 0 ? OrderStatus.DELIVERED : OrderStatus.PENDING,
        totalAmount: Number(product.sellingPrice) * 2,
        createdById: sales.id,
      },
    });
    await prisma.orderItem.create({
      data: { orderId: order.id, productId: product.id, quantity: 2, unitPrice: product.sellingPrice },
    });
  }

  // ---------------- Sample Purchase Orders ----------------
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-5001',
      supplierId: supplierFood.id,
      warehouseId: warehouseA.id,
      status: PurchaseStatus.PENDING,
      totalAmount: 38000,
      expectedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      createdById: manager.id,
    },
  });
  await prisma.purchaseItem.create({
    data: { purchaseOrderId: po.id, productId: products[3].id, quantity: 100, unitCost: products[3].costPrice },
  });

  // ---------------- Expiry Batches ----------------
  await prisma.expiryBatch.create({
    data: {
      productId: products[5].id, // Toned Milk
      warehouseId: warehouseA.id,
      batchNumber: 'BATCH-MILK-001',
      quantity: 40,
      manufactureDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  // ---------------- Notifications ----------------
  await prisma.notification.create({
    data: {
      userId: admin.id,
      type: 'LOW_STOCK',
      title: 'Low Stock Alert',
      message: 'Bluetooth Headphones running low at South Hub Bengaluru',
    },
  });

  console.log('✅ Seed complete.');
  console.log('   Login with: admin@inventory.io / Password@123 (also manager@, sales@, supplier@, viewer@)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
