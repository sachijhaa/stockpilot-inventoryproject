import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Minus, Package as PackageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/AnimatedCounter';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/States';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import type { InventoryRecord } from '@/types';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adjustTarget, setAdjustTarget] = useState<InventoryRecord | null>(null);
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/inventory')
      .then((res) => setInventory(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const filtered = inventory.filter(
    (i) =>
      i.product?.name.toLowerCase().includes(search.toLowerCase()) ||
      i.product?.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdjust = async () => {
    if (!adjustTarget || delta === 0) return;
    try {
      await api.post('/inventory/adjust', {
        productId: adjustTarget.productId,
        warehouseId: adjustTarget.warehouseId,
        delta,
        reason,
      });
      toast.success('Inventory updated');
      setAdjustTarget(null);
      setDelta(0);
      setReason('');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to adjust inventory');
    }
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Inventory</h1>
          <p className="text-slate-500 text-sm mt-1">Stock levels across all warehouses</p>
        </div>
      </div>

      <Card hover={false}>
        <div className="mb-4">
          <Input placeholder="Search by product name or SKU..." icon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-white/[0.06]">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Warehouse</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading &&
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)}
              {!loading &&
                filtered.map((item) => {
                  const low = item.product && item.quantity <= item.product.reorderPoint;
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-slate-200">{item.product?.name}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{item.product?.sku}</td>
                      <td className="px-4 py-3 text-slate-400">{item.warehouse?.name}</td>
                      <td className="px-4 py-3 text-slate-200 font-medium">{formatNumber(item.quantity)}</td>
                      <td className="px-4 py-3">
                        {low ? <Badge variant="danger">Low Stock</Badge> : <Badge variant="success">Healthy</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setAdjustTarget(item)}>
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <EmptyState icon={PackageIcon} title="No inventory found" description="Try a different search term, or add products first." />
          )}
        </div>
      </Card>

      <Modal open={!!adjustTarget} onClose={() => setAdjustTarget(null)} title={`Adjust: ${adjustTarget?.product?.name ?? ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Current stock at {adjustTarget?.warehouse?.name}: <span className="text-white font-medium">{adjustTarget?.quantity}</span>
          </p>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setDelta((d) => d - 1)}>
              <Minus className="h-4 w-4" />
            </Button>
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(parseInt(e.target.value || '0', 10))}
              className="input-field text-center w-24"
            />
            <Button variant="ghost" size="sm" onClick={() => setDelta((d) => d + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Input label="Reason" placeholder="e.g. Damage, stock count correction..." value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button className="w-full" onClick={handleAdjust} disabled={delta === 0}>
            Confirm Adjustment
          </Button>
        </div>
      </Modal>
    </div>
  );
}
