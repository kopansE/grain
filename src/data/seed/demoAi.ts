import type { ArcClass } from '@/domain/types';
import type { ArcAi, DiscoverResult, FollowUp, Lead } from '@/lib/ai';

/**
 * Canned AI answers for demo mode (no Anthropic key). Written by hand so the
 * live URL demonstrates the feature even before a key is pasted. Everything
 * here is marked `demo: true` in the UI.
 */

export const DEMO_ARC: Record<string, ArcAi> = {
  'c-nadia-hussain': {
    summary: 'Nadia has gone from comparing bank forwards to introducing us to her own merchants in fifteen months; the pilot is with legal. This is a champion, not a prospect.',
    nudge: 'Send the pilot paperwork status to Nadia this week and ask which of the two merchants she introduced at EuroFinance should go first.',
    opener: 'Nadia, did the two merchants from the bar ever follow up with you? I owe you a status on the pilot.',
  },
  'c-sarah-chen': {
    summary: 'Sarah started as an analyst asking questions for her boss and is now a senior analyst running the EUR book by hand. She asked for the deck to circulate, which means she is selling internally.',
    nudge: 'Offer Sarah a 20-minute walkthrough she can forward to her treasurer, and ask who signs off on hedging tools at Worldpay.',
    opener: 'Sarah, did the deck survive the internal round? What did your treasurer push back on?',
  },
  'c-omar-haddad': {
    summary: 'Omar liked embedded hedging as a VP at PayTabs and now owns FX exposure as CFO of a bedbank paying hotels in forty currencies. Same person, much bigger problem, and he remembered us.',
    nudge: 'Book the demo Omar asked for while the CFO seat is new; propose two slots this week and bring the travel-wholesaler payout case.',
    opener: 'Omar, congratulations on WebBeds. Forty currencies of hotel payouts is exactly the problem we built for.',
  },
  'c-priya-raman': {
    summary: 'Three conversations in twelve months, all "curious", never a next step, and the same questions each time. Priya is keeping an eye on the space, not buying.',
    nudge: 'Ask Priya directly whether Airwallex has a hedging project and budget this year. If the answer is vague, park her with a quarterly newsletter and stop spending booth time.',
    opener: 'Priya, third time we chat. Is there an actual project at Airwallex this year, or should I stop pitching and just keep you posted?',
  },
  'c-hannah-schmidt': {
    summary: 'Hannah has asked for the deck twice across three events and never moved past polite interest. TUI has the exposure, but she is not the buyer and has not named one.',
    nudge: 'Send the deck once more with one question: who at TUI owns the decision on hedging tools? If no name comes back, deprioritise.',
    opener: 'Hannah, I will send the deck today. Who at TUI would actually evaluate something like this?',
  },
  'c-ivan-petrov': {
    summary: 'Ivan says "interested in principle" at every event and has never agreed to anything concrete. A year in, nothing has changed.',
    nudge: 'Stop pitching. Ask Ivan for a fifteen-minute call with a specific agenda; if he declines, move him to quarterly updates.',
    opener: 'Ivan, we keep saying we should talk. Fifteen minutes next week, or should I just send updates?',
  },
  'c-carlos-mendes': {
    summary: 'Carlos moved from evaluating to a budgeted H2 line in six months, with a demo done and pricing sent. dLocal is close.',
    nudge: 'Follow up on the BRL and MXN pricing with a proposed start date and the implementation timeline; ask what stands between him and a signature.',
    opener: 'Carlos, is H2 still the window? What would make BRL and MXN the first pair to go live?',
  },
  'c-yonatan-levy': {
    summary: 'Yonatan booked and attended a demo, came back with budget approval for a Q1 pilot and asked for pricing on twelve pairs. This is warming fast.',
    nudge: 'Send the twelve-pair pricing within 48 hours with a proposed Q1 pilot plan, and ask for the procurement contact now rather than later.',
    opener: 'Yonatan, pricing is on its way. Who runs procurement at Rapyd so we do not lose January to paperwork?',
  },
  'c-maria-garcia-lopez': {
    summary: "Maria came to the booth with her CFO's questions written down and a defined pilot scope. Two meetings, both hot, demo done. Hotelbeds is ready for a number.",
    nudge: 'Send pricing for EUR, USD, GBP and MXN with a one-page pilot plan and offer to walk her CFO through it on a call.',
    opener: 'Maria, pricing for the four currencies is ready. Want me to present it to your CFO directly?',
  },
  'c-elena-petrova': {
    summary: 'Elena is a product lead at Wise asking how we price, twice, with no project behind it. This reads as competitive research, politely done.',
    nudge: 'Keep it friendly and keep it shallow. No pricing detail, no roadmap. A partnership conversation only if Wise raises it.',
    opener: 'Elena, good to see you again. How is the business FX product doing on your side?',
  },
  'c-robert-muller': {
    summary: 'Robert has been evaluating embedded hedging for Nuvei merchants for a year and has now offered a CFO introduction after Q3 planning. The intro is the whole game.',
    nudge: 'Ask Robert for the CFO intro now with a specific date, and offer a one-page summary he can forward before the meeting.',
    opener: 'Robert, Q3 planning should be done. Is the CFO intro still on? I can send a one-pager first.',
  },
  'c-thomas-berg': {
    summary: 'Thomas moved from curious to evaluating whether to outsource part of the hedging workflow, and asked for a team demo. A sophisticated buyer taking it seriously.',
    nudge: 'Book the team demo and prepare for a technical audience: the API, the controls, the audit trail. Do not sell; show.',
    opener: 'Thomas, for the team demo, who should be in the room from your side so we go deep enough?',
  },
  'c-david-cohen': {
    summary: 'David liked the deck and named a window: Q2 next year, after the TMS migration. Warm, honest, and on a timeline we should respect.',
    nudge: 'Set a reminder for the month before Q2 and send one relevant case study in between. Do not chase before the migration ends.',
    opener: 'David, how is the TMS migration going? Still looking at Q2 for the hedging piece?',
  },
  'c-aisha-okafor': {
    summary: 'Aisha read the Africa case study and wants the CFO in the next call. NGN and KES volatility is a live pain at Flutterwave.',
    nudge: 'Propose two dates for the CFO call and send a one-paragraph agenda Aisha can forward internally.',
    opener: 'Aisha, shall we lock the CFO call? I can send an agenda you can forward.',
  },
  'c-olivia-martin': {
    summary: 'Olivia asked for the travel case study, read it, and now wants a demo with her agency settlement team. Travelport is moving at a normal enterprise pace.',
    nudge: 'Schedule the settlement-team demo and ask for their currency list ahead of time so the demo uses their pairs.',
    opener: 'Olivia, for the demo with your settlement team, can you send the currency pairs you settle most?',
  },
  'c-laura-rossi': {
    summary: 'Laura was early a year ago; now Mollie is expanding into GBP and CHF merchants and the FX question is real. She asked for the deck and got it.',
    nudge: 'Follow the deck with a specific offer: a short call on GBP and CHF settlement for Mollie merchants.',
    opener: 'Laura, how far along is the GBP and CHF expansion? Happy to talk through the settlement side.',
  },
};

const DEMO_ARC_GENERIC: Record<ArcClass, (name: string, company: string) => ArcAi> = {
  new: (n, c) => ({
    summary: `One meeting with ${n} at ${c}, recently. Nothing to read yet beyond what was said in the room.`,
    nudge: `Follow up within 48 hours with the one thing ${n.split(' ')[0]} asked for.`,
    opener: `${n.split(' ')[0]}, good to meet you the other day. I said I would follow up on that.`,
  }),
  warming: (n, c) => ({
    summary: `${n} at ${c} has moved forward since the first meeting. The signals point to a real evaluation.`,
    nudge: 'Propose one concrete next step with a date, this week.',
    opener: `${n.split(' ')[0]}, since we last spoke, what changed on your side?`,
  }),
  stalled: (n, c) => ({
    summary: `${n} at ${c} has been met more than once without much movement. Interested, not committed.`,
    nudge: 'Re-open with something new: a case study, a product change, or a mutual contact. Not another pitch.',
    opener: `${n.split(' ')[0]}, something new since we last spoke that might be relevant to ${c}.`,
  }),
  'tire-kicker': (n, c) => ({
    summary: `${n} at ${c} keeps listening and never moves. Several meetings, never past curious, no next step ever agreed.`,
    nudge: 'Ask the budget and timeline question directly. If the answer is vague, park them and stop spending floor time.',
    opener: `${n.split(' ')[0]}, honest question: is there a project at ${c} this year, or should I just keep you posted?`,
  }),
  'job-change': (n, c) => ({
    summary: `${n} moved to ${c} in a more senior role. An existing relationship at a new account.`,
    nudge: 'Congratulate, then ask about FX exposure at the new company. Treat it as a new opportunity.',
    opener: `${n.split(' ')[0]}, congratulations on the move. What does currency risk look like at ${c}?`,
  }),
};

export function demoArc(contactId: string, cls: ArcClass, name: string, company: string): ArcAi {
  return DEMO_ARC[contactId] ?? DEMO_ARC_GENERIC[cls](name, company);
}

export interface DemoFollowUpVars {
  firstName: string;
  company: string;
  conference: string;
  pain?: string;
  nextStep?: string;
  repName: string;
  tone: 'warm' | 'direct' | 'short';
}

export function demoFollowUp(cls: ArcClass, v: DemoFollowUpVars): FollowUp {
  const rep = v.repName.split(' ')[0];
  const pain = v.pain ? v.pain.toLowerCase() : 'currency risk';
  const step = v.nextStep ?? 'a short call';
  if (v.tone === 'short') {
    return {
      subject: `${step} after ${v.conference}`,
      body: `Hi ${v.firstName},\n\nGood to talk at ${v.conference}. As promised: ${step.toLowerCase()}. Does Tuesday or Thursday work?\n\n${rep}`,
    };
  }
  const bodies: Record<ArcClass, string> = {
    new: `Hi ${v.firstName},\n\nGood to meet you at ${v.conference}. You mentioned ${pain} at ${v.company}, which is exactly the problem we take off people's plates.\n\nAs promised, the next step from my side is ${step.toLowerCase()}. Would Tuesday or Thursday next week suit you?\n\n${rep}`,
    warming: `Hi ${v.firstName},\n\nThanks for making time again at ${v.conference}. Since we last spoke you have moved things forward at ${v.company}, and I want to match that pace.\n\n${step} is ready on my side. Can we put thirty minutes in the calendar next week to go through it with whoever else needs to see it?\n\n${rep}`,
    stalled: `Hi ${v.firstName},\n\nWe have talked a couple of times now, most recently at ${v.conference}, and I do not want to keep pitching if the timing is wrong.\n\nOne thing that might be relevant: we recently published how a company like ${v.company} handled ${pain}. Happy to send it, or to leave it until the timing changes. Which is it?\n\n${rep}`,
    'tire-kicker': `Hi ${v.firstName},\n\nWe have caught up at a few events now, most recently at ${v.conference}, and I would rather ask plainly than keep guessing: is there a project at ${v.company} around ${pain} this year, with an owner and a budget?\n\nIf yes, I would love to put ${step.toLowerCase()} in the calendar. If not, I will keep you posted quarterly and stop taking your time at booths.\n\n${rep}`,
    'job-change': `Hi ${v.firstName},\n\nCongratulations on the move to ${v.company}. When we spoke at ${v.conference} it was clear the FX exposure you now own is a different scale from before.\n\nI would like to show you what we would do specifically for ${v.company}. ${step} next week?\n\n${rep}`,
  };
  const subjects: Record<ArcClass, string> = {
    new: `Following up from ${v.conference}`,
    warming: `${step} for ${v.company}`,
    stalled: `Timing check`,
    'tire-kicker': `Straight question about ${v.company}`,
    'job-change': `Congratulations, and a question`,
  };
  return { subject: subjects[cls], body: bodies[cls] };
}

/** Demo extraction for the canonical transcript; anything else falls back to the heuristic parser. */
export function demoExtract(transcript: string): Lead | undefined {
  const t = transcript.toLowerCase();
  if (t.includes('sara') && t.includes('chen') && t.includes('adyen')) {
    return {
      name: 'Sarah Chen',
      company: 'Adyen',
      title: 'Head of Treasury',
      email: null,
      phone: null,
      linkedin: null,
      interest: 'hot',
      intent: 'budget',
      painPoints: ['Manual hedging'],
      nextStep: 'Book demo',
      summary: 'Sarah now heads treasury at Adyen; they hedge EUR manually and she wants a demo in Q1.',
      matchedCandidate: 'Sarah Chen',
    };
  }
  return undefined;
}

export const DEMO_DISCOVER: DiscoverResult = {
  note: 'Demo results. Add an Anthropic key in Settings and Discover will search the web live; dates below are unverified.',
  events: [
    {
      name: 'Seamless Asia 2027',
      series: 'Seamless Asia',
      startDate: null,
      endDate: null,
      city: 'Singapore',
      country: 'Singapore',
      countryCode: 'SG',
      region: 'APAC',
      lat: 1.3521,
      lng: 103.8198,
      verticals: ['payments', 'ecommerce', 'fintech'],
      audienceSize: 8000,
      url: 'https://www.terrapinn.com/exhibition/seamless-asia/',
      description: 'Payments, e-commerce and fintech trade show for Southeast Asia. PSPs and marketplaces exhibit; banks and regulators attend.',
      whyItFits: 'Good PSP and marketplace density for the region; fewer treasurers than a EuroFinance room.',
      icp: { verticalFit: 7, buyerDensity: 6, seniority: 5 },
      ticketUsd: 900,
      datesConfirmed: false,
      sources: ['https://www.terrapinn.com/exhibition/seamless-asia/'],
    },
    {
      name: 'ITB Asia 2027',
      series: 'ITB Asia',
      startDate: null,
      endDate: null,
      city: 'Singapore',
      country: 'Singapore',
      countryCode: 'SG',
      region: 'APAC',
      lat: 1.3521,
      lng: 103.8198,
      verticals: ['travel'],
      audienceSize: 12000,
      url: 'https://www.itb-asia.com/',
      description: 'Asia edition of the ITB travel trade show, with a travel-tech track. Tour operators, wholesalers, OTAs and airlines from the region.',
      whyItFits: 'Travel wholesalers and OTAs pricing in many currencies; large and diluted, so plan meetings in advance.',
      icp: { verticalFit: 6, buyerDensity: 6, seniority: 4 },
      ticketUsd: 500,
      datesConfirmed: false,
      sources: ['https://www.itb-asia.com/'],
    },
    {
      name: 'Intersekt 2027',
      series: 'Intersekt',
      startDate: null,
      endDate: null,
      city: 'Melbourne',
      country: 'Australia',
      countryCode: 'AU',
      region: 'APAC',
      lat: -37.8136,
      lng: 144.9631,
      verticals: ['fintech', 'payments'],
      audienceSize: 2000,
      url: 'https://www.intersektfestival.com/',
      description: "FinTech Australia's annual festival. Australian fintechs, payments companies, banks and regulators.",
      whyItFits: 'Decent payments density in a market with heavy AUD/USD exposure; far from Tel Aviv.',
      icp: { verticalFit: 6, buyerDensity: 5, seniority: 5 },
      ticketUsd: 700,
      datesConfirmed: false,
      sources: ['https://www.intersektfestival.com/'],
    },
  ],
};
