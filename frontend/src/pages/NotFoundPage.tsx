import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CompassIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-950 text-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-20 w-20 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6 animate-float"
      >
        <CompassIcon className="h-9 w-9 text-slate-500" />
      </motion.div>
      <h1 className="text-5xl font-bold gradient-text mb-2">404</h1>
      <p className="text-slate-400 mb-6">This page drifted off the supply chain map.</p>
      <Link to="/">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
