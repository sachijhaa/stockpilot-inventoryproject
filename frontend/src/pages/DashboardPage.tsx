import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, ShoppingBag, Package, TrendingUp, Warehouse, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { KpiCardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { DashboardKpis } from '@/types';

const COLORS = ['#22d3ee', '#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e'];

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [salesTrend, setSalesTrend] = useState<{ date: string; revenue: number }[]>([]);
  const [warehouseDist, setWarehouseDist] = useState<{ name: string; units: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; unitsSold: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/kpis'),
      api.get('/dashboard/sales-trend?days=30'),
      api.get('/dashboard/warehouse-distribution'),
      api.get('/dashboard/top-products?limit=5'),
    ])
      .then(([k, s, w, t]) => {
        setKpis(k.data.data);
        setSalesTrend(s.data.data);
        setWarehouseDist(w.data.data);
        setTopProducts(t.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const kpiCards = kpis
    ? [
        { label: 'Revenue', value: kpis.revenue, icon: DollarSign, format: formatCurrency, color: 'from-emerald-500/20 to-emerald-500/5', iconColor: 'text-emerald-400' },
        { label: 'Orders Today', value: kpis.ordersToday, icon: ShoppingBag, format: (n: number) => Math.round(n).toString(), color: 'from-blue-500/20 to-blue-500/5', iconColor: 'text-blue-400' },
        { label: 'Inventory Value', value: kpis.inventoryValue, icon: Package, format: formatCurrency, color: 'from-violet-500/20 to-violet-500/5', iconColor: 'text-violet-400' },
        { label: 'Potential Profit', value: kpis.potentialProfit, icon: TrendingUp, format: formatCurrency, color: 'from-cyan-500/20 to-cyan-500/5', iconColor: 'text-cyan-400' },
        { label: 'Active Warehouses', value: kpis.activeWarehouses, icon: Warehouse, format: (n: number) => Math.round(n).toString(), color: 'from-amber-500/20 to-amber-500/5', iconColor: 'text-amber-400' },
        { label: 'Stock Alerts', value: kpis.stockAlerts, icon: AlertTriangle, format: (n: number) => Math.round(n).toString(), color: 'from-rose-500/20 to-rose-500/5', iconColor: 'text-rose-400' },
      ]
    : [];

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time overview of your supply chain operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)
          : kpiCards.map((kpi, i) => (
              <Card key={kpi.label} delay={i * 0.05} className={`bg-gradient-to-br ${kpi.color} relative overflow-hidden`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">{kpi.label}</p>
                    <p className="text-xl font-semibold text-white">
                      <AnimatedCounter value={kpi.value} formatFn={kpi.format} />
                    </p>
                  </div>
                  <div className={`h-9 w-9 rounded-xl bg-white/[0.06] flex items-center justify-center ${kpi.iconColor}`}>
                    <kpi.icon className="h-4 w-4" />
                  </div>
                </div>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {loading ? (
            <ChartSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend (30 days)</CardTitle>
              </CardHeader>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ background: '#0d121e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#22d3ee" strokeWidth={2} fill="url(#revenueGradient)" animationDuration={1200} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        <div>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Warehouse Distribution</CardTitle>
              </CardHeader>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={warehouseDist} dataKey="units" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4} animationDuration={1000}>
                    {warehouseDist.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0d121e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {warehouseDist.map((w, i) => (
                  <div key={w.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {w.name}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Units Sold</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={140} />
              <Tooltip contentStyle={{ background: '#0d121e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
              <Bar dataKey="unitsSold" radius={[0, 8, 8, 0]} fill="#8b5cf6" animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
