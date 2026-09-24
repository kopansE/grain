import { useRef, useState } from 'react';
import { CheckCircle2, Download, Eye, EyeOff, KeyRound, RotateCcw, Upload, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { toast } from '@/components/ui/Toast';
import { MODEL_OPTIONS, useSettings } from '@/store/settings';
import { useData, type DataSnapshot } from '@/store/data';
import { ScoringPanel } from '@/views/Explore/ScoringPanel';
import { tierCounts } from '@/domain/scoring';
import { useScores, useUpcoming } from '@/store/selectors';
import { HOME_BASES } from '@/lib/geo';
import { pingAi } from '@/lib/ai';
import { pingHubspot } from '@/lib/hubspot';
import type { HomeBaseCode, Rep } from '@/domain/types';
import { cn } from '@/lib/cn';

function Section({ title, blurb, children }: { title: string; blurb?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {blurb && <p className="mt-1 text-[12.5px] text-ink-muted">{blurb}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function KeyField({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
        <Input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" spellCheck={false} className="pl-10 pr-11 font-mono text-[13px]" />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink" aria-label={show ? 'Hide' : 'Show'}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

function TestResult({ r }: { r?: { ok: boolean; message?: string } }) {
  if (!r) return null;
  return (
    <p className={cn('flex items-center gap-1.5 text-[12.5px]', r.ok ? 'text-teal' : 'text-rose')}>
      {r.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {r.message ?? (r.ok ? 'Connected' : 'Failed')}
    </p>
  );
}

export default function Settings() {
  const s = useSettings();
  const data = useData();
  const scores = useScores();
  const upcoming = useUpcoming();
  const fileRef = useRef<HTMLInputElement>(null);
  const [aiTest, setAiTest] = useState<{ ok: boolean; message?: string }>();
  const [hsTest, setHsTest] = useState<{ ok: boolean; message?: string }>();
  const [testingAi, setTestingAi] = useState(false);
  const [testingHs, setTestingHs] = useState(false);

  const testAi = async () => {
    setTestingAi(true);
    const r = await pingAi(s.anthropicKey.trim() || undefined);
    setAiTest({ ok: r.ok, message: r.ok ? `Connected · ${r.displayName ?? r.model}${r.usingHostKey ? ' (host key)' : ''}` : r.message });
    setTestingAi(false);
  };
  const testHs = async () => {
    setTestingHs(true);
    const r = await pingHubspot(s.hubspotToken.trim() || undefined);
    setHsTest({ ok: r.ok, message: r.ok ? `Connected${r.usingHostToken ? ' (host token)' : ''}` : r.message });
    setTestingHs(false);
  };

  const exportJson = () => {
    const snap = data.exportSnapshot();
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grain-orbit-${snap.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const snap = JSON.parse(String(reader.result)) as DataSnapshot;
        if (!Array.isArray(snap.conferences) || !Array.isArray(snap.encounters)) throw new Error('Not an Orbit export.');
        data.importSnapshot(snap);
        toast.success('Imported', `${snap.conferences.length} events, ${snap.encounters.length} meetings, ${snap.contacts?.length ?? 0} people.`);
      } catch (e) {
        toast.error('Import failed', e instanceof Error ? e.message : undefined);
      }
    };
    reader.readAsText(file);
  };

  const updateRep = (id: string, patch: Partial<Rep>) => {
    const rep = data.reps.find((r) => r.id === id);
    if (rep) data.upsertRep({ ...rep, ...patch });
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <header>
        <h2 className="display text-[34px] leading-none text-ink">Settings</h2>
        <p className="mt-1.5 text-[14px] text-ink-muted">Keys stay in this browser. Nothing here is sent anywhere except to the service the key belongs to.</p>
      </header>

      <Section title="AI" blurb="Powers voice-to-lead, card reading, relationship reads, follow-up drafts and web discovery. Without a key, the app shows hand-written demo answers.">
        <div className="flex flex-col gap-3">
          <KeyField label="Anthropic API key" value={s.anthropicKey} onChange={(v) => s.update({ anthropicKey: v })} placeholder="sk-ant-…" hint="Create one at console.anthropic.com. Stored only in this browser." />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Model">
              <Select value={s.model} onChange={(e) => s.update({ model: e.target.value })}>
                {MODEL_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} · {m.hint}
                  </option>
                ))}
              </Select>
            </Field>
            <Button onClick={testAi} loading={testingAi}>
              Test connection
            </Button>
          </div>
          <TestResult r={aiTest} />
          <p className="text-[12px] text-ink-dim">
            Status: {s.anthropicKey.trim() ? 'live with your key' : s.hostHasAnthropicKey ? 'live with the host\'s key' : 'demo mode'}.
          </p>
        </div>
      </Section>

      <Section title="HubSpot" blurb="Push captured leads as contacts with a note per meeting. Needs a Private App token with contact read and write scopes.">
        <div className="flex flex-col gap-3">
          <KeyField label="Private App access token" value={s.hubspotToken} onChange={(v) => s.update({ hubspotToken: v })} placeholder="pat-eu1-…" hint="HubSpot → Settings → Integrations → Private Apps → Create. Scopes: crm.objects.contacts.read, crm.objects.contacts.write, crm.objects.companies.read/write, crm.schemas.contacts.write." />
          <div className="flex items-center gap-3">
            <Button onClick={testHs} loading={testingHs}>
              Test connection
            </Button>
            <TestResult r={hsTest} />
          </div>
          <p className="text-[12px] text-ink-dim">Status: {s.hubspotToken.trim() ? 'live with your token' : s.hostHasHubspotToken ? 'live with the host\'s token' : 'not connected · leads can still be exported as CSV'}.</p>
        </div>
      </Section>

      <Section title="Team" blurb="Who captures leads, and where they fly from.">
        <div className="flex flex-col gap-3">
          <Field label="You are">
            <Select value={s.currentRepId} onChange={(e) => s.update({ currentRepId: e.target.value })}>
              {data.reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.role}
                </option>
              ))}
            </Select>
          </Field>
          <ul className="flex flex-col gap-2">
            {data.reps.map((r) => (
              <li key={r.id} className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-2 rounded-xl border border-line bg-bg-elevated p-2">
                <Avatar name={r.name} color={r.color} size={30} />
                <input value={r.name} onChange={(e) => updateRep(r.id, { name: e.target.value })} className="h-9 min-w-0 rounded-lg border border-line bg-bg px-2 text-[13px] text-ink" />
                <input value={r.role} onChange={(e) => updateRep(r.id, { role: e.target.value })} className="h-9 min-w-0 rounded-lg border border-line bg-bg px-2 text-[13px] text-ink" placeholder="Role" />
                <select value={r.homeBase} onChange={(e) => updateRep(r.id, { homeBase: e.target.value as HomeBaseCode })} className="h-9 rounded-lg border border-line bg-bg px-2 text-[12.5px] text-ink">
                  {(Object.keys(HOME_BASES) as HomeBaseCode[]).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => data.reps.length > 1 && data.removeRep(r.id)} className="text-[12px] text-ink-dim hover:text-rose" disabled={data.reps.length <= 1}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            onClick={() => {
              const id = `rep-${Date.now().toString(36)}`;
              data.upsertRep({ id, name: 'New rep', initials: 'NR', color: '#8593f5', homeBase: 'TLV', role: 'Account Executive' });
            }}
          >
            Add a rep
          </Button>
        </div>
      </Section>

      <Section title="Scoring and travel" blurb="Weights drive every score in the app. Home base drives travel cost and the globe's arcs.">
        <div className="grid gap-5 md:grid-cols-[1fr_260px]">
          <ScoringPanel tierCounts={tierCounts(upcoming.map((c) => scores.get(c.id)!))} total={upcoming.length} />
          <div className="flex flex-col gap-3">
            <Field label="Home base">
              <Select value={s.homeBase.label} onChange={(e) => s.update({ homeBase: Object.values(HOME_BASES).find((h) => h.label === e.target.value) ?? HOME_BASES.TLV })}>
                {Object.values(HOME_BASES).map((h) => (
                  <option key={h.label} value={h.label}>
                    {h.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Annual conference budget (USD)">
              <Input type="number" step={10000} value={s.annualBudgetUsd} onChange={(e) => s.update({ annualBudgetUsd: Number(e.target.value) || 0 })} />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Your data" blurb="Everything lives in this browser's storage. Export to back it up or share with a teammate; import to load theirs.">
        <div className="flex flex-wrap gap-2">
          <Button icon={<Download className="h-4 w-4" />} onClick={exportJson}>
            Export JSON
          </Button>
          <Button icon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>
            Import JSON
          </Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          <Button
            variant="danger"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={() => {
              if (confirm('Replace everything with the bundled sample data? Your captured leads will be lost unless you exported them.')) {
                data.resetToSeed();
                toast.success('Reset to sample data');
              }
            }}
          >
            Reset to sample data
          </Button>
        </div>
        <p className="mt-3 text-[12px] text-ink-dim">
          {data.conferences.length} events · {data.contacts.filter((c) => c.encounterIds.length > 0).length} people · {data.encounters.length} meetings
        </p>
      </Section>
    </div>
  );
}
