import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { GRAIN_CONTEXT } from './grainContext.js';

/**
 * Every AI feature in one place: the schema it must return, the prompt, and
 * the call. All outputs are structured (zod schema → JSON), so the app never
 * parses prose. Effort is tuned per job: extraction is fast, judgment is not.
 */

export interface AiCtx {
  client: Anthropic;
  model: string;
}

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------
const Interest = z.enum(['hot', 'warm', 'cold']);
const Intent = z.enum(['curious', 'evaluating', 'budget', 'champion']);

export const LeadSchema = z.object({
  name: z.string().nullable().describe('Full name as the rep would write it. Null if not stated.'),
  company: z.string().nullable(),
  title: z.string().nullable().describe('Job title, e.g. "Head of Treasury". Null if not stated.'),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  linkedin: z.string().nullable(),
  interest: Interest.describe('hot = wants to move now, warm = engaged, cold = polite or browsing'),
  intent: Intent.describe('curious = interested in principle; evaluating = comparing options; budget = has money and a timeline; champion = will sell it internally'),
  painPoints: z.array(z.string()).describe('Only from the provided list, only if the person actually mentioned that pain.'),
  nextStep: z.string().nullable().describe('One of the provided next steps, or null if none was agreed.'),
  summary: z.string().describe('The conversation in one or two short sentences, in the rep\'s voice. Facts only.'),
  matchedCandidate: z.string().nullable().describe('If the transcript clearly refers to one of the known candidates, that candidate\'s exact name. Otherwise null.'),
});
export type Lead = z.infer<typeof LeadSchema>;

export const ArcAiSchema = z.object({
  summary: z.string().describe('Two sentences a salesperson can read in five seconds: where this relationship is and why.'),
  nudge: z.string().describe('One concrete thing to do now, with the specific next step. Not generic advice.'),
  opener: z.string().describe('A natural spoken opening line for the next time they meet, under 25 words. No cheese.'),
});
export type ArcAi = z.infer<typeof ArcAiSchema>;

export const FollowUpSchema = z.object({
  subject: z.string().describe('Under 8 words. Specific, not salesy.'),
  body: z.string().describe('The email body, plain text, ready to send. Greeting, 3 to 6 short sentences, one ask, sign-off with the rep\'s first name.'),
});
export type FollowUp = z.infer<typeof FollowUpSchema>;

const Region = z.enum(['EMEA', 'NA', 'APAC', 'LATAM', 'MEA', 'IL']);
const Vertical = z.enum(['payments', 'fintech', 'treasury', 'travel', 'banking', 'ecommerce', 'crypto', 'saas', 'insurtech']);

export const DiscoveredConferenceSchema = z.object({
  name: z.string().describe('Full edition name, e.g. "Seamless Asia 2027".'),
  series: z.string().describe('Family name without the year, e.g. "Seamless Asia".'),
  startDate: z.string().nullable().describe('YYYY-MM-DD or null if unknown.'),
  endDate: z.string().nullable(),
  city: z.string(),
  country: z.string(),
  countryCode: z.string().describe('ISO 3166-1 alpha-2.'),
  region: Region,
  lat: z.number().describe('City latitude.'),
  lng: z.number().describe('City longitude.'),
  verticals: z.array(Vertical),
  audienceSize: z.number().int().nullable().describe('Estimated attendees, null if unknown.'),
  url: z.string().nullable(),
  description: z.string().describe('One line: who attends and why it might matter to Grain.'),
  whyItFits: z.string().describe('One sentence on ICP fit, honest about weaknesses.'),
  icp: z.object({
    verticalFit: z.number().int().min(0).max(10),
    buyerDensity: z.number().int().min(0).max(10),
    seniority: z.number().int().min(0).max(10),
  }),
  ticketUsd: z.number().int().nullable(),
  datesConfirmed: z.boolean().describe('True only if an official source states the dates.'),
  sources: z.array(z.string()).describe('URLs that back this up.'),
});
export const DiscoverSchema = z.object({
  events: z.array(DiscoveredConferenceSchema),
  note: z.string().describe('One sentence to the user about coverage or caveats.'),
});
export type DiscoverResult = z.infer<typeof DiscoverSchema>;

// ---------------------------------------------------------------------------
// Payload schemas (what the browser sends)
// ---------------------------------------------------------------------------
const ConferenceLite = z.object({ name: z.string(), city: z.string().optional(), dates: z.string().optional() }).optional();

export const ExtractLeadPayload = z.object({
  transcript: z.string().min(1),
  conference: ConferenceLite,
  repName: z.string().optional(),
  candidates: z.array(z.object({ name: z.string(), company: z.string(), title: z.string().optional() })).default([]),
  painOptions: z.array(z.string()).default([]),
  nextStepOptions: z.array(z.string()).default([]),
});

export const ExtractCardPayload = z.object({
  image: z.string().describe('data URL or raw base64'),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']).optional(),
  conference: ConferenceLite,
  painOptions: z.array(z.string()).default([]),
  nextStepOptions: z.array(z.string()).default([]),
});

const EncounterLite = z.object({
  conference: z.string(),
  date: z.string(),
  title: z.string().optional(),
  company: z.string(),
  interest: Interest,
  intent: Intent,
  notes: z.string(),
  painPoints: z.array(z.string()).default([]),
  nextStep: z.string().optional(),
  nextStepDone: z.boolean().optional(),
  rep: z.string().optional(),
});

export const ArcSummaryPayload = z.object({
  contact: z.object({ name: z.string(), company: z.string(), title: z.string().optional() }),
  classification: z.string(),
  signals: z.array(z.string()),
  nudgeGoal: z.string(),
  encounters: z.array(EncounterLite).min(1),
  today: z.string().optional(),
});

export const FollowUpPayload = z.object({
  contact: z.object({ name: z.string(), company: z.string(), title: z.string().optional() }),
  classification: z.string(),
  signals: z.array(z.string()).default([]),
  encounters: z.array(EncounterLite).min(1),
  tone: z.enum(['warm', 'direct', 'short']).default('warm'),
  repName: z.string(),
  repRole: z.string().optional(),
  today: z.string().optional(),
});

export const DiscoverPayload = z.object({
  query: z.string().min(2),
  known: z.array(z.string()).default([]),
  today: z.string().optional(),
  homeBase: z.string().optional(),
});

export const PreBriefSchema = z.object({
  headline: z.string().describe('One line: why this event matters for Grain this year.'),
  whoToMeet: z
    .array(
      z.object({
        name: z.string(),
        company: z.string(),
        why: z.string().describe('One sentence on where the relationship stands and what to move.'),
        opener: z.string().describe('A spoken first line, under 20 words.'),
      }),
    )
    .describe('Only people from the provided known list. Most valuable first. At most 6.'),
  targets: z.array(z.string()).describe('3 to 5 kinds of companies or roles to hunt on the floor, specific to this event.'),
  talkingPoints: z.array(z.string()).describe('3 talking points that connect the event agenda to Grain, in plain words.'),
  checklist: z.array(z.string()).describe('5 practical items for the team before and during the event.'),
});
export type PreBrief = z.infer<typeof PreBriefSchema>;

export const PreBriefPayload = z.object({
  conference: z.object({ name: z.string(), city: z.string(), dates: z.string(), description: z.string(), verticals: z.array(z.string()), audienceSize: z.number().optional() }),
  known: z
    .array(z.object({ name: z.string(), company: z.string(), title: z.string().optional(), classification: z.string(), lastMet: z.string(), nextStep: z.string().optional(), notes: z.string().optional() }))
    .default([]),
  recentPains: z.array(z.string()).default([]),
  reps: z.array(z.string()).default([]),
  today: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SYSTEM_BASE = `You are the sales-intelligence assistant inside Grain Orbit, a tool Grain's sales team uses to plan conferences and capture leads on the show floor.\n\n${GRAIN_CONTEXT}`;

function fmtEncounters(list: z.infer<typeof EncounterLite>[]): string {
  return list
    .map(
      (e, i) =>
        `${i + 1}. ${e.date} at ${e.conference}${e.rep ? ` (met by ${e.rep})` : ''}: ${e.title ? `${e.title}, ` : ''}${e.company}. Interest: ${e.interest}. Intent: ${e.intent}.${
          e.painPoints.length ? ` Pain: ${e.painPoints.join(', ')}.` : ''
        }${e.nextStep ? ` Next step agreed: ${e.nextStep}${e.nextStepDone ? ' (done)' : ' (not done)'}.` : ' No next step agreed.'} Notes: "${e.notes}"`,
    )
    .join('\n');
}

function parsedOrThrow<T>(out: T | null | undefined, what: string): T {
  if (out === null || out === undefined) throw new Error(`The model did not return a valid ${what}.`);
  return unescapeDeep(out) as T;
}

/**
 * Some models double-escape inside JSON strings ("\\u2014", "\\n"). After
 * parsing, those survive as literal backslash sequences. Normalise them.
 */
function unescapeDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return value
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"') as T;
  }
  if (Array.isArray(value)) return value.map((v) => unescapeDeep(v)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = unescapeDeep(v);
    return out as T;
  }
  return value;
}

// ---------------------------------------------------------------------------
// 1. Voice / text → lead
// ---------------------------------------------------------------------------
export async function extractLead(ctx: AiCtx, raw: unknown): Promise<Lead> {
  const p = ExtractLeadPayload.parse(raw);
  const res = await ctx.client.messages.parse({
    model: ctx.model,
    max_tokens: 4000,
    system: `${SYSTEM_BASE}\n\nYou turn a salesperson's spoken or typed note into a structured lead. Extract only what was said; never invent a name, company or title. Fix obvious speech-to-text slips in names of well-known companies (e.g. "a dyen" → "Adyen"). If a known candidate clearly matches the person described, set matchedCandidate to that exact name and prefer the candidate's spelling of the name.`,
    output_config: { format: zodOutputFormat(LeadSchema), effort: 'low' },
    messages: [
      {
        role: 'user',
        content: [
          p.conference ? `Where: ${p.conference.name}${p.conference.city ? `, ${p.conference.city}` : ''}${p.conference.dates ? ` (${p.conference.dates})` : ''}.` : '',
          p.repName ? `Rep: ${p.repName}.` : '',
          p.candidates.length ? `Known candidates who might be this person:\n${p.candidates.map((c) => `- ${c.name}, ${c.title ? `${c.title}, ` : ''}${c.company}`).join('\n')}` : 'No known candidates.',
          p.painOptions.length ? `Pain point options: ${p.painOptions.join(' | ')}` : '',
          p.nextStepOptions.length ? `Next step options: ${p.nextStepOptions.join(' | ')}` : '',
          `\nThe note:\n"""${p.transcript}"""`,
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ],
  });
  return parsedOrThrow(res.parsed_output, 'lead');
}

// ---------------------------------------------------------------------------
// 2. Business card photo → lead
// ---------------------------------------------------------------------------
export async function extractCard(ctx: AiCtx, raw: unknown): Promise<Lead> {
  const p = ExtractCardPayload.parse(raw);
  const m = p.image.match(/^data:(image\/[a-z]+);base64,(.+)$/i);
  const mediaType = (m?.[1] as typeof p.mediaType) ?? p.mediaType ?? 'image/jpeg';
  const data = m?.[2] ?? p.image;
  const res = await ctx.client.messages.parse({
    model: ctx.model,
    max_tokens: 4000,
    system: `${SYSTEM_BASE}\n\nYou read business cards. Return exactly what is printed: name, company, title, email, phone, LinkedIn if shown. Interest is "warm" and intent is "curious" unless the photo shows a handwritten note saying otherwise. Summary: "Business card scanned at <event>" plus anything handwritten.`,
    output_config: { format: zodOutputFormat(LeadSchema), effort: 'low' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
          { type: 'text', text: `${p.conference ? `Event: ${p.conference.name}. ` : ''}Read this card.` },
        ],
      },
    ],
  });
  return parsedOrThrow(res.parsed_output, 'card');
}

// ---------------------------------------------------------------------------
// 3. Relationship arc → summary, nudge, opener
// ---------------------------------------------------------------------------
export async function arcSummary(ctx: AiCtx, raw: unknown): Promise<ArcAi> {
  const p = ArcSummaryPayload.parse(raw);
  const res = await ctx.client.messages.parse({
    model: ctx.model,
    max_tokens: 4000,
    system: `${SYSTEM_BASE}\n\nYou brief a salesperson about one person they keep meeting at conferences. The classification and signals were computed by rules; do not contradict them, explain them. Be specific: name the company, the pain, the next step. Never flatter, never pad. The nudge must be something the rep can do in the next five minutes or the next email.`,
    output_config: { format: zodOutputFormat(ArcAiSchema), effort: 'medium' },
    messages: [
      {
        role: 'user',
        content: `Person: ${p.contact.name}, ${p.contact.title ? `${p.contact.title}, ` : ''}${p.contact.company}.\nToday: ${p.today ?? 'unknown'}.\nClassification: ${p.classification}.\nSignals:\n${p.signals.map((s) => `- ${s}`).join('\n')}\nGoal of the nudge: ${p.nudgeGoal}\n\nMeetings, oldest first:\n${fmtEncounters(p.encounters)}`,
      },
    ],
  });
  return parsedOrThrow(res.parsed_output, 'summary');
}

// ---------------------------------------------------------------------------
// 4. Follow-up email
// ---------------------------------------------------------------------------
export async function followUp(ctx: AiCtx, raw: unknown): Promise<FollowUp> {
  const p = FollowUpPayload.parse(raw);
  const toneLine = { warm: 'Warm and personal, but still short.', direct: 'Direct: name the pain, name the next step, ask for a time.', short: 'Three sentences maximum.' }[p.tone];
  const res = await ctx.client.messages.parse({
    model: ctx.model,
    max_tokens: 4000,
    system: `${SYSTEM_BASE}\n\nYou write follow-up emails for a salesperson after a conference meeting. Use only facts from the notes. Reference the specific conversation (what they said, where). One ask. No "I hope this finds you well", no "circling back", no exclamation marks. ${toneLine} Sign off with the rep's first name only.`,
    output_config: { format: zodOutputFormat(FollowUpSchema), effort: 'medium' },
    messages: [
      {
        role: 'user',
        content: `From: ${p.repName}${p.repRole ? `, ${p.repRole}` : ''} at Grain.\nTo: ${p.contact.name}, ${p.contact.title ? `${p.contact.title}, ` : ''}${p.contact.company}.\nToday: ${p.today ?? 'unknown'}.\nRelationship: ${p.classification}. Signals: ${p.signals.join('; ') || 'none'}.\n\nMeetings, most recent last:\n${fmtEncounters(p.encounters)}\n\nWrite the email that follows the most recent meeting.`,
      },
    ],
  });
  return parsedOrThrow(res.parsed_output, 'email');
}

// ---------------------------------------------------------------------------
// 4b. Pre-conference brief
// ---------------------------------------------------------------------------
export async function preBrief(ctx: AiCtx, raw: unknown): Promise<PreBrief> {
  const p = PreBriefPayload.parse(raw);
  const res = await ctx.client.messages.parse({
    model: ctx.model,
    max_tokens: 6000,
    system: `${SYSTEM_BASE}\n\nYou write a one-page pre-conference brief for the sales team. Practical, specific to this event, no filler. whoToMeet may only include people from the known list. Talking points must connect what this event's audience cares about to what Grain does. The checklist is concrete (things like "pre-book meetings with X", "bring the travel payout one-pager"), never generic ("network!").`,
    output_config: { format: zodOutputFormat(PreBriefSchema), effort: 'medium' },
    messages: [
      {
        role: 'user',
        content: `Event: ${p.conference.name}, ${p.conference.city}, ${p.conference.dates}. ${p.conference.description} Verticals: ${p.conference.verticals.join(', ')}.${p.conference.audienceSize ? ` About ${p.conference.audienceSize} attendees.` : ''}\nToday: ${p.today ?? 'unknown'}. Reps going: ${p.reps.join(', ') || 'not assigned yet'}.\n\nPeople we already know who attend this series:\n${
          p.known.map((k) => `- ${k.name}, ${k.title ? `${k.title}, ` : ''}${k.company}. Status: ${k.classification}. Last met ${k.lastMet}.${k.nextStep ? ` Open next step: ${k.nextStep}.` : ''}${k.notes ? ` Notes: "${k.notes}"` : ''}`).join('\n') || '- none yet'
        }\n\nPains we heard most at recent events: ${p.recentPains.join(', ') || 'none logged'}.`,
      },
    ],
  });
  return parsedOrThrow(res.parsed_output, 'brief');
}

// ---------------------------------------------------------------------------
// 5. Conference discovery with web search (two steps: research, then structure)
// ---------------------------------------------------------------------------
export async function discover(ctx: AiCtx, raw: unknown): Promise<DiscoverResult> {
  const p = DiscoverPayload.parse(raw);
  const research = await runWithWebSearch(ctx, {
    system: `${SYSTEM_BASE}\n\nYou research industry conferences for Grain's sales team. Use web search to find real, upcoming events that match the request and are NOT already in the known list. Prefer official event sites. Be fast: at most five searches, then write. For each event report: full name, dates (or "TBA"), city, country, organizer URL, estimated attendee count, who attends, and a frank line on how well it fits Grain's ICP (PSPs, cross-border payments, travel wholesalers, treasurers). Report 4 to 6 events. Say clearly when dates are unconfirmed.`,
    user: `Today is ${p.today ?? 'unknown'}. Home base: ${p.homeBase ?? 'Tel Aviv'}.\nRequest: ${p.query}\n\nAlready known (exclude these and other editions of the same series):\n${p.known.map((k) => `- ${k}`).join('\n') || '- none'}`,
    maxUses: 4,
  });

  const res = await ctx.client.messages.parse({
    model: ctx.model,
    max_tokens: 8000,
    system: `${SYSTEM_BASE}\n\nYou convert research notes about conferences into structured records. Keep only events that are not in the known list. Estimate ICP inputs on a 0-10 scale using Grain's ICP: verticalFit = share of the agenda that is payments, treasury, FX or cross-border; buyerDensity = share of attendees who are PSPs, cross-border payment companies, travel wholesalers or treasurers; seniority = whether CFOs, treasurers and heads of payments attend in person. Use real city coordinates. datesConfirmed is true only when the notes cite an official source for the dates.`,
    output_config: { format: zodOutputFormat(DiscoverSchema), effort: 'low' },
    messages: [{ role: 'user', content: `Known list:\n${p.known.map((k) => `- ${k}`).join('\n') || '- none'}\n\nResearch notes:\n${research}` }],
  });
  return parsedOrThrow(res.parsed_output, 'discovery result');
}

/**
 * Web search turn with pause_turn handling. Streamed, so the SDK's request
 * timeout does not fire while the server is still searching. Returns the
 * final text.
 */
async function runWithWebSearch(ctx: AiCtx, opts: { system: string; user: string; maxUses: number }): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: opts.user }];
  let text = '';
  for (let i = 0; i < 3; i++) {
    const res = await ctx.client.messages
      .stream({
        model: ctx.model,
        max_tokens: 12000,
        system: opts.system,
        output_config: { effort: 'low' },
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: opts.maxUses }],
        messages,
      })
      .finalMessage();
    text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    if (res.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: res.content });
      continue;
    }
    if (res.stop_reason === 'refusal') throw new Error('The model declined this research request.');
    break;
  }
  if (!text.trim()) throw new Error('Web search returned nothing usable.');
  return text;
}
