import { type ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';

const base = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55 } } };

export function AnimateScroll({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div className={className} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={{ ...base, visible: { ...base.visible, transition: { ...base.visible.transition, delay } } }}>
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children, className = '', amount = 0.15 }: { children: ReactNode; className?: string; amount?: number }) {
  const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.08, amount } } };
  return (
    <motion.div className={className} initial="hidden" whileInView="visible" viewport={{ once: true, amount }} variants={stagger}>
      {children}
    </motion.div>
  );
}

export function AnimateScale({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
      {children}
    </motion.div>
  );
}
