import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Boxes } from 'lucide-react';
import { ParticleBackground } from '@/components/ui/ParticleBackground';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-base-950">
      <ParticleBackground />
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-accent-blue/20 blur-[120px] animate-float" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent-violet/20 blur-[120px] animate-float" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-panel p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center shadow-glow mb-4">
              <Boxes className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-white">{title}</h1>
            <p className="text-sm text-slate-500 mt-1 text-center">{subtitle}</p>
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
