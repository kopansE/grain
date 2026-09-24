import { motion } from 'motion/react';
import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/cn';

/** The big mic. Pulses while listening. */
export function VoiceButton({ listening, onToggle, disabled, size = 84 }: { listening: boolean; onToggle: () => void; disabled?: boolean; size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size + 40, height: size + 40 }}>
      {listening && (
        <>
          <motion.span className="absolute rounded-full bg-rose/30" style={{ width: size, height: size }} animate={{ scale: [1, 1.6], opacity: [0.6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }} />
          <motion.span className="absolute rounded-full bg-rose/30" style={{ width: size, height: size }} animate={{ scale: [1, 1.6], opacity: [0.6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: 0.5 }} />
        </>
      )}
      <motion.button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        whileTap={{ scale: 0.94 }}
        aria-pressed={listening}
        aria-label={listening ? 'Stop listening' : 'Start listening'}
        className={cn(
          'relative z-10 flex items-center justify-center rounded-full text-bg shadow-glow-accent transition-colors disabled:opacity-50',
          listening ? 'bg-rose shadow-[0_0_0_1px_rgba(240,112,130,0.4),0_12px_40px_-12px_rgba(240,112,130,0.7)]' : 'bg-accent hover:bg-accent-bright',
        )}
        style={{ width: size, height: size }}
      >
        {listening ? <Square className="h-7 w-7 fill-current" /> : <Mic className="h-9 w-9" strokeWidth={2.2} />}
      </motion.button>
    </div>
  );
}
