import { useEffect, useState } from 'react';
import { MapPin, Package, Gauge } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { KpiCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/States';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import type { Warehouse } from '@/types';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/warehouses')
      .then((res) => setWarehouses(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-semibold text-white">Warehouses</h1>
        <p className="text-slate-500 text-sm mt-1">Capacity and utilization across all locations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && Array.from({ length: 3 }).map((_, i) => <KpiCardSkeleton key={i} />)}

        {!loading &&
          warehouses.map((w, i) => (
            <Card key={w.id} delay={i * 0.06}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{w.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {w.city}, {w.state}
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-1 rounded-lg">{w.code}</span>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Gauge className="h-3 w-3" /> Capacity Used</span>
                  <span>{w.utilizationPct ?? 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      (w.utilizationPct ?? 0) > 85 ? 'bg-danger' : (w.utilizationPct ?? 0) > 60 ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${Math.min(100, w.utilizationPct ?? 0)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm pt-3 border-t border-white/[0.06]">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Capacity
                </span>
                <span className="text-slate-300 font-medium">
                  {formatNumber(w.usedCapacity)} / {formatNumber(w.capacity)}
                </span>
              </div>
            </Card>
          ))}
      </div>

      {!loading && warehouses.length === 0 && <EmptyState title="No warehouses yet" description="Add your first warehouse to get started." />}
    </div>
  );
}
