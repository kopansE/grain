import { cn } from '@/lib/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-8 w-8', className)} aria-hidden="true">
      <defs>
        <radialGradient id="orbit-mark-g" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#f6c77a" />
          <stop offset="0.55" stopColor="#d9962c" />
          <stop offset="1" stopColor="#5a3a0c" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="15" fill="url(#orbit-mark-g)" />
      <ellipse cx="32" cy="32" rx="26" ry="9" fill="none" stroke="#5ecbb8" strokeWidth="2.4" transform="rotate(-22 32 32)" />
      <circle cx="53.5" cy="21.5" r="3.4" fill="#5ecbb8" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-baseline gap-1.5 leading-none', className)}>
      <span className="font-semibold tracking-tight text-ink">Grain</span>
      <span className="display text-[1.35em] italic text-accent-bright">Orbit</span>
    </span>
  );
}
