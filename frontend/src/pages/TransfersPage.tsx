import { useEffect, useState, useCallback } from 'react';
import { ArrowLeftRight, Leaf, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/AnimatedCounter';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import type { Transfer, TransferStatus } from '@/types';

const statusColors: Record<TransferStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  REQUESTED: 'warning',
  APPROVED: 'info',
  IN_TRANSIT: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

interface Suggestion {
  productName: string;
  fromWarehouse: string;
  toWarehouse: string;
  suggestedQuantity: number;
  distanceKm?: number;
  estimatedCarbonKg?: number;
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/transfers'), api.get('/transfers/suggestions')])
      .then(([t, s]) => {
        setTransfers(t.data.data);
        setSuggestions(s.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const action = async (id: string, verb: 'approve' | 'ship' | 'complete' | 'cancel') => {
    try {
      await api.patch(`/transfers/${id}/${verb}`);
      toast.success(`Transfer ${verb === 'ship' ? 'shipped' : verb + 'd'}`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? `Failed to ${verb} transfer`);
    }
  };

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-semibold text-white">Warehouse Transfers</h1>
        <p className="text-slate-500 text-sm mt-1">Move stock between warehouses to balance demand</p>
      </div>

      {suggestions.length > 0 && (
        <Card className="border-accent-cyan/20 bg-gradient-to-br from-accent-cyan/[0.06] to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-accent-cyan">
              <Lightbulb className="h-4 w-4" /> Smart Transfer Suggestions
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {suggestions.slice(0, 4).map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-white/[0.03] rounded-xl px-4 py-2.5">
                <span className="text-slate-300">
                  Move <span className="font-medium text-white">{s.suggestedQuantity} units</span> of{' '}
                  <span className="text-accent-cyan">{s.productName}</span> from {s.fromWarehouse} → {s.toWarehouse}
                </span>
                {s.estimatedCarbonKg !== undefined && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Leaf className="h-3 w-3" /> {s.estimatedCarbonKg} kg CO₂
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-white/[0.06]">
                <th className="px-4 py-3 font-medium">Transfer #</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Distance</th>
                <th className="px-4 py-3 font-medium">Carbon</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)}
              {!loading &&
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{t.transferNumber}</td>
                    <td className="px-4 py-3 text-slate-200">
                      {t.sourceWarehouse?.name} → {t.destWarehouse?.name}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{t.distanceKm ? `${t.distanceKm} km` : '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{t.carbonScore ? `${t.carbonScore} kg` : '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[t.status]}>{t.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      {t.status === 'REQUESTED' && (
                        <Button size="sm" variant="ghost" onClick={() => action(t.id, 'approve')}>
                          Approve
                        </Button>
                      )}
                      {t.status === 'APPROVED' && (
                        <Button size="sm" variant="ghost" onClick={() => action(t.id, 'ship')}>
                          Ship
                        </Button>
                      )}
                      {t.status === 'IN_TRANSIT' && (
                        <Button size="sm" variant="ghost" onClick={() => action(t.id, 'complete')}>
                          Complete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && transfers.length === 0 && (
            <EmptyState icon={ArrowLeftRight} title="No transfers yet" description="Rebalance stock between warehouses as demand shifts." />
          )}
        </div>
      </Card>
    </div>
  );
}
