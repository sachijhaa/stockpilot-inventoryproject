import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';

export function DashboardLayout() {
  const location = useLocation();

  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    socket.on('inventory:low-stock', (data: { productName: string; warehouseId: string }) => {
      toast(`Low stock: ${data.productName}`, { icon: '⚠️' });
    });

    socket.on('notification:new', (data: { title: string }) => {
      toast.success(data.title);
    });

    socket.on('transfer:updated', (data: { status: string }) => {
      toast(`Transfer ${data.status.toLowerCase()}`, { icon: '🚚' });
    });

    return () => {
      socket.off('inventory:low-stock');
      socket.off('notification:new');
      socket.off('transfer:updated');
      disconnectSocket();
    };
  }, []);

  return (
    <div className="min-h-screen flex bg-[length:32px_32px] bg-grid-pattern">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 px-6 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
