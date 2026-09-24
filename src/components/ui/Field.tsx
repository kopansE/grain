import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const base =
  'w-full rounded-xl border border-line bg-bg-elevated px-3.5 text-[14px] text-ink placeholder:text-ink-dim transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20';

export function Field({ label, hint, children, className, right }: { label?: string; hint?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <label className={cn('block', className)}>
      {(label || right) && (
        <span className="mb-1.5 flex items-center justify-between text-[12.5px] font-medium text-ink-muted">
          <span>{label}</span>
          {right}
        </span>
      )}
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-ink-dim">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, 'h-11', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, 'min-h-[88px] py-2.5 leading-relaxed', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(base, 'h-11 appearance-none pr-9', className)} {...rest}>
      {children}
    </select>
  );
}
