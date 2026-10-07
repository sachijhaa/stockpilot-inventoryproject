export function generateSku(categoryName: string, name: string): string {
  const prefix = categoryName.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 'GEN';
  const namePart = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${namePart}${random}`;
}

export function generatePoNumber(): string {
  return `PO-${Date.now().toString().slice(-8)}`;
}

export function generateOrderNumber(): string {
  return `ORD-${Date.now().toString().slice(-8)}`;
}

export function generateTransferNumber(): string {
  return `TRF-${Date.now().toString().slice(-8)}`;
}
