import { motion } from 'framer-motion';

export default function Card({ className = '', children, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`card p-5 ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function CardTitle({ icon: Icon, children, right }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
        {Icon && <Icon size={16} className="text-primary-600 dark:text-primary-400" />}
        {children}
      </h3>
      {right}
    </div>
  );
}
