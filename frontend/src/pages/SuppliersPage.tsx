import { useEffect, useState } from 'react';
import { Star, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/AnimatedCounter';
import { KpiCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/States';
import { api } from '@/lib/api';
import type { Supplier } from '@/types';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/suppliers')
      .then((res) => setSuppliers(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-semibold text-white">Suppliers</h1>
        <p className="text-slate-500 text-sm mt-1">Vendor relationships and performance tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && Array.from({ length: 3 }).map((_, i) => <KpiCardSkeleton key={i} />)}

        {!loading &&
          suppliers.map((s, i) => (
            <Card key={s.id} delay={i * 0.06}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-white font-semibold">{s.name}</h3>
                <Badge variant={s.onTimeRate > 85 ? 'success' : s.onTimeRate > 70 ? 'warning' : 'danger'}>
                  {s.onTimeRate}% on-time
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mb-3">{s.contactPerson}</p>
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className={`h-3.5 w-3.5 ${idx < Math.round(s.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                ))}
                <span className="text-xs text-slate-500 ml-1">{s.rating.toFixed(1)}</span>
              </div>
              <div className="text-xs text-slate-500 space-y-1 pt-3 border-t border-white/[0.06]">
                <p>{s.email}</p>
                <p>{s.phone}</p>
              </div>
            </Card>
          ))}
      </div>

      {!loading && suppliers.length === 0 && <EmptyState icon={Users} title="No suppliers yet" description="Add suppliers to start creating purchase orders." />}
    </div>
  );
}
