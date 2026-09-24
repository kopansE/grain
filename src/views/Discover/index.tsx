import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ExternalLink, Globe2, Plus, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Field';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Badge, CountryTag, TierBadge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import { VERTICAL_LABELS, type Conference } from '@/domain/types';
import { scoreConference } from '@/domain/scoring';
import { useData, newId } from '@/store/data';
import { useSettings, selectAiLive } from '@/store/settings';
import { useToday } from '@/store/selectors';
import { callAi, type DiscoverResult } from '@/lib/ai';
import { DEMO_DISCOVER } from '@/data/seed/demoAi';
import { fmtCompact, fmtDateRange } from '@/lib/format';
import { cn } from '@/lib/cn';

const PROMPTS = [
  'Treasury events in Asia Pacific, first half of 2027',
  'Travel-tech and airline finance events in Europe',
  'Cross-border payments and remittance events in Latin America',
  'PSP and acquirer events in the Middle East',
  'Corporate treasury summits in the US we are missing',
];

type Found = DiscoverResult['events'][number];

const STEPS = [
  { at: 0, label: 'Searching the web' },
  { at: 15, label: 'Reading event pages' },
  { at: 45, label: 'Scoring for ICP fit' },
  { at: 80, label: 'Almost there' },
];

export default function Discover() {
  const conferences = useData((s) => s.conferences);
  const addConference = useData((s) => s.addConference);
  const weights = useSettings((s) => s.weights);
  const homeBase = useSettings((s) => s.homeBase);
  const live = useSettings(selectAiLive);
  const today = useToday();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<DiscoverResult>();
  const [demo, setDemo] = useState(false);
  const [dates, setDates] = useState<Record<string, { start: string; end: string }>>({});
  const [added, setAdded] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  const known = useMemo(() => [...new Set(conferences.flatMap((c) => [c.series, c.name]))], [conferences]);

  const run = async (q: string) => {
    const text = q.trim();
    if (!text) return;
    setQuery(text);
    setLoading(true);
    setResult(undefined);
    try {
      const res = await callAi<DiscoverResult>('discover', { query: text, known, today, homeBase: homeBase.label }, () => DEMO_DISCOVER);
      setResult(res.data);
      setDemo(res.demo);
      const d: Record<string, { start: string; end: string }> = {};
      for (const e of res.data.events) d[e.name] = { start: e.startDate ?? '', end: e.endDate ?? e.startDate ?? '' };
      setDates(d);
    } catch (e) {
      toast.error('Search failed', e instanceof Error ? e.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  const toConference = (f: Found): Conference | undefined => {
    const d = dates[f.name];
    if (!d?.start) return undefined;
    return {
      id: newId('conf'),
      series: f.series,
      name: f.name,
      startDate: d.start,
      endDate: d.end || d.start,
      city: f.city,
      country: f.country,
      countryCode: f.countryCode.toUpperCase(),
      region: f.region,
      lat: f.lat,
      lng: f.lng,
      verticals: f.verticals,
      audienceSize: f.audienceSize ?? 1000,
      url: f.url ?? undefined,
      description: `${f.description} ${f.whyItFits}`.trim(),
      icpInputs: { verticalFit: f.icp.verticalFit, buyerDensity: f.icp.buyerDensity, seniority: f.icp.seniority },
      costs: { ticketUsd: f.ticketUsd ?? 1200 },
      status: 'considering',
      assignedRepIds: [],
      source: 'ai',
      datesConfirmed: f.datesConfirmed && !!f.startDate,
    };
  };

  const step = STEPS.filter((s) => elapsed >= s.at).pop() ?? STEPS[0]!;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h2 className="display text-[34px] leading-none text-ink">Find what you don't know about.</h2>
        <p className="mt-1.5 max-w-2xl text-[14px] text-ink-muted">
          Describe a region, a vertical or a timeframe. The AI searches the web, skips the {conferences.length} events already in your list, and scores what it finds with your current weights.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
        className="card p-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. treasury events in APAC in H1 2027" className="h-12 pl-10 text-[15px]" />
          </div>
          <Button type="submit" variant="primary" size="lg" loading={loading} icon={<Sparkles className="h-4 w-4" />}>
            {live ? 'Search the web' : 'Show demo results'}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PROMPTS.map((p) => (
            <Chip key={p} onClick={() => void run(p)} active={query === p}>
              {p}
            </Chip>
          ))}
        </div>
        {!live && <p className="mt-3 text-[12px] text-ink-dim">Demo mode: results are a bundled sample. Add an Anthropic key in Settings for live web search.</p>}
      </form>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card flex flex-col items-center gap-3 p-10 text-center">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}>
              <Globe2 className="h-10 w-10 text-teal" />
            </motion.div>
            <p className="text-[15px] font-medium text-ink">{step.label}…</p>
            <p className="text-[12.5px] text-ink-muted">Live web search takes one to two minutes. Worth it: every result arrives scored and sourced.</p>
            <div className="flex gap-1.5">
              {STEPS.map((s) => (
                <span key={s.label} className={cn('h-1.5 w-8 rounded-full transition-colors', elapsed >= s.at ? 'bg-teal' : 'bg-surface-3')} />
              ))}
            </div>
          </motion.div>
        )}

        {!loading && result && (
          <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] text-ink-muted">{result.note}</p>
              {demo && <Badge tone="accent">Demo</Badge>}
            </div>
            {result.events.length === 0 && <p className="card p-6 text-center text-ink-muted">Nothing new found. Try a broader region or a different vertical.</p>}
            {result.events.map((f, i) => {
              const conf = toConference(f);
              const preview = conf ? scoreConference(conf, { weights, homeBase }) : scoreConference({ ...(toConference({ ...f, startDate: today, endDate: today }) as Conference) }, { weights, homeBase });
              const d = dates[f.name] ?? { start: '', end: '' };
              const addedId = added[f.name];
              return (
                <motion.article key={f.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                  <ScoreRing score={preview.score} tier={preview.tier} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[16px] font-semibold text-ink">{f.name}</h3>
                      <TierBadge tier={preview.tier} />
                      {f.datesConfirmed ? <Badge tone="teal">dates confirmed</Badge> : <Badge>dates unconfirmed</Badge>}
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink-muted">
                      <CountryTag code={f.countryCode} /> {f.city}, {f.country} · {f.verticals.map((v) => VERTICAL_LABELS[v]).join(', ')}
                      {f.audienceSize ? ` · ~${fmtCompact(f.audienceSize)} people` : ''}
                      {f.startDate ? ` · ${fmtDateRange(f.startDate, f.endDate ?? f.startDate)}` : ''}
                    </p>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-ink">{f.description}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{f.whyItFits}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-dim">
                      {f.sources.slice(0, 3).map((s) => (
                        <a key={s} href={s} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-ink">
                          <ExternalLink className="h-3 w-3" /> {safeHost(s)}
                        </a>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <label className="text-[11.5px] text-ink-dim">
                        Start
                        <input type="date" value={d.start} onChange={(e) => setDates((x) => ({ ...x, [f.name]: { ...d, start: e.target.value } }))} className="ml-1.5 h-9 rounded-lg border border-line bg-bg-elevated px-2 text-[12.5px] text-ink" />
                      </label>
                      <label className="text-[11.5px] text-ink-dim">
                        End
                        <input type="date" value={d.end} onChange={(e) => setDates((x) => ({ ...x, [f.name]: { ...d, end: e.target.value } }))} className="ml-1.5 h-9 rounded-lg border border-line bg-bg-elevated px-2 text-[12.5px] text-ink" />
                      </label>
                      {addedId ? (
                        <NavLink to={`/conferences/${addedId}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal/40 bg-teal-soft px-3 text-[12.5px] font-semibold text-teal">
                          <Check className="h-3.5 w-3.5" /> Added · open
                        </NavLink>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<Plus className="h-3.5 w-3.5" />}
                          disabled={!d.start}
                          title={d.start ? undefined : 'Set a start date first'}
                          onClick={() => {
                            const c = toConference(f);
                            if (!c) return;
                            addConference(c);
                            setAdded((a) => ({ ...a, [f.name]: c.id }));
                            toast.success(`Added ${f.name}`, 'It is in Explore now, marked as AI-discovered.');
                          }}
                        >
                          Add to database
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
