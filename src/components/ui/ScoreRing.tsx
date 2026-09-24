import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import type { Tier } from '@/domain/types';
import { TIER_COLOR } from './Badge';

export function ScoreRing({ score, tier, size = 44, stroke = 4, className, animate = true }: { score: number; tier: Tier; size?: number; stroke?: number; className?: string; animate?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }} aria-label={`Score ${score}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TIER_COLOR[tier]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={animate ? { strokeDashoffset: c } : false}
          animate={{ strokeDashoffset: target }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span className="numeric absolute inset-0 flex items-center justify-center font-semibold text-ink" style={{ fontSize: size * 0.32 }}>
        {score}
      </span>
    </div>
  );
}
