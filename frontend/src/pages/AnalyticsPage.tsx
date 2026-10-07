import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { ChartSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface HeatmapCell {
  warehouse: string;
  product: string;
  quantity: number;
  utilization: number;
}

export default function AnalyticsPage() {
  const [categoryPerf, setCategoryPerf] = useState<{ name: string; revenue: number }[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/dashboard/category-performance'), api.get('/dashboard/inventory-heatmap')])
      .then(([c, h]) => {
        setCategoryPerf(c.data.data);
        setHeatmap(h.data.data.slice(0, 40));
      })
      .finally(() => setLoading(false));
  }, []);

  const heatColor = (util: number) => {
    if (util > 80) return 'bg-danger/70';
    if (util > 50) return 'bg-warning/60';
    if (util > 20) return 'bg-accent-cyan/40';
    return 'bg-white/[0.05]';
  };

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Deep dive into category and inventory performance</p>
      </div>

      {loading ? (
        <ChartSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryPerf}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ background: '#0d121e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                formatter={(v: number) => formatCurrency(v)}
              />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="#3b82f6" animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card hover={false}>
        <CardHeader>
          <CardTitle>Inventory Heatmap (utilization vs. reorder threshold)</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
          {heatmap.map((cell, i) => (
            <div
              key={i}
              title={`${cell.product} @ ${cell.warehouse}: ${cell.quantity} units`}
              className={`aspect-square rounded-md ${heatColor(cell.utilization)} transition-all duration-300 hover:scale-110 cursor-pointer`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-white/[0.05]" /> Low</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-accent-cyan/40" /> Moderate</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-warning/60" /> High</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-danger/70" /> Critical</span>
        </div>
      </Card>
    </div>
  );
}
