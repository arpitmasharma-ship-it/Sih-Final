import { forwardRef } from 'react';
import { X } from 'lucide-react';

export const Input = forwardRef(function Input({ label, error, className = '', ...rest }, ref) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <input ref={ref} className="input" {...rest} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

export const Select = forwardRef(function Select({ label, error, children, className = '', ...rest }, ref) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <select ref={ref} className="input" {...rest}>
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, className = '', ...rest }, ref) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <textarea ref={ref} rows={3} className="input resize-y" {...rest} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

export default Input;
