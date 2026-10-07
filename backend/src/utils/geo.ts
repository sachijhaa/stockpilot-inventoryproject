export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Rough carbon footprint estimate (kg CO2) based on distance & transport mode
const EMISSION_FACTOR_KG_PER_KM: Record<string, number> = {
  truck: 0.12,
  rail: 0.03,
  air: 0.5,
  ship: 0.015,
};

export function estimateCarbonFootprint(distanceKm: number, mode: keyof typeof EMISSION_FACTOR_KG_PER_KM = 'truck') {
  const factor = EMISSION_FACTOR_KG_PER_KM[mode] ?? EMISSION_FACTOR_KG_PER_KM.truck;
  return Math.round(distanceKm * factor * 100) / 100;
}
