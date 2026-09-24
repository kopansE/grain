import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { create } from 'zustand';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarRange, Search, Settings, Sparkles, Telescope, Users, Zap } from 'lucide-react';
import { useData } from '@/store/data';
import { useScores } from '@/store/selectors';
import { TierBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { fmtDateRange } from '@/lib/format';
import { cn } from '@/lib/cn';

interface PaletteState {
  open: boolean;
  setOpen: (v: boolean) => void;
}
export const usePalette = create<PaletteState>((set) => ({ open: false, setOpen: (open) => set({ open }) }));

interface Item {
  id: string;
  group: 'Actions' | 'Events' | 'People';
  label: string;
  sub?: string;
  icon?: React.ReactNode;
  to: string;
}

/** ⌘K / Ctrl+K. Jump to any event or person, or fire a common action. */
export function CommandPalette() {
  const open = usePalette((s) => s.open);
  const setOpen = usePalette((s) => s.setOpen);
  const navigate = useNavigate();
  const conferences = useData((s) => s.conferences);
  const contacts = useData((s) => s.contacts);
  const scores = useScores();
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!usePalette.getState().open);
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQ('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const s = q.trim().toLowerCase();
    const allActions: Item[] = [
      { id: 'a-capture', group: 'Actions', label: 'Capture a lead', sub: 'Show floor mode', icon: <Zap className="h-4 w-4 text-accent" />, to: '/capture' },
      { id: 'a-explore', group: 'Actions', label: 'Explore events', icon: <Telescope className="h-4 w-4" />, to: '/conferences' },
      { id: 'a-plan', group: 'Actions', label: 'Open the plan', icon: <CalendarRange className="h-4 w-4" />, to: '/plan' },
      { id: 'a-people', group: 'Actions', label: 'Relationships', icon: <Users className="h-4 w-4" />, to: '/contacts' },
      { id: 'a-discover', group: 'Actions', label: 'Discover new events', icon: <Sparkles className="h-4 w-4" />, to: '/discover' },
      { id: 'a-settings', group: 'Actions', label: 'Settings', icon: <Settings className="h-4 w-4" />, to: '/settings' },
    ];
    const actions = allActions.filter((a) => !s || a.label.toLowerCase().includes(s) || (a.sub ?? '').toLowerCase().includes(s));
    const events: Item[] = conferences
      .filter((c) => s && `${c.name} ${c.series} ${c.city} ${c.country}`.toLowerCase().includes(s))
      .slice(0, 6)
      .map((c) => ({ id: 'c-' + c.id, group: 'Events', label: c.name, sub: `${fmtDateRange(c.startDate, c.endDate)} · ${c.city}`, to: `/conferences/${c.id}` }));
    const people: Item[] = contacts
      .filter((c) => c.encounterIds.length > 0 && s && `${c.canonicalName} ${c.currentCompany} ${c.aliases.join(' ')}`.toLowerCase().includes(s))
      .slice(0, 6)
      .map((c) => ({ id: 'p-' + c.id, group: 'People', label: c.canonicalName, sub: `${c.currentTitle ? `${c.currentTitle}, ` : ''}${c.currentCompany}`, to: `/contacts/${c.id}` }));
    return [...events, ...people, ...actions];
  }, [q, conferences, contacts]);

  useEffect(() => setCursor(0), [q]);

  const go = (item: Item) => {
    setOpen(false);
    navigate(item.to);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(items.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter' && items[cursor]) {
      go(items[cursor]!);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  let lastGroup = '';
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="palette" className="fixed inset-0 z-[65] flex items-start justify-center px-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <motion.div initial={{ scale: 0.97, y: -8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: -8 }} transition={{ type: 'spring', stiffness: 460, damping: 36 }} className="glass relative w-full max-w-xl overflow-hidden rounded-2xl">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 text-ink-dim" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Jump to an event, a person, or an action…" className="h-13 w-full bg-transparent py-4 text-[15px] text-ink placeholder:text-ink-dim focus:outline-none" />
              <kbd className="rounded border border-line bg-bg px-1.5 font-mono text-[10px] text-ink-dim">esc</kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {items.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-ink-muted">Nothing matches.</li>}
              {items.map((item, i) => {
                const header = item.group !== lastGroup ? item.group : null;
                lastGroup = item.group;
                const conf = item.group === 'Events' ? conferences.find((c) => 'c-' + c.id === item.id) : undefined;
                return (
                  <li key={item.id}>
                    {header && <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim">{header}</p>}
                    <button type="button" onMouseEnter={() => setCursor(i)} onClick={() => go(item)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left', i === cursor ? 'bg-surface-2 ring-1 ring-line-strong' : 'hover:bg-surface-2')}>
                      {item.group === 'People' ? <Avatar name={item.label} size={26} /> : <span className="flex h-6 w-6 items-center justify-center text-ink-muted">{item.icon ?? <CalendarRange className="h-4 w-4" />}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-ink">{item.label}</span>
                        {item.sub && <span className="block truncate text-[12px] text-ink-muted">{item.sub}</span>}
                      </span>
                      {conf && scores.get(conf.id) && <TierBadge tier={scores.get(conf.id)!.tier} short />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
