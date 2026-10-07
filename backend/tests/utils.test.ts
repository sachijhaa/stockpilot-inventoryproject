import { haversineDistanceKm, estimateCarbonFootprint } from '../src/utils/geo';
import { generateSku, generateOrderNumber, generatePoNumber, generateTransferNumber } from '../src/utils/sku';
import { ApiError } from '../src/utils/ApiError';

describe('geo utils', () => {
  it('computes distance between Mumbai and Delhi within a realistic range', () => {
    // Mumbai: 19.0760, 72.8777 | Delhi: 28.7041, 77.1025
    const distance = haversineDistanceKm(19.076, 72.8777, 28.7041, 77.1025);
    expect(distance).toBeGreaterThan(1100);
    expect(distance).toBeLessThan(1300);
  });

  it('returns 0 distance for identical coordinates', () => {
    expect(haversineDistanceKm(10, 10, 10, 10)).toBe(0);
  });

  it('estimates higher carbon footprint for air vs rail over the same distance', () => {
    const air = estimateCarbonFootprint(1000, 'air');
    const rail = estimateCarbonFootprint(1000, 'rail');
    expect(air).toBeGreaterThan(rail);
  });
});

describe('sku utils', () => {
  it('generates a SKU with category and name prefix', () => {
    const sku = generateSku('Electronics', 'Wireless Mouse');
    expect(sku).toMatch(/^ELEC-WIR\d{4}$/);
  });

  it('generates unique-looking order/PO/transfer numbers', () => {
    expect(generateOrderNumber()).toMatch(/^ORD-\d{8}$/);
    expect(generatePoNumber()).toMatch(/^PO-\d{8}$/);
    expect(generateTransferNumber()).toMatch(/^TRF-\d{8}$/);
  });
});

describe('ApiError', () => {
  it('builds errors with correct status codes', () => {
    expect(ApiError.badRequest('bad').statusCode).toBe(400);
    expect(ApiError.unauthorized().statusCode).toBe(401);
    expect(ApiError.forbidden().statusCode).toBe(403);
    expect(ApiError.notFound().statusCode).toBe(404);
    expect(ApiError.conflict('dup').statusCode).toBe(409);
    expect(ApiError.internal().statusCode).toBe(500);
  });
});
