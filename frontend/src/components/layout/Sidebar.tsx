import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Truck,
  ShoppingCart,
  Users,
  ArrowLeftRight,
  Bell,
  BarChart3,
  Sparkles,
  Leaf,
  ChevronsLeft,
  Boxes,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/warehouses', icon: Warehouse, label: 'Warehouses' },
  { to: '/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/purchase-orders', icon: Truck, label: 'Purchase Orders' },
  { to: '/transfers', icon: ArrowLeftRight, label: 'Transfers' },
  { to: '/suppliers', icon: Users, label: 'Suppliers' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/ai-insights', icon: Sparkles, label: 'AI Insights' },
  { to: '/carbon', icon: Leaf, label: 'Carbon Dashboard' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 76 : 248 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="h-screen sticky top-0 flex flex-col border-r border-white/[0.06] bg-base-900/60 backdrop-blur-xl z-30"
    >
      <div className="flex items-center gap-2 px-5 py-6">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center shadow-glow shrink-0">
          <Boxes className="h-5 w-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-semibold text-white tracking-tight whitespace-nowrap">
            Smart<span className="gradient-text">Inventory</span>
          </motion.span>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 group',
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent-blue/20 to-accent-violet/20 border border-accent-cyan/20"
                    transition={{ type: 'spring', duration: 0.5 }}
                  />
                )}
                <item.icon className="h-[18px] w-[18px] shrink-0 relative z-10" />
                {!sidebarCollapsed && <span className="relative z-10 whitespace-nowrap">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={toggleSidebar}
        className="mx-3 mb-5 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors"
      >
        <ChevronsLeft className={cn('h-4 w-4 transition-transform duration-300', sidebarCollapsed && 'rotate-180')} />
      </button>
    </motion.aside>
  );
}
