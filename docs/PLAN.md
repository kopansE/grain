# Grain Orbit — Build Plan

> **Status (2026-09-24):** every phase in §12 is built and committed, plus extras 1, 3 (calendar export), 4, 6, 7, 8 from §10. Remaining for the candidate: deploy on Vercel (README, "Host it yourself"), paste a valid HubSpot token, record the video (docs/VIDEO.md). The README's "How I built this with AI" section is a draft in the candidate's voice to edit.

Conference intelligence for Grain's sales team. This document is the single source of truth for what we are building, why, and in what order. Any implementer (human or model) should read this end to end before writing code, then follow the phases in order and commit at each phase boundary.

Assignment source: `Sales AI Builder — Home Assignment.docx` in the repo root. Deadline: 3 days from 2026-09-24. Deliverables: live URL, source repo, 5–10 min video.

---

## 0. Decisions already made (do not re-litigate)

| Topic | Decision |
|---|---|
| Product name | **Grain Orbit** (the globe, the conference circuit). Tagline: "Know where to be, who to meet, and what to say." |
| Stack | Vite + React 19 + TypeScript, Tailwind CSS v4, Framer Motion, react-globe.gl, Recharts, Zustand (persist → localStorage), react-router, lucide-react, vitest |
| Hosting | Vercel. Two serverless functions (`api/ai.ts`, `api/hubspot.ts`) act as thin proxies. Git push = deploy. |
| Persistence | Seeded JSON loaded into Zustand, persisted to localStorage. Export/Import JSON in Settings. No backend DB. |
| API keys | Entered by the user in Settings, stored in localStorage, sent per-request to the proxy. `.env` values are optional server-side fallbacks only. Nothing hardcoded. |
| Home base | Tel Aviv (TLV). Drives travel-cost estimates, arcs on the globe, and cluster logic. Secondary bases can be added per rep. |
| Landing visual | 3D globe (react-globe.gl). Planning view uses timeline + heatmap, no second map. |
| Theme | Dark by default ("mission control"), with a subtle film-grain texture as a nod to the company name. Light mode is a stretch goal, not required. |
| AI model | Default `claude-sonnet-5` (user can switch to `claude-haiku-4-5-20251001` for speed in Settings). Verify IDs and the web-search tool with the `claude-api` skill before writing `api/ai.ts`. |
| Demo mode | The live URL must be fully usable with **no keys entered**. Every AI feature has a pre-generated response for the seed data, shown with a "Demo response — add your key in Settings for live AI" badge. |

---

## 1. Product story (this is what the video demonstrates)

1. **Command Center.** A slowly rotating globe. Conferences glow by tier. Arcs sweep from Tel Aviv to the events we're attending. Pulsing halos mark clusters. A KPI strip counts up. "Up next: Money20/20 USA in 31 days. Noa and Daniel are going. 6 people you know will be there."
2. **Explore.** Filter 40 real events by vertical, region, month, tier, size. Drag the scoring sliders: the list re-sorts live with spring animation. Hover a score ring to see why it scored what it scored. This is the "defend the methodology" moment.
3. **Plan.** A 12-month ribbon of events by region. Coverage heatmap shows "Q3 APAC: nothing." Cluster cards say "Amsterdam run: 2 events, 6 days apart, one trip saves 2 travel days and ~$1,900." A Tier-1 collision warning says "two anchor events same week — split the team."
4. **Show Floor mode (phone).** Tap the mic: "Met Sarah Chen from Adyen, head of treasury, they hedge EUR manually, wants a demo in Q1." Fields fill themselves. A card slides in: "You've met Sarah twice. Analyst at Worldpay (Money20/20 Vegas 2025) → Head of Treasury at Adyen now. Seniority up, mentioned budget. **Warming.** Nudge: send the travel-wholesaler hedging case study and propose a Q1 demo date before you leave the booth." Tap hot/warm/cold, tap a next step, Save. One tap: Push to HubSpot.
5. **Relationships.** The contact list filtered to "warming" and "tire-kicker". Open Priya: three events over 14 months, always "curious", never a next step. Verdict: tire-kicker. Nudge: "Ask the budget question directly or park her." Draft a follow-up email with AI.
6. **Discover.** "Find treasury events in APAC I don't have." Claude searches the web, returns scored candidates, one click adds them.
7. **Settings.** Show the keys are user-entered. Show export/import. Show the HubSpot test-connection button.

---

## 2. Architecture

```
grain/
├─ api/                      # Vercel serverless functions (Node runtime)
│  ├─ _lib/
│  │  ├─ anthropic.ts        # buildAnthropicRequest(), forwards to api.anthropic.com
│  │  └─ hubspot.ts          # forwards to api.hubapi.com with the caller's token
│  ├─ ai.ts                  # POST /api/ai       { key?, model?, messages, tools?, system? }
│  └─ hubspot.ts             # POST /api/hubspot  { token?, method, path, body }
├─ public/
│  ├─ manifest.webmanifest   # installable on phone home screen
│  └─ icons/
├─ src/
│  ├─ main.tsx, App.tsx, routes.tsx
│  ├─ styles/                # tailwind entry, tokens, grain texture, globals
│  ├─ data/
│  │  ├─ seed/conferences.ts # ~40 real events, see §7
│  │  ├─ seed/contacts.ts    # ~40 people, ~75 encounters, edge cases by design
│  │  ├─ seed/reps.ts
│  │  ├─ seed/demoAi.ts      # canned AI outputs keyed by feature+entity id
│  │  └─ grainContext.ts     # who Grain is, ICP, value props (used in prompts)
│  ├─ domain/                # pure TS, no React, fully unit-tested
│  │  ├─ types.ts
│  │  ├─ scoring.ts          # score(), tier(), clusterBonus(), presets
│  │  ├─ clustering.ts       # geo/temporal clusters, gaps, collisions
│  │  ├─ matching/
│  │  │  ├─ normalize.ts     # names, companies, emails, nicknames, transliteration
│  │  │  ├─ similarity.ts    # jaroWinkler, tokenSetRatio
│  │  │  ├─ match.ts         # findCandidates(lead, contacts) → ranked matches w/ confidence + reasons
│  │  │  └─ arc.ts           # classifyArc(contact) → new|warming|stalled|tire-kicker|job-change + signals
│  │  └─ hubspot/mapping.ts  # lead → HubSpot contact + note payloads
│  ├─ store/                 # zustand slices: conferences, leads, contacts, reps, settings, ui
│  ├─ lib/
│  │  ├─ ai.ts               # callClaude(feature, input) → routes to /api/ai or demo response
│  │  ├─ prompts/            # one file per AI feature, with JSON schema tool definitions
│  │  ├─ hubspot.ts          # client for /api/hubspot + CSV export fallback
│  │  ├─ speech.ts           # Web Speech API wrapper
│  │  └─ geo.ts              # haversine, TLV distance, travel cost estimate
│  ├─ components/
│  │  ├─ ui/                 # Button, Card, Chip, Drawer, Sheet, Slider, ScoreRing, Kpi, Toast…
│  │  ├─ globe/              # GlobeHero, pin/arc/ring data builders
│  │  ├─ charts/             # CoverageHeatmap, TimelineRibbon, ScoreRadar
│  │  └─ layout/             # AppShell, Sidebar, TopBar, CommandPalette
│  └─ views/
│     ├─ CommandCenter/
│     ├─ Explore/            # list + filters + ScoringPanel + ConferenceDrawer
│     ├─ Plan/
│     ├─ Capture/            # show-floor mode
│     ├─ Relationships/      # contacts list + ContactArc
│     ├─ Discover/
│     └─ Settings/
├─ docs/PLAN.md              # this file
├─ README.md                 # written for non-developers, see §11
├─ .env.example
├─ vercel.json
└─ vite.config.ts            # includes a dev plugin that mounts api/*.ts locally
```

**Proxy rationale.** HubSpot's API does not allow browser calls (CORS). Anthropic does, but routing both through one tiny function keeps the pattern uniform, lets the host optionally supply fallback keys via env, and keeps user keys out of URLs. The functions are stateless and under 60 lines each.

**Local dev without the Vercel CLI.** A Vite plugin in `vite.config.ts` imports the same handler modules from `api/_lib` and mounts them on `/api/ai` and `/api/hubspot` in the dev server. Same code, zero extra tooling.

---

## 3. Data model (`src/domain/types.ts`)

```ts
type Region = 'EMEA' | 'NA' | 'APAC' | 'LATAM' | 'MEA' | 'IL';
type Vertical = 'payments' | 'fintech' | 'treasury' | 'travel' | 'banking'
              | 'ecommerce' | 'crypto' | 'saas' | 'insurtech';
type ConferenceStatus = 'considering' | 'planned' | 'attended' | 'skipped';

interface Conference {
  id: string;                 // 'm2020-usa-2026'
  series: string;             // 'Money20/20'
  name: string;               // 'Money20/20 USA 2026'
  startDate: string;          // ISO date
  endDate: string;
  city: string; country: string; region: Region;
  lat: number; lng: number;
  verticals: Vertical[];
  audienceSize: number;       // estimated attendees
  url?: string;
  description: string;        // one line, plain English
  icpInputs: {                // hand-estimated 0–10, editable in the drawer
    verticalFit: number;      // how much of the agenda is payments/treasury/FX
    buyerDensity: number;     // share of attendees who are PSPs, cross-border, travel wholesalers, treasurers
    seniority: number;        // are decision-makers (CFO, Treasurer, Head of Payments) actually there
  };
  costs: { ticketUsd: number; boothUsd?: number; };   // travel is computed from TLV
  status: ConferenceStatus;
  assignedRepIds: string[];
  history?: { year: number; leads: number; pipelineUsd: number; notes?: string }[];
  source: 'seed' | 'ai' | 'manual';
  datesConfirmed: boolean;    // false for AI-discovered or estimated dates
}

type Interest = 'hot' | 'warm' | 'cold';
type Intent = 'curious' | 'evaluating' | 'budget' | 'champion';

interface Encounter {         // one meeting at one conference ("lead" in the UI)
  id: string;
  contactId: string;          // resolved after matching
  conferenceId: string;
  repId: string;
  capturedAt: string;         // ISO datetime
  name: string; company: string; title?: string;
  email?: string; phone?: string; linkedin?: string;
  interest: Interest; intent: Intent;
  painPoints: string[];       // 'manual hedging', 'multi-currency pricing', 'FX margin leakage'…
  notes: string;              // free text or transcript
  nextStep?: string;          // 'Send deck', 'Book demo', 'Intro to CFO', 'Send case study'
  nextStepDone?: boolean;
  source: 'voice' | 'card' | 'typed' | 'seed';
  hubspot?: { contactId?: string; noteId?: string; pushedAt?: string; status: 'unsynced' | 'synced' | 'failed'; error?: string };
}

interface Contact {           // one human, across encounters
  id: string;
  canonicalName: string;
  aliases: string[];          // every spelling we've seen
  emails: string[]; phones: string[]; linkedin?: string;
  currentCompany: string; currentTitle?: string;
  encounterIds: string[];
  mergedFrom?: string[];      // ids merged into this one (undo support)
  arc?: ArcAssessment;        // cached, recomputed when encounters change
}

interface ArcAssessment {
  classification: 'new' | 'warming' | 'stalled' | 'tire-kicker' | 'job-change';
  confidence: number;
  signals: string[];          // human-readable, e.g. 'Seniority up: Analyst → Head of Treasury'
  touches: number; spanMonths: number;
  seniorityDelta: number; intentTrend: 'up' | 'flat' | 'down';
  nextStepsAgreed: number; nextStepsDone: number;
  ai?: { summary: string; nudge: string; opener: string; generatedAt: string; demo: boolean };
}

interface Rep { id: string; name: string; initials: string; color: string; homeBase: 'TLV' | 'NYC' | 'LON'; }

interface Settings {
  anthropicKey?: string; hubspotToken?: string; model: string;
  weights: ScoringWeights; preset: string;
  homeBase: { lat: number; lng: number; label: string };   // TLV
  annualBudgetUsd?: number;
  currentRepId: string;
}
```

---

## 4. Scoring methodology (`src/domain/scoring.ts`)

Score is 0–100, transparent, and every component is visible in the UI. Weights are user-adjustable and normalized to sum to 1.

| Component | Default weight | Input → 0..1 |
|---|---|---|
| Vertical fit | 0.30 | `icpInputs.verticalFit / 10`, boosted by vertical tags: payments 1.0, treasury 1.0, fintech 0.8, travel 0.8, banking 0.6, ecommerce 0.5, insurtech 0.4, crypto 0.3, saas 0.2. Final = 0.6·input + 0.4·max(tagWeights). |
| Buyer density | 0.25 | `icpInputs.buyerDensity / 10` |
| Seniority | 0.15 | `icpInputs.seniority / 10` |
| Reach | 0.10 | `clamp(log10(audience) / log10(30000), 0, 1)`. Log scale on purpose: a 2,000-person treasury summit should not lose to a 70,000-person general tech show. |
| Cost efficiency | 0.10 | `1 − clamp(totalCost / 12000, 0, 1)` where totalCost = ticket + estimated travel from TLV (flight bucket by distance + hotel per night × nights) + booth if planned |
| Track record | 0.10 | If attended before: `clamp(leadsPerDay / 8, 0, 1)`. Else 0.5 (neutral, "unknown"). This is the feedback loop: logging leads at an event changes next year's score. |

**Tiers.** ≥ 75 → **Anchor** (Tier 1: booth or full team). 58–74 → **Cover** (Tier 2: 1–2 reps walk the floor). 40–57 → **Opportunistic** (Tier 3: only if it clusters with an Anchor trip). < 40 → **Skip**.

**Cluster bonus.** An Opportunistic event within 7 days and 1,500 km of an Anchor or Cover event that is `planned` gets +8 and a "piggyback" badge. Rationale: marginal cost of a second event on the same trip is a day, not a flight.

**Presets** (sliders snap to these; the user can then fine-tune): `Pipeline first` (default above), `Budget-conscious` (cost 0.25, reach 0.05), `Brand & reach` (reach 0.25, buyer density 0.15), `Treasury focus` (vertical 0.40 with treasury tag weight 1.2).

**Why this and not ML.** Forty events and a handful of past outcomes is not a training set. A transparent weighted model the sales lead can argue with in a meeting is more useful than a black box, and the track-record term lets it learn from real results as the team logs leads. Say this in the video.

---

## 5. Cross-conference contact matching (`src/domain/matching/`)

### 5.1 Normalization (`normalize.ts`)
- Names: lowercase, strip diacritics (Müller → muller), strip punctuation and honorifics (Dr., Mr.), collapse whitespace, handle `Last, First`, drop middle initials, expand nicknames via a ~80-entry map (bob→robert, liz/beth/betsy→elizabeth, mike→michael, jon/johnny→jonathan, yoni/jonathan→yonatan...). Include a small Hebrew-transliteration map (levi/levy, cohen/kohen, yonatan/jonathan, moshe/moses, yossi/yosef/joseph, avi/avraham/abraham, tal, noa/noah handled with care).
- Companies: lowercase, strip legal suffixes (inc, ltd, llc, gmbh, ag, sa, plc, co, corp, holdings, group, limited), strip "the", punctuation; alias map for known entities (fis/worldpay, checkout/checkout.com, paypal/braintree, jpm/jpmorgan/j.p. morgan). Extract email domain as a company hint.
- Emails: lowercase, trim, strip gmail dots and plus-tags.
- Phones: digits only, last 9 digits compared.
- LinkedIn: extract slug from any URL form.

### 5.2 Similarity (`similarity.ts`)
- `jaroWinkler(a, b)` for names and single tokens.
- `tokenSetRatio(a, b)` for multi-token names and companies (handles "Maria Garcia Lopez" vs "Maria Garcia", "Sarah J. Chen" vs "Chen Sarah").
- Name score = max(JW on full normalized string, tokenSetRatio, JW on first + JW on last with nickname expansion).

### 5.3 Matching cascade (`match.ts`)
`findCandidates(input, contacts) → Candidate[]` where `Candidate = { contact, confidence, reasons[], flags[] }`, sorted by confidence.

| Rule | Confidence | Flag |
|---|---|---|
| Email exact | 1.00 | |
| LinkedIn slug exact | 1.00 | |
| Phone exact | 0.95 | |
| Name ≥ 0.92 and company ≥ 0.80 | 0.90 | |
| Name ≥ 0.92 and email domain matches a known company domain | 0.88 | |
| Name ≥ 0.92 and company clearly different | 0.62 | `possible-job-change` |
| Name 0.85–0.92 and company ≥ 0.80 | 0.72 | `name-variant` |
| Same first name (nickname-expanded) + last name JW ≥ 0.85 + same company | 0.70 | `name-variant` |
| Name ≥ 0.92 only, no company on either side | 0.55 | `needs-confirmation` |

Thresholds: **≥ 0.85 auto-link** (the capture form shows "Linked to existing contact" with an Undo). **0.50–0.85 ask**: the form shows a side-by-side card "Same person?" with Yes / No, one tap. **< 0.50 ignore.** Common names get a penalty: if the normalized full name appears ≥ 3 times across distinct companies in the DB, subtract 0.15 (guards the two "James Smith"s).

### 5.4 Merge & undo
Linking an encounter to a contact appends the alias, email, phone, and updates `currentCompany/currentTitle` when the encounter is the most recent. Merging two contacts keeps `mergedFrom` so it can be undone from the contact page. Never delete history.

### 5.5 Arc classification (`arc.ts`)
Inputs per contact: encounters sorted by date. Derived signals:
- `touches`, `spanMonths`
- `seniorityDelta`: title → level via keyword map (intern/analyst 1, associate/specialist 1.5, manager 2, senior manager 2.5, head/director 3, vp/svp 4, c-level/founder/partner/treasurer 5). Delta = last − first.
- `intentTrend`: intent levels curious 1, evaluating 2, budget 3, champion 4; trend of last vs first.
- `nextStepsAgreed`, `nextStepsDone`
- `lastInterest`, `daysSinceLast`
- `companyChanged`

Rules, evaluated in order:
1. `touches == 1` → **new**
2. `companyChanged && seniorityDelta > 0` → **job-change** (signal: "Champion moved up at a new company — a fresh account with an existing relationship")
3. `touches ≥ 3 && spanMonths ≥ 9 && maxIntent ≤ evaluating && nextStepsDone == 0` → **tire-kicker**
4. `touches ≥ 2 && (intentTrend == up || seniorityDelta > 0 || nextStepsDone > 0 || lastInterest == hot)` → **warming**
5. `touches ≥ 2` otherwise → **stalled**

Each rule emits human-readable `signals[]`. The UI never shows a bare count; it shows the signals.

### 5.6 Nudges: where they appear and how loud
- **In the capture form**, the moment a match fires (this is the highest-value moment: the rep is standing in front of the person).
- **On a conference page**: "People you know likely here" (contacts whose past encounters include this series, or whose company is listed as an exhibitor in seed data).
- **On the Command Center**: a "Relationship radar" panel with at most 5 items, ranked by (warming first, then job-change, then tire-kickers with a scheduled next step). Nothing else surfaces globally. Volume is the design decision: nudges live where the rep already is, not in a notification feed.

---

## 6. AI features (`src/lib/ai.ts`, `src/lib/prompts/`)

One entry point: `callClaude(feature, payload)`. It reads `settings.anthropicKey`; if absent and the server has no fallback, it returns `demoAi[feature][entityId]` with `demo: true`, or a generic demo string. Every feature uses **tool-use with a JSON schema** so outputs are structured and never need string parsing. Prompts live in one file each, with the schema next to the prompt.

| # | Feature | Where | Why AI is the right tool | Model |
|---|---|---|---|---|
| 1 | **Voice / text → structured lead** | Capture | Reps talk in fragments on a loud floor. Turning "met sarah adyen head of treasury hedges eur manually wants q1 demo" into name/company/title/pain points/intent/next step is language understanding, not regex. Prompt includes the current conference, the rep's name, and the top 5 fuzzy-match candidates so the model can normalize spelling ("Sara" → existing "Sarah Chen"). | sonnet-5 (haiku option) |
| 2 | **Business-card photo → lead** | Capture | Vision + layout understanding. Same output schema as #1. Uses image input. | sonnet-5 |
| 3 | **Relationship-arc summary + nudge** | Relationships, Capture match card | The rules decide the classification (deterministic, explainable). The model turns 3–5 encounters into two sentences a rep can read in 5 seconds, plus one concrete nudge and one opener line. Judgment about tone is where a model beats a template. | sonnet-5 |
| 4 | **Follow-up email draft** | Contact page, Capture "after save" sheet | Combines notes, arc, conference context, and Grain's value props into a short email in the rep's voice. Three tones: warm / direct / short. Output is editable, with `mailto:` and copy. | sonnet-5 |
| 5 | **Conference discovery with web search** | Discover | Genuinely needs the model: unstructured web → structured, scored records. Uses Anthropic's server-side web search tool. Prompt excludes events already in the DB, asks for region/timeframe/vertical, returns the `Conference` schema with `icpInputs` estimates and a one-line "why it fits" rationale. Results are flagged `datesConfirmed: false`. | sonnet-5 |
| 6 | **Pre-conference brief** (stretch) | Conference drawer | For a planned event: who we know there, suggested targets by ICP, 3 talking points tied to the event's agenda, and a packing-list-style checklist. | sonnet-5 |

`grainContext.ts` holds the company description used in prompts: what Grain does (currency risk management / FX hedging solutions for PSPs, travel wholesalers, cross-border payment companies, and businesses with FX exposure), ICP verticals, typical pain points, and the tone of voice. **The user should review this file before the video** since it shapes every AI output.

Demo-mode canned responses (`demoAi.ts`) exist for: arc summaries of every seed contact with ≥ 2 encounters, one follow-up email per arc class, one voice-extraction example (the Sarah Chen transcript), and one discovery result set (APAC treasury). The capture flow in demo mode still runs the deterministic matcher live, so the "same person?" moment always works.

---

## 7. Seed data (`src/data/seed/`)

### 7.1 Conferences (~40)
Cover Oct 2026 → Dec 2027 plus a few 2025/2026 past editions (with `history`) so the track-record term and cross-conference history have something to chew on. **Dates must be verified with web search during implementation**; anything unverifiable is estimated from the prior year's pattern and marked `datesConfirmed: false`. Each entry gets `icpInputs` estimated by the implementer with a one-line rationale in `description`.

Candidate list by vertical (final list may differ after verification):

- **Payments / fintech:** Money20/20 USA (Las Vegas), Money20/20 Europe (Amsterdam), Money20/20 Asia (Bangkok), Money20/20 Middle East (Riyadh), Fintech Meetup (Las Vegas), Sibos, Finovate Fall (NYC), FinovateEurope (London), Pay360 (London), MPE Merchant Payments Ecosystem (Berlin), Seamless Middle East (Dubai), Singapore Fintech Festival, Hong Kong FinTech Week, Paris Fintech Forum, Fintech Nexus (NYC), Nacha Smarter Faster Payments, EBAday, MoneyLIVE Summit (London), Fintech Week London, Payments Canada Summit (Toronto), Fintech Islands (Barbados), Africa Fintech Summit, Fintech Americas (Miami).
- **Treasury (highest ICP):** EuroFinance International Treasury Management, AFP Annual Conference, ACT Annual Conference (UK), EuroFinance Asia / Americas / Middle East, The Treasury Summit.
- **Travel (wholesalers, airlines, OTAs):** Phocuswright Conference, ITB Berlin, WTM London, Arabian Travel Market (Dubai), Skift Global Forum (NYC), Phocuswright Europe, IATA World Financial Symposium (airline finance — very relevant), GBTA Convention, Arival.
- **Ecommerce / marketplaces:** Shoptalk (Las Vegas), Shoptalk Europe (Barcelona), NRF (NYC).
- **Israel (home turf):** Fintech Junction (Tel Aviv), Israel Fintech Week.
- **SaaS / general tech (deliberately low fit, shows the scorer rejecting):** SaaStr Annual, Web Summit (Lisbon), Slush (Helsinki), TechCrunch Disrupt (SF), Dreamforce (SF), Collision.
- **Crypto (low fit):** Consensus.

Give ~8 events `status: 'planned'` with reps assigned, ~3 `attended` with history, the rest `considering`. Make sure the data produces: at least two clear geographic/temporal clusters (Amsterdam June, London Feb/March, Las Vegas Oct/March, Dubai May), one Tier-1 collision (same week, different continents), and one obvious gap (APAC Q3).

### 7.2 Reps (4)
Noa Barak (TLV, head of sales), Daniel Cohen (TLV), Maya Levin (NYC), Tom Reilly (LON). Colors for globe arcs and timeline bars.

### 7.3 Contacts & encounters (~40 contacts, ~75 encounters)
Designed to exercise every matching and arc path. Required cases:

| Case | Data | Expected |
|---|---|---|
| Name variant + job change, warming | "Sarah Chen", Analyst @ Worldpay (M20/20 USA 2025) → "S. Chen", Senior Analyst @ Worldpay (Pay360 2026) → captured live as "Sara Chen", Head of Treasury @ Adyen | auto-link on email; arc = job-change/warming with seniority signal |
| Nickname + diacritics | "Robert Müller" / "Bob Mueller", same company | name-variant, confidence ~0.72, ask, Yes → linked |
| Tire-kicker | "Priya Raman", Fintech Nexus 2025, Money20/20 Europe 2026, Sibos 2026; intent always curious; no next steps | tire-kicker with "3 touches over 14 months, never past curious" |
| Transliteration | "Jonathan Levi" / "Yonatan Levy" same company | name-variant via transliteration map, ask |
| Two different people, same name | "James Smith" @ Stripe and "James Smith" @ Barclays | never auto-linked; common-name penalty keeps confidence < 0.5 unless email/company matches |
| Compound surname | "Maria Garcia Lopez" vs "Maria Garcia", same email domain | linked via tokenSetRatio + domain |
| Job change, seniority up | "Omar Haddad" VP Payments @ PayTabs → CFO @ a travel wholesaler | job-change class, "fresh account" nudge |
| Stalled | 2 touches, flat, no next step done, 5 months apart | stalled |
| Warming via next-step completion | 2 touches, next step done, last interest hot | warming |
| New | single encounter | new |

Each encounter has realistic notes mentioning FX pain (manual hedging, multi-currency pricing, margin leakage on cross-border payouts, guaranteed local-currency pricing for travel bookings).

---

## 8. Views (routes, components, wow effects, acceptance)

Global shell: left sidebar (icons + labels, collapses on mobile to a bottom tab bar), top bar with search / ⌘K command palette, "current rep" avatar switcher, demo-mode pill when no key is set. Page transitions: fade + 12px rise, 250ms. Cards: glass surface, 1px border at 8% white, hover lift. Film-grain overlay at 4% opacity via an SVG `feTurbulence` filter. Typography: Inter for UI, a display face (e.g. "Instrument Serif" or "Space Grotesk") for numbers and headings. Accent palette: amber/gold primary (grain), teal secondary, tier colors: Anchor amber, Cover teal, Opportunistic slate-blue, Skip gray.

### 8.1 `/` Command Center
- **GlobeHero**: react-globe.gl, dark earth texture, atmosphere on, auto-rotate at 0.4°/s, pauses on hover. Points = conferences colored by tier, altitude by audience (log). Arcs from TLV to `planned` events, dashed and animated. Rings (pulsing) on cluster centroids. Click a point → flies to it and opens the conference drawer. Label on hover.
- **KPI strip** (animated count-up on mount): events in next 12 months, Anchor events, planned trips, leads captured this year, warming relationships, unsynced leads.
- **Up next** card: next planned event, countdown in days, assigned reps, "people you know there" avatars, "Open show floor mode" button (renders a QR code so the rep can open `/capture?conf=id` on their phone).
- **Relationship radar**: ≤ 5 nudges with class badge, one-line signal, primary action.
- **Coverage sparkline**: events per month for the next 12 months, colored by tier.
- Acceptance: loads in < 3s on a laptop, globe interactive, every KPI links to its view.

### 8.2 `/conferences` Explore
- Left: filter rail — text search, vertical chips, region chips, month range, tier, audience size slider, status, "only unassigned".
- Center: ranked list. Each row: name, series badge, dates, city + flag emoji, verticals, audience, `ScoreRing` (SVG ring that fills on mount), tier chip, assigned rep avatars, status. Rows use Framer Motion `layout` so re-ranking animates.
- Right: **ScoringPanel** — six sliders with live values, preset buttons, "reset". Changing a slider re-scores instantly. Below: a mini bar showing how many events sit in each tier.
- Hover on a score ring → popover with the six components as horizontal bars and the cluster bonus if any.
- `ConferenceDrawer` (also used from globe/plan): header, score radar (Recharts), logistics (dates, city, distance from TLV, estimated travel cost, nights), `icpInputs` editable with sliders (edits persist and re-score), status select, assign reps, past history table, "people you know here", leads captured here, AI pre-brief (stretch), "Add to plan" primary button.
- Acceptance: filter + sort + re-rank all client-side and instant; edits persist across reload.

### 8.3 `/plan` Planning
- **TimelineRibbon**: 12 months across, rows by region (toggle: by rep). Bars = events, colored by tier, width by duration, stagger-in animation. Clusters rendered as a soft halo behind grouped bars. Today marker. Click bar → drawer.
- **CoverageHeatmap**: months × regions, cell intensity = count weighted by tier. Empty cells with an Anchor-worthy vertical elsewhere are outlined as gaps.
- **Insights column** (computed by `clustering.ts`):
  - Cluster cards: "Amsterdam run: Money20/20 Europe + EBAday, 6 days apart, 1 trip. Saves ~2 travel days and ~$1,900." with "Plan as one trip" (sets both to planned, assigns same rep).
  - Gap cards: "No APAC coverage in Q3. Candidates: …" with the top Opportunistic/Cover events in that window.
  - Collision cards: "Two Anchor events the same week (Vegas & Amsterdam). Split the team: Noa → Vegas, Tom → Amsterdam?" with one-click apply.
  - Load cards: "Daniel is at 4 events in 3 weeks."
- **Budget rollup**: planned events total (tickets + booth + travel) vs `annualBudgetUsd` if set, with a progress bar.
- Acceptance: all insights derive from data, no hardcoded strings; changing a status updates insights immediately.

### 8.4 `/capture` Show Floor mode
Mobile-first. Full-screen, no sidebar, big targets (≥ 56px), high contrast. Also usable on desktop with a phone-width frame.
- Header: current conference (auto-picked: an event whose dates contain today, else nearest upcoming; user can switch), current rep.
- **Primary actions row**: 🎤 Voice (hold or tap to toggle; Web Speech API; live transcript shown; audio-level pulse animation on the button), 📷 Card (file input with `capture="environment"`, preview, "Extracting…" shimmer), ⌨️ Type.
- After extraction, the form fields **type themselves in** (staggered reveal). Fields: name, company, title, email, phone, LinkedIn (all optional), interest (3 big segmented buttons), intent (4 chips), pain points (chips + free), next step (chips: Send deck / Book demo / Intro to CFO / Send case study / Follow up in a month + free text), notes.
- **Match card**: as soon as name/company/email are filled, `findCandidates` runs. ≥ 0.85: green "Linked to Sarah Chen (met 2× before)" with Undo. 0.5–0.85: amber "Same person as Robert Müller, Worldpay? met at Pay360 2026" with Yes / No. Card expands to show the arc badge, signals, AI summary and nudge.
- **Save**: one tap, haptic-like bounce + check animation, toast "Saved. 3 captured today." Then an "After save" sheet: Push to HubSpot, Draft follow-up, Capture another (default focus).
- Recent captures list at the bottom (today, this conference), each with sync status.
- Offline: everything except AI works without network. AI calls fail gracefully with "You're offline — saved as typed. Extract later" and a retry queue.
- Acceptance: a full capture from mic to save takes under 20 seconds on a phone; no field is required except name.

### 8.5 `/contacts` Relationships
- List with arc class filter chips (all / warming / job-change / stalled / tire-kicker / new), search, sort by last seen. Each row: name, company → company if changed, title, touches, last conference, arc badge, HubSpot status.
- **ContactArc** page: header with class badge and confidence; vertical timeline that draws itself (SVG path length animation), one node per encounter with conference, date, title chip, intent chip, interest dot, notes; "title trajectory" mini-chart; signals list; AI summary + nudge + opener (with "Regenerate"); buttons: Draft follow-up (opens sheet with tone toggle, editable text, Copy, `mailto:`), Push to HubSpot, Merge with… (search), Unmerge (if `mergedFrom`), Mark next step done.
- Acceptance: classification updates instantly when an encounter is edited or a next step is marked done.

### 8.6 `/discover` AI Discovery
- Prompt chips: "Treasury events in APAC", "Travel-tech events in Europe H1", "Cross-border payments in LATAM", free text.
- Results as cards with estimated score/tier (using the user's current weights), "why it fits", source links from web search, `datesConfirmed: false` badge. "Add to database" → appears in Explore with `source: 'ai'`.
- Demo mode shows a canned APAC treasury result set.

### 8.7 `/settings`
- Keys: Anthropic key, HubSpot token (masked inputs, "Test connection" buttons that call a cheap endpoint and show a green check), model select. Note: "Stored only in this browser."
- Scoring weights (same panel as Explore), home base, annual budget, reps (add/edit/color), current rep.
- Data: Export JSON, Import JSON, Reset to seed, "Demo mode" indicator.

---

## 9. HubSpot (`api/hubspot.ts`, `src/lib/hubspot.ts`, `src/domain/hubspot/mapping.ts`)

- Auth: Private App token, sent as `Authorization: Bearer` by the proxy. Required scopes are documented in the README (contacts read/write; notes write via the CRM objects API — verify exact scope names in HubSpot docs during implementation).
- Push flow for one encounter:
  1. If contact has an email: `POST /crm/v3/objects/contacts/search` by email. Else search by firstname + lastname + company.
  2. Create or update the contact with `firstname, lastname, email, phone, company, jobtitle` plus, when they exist in the portal, optional custom properties `grain_last_conference`, `grain_relationship_stage` (created lazily via the properties API on first use if the token has the scope; otherwise skipped silently and noted in the result).
  3. Create a Note (`POST /crm/v3/objects/notes`) with the encounter summary (conference, date, interest, intent, pain points, next step, notes, rep) associated to the contact.
  4. Store `hubspot.contactId`, `noteId`, `pushedAt`, `status`.
- Bulk: "Push all unsynced from {conference}" with a progress list and per-row result.
- Dry-run: "Preview payload" shows the exact JSON before sending.
- Fallback path with no token: "Export for HubSpot import" produces a CSV with HubSpot's standard column headers, so the path exists even before IT hands over a token.

---

## 10. Beyond the brief (features they didn't ask for)

Build these after §8–9 are complete and polished, in this order. Each is small and reinforces "built by someone who has worked a booth."

1. **Pre-conference brief** (AI): one page per planned event: who we know there, target companies by ICP, three talking points, logistics. Printable.
2. **Post-conference debrief & ROI**: leads per event, cost per lead, pipeline entered; feeds the `history` array and therefore next year's score. Closes the loop: the scorer learns.
3. **Trip builder**: turn a cluster card into an itinerary (events, nights, estimated cost) and export an `.ics` calendar file.
4. **Follow-up SLA queue**: "4 leads from Money20/20 not followed up in 48h" on the Command Center; one-click draft.
5. **Team load view**: rep × month grid, warns on overload and on unassigned Anchor events.
6. **Israeli holiday awareness**: flags planned events that collide with Rosh Hashanah, Yom Kippur, Sukkot, Pesach, Shavuot (static table for 2026–2027). Small, specific, shows empathy for a TLV team.
7. **Command palette** (⌘K): jump to any conference or contact, "capture lead", "push unsynced".
8. **Installable PWA + offline**: manifest + service worker via `vite-plugin-pwa` so show-floor mode works with bad venue WiFi.
9. **Weekly digest** (AI): a paste-ready Slack summary of conference pipeline for the week.
10. **Light theme** toggle, if time remains.

---

## 11. README (written for non-developers)

Sections, in order: hero image or GIF of the globe; one-paragraph "what this is"; "Try it" with the live URL and a 60-second tour; "Host it yourself in 3 steps" (fork on GitHub → import on Vercel → paste two optional keys); "How conferences are scored" in plain English with the weight table and a worked example; "How it recognizes the same person twice" with the edge-case table from §7.3; "The AI features and why AI"; "Connecting HubSpot" (create a Private App, scopes, paste token, test); "Your data" (lives in your browser, export/import); "How I built this with AI" (tools, what helped, what got in the way); "What I'd build next"; a short "For developers" footer with `npm i && npm run dev`. Badges at the top. No code blocks outside the developer footer.

---

## 12. Build phases and commit points

Each phase ends with: `npm run typecheck && npm run test && npm run build` green, a browser check of the affected views, and a commit with a descriptive message. Do not start the next phase with a red build.

| Phase | Scope | Commit message |
|---|---|---|
| 0 | Scaffold: Vite + React + TS, Tailwind v4, router, Zustand, Framer Motion, lucide, vitest, ESLint, path aliases, theme tokens, grain texture, AppShell with sidebar/topbar, empty routes, `vercel.json`, dev API plugin, `.env.example` wiring | `chore: scaffold Grain Orbit app shell` |
| 1 | `domain/types.ts`, seed data (conferences with verified dates, reps, contacts, encounters), `geo.ts`, `scoring.ts` with tests, `clustering.ts` with tests | `feat: domain model, seed data, scoring and clustering engines` |
| 2 | `matching/` (normalize, similarity, match, arc) with tests covering every §7.3 case | `feat: cross-conference contact matching and relationship arcs` |
| 3 | Explore view: list, filters, ScoringPanel, ScoreRing, ConferenceDrawer | `feat: explore view with live re-ranking` |
| 4 | Command Center: GlobeHero, KPIs, Up next, Relationship radar | `feat: command center with globe` |
| 5 | Plan view: timeline, heatmap, insight cards, budget | `feat: planning view with clusters, gaps and collisions` |
| 6 | Capture (show-floor mode): form, speech, match card, save flow, recent list | `feat: show-floor lead capture with live matching` |
| 7 | Relationships: list + ContactArc, merge/unmerge | `feat: relationships view with arc timeline` |
| 8 | AI layer: `api/ai.ts`, `lib/ai.ts`, prompts, demo responses; wire features 1–4 | `feat: AI extraction, arc summaries and follow-up drafts` |
| 9 | HubSpot: proxy, mapping, push/bulk/preview/CSV, Settings keys + test buttons | `feat: HubSpot sync and settings` |
| 10 | Discover view with web search + demo set | `feat: AI conference discovery` |
| 11 | Polish pass: animations, empty states, mobile QA, PWA manifest, command palette, keyboard nav, perf (lazy-load globe) | `polish: motion, mobile, PWA` |
| 12 | Extras from §10 in order, one commit each | `feat: <extra>` |
| 13 | README, screenshots/GIF, Vercel deploy, final QA on the live URL on a phone | `docs: README and deployment` |

Verification per phase: run the dev server, open the view in a browser (use the built-in browser tools if available for screenshots), check the console is clean, test on a 390px-wide viewport for Capture and the shell.

---

## 13. Deployment

- `vercel.json`: framework `vite`, functions under `api/`, SPA rewrite to `index.html`.
- Import the GitHub repo in Vercel, set optional env vars `ANTHROPIC_API_KEY`, `HUBSPOT_ACCESS_TOKEN`, `ANTHROPIC_MODEL`. Deploy. Every push to `main` redeploys.
- Updating conference data as a non-developer: either edit in the app (persists in the browser, export JSON to share) or edit `src/data/seed/conferences.ts` on GitHub in the browser and commit; Vercel redeploys.

---

## 14. Video storyboard (5–10 min)

1. 0:00 Problem in one sentence, then the globe. (30s)
2. 0:30 Explore: filters, sliders, re-rank, score breakdown. Explain the six components and why log-scale reach and the track-record loop. (2 min)
3. 2:30 Plan: clusters, gaps, collision, one-click "plan as one trip". (1 min)
4. 3:30 Phone: voice capture, fields fill, match card, arc, nudge, save, push to HubSpot, show it in HubSpot. (2 min)
5. 5:30 Relationships: Priya the tire-kicker vs Sarah warming; job-change case; two James Smiths not merged; explain the cascade and thresholds and the "ask, don't auto-merge" choice. (1.5 min)
6. 7:00 Discover with web search. (45s)
7. 7:45 How AI tools were used to build it: planning in Claude Code, what it nailed, where it went wrong (be specific). (1 min)
8. 8:45 What's next. (30s)

---

## 15. Open items for the user

- Create an Anthropic API key and a free HubSpot developer/test portal with a Private App token; paste into `.env.local` and/or Settings before recording.
- Review `src/data/grainContext.ts` once written; it shapes every AI output.
- Confirm rep names (fictional placeholders are fine).
- Optionally email the company one or two scoping questions (home base, HubSpot object model) since they said the way you ask is itself a signal.
