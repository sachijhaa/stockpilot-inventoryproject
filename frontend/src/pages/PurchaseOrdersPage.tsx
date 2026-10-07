import { useEffect, useState, useCallback } from 'react';
import { Truck, Check, X, Send, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/AnimatedCounter';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PurchaseOrder, PurchaseStatus } from '@/types';

const statusColors: Record<PurchaseStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  PENDING: 'warning',
  APPROVED: 'info',
  DISPATCHED: 'info',
  DELIVERED: 'success',
  REJECTED: 'danger',
};

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/purchase-orders')
      .then((res) => setPos(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const action = async (id: string, verb: 'approve' | 'reject' | 'dispatch' | 'deliver') => {
    try {
      await api.patch(`/purchase-orders/${id}/${verb}`);
      toast.success(`Purchase order ${verb}d`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? `Failed to ${verb} purchase order`);
    }
  };

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-semibold text-white">Purchase Orders</h1>
        <p className="text-slate-500 text-sm mt-1">Supplier procurement and approval workflow</p>
      </div>

      <Card hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-white/[0.06]">
                <th className="px-4 py-3 font-medium">PO #</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Warehouse</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Expected</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)}
              {!loading &&
                pos.map((po) => (
                  <tr key={po.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{po.poNumber}</td>
                    <td className="px-4 py-3 text-slate-200">{po.supplier?.name}</td>
                    <td className="px-4 py-3 text-slate-400">{po.warehouse?.name}</td>
                    <td className="px-4 py-3 text-slate-200">{formatCurrency(po.totalAmount)}</td>
                    <td className="px-4 py-3 text-slate-500">{po.expectedDate ? formatDate(po.expectedDate) : '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[po.status]}>{po.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      {po.status === 'PENDING' && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => action(po.id, 'approve')}>
                            <Check className="h-3.5 w-3.5 text-success" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => action(po.id, 'reject')}>
                            <X className="h-3.5 w-3.5 text-danger" />
                          </Button>
                        </>
                      )}
                      {po.status === 'APPROVED' && (
                        <Button size="sm" variant="ghost" onClick={() => action(po.id, 'dispatch')}>
                          <Send className="h-3.5 w-3.5" /> Dispatch
                        </Button>
                      )}
                      {po.status === 'DISPATCHED' && (
                        <Button size="sm" variant="ghost" onClick={() => action(po.id, 'deliver')}>
                          <PackageCheck className="h-3.5 w-3.5" /> Mark Delivered
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && pos.length === 0 && <EmptyState icon={Truck} title="No purchase orders" description="Create a purchase order to restock a warehouse." />}
        </div>
      </Card>
    </div>
  );
}
