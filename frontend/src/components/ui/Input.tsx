import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, icon, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>}
      <input
        ref={ref}
        className={cn('input-field', icon && 'pl-10', error && 'border-danger/50 focus:border-danger/50 focus:ring-danger/20', className)}
        {...props}
      />
    </div>
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
));
Input.displayName = 'Input';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, label, error, children, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>}
    <select ref={ref} className={cn('input-field appearance-none cursor-pointer', className)} {...props}>
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
));
Select.displayName = 'Select';
