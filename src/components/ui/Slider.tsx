import { cn } from '@/lib/cn';

export interface SliderProps {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  className?: string;
  accent?: string;
}

export function Slider({ label, hint, value, min = 0, max = 1, step = 0.01, onChange, format, className, accent }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className={cn('block', className)} title={hint}>
      <span className="mb-1.5 flex items-baseline justify-between text-[12.5px]">
        <span className="font-medium text-ink">{label}</span>
        <span className="numeric font-mono text-[11.5px] text-ink-muted">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        className="range w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--pct': `${pct}%`, '--range-accent': accent ?? 'var(--color-accent)' } as React.CSSProperties}
      />
    </label>
  );
}
