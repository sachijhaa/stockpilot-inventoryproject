import { useEffect, useState, useCallback } from 'react';
import { ShoppingCart, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/AnimatedCounter';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/States';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types';

const statusColors: Record<OrderStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  PENDING: 'warning',
  PACKED: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  RETURNED: 'danger',
  CANCELLED: 'neutral',
};

const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  RETURNED: [],
  CANCELLED: [],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/orders')
      .then((res) => setOrders(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Order marked as ${status.toLowerCase()}`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to update order');
    }
  };

  const handleInvoice = async (orderId: string) => {
    try {
      const { data } = await api.post(`/orders/${orderId}/invoice`);
      window.open(data.data.invoiceUrl, '_blank');
    } catch {
      toast.error('Failed to generate invoice');
    }
  };

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-semibold text-white">Sales Orders</h1>
        <p className="text-slate-500 text-sm mt-1">Track and fulfill customer orders</p>
      </div>

      <Card hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-white/[0.06]">
                <th className="px-4 py-3 font-medium">Order #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Warehouse</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)}
              {!loading &&
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-slate-200">{order.customerName}</td>
                    <td className="px-4 py-3 text-slate-400">{order.warehouse?.name}</td>
                    <td className="px-4 py-3 text-slate-200">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[order.status]}>{order.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {nextStatuses[order.status].length > 0 && (
                          <Select
                            className="!py-1.5 !text-xs w-36"
                            defaultValue=""
                            onChange={(e) => e.target.value && handleStatusChange(order.id, e.target.value as OrderStatus)}
                          >
                            <option value="" disabled>
                              Update status
                            </option>
                            {nextStatuses[order.status].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </Select>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleInvoice(order.id)}>
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && orders.length === 0 && <EmptyState icon={ShoppingCart} title="No orders yet" description="Sales orders will appear here once created." />}
        </div>
      </Card>
    </div>
  );
}
