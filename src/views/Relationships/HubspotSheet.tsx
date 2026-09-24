import { useMemo, useState } from 'react';
import { NavLink } from 'react-router';
import { AlertCircle, CheckCircle2, Code2, Download, Loader2, Upload } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import type { ArcAssessment, Contact, Encounter } from '@/domain/types';
import { ARC_LABELS } from '@/domain/types';
import { useData } from '@/store/data';
import { useSettings, selectHubspotLive } from '@/store/settings';
import { useArcs, useConferenceNameLookup } from '@/store/selectors';
import { downloadHubspotCsv, planPush, pushEncounter } from '@/lib/hubspot';
import { fmtDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface HubspotSheetProps {
  open: boolean;
  onClose: () => void;
  /** Meetings to push. Defaults to every unsynced meeting of `contact`, or every unsynced meeting when no contact is given. */
  encounters: Encounter[];
  contact?: Contact;
  title?: string;
}

type RowState = { status: 'idle' | 'pushing' | 'done' | 'failed'; message?: string };

export function HubspotSheet({ open, onClose, encounters, contact, title }: HubspotSheetProps) {
  const live = useSettings(selectHubspotLive);
  const contacts = useData((s) => s.contacts);
  const reps = useData((s) => s.reps);
  const arcs = useArcs();
  const nameOf = useConferenceNameLookup();
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [preview, setPreview] = useState<string>();
  const [running, setRunning] = useState(false);

  const items = useMemo(
    () =>
      encounters
        .map((e) => ({ e, c: contact ?? contacts.find((k) => k.id === e.contactId) }))
        .filter((x): x is { e: Encounter; c: Contact } => !!x.c)
        .sort((a, b) => b.e.capturedAt.localeCompare(a.e.capturedAt)),
    [encounters, contacts, contact],
  );
  const pending = items.filter(({ e }) => e.hubspot?.status !== 'synced');

  const arcLine = (c: Contact): string | undefined => {
    const a: ArcAssessment | undefined = arcs.get(c.id);
    return a ? `${ARC_LABELS[a.classification]} (${a.touches} meetings)` : undefined;
  };

  const pushAll = async () => {
    setRunning(true);
    let ok = 0;
    for (const { e, c } of pending) {
      setRows((r) => ({ ...r, [e.id]: { status: 'pushing' } }));
      try {
        const res = await pushEncounter(e, c, nameOf(e.conferenceId), reps.find((r) => r.id === e.repId)?.name, arcLine(c));
        setRows((r) => ({ ...r, [e.id]: { status: 'done', message: res.created ? 'Contact created + note' : 'Contact updated + note' } }));
        ok++;
      } catch (err) {
        setRows((r) => ({ ...r, [e.id]: { status: 'failed', message: err instanceof Error ? err.message : 'Failed' } }));
      }
    }
    setRunning(false);
    if (ok > 0) toast.success(`Pushed ${ok} meeting${ok === 1 ? '' : 's'} to HubSpot`);
  };

  const exportCsv = () => {
    downloadHubspotCsv(items.map(({ e, c }) => ({ encounter: e, contact: c, conferenceName: nameOf(e.conferenceId) })), contact ? `hubspot-${contact.canonicalName.replace(/\s+/g, '-').toLowerCase()}.csv` : 'hubspot-leads.csv');
    toast.success('CSV downloaded', 'Import it in HubSpot: Contacts → Import → File from computer.');
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div>
          <p className="font-semibold text-ink">{title ?? (contact ? `Push ${contact.canonicalName.split(' ')[0]} to HubSpot` : 'Push to HubSpot')}</p>
          <p className="text-[12px] text-ink-muted">{live ? 'One contact, one note per meeting. Existing contacts are matched by email.' : 'No token yet. Export a CSV HubSpot imports directly, or add a token in Settings.'}</p>
        </div>
      }
    >
      <ul className="flex flex-col gap-1.5">
        {items.map(({ e, c }) => {
          const st = rows[e.id] ?? { status: e.hubspot?.status === 'synced' ? 'done' : e.hubspot?.status === 'failed' ? 'failed' : 'idle', message: e.hubspot?.error };
          return (
            <li key={e.id} className="rounded-xl border border-line bg-bg-elevated px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-ink">
                    {c.canonicalName} <span className="text-ink-dim">· {c.currentCompany}</span>
                  </span>
                  <span className="block truncate text-[12px] text-ink-muted">
                    {nameOf(e.conferenceId)} · {fmtDate(e.capturedAt)}
                    {e.hubspot?.status === 'synced' && e.hubspot.contactId ? ` · HubSpot #${e.hubspot.contactId}` : ''}
                  </span>
                </span>
                <span className={cn('flex shrink-0 items-center gap-1 text-[11.5px] font-medium', st.status === 'done' ? 'text-teal' : st.status === 'failed' ? 'text-rose' : st.status === 'pushing' ? 'text-accent' : 'text-ink-dim')}>
                  {st.status === 'done' && <CheckCircle2 className="h-4 w-4" />}
                  {st.status === 'failed' && <AlertCircle className="h-4 w-4" />}
                  {st.status === 'pushing' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {st.status === 'done' ? 'In HubSpot' : st.status === 'failed' ? 'Failed' : st.status === 'pushing' ? 'Pushing' : 'Not pushed'}
                </span>
                <button type="button" onClick={() => setPreview(preview === e.id ? undefined : e.id)} className="text-ink-dim hover:text-ink" title="Preview payload">
                  <Code2 className="h-4 w-4" />
                </button>
              </div>
              {st.message && <p className={cn('mt-1 text-[11.5px]', st.status === 'failed' ? 'text-rose' : 'text-ink-dim')}>{st.message}</p>}
              {preview === e.id && (
                <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-line bg-bg p-2.5 font-mono text-[10.5px] leading-relaxed text-ink-muted">
                  {JSON.stringify(planPush(e, c, nameOf(e.conferenceId), reps.find((r) => r.id === e.repId)?.name, arcLine(c)), null, 2)}
                </pre>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        {live ? (
          <Button variant="primary" icon={<Upload className="h-4 w-4" />} onClick={pushAll} loading={running} disabled={pending.length === 0}>
            {pending.length === 0 ? 'Everything is in HubSpot' : `Push ${pending.length} meeting${pending.length === 1 ? '' : 's'}`}
          </Button>
        ) : (
          <NavLink to="/settings" className="inline-flex h-10 items-center rounded-xl border border-line px-4 text-[13.5px] text-ink-muted hover:text-ink">
            Add a HubSpot token
          </NavLink>
        )}
        <Button icon={<Download className="h-4 w-4" />} onClick={exportCsv}>
          Export CSV for import
        </Button>
      </div>
    </Drawer>
  );
}
