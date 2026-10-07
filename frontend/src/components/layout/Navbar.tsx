import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, Wifi, LogOut, Command } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { setCommandPaletteOpen } = useUIStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/notifications')
      .then((res) => setUnreadCount(res.data.unreadCount ?? 0))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-20 mx-4 mt-4 mb-2"
    >
      <div className="glass-panel flex items-center justify-between gap-4 px-5 py-3">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 text-slate-500 text-sm bg-white/[0.03] border border-white/10 rounded-xl px-3 py-1.5 hover:bg-white/[0.06] transition-colors w-64"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search or jump to...</span>
          <kbd className="flex items-center gap-0.5 text-[10px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
            <Command className="h-3 w-3" /> K
          </kbd>
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-success bg-success/10 border border-success/20 rounded-full px-3 py-1">
            <Wifi className="h-3 w-3 animate-pulse-glow" /> Live synced
          </div>

          <button className="relative h-9 w-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center hover:bg-white/[0.08] transition-colors">
            <Bell className="h-4 w-4 text-slate-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent-cyan text-[10px] font-bold text-base-950 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="h-6 w-px bg-white/10" />

          <div className="flex items-center gap-2.5 pr-1">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center text-xs font-semibold text-white">
              {user?.name?.charAt(0) ?? 'U'}
            </div>
            <div className="hidden md:block leading-tight">
              <p className="text-xs font-medium text-slate-200">{user?.name}</p>
              <p className="text-[10px] text-slate-500">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-danger transition-colors ml-1" title="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
