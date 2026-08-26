import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-primary-800 hover:bg-primary-700 text-white shadow-sm focus-visible:ring-primary-500',
  secondary:
    'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-slate-400',
  danger: 'bg-red-600 hover:bg-red-500 text-white focus-visible:ring-red-400',
  ghost:
    'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-slate-300',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white focus-visible:ring-emerald-400',
};

const sizes = {
  xs: 'px-2 py-1 text-[11px] gap-1',
  sm: 'px-2.5 py-1.5 text-xs gap-1',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading, icon: Icon, children, className = '', disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition focus:outline-none focus-visible:ring-2
        disabled:opacity-60 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={size === 'sm' || size === 'xs' ? 13 : 16} className="animate-spin" /> : Icon ? <Icon size={size === 'sm' || size === 'xs' ? 14 : 17} /> : null}
      {children}
    </button>
  );
});

export default Button;
