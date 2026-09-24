import { useEffect, useRef, useState } from 'react';
import { Copy, Mail, RefreshCw, Sparkles } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Textarea, Input, Field } from '@/components/ui/Field';
import { toast } from '@/components/ui/Toast';
import type { ArcAssessment, Contact } from '@/domain/types';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { useConferenceNameLookup, useEncountersFor } from '@/store/selectors';
import { callAi, type FollowUp } from '@/lib/ai';
import { encountersForAi } from '@/lib/useArcAi';
import { demoFollowUp } from '@/data/seed/demoAi';

type Tone = 'warm' | 'direct' | 'short';

export function FollowUpSheet({ open, onClose, contact, arc }: { open: boolean; onClose: () => void; contact: Contact; arc?: ArcAssessment }) {
  const encounters = useEncountersFor(contact.id);
  const reps = useData((s) => s.reps);
  const currentRepId = useSettings((s) => s.currentRepId);
  const rep = reps.find((r) => r.id === currentRepId) ?? reps[0];
  const nameOf = useConferenceNameLookup();
  const [tone, setTone] = useState<Tone>('warm');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false);
  const generatedFor = useRef<string | undefined>(undefined);

  const generate = async (t: Tone) => {
    if (!rep || encounters.length === 0) return;
    setLoading(true);
    try {
      const last = encounters[encounters.length - 1]!;
      const res = await callAi<FollowUp>(
        'followUp',
        {
          contact: { name: contact.canonicalName, company: contact.currentCompany, title: contact.currentTitle },
          classification: arc?.classification ?? 'new',
          signals: arc?.signals ?? [],
          encounters: encountersForAi(encounters.slice(-4), nameOf, reps),
          tone: t,
          repName: rep.name,
          repRole: rep.role,
          today: new Date().toISOString().slice(0, 10),
        },
        () =>
          demoFollowUp(arc?.classification ?? 'new', {
            firstName: contact.canonicalName.split(' ')[0]!,
            company: contact.currentCompany,
            conference: nameOf(last.conferenceId),
            pain: last.painPoints[0],
            nextStep: last.nextStep,
            repName: rep.name,
            tone: t,
          }),
      );
      setSubject(res.data.subject);
      setBody(res.data.body);
      setDemo(res.demo);
    } catch (e) {
      toast.error('Could not draft the email', e instanceof Error ? e.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const key = `${contact.id}:${tone}`;
    if (generatedFor.current === key) return;
    generatedFor.current = key;
    void generate(tone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tone, contact.id]);

  const email = contact.emails[0];
  const mailto = `mailto:${email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      toast.success('Copied', 'Subject and body are on your clipboard.');
    } catch {
      toast.error('Copy failed', 'Select the text and copy it manually.');
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div>
          <p className="font-semibold text-ink">Follow-up to {contact.canonicalName.split(' ')[0]}</p>
          <p className="text-[12px] text-ink-muted">{demo ? 'Demo draft. Add a key in Settings for a real one.' : 'Drafted from your notes. Edit anything.'}</p>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmented
          value={tone}
          onChange={setTone}
          options={[
            { value: 'warm', label: 'Warm' },
            { value: 'direct', label: 'Direct' },
            { value: 'short', label: 'Short' },
          ]}
        />
        {loading ? (
          <div className="space-y-2 py-2">
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-3" />
            <div className="h-24 animate-pulse rounded-xl bg-surface-3" />
            <p className="flex items-center gap-1.5 text-[12px] text-ink-dim">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Writing from {encounters.length} meeting{encounters.length === 1 ? '' : 's'}…
            </p>
          </div>
        ) : (
          <>
            <Field label="Subject">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label="Body">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[260px] text-[14px]" />
            </Field>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <a href={mailto} className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[13.5px] font-semibold text-bg shadow-glow-accent hover:bg-accent-bright">
            <Mail className="h-4 w-4" /> Open in email{email ? '' : ' (no address)'}
          </a>
          <Button icon={<Copy className="h-4 w-4" />} onClick={copy} disabled={loading}>
            Copy
          </Button>
          <Button variant="ghost" icon={<RefreshCw className="h-4 w-4" />} onClick={() => generate(tone)} disabled={loading}>
            Redraft
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
