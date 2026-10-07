import { motion } from 'framer-motion';
import { Inbox, AlertTriangle, type LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-16 px-6"
    >
      <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4 animate-float">
        <Icon className="h-7 w-7 text-slate-500" />
      </div>
      <h3 className="text-slate-200 font-medium mb-1">{title}</h3>
      {description && <p className="text-slate-500 text-sm max-w-sm mb-4">{description}</p>}
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-16 px-6"
    >
      <div className="h-16 w-16 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mb-4">
        <AlertTriangle className="h-7 w-7 text-danger" />
      </div>
      <h3 className="text-slate-200 font-medium mb-1">{title}</h3>
      {description && <p className="text-slate-500 text-sm max-w-sm mb-4">{description}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </motion.div>
  );
}
