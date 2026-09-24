import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'motion/react';

/** Number that counts up from zero the first time it scrolls into view. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-US'), duration = 1.1, className }: { value: number; format?: (n: number) => string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(from.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(v),
      onComplete: () => {
        from.current = value;
      },
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {format(shown)}
    </span>
  );
}
