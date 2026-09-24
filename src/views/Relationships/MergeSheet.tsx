import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Avatar } from '@/components/ui/Avatar';
import type { Contact } from '@/domain/types';
import { useData } from '@/store/data';

export function MergeSheet({ open, onClose, source, onMerge }: { open: boolean; onClose: () => void; source: Contact; onMerge: (targetId: string) => void }) {
  const contacts = useData((s) => s.contacts);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return contacts
      .filter((c) => c.id !== source.id && c.encounterIds.length > 0)
      .filter((c) => !s || `${c.canonicalName} ${c.currentCompany} ${c.aliases.join(' ')}`.toLowerCase().includes(s))
      .slice(0, 20);
  }, [contacts, q, source.id]);
  return (
    <Drawer open={open} onClose={onClose} title={<p className="font-semibold text-ink">Merge {source.canonicalName} into…</p>}>
      <p className="mb-3 text-[12.5px] text-ink-muted">All of {source.canonicalName.split(' ')[0]}'s meetings move to the person you pick. You can undo from their page.</p>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" className="h-11 w-full rounded-xl border border-line bg-bg-elevated pl-9 pr-3 text-[15px] text-ink placeholder:text-ink-dim focus:border-accent/60 focus:outline-none" />
      </div>
      <ul className="flex flex-col gap-1.5">
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onMerge(c.id)} className="flex w-full items-center gap-3 rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-left hover:border-line-strong">
              <Avatar name={c.canonicalName} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-ink">{c.canonicalName}</span>
                <span className="block truncate text-[12px] text-ink-muted">
                  {c.currentTitle ? `${c.currentTitle}, ` : ''}
                  {c.currentCompany} · {c.encounterIds.length} meeting{c.encounterIds.length === 1 ? '' : 's'}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
