import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import type { NotificationItem } from '@/types';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get('/notifications')
      .then((res) => setNotifications(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    load();
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">Stay on top of stock, transfers, and AI alerts</p>
        </div>
        <Button variant="ghost" size="sm" onClick={markAllRead}>
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      <Card hover={false}>
        {!loading && notifications.length === 0 ? (
          <EmptyState icon={Bell} title="You're all caught up" description="New alerts will appear here in real time." />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-start gap-3 py-3.5 ${!n.isRead ? 'bg-accent-cyan/[0.03]' : ''}`}
              >
                <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${!n.isRead ? 'bg-accent-cyan' : 'bg-transparent'}`} />
                <div className="flex-1">
                  <p className="text-sm text-slate-200 font-medium">{n.title}</p>
                  <p className="text-sm text-slate-500">{n.message}</p>
                </div>
                <span className="text-xs text-slate-600 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
