import { useEffect, useState } from 'react';
import { Leaf, Route, Truck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { KpiCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/States';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

interface CarbonData {
  totalTransfers: number;
  totalDistanceKm: number;
  totalCarbonKg: number;
  avgCarbonPerTransfer: number;
  transfers: { route: string; distanceKm: number; carbonKg: number }[];
}

export default function CarbonPage() {
  const [data, setData] = useState<CarbonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/ai/carbon')
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-glow">
          <Leaf className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Carbon Efficient Logistics</h1>
          <p className="text-slate-500 text-sm">Sustainability impact of your warehouse transfer network</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
        {!loading && data && (
          <>
            <Card>
              <p className="text-xs text-slate-400 mb-1">Total Transfers</p>
              <p className="text-xl font-semibold text-white"><AnimatedCounter value={data.totalTransfers} /></p>
            </Card>
            <Card delay={0.05}>
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Route className="h-3 w-3" /> Total Distance</p>
              <p className="text-xl font-semibold text-white"><AnimatedCounter value={data.totalDistanceKm} formatFn={(n) => `${formatNumber(Math.round(n))} km`} /></p>
            </Card>
            <Card delay={0.1}>
              <p className="text-xs text-slate-400 mb-1">Total CO₂ Emitted</p>
              <p className="text-xl font-semibold text-white"><AnimatedCounter value={data.totalCarbonKg} formatFn={(n) => `${n.toFixed(1)} kg`} /></p>
            </Card>
            <Card delay={0.15}>
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Truck className="h-3 w-3" /> Avg per Transfer</p>
              <p className="text-xl font-semibold text-white"><AnimatedCounter value={data.avgCarbonPerTransfer} formatFn={(n) => `${n.toFixed(1)} kg`} /></p>
            </Card>
          </>
        )}
      </div>

      <Card hover={false}>
        <h3 className="text-sm font-medium text-slate-400 mb-4">Transfer Routes</h3>
        {!loading && data && data.transfers.length > 0 ? (
          <div className="space-y-2">
            {data.transfers.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-white/[0.03] rounded-xl px-4 py-3">
                <span className="text-slate-300">{t.route}</span>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{t.distanceKm} km</span>
                  <span className="text-emerald-400">{t.carbonKg} kg CO₂</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loading && <EmptyState icon={Leaf} title="No transfer data yet" description="Carbon metrics appear once warehouse transfers with coordinates are recorded." />
        )}
      </Card>
    </div>
  );
}
