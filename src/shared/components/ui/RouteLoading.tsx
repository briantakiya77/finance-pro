import { motion } from 'framer-motion';

import { BrandLogo } from '@/shared/components/brand/BrandLogo';

export function RouteLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-[58vh] max-w-6xl items-center justify-center"
    >
      <div className="flex flex-col items-center gap-4 rounded-panel border border-border bg-surface px-6 py-6 text-sm text-text-secondary shadow-panel">
        <motion.div
          initial={{ opacity: 0.72, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 1.15,
            ease: [0.22, 1, 0.36, 1],
            repeat: Infinity,
            repeatType: 'mirror'
          }}
        >
          <BrandLogo variant="mark" theme="dark" size="lg" decorative />
        </motion.div>
        <span>Carregando rota...</span>
      </div>
    </div>
  );
}
