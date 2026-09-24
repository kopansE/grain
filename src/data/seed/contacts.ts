import type { Contact, Encounter, Intent, Interest } from '@/domain/types';

/**
 * Seed people and meetings. Every matching and relationship-arc edge case in
 * docs/PLAN.md §7.3 is represented here on purpose: name variants, a job
 * change, three different James Smiths, a compound surname, a tire-kicker,
 * a warming four-touch arc, and plenty of one-off meetings.
 *
 * Companies are real names used illustratively; every person is fictional.
 */

interface E {
  id: string;
  contact: string;
  conf: string;
  date: string; // YYYY-MM-DD (time added below)
  rep: string;
  name: string;
  company: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  interest: Interest;
  intent: Intent;
  pain?: string[];
  notes: string;
  next?: string;
  done?: boolean;
  synced?: string; // HubSpot contact id when already pushed
}

const e = (x: E): Encounter => ({
  id: x.id,
  contactId: x.contact,
  conferenceId: x.conf,
  repId: x.rep,
  capturedAt: `${x.date}T${String(9 + (x.id.charCodeAt(x.id.length - 1) % 8)).padStart(2, '0')}:${String((x.id.length * 7) % 60).padStart(2, '0')}:00Z`,
  name: x.name,
  company: x.company,
  title: x.title,
  email: x.email,
  phone: x.phone,
  linkedin: x.linkedin,
  interest: x.interest,
  intent: x.intent,
  painPoints: x.pain ?? [],
  notes: x.notes,
  nextStep: x.next,
  nextStepDone: x.done,
  source: 'seed',
  hubspot: x.synced ? { status: 'synced', contactId: x.synced, pushedAt: `${x.date}T18:00:00Z` } : { status: 'unsynced' },
});

export const SEED_ENCOUNTERS: Encounter[] = [
  // ── Sarah Chen: analyst → senior analyst at Worldpay. (Her move to Adyen is the live capture demo.)
  e({ id: 'e-sarah-1', contact: 'c-sarah-chen', conf: 'm2020-usa-2025', date: '2025-10-27', rep: 'noa', name: 'Sarah Chen', company: 'Worldpay', title: 'Treasury Analyst', interest: 'warm', intent: 'curious', pain: ['Manual hedging'], notes: 'Junior on the treasury team. Asked sharp questions about how we price forwards for PSP merchants. Collecting information for her boss.', synced: '30101' }),
  e({ id: 'e-sarah-2', contact: 'c-sarah-chen', conf: 'pay360-2026', date: '2026-03-25', rep: 'tom', name: 'S. Chen', company: 'Worldpay', title: 'Senior Treasury Analyst', email: 'sarah.chen@worldpay.com', interest: 'warm', intent: 'evaluating', pain: ['Manual hedging', 'Bank FX spreads'], notes: 'Promoted since Vegas. Now runs the EUR hedging book by hand in spreadsheets. Asked for the deck to circulate internally.', next: 'Send deck', done: true }),

  // ── Robert Müller, Nuvei. Live capture of "Bob Mueller" should ask before linking.
  e({ id: 'e-robert-1', contact: 'c-robert-muller', conf: 'm2020-europe-2025', date: '2025-06-04', rep: 'daniel', name: 'Robert Müller', company: 'Nuvei', title: 'Head of Payments Partnerships', email: 'r.mueller@nuvei.com', interest: 'warm', intent: 'evaluating', pain: ['Multi-currency pricing', 'Settlement timing'], notes: 'Nuvei is expanding merchant settlement currencies. Wants to see how embedded hedging would work for their merchants.', next: 'Send case study', done: true, synced: '30102' }),
  e({ id: 'e-robert-2', contact: 'c-robert-muller', conf: 'm2020-europe-2026', date: '2026-06-03', rep: 'noa', name: 'Robert Müller', company: 'Nuvei', title: 'Head of Payments Partnerships', interest: 'warm', intent: 'evaluating', pain: ['Multi-currency pricing'], notes: 'Still interested. Budget sits with the CFO; he offered to make the intro after their Q3 planning.', next: 'Intro to CFO' }),

  // ── Priya Raman, Airwallex: three meetings, a year, never past curious. The tire-kicker.
  e({ id: 'e-priya-1', contact: 'c-priya-raman', conf: 'm2020-europe-2025', date: '2025-06-05', rep: 'noa', name: 'Priya Raman', company: 'Airwallex', title: 'Payments Manager', interest: 'cold', intent: 'curious', notes: 'Asked for a brochure. Took a sticker.', synced: '30103' }),
  e({ id: 'e-priya-2', contact: 'c-priya-raman', conf: 'fintech-meetup-2026', date: '2026-03-31', rep: 'maya', name: 'Priya Raman', company: 'Airwallex', title: 'Payments Manager', interest: 'warm', intent: 'curious', notes: 'Remembered us from Amsterdam. Asked the same questions about pricing. No project on her side.' }),
  e({ id: 'e-priya-3', contact: 'c-priya-raman', conf: 'm2020-europe-2026', date: '2026-06-02', rep: 'daniel', name: 'Priya Raman', company: 'Airwallex', title: 'Payments Manager', interest: 'cold', intent: 'curious', notes: 'Stopped by the stand again. "Just keeping an eye on the space."' }),

  // ── Yonatan Levy, Rapyd: warming fast.
  e({ id: 'e-yonatan-1', contact: 'c-yonatan-levy', conf: 'pay360-2026', date: '2026-03-26', rep: 'tom', name: 'Yonatan Levy', company: 'Rapyd', title: 'Treasury Manager', email: 'yonatan.levy@rapyd.net', interest: 'warm', intent: 'evaluating', pain: ['Cross-border payouts', 'FX margin leakage'], notes: 'Rapyd pays out in 100+ currencies; margin leaks between collection and payout. Wants a demo.', next: 'Book demo', done: true }),
  e({ id: 'e-yonatan-2', contact: 'c-yonatan-levy', conf: 'eurofinance-itm-2026', date: '2026-09-17', rep: 'daniel', name: 'Yonatan Levy', company: 'Rapyd', title: 'Treasury Manager', interest: 'hot', intent: 'budget', pain: ['Cross-border payouts'], notes: 'Demo went well. Has budget approval for a Q1 pilot. Wants pricing for 12 currency pairs.', next: 'Send pricing' }),

  // ── Three James Smiths. Must never merge.
  e({ id: 'e-jsmith-stripe', contact: 'c-james-smith-stripe', conf: 'm2020-usa-2025', date: '2025-10-28', rep: 'maya', name: 'James Smith', company: 'Stripe', title: 'Partnerships Manager', interest: 'cold', intent: 'curious', notes: 'Partnerships, not a buyer. Friendly.', synced: '30104' }),
  e({ id: 'e-jsmith-barclays', contact: 'c-james-smith-barclays', conf: 'pay360-2026', date: '2026-03-25', rep: 'tom', name: 'James Smith', company: 'Barclays', title: 'Director, Transaction Banking', interest: 'warm', intent: 'evaluating', pain: ['Bank FX spreads'], notes: 'Interested in how we complement bank FX for their PSP clients. Possible channel.', next: 'Follow up in a month' }),
  e({ id: 'e-jsmith-hsbc', contact: 'c-james-smith-hsbc', conf: 'm2020-europe-2026', date: '2026-06-04', rep: 'noa', name: 'James Smith', company: 'HSBC', title: 'VP Global Payments Solutions', interest: 'warm', intent: 'curious', notes: 'Wanted to understand our bank relationships. Not a direct buyer.' }),

  // ── Maria Garcia Lopez, Hotelbeds: compound surname, company email. Warming.
  e({ id: 'e-maria-1', contact: 'c-maria-garcia-lopez', conf: 'm2020-europe-2026', date: '2026-06-03', rep: 'tom', name: 'Maria Garcia Lopez', company: 'Hotelbeds', title: 'Head of Treasury', email: 'mgarcia@hotelbeds.com', interest: 'hot', intent: 'evaluating', pain: ['Guaranteed local pricing', 'FX margin leakage'], notes: 'Hotelbeds sells hotel inventory in 30 currencies; margins get eaten between booking and check-in. Wants to guarantee prices to travel agents.', next: 'Book demo', done: true }),
  e({ id: 'e-maria-2', contact: 'c-maria-garcia-lopez', conf: 'eurofinance-itm-2026', date: '2026-09-16', rep: 'noa', name: 'Maria Garcia', company: 'Hotelbeds', title: 'Head of Treasury', email: 'mgarcia@hotelbeds.com', interest: 'hot', intent: 'budget', pain: ['Guaranteed local pricing'], notes: "Came to the booth with her CFO's questions written down. Pilot scope: EUR, USD, GBP, MXN.", next: 'Send pricing' }),

  // ── Omar Haddad: VP at PayTabs → CFO at WebBeds. Job change with seniority up.
  e({ id: 'e-omar-1', contact: 'c-omar-haddad', conf: 'm2020-europe-2025', date: '2025-06-04', rep: 'daniel', name: 'Omar Haddad', company: 'PayTabs', title: 'VP Payments', email: 'omar.haddad@paytabs.com', interest: 'warm', intent: 'evaluating', pain: ['Multi-currency pricing'], notes: 'PayTabs merchants price in AED and SAR but settle in USD. Interested in embedded hedging for merchants.', next: 'Send deck', done: true, synced: '30105' }),
  e({ id: 'e-omar-2', contact: 'c-omar-haddad', conf: 'eurofinance-itm-2026', date: '2026-09-18', rep: 'noa', name: 'Omar Haddad', company: 'WebBeds', title: 'CFO', email: 'ohaddad@webbeds.com', interest: 'hot', intent: 'budget', pain: ['Cross-border payouts', 'Guaranteed local pricing'], notes: 'Moved to WebBeds as CFO in May. Now owns FX exposure for a bedbank paying hotels in 40 currencies. Remembered our Money20/20 conversation.', next: 'Book demo' }),

  // ── Elena Petrova, Wise: competitor-adjacent, stalled.
  e({ id: 'e-elena-1', contact: 'c-elena-petrova', conf: 'm2020-europe-2025', date: '2025-06-03', rep: 'noa', name: 'Elena Petrova', company: 'Wise', title: 'Product Lead, Business FX', interest: 'warm', intent: 'curious', notes: 'Product person at Wise. Curious about how we price. Probably competitive research.', synced: '30106' }),
  e({ id: 'e-elena-2', contact: 'c-elena-petrova', conf: 'm2020-europe-2026', date: '2026-06-02', rep: 'tom', name: 'Elena Petrova', company: 'Wise', title: 'Product Lead, Business FX', interest: 'cold', intent: 'curious', notes: 'Same questions as last year. Fishing.' }),

  // ── Lukas Weber, Delivery Hero: new, hot.
  e({ id: 'e-lukas-1', contact: 'c-lukas-weber', conf: 'eurofinance-itm-2026', date: '2026-09-17', rep: 'noa', name: 'Lukas Weber', company: 'Delivery Hero', title: 'Group Treasurer', email: 'lukas.weber@deliveryhero.com', interest: 'hot', intent: 'budget', pain: ['Bank FX spreads', 'Treasury headcount'], notes: 'Runs a 12-person treasury; hedges 20+ currencies with three banks and hates the spreads. Wants automated layering.', next: 'Book demo' }),

  // ── Aisha Okafor, Flutterwave: warming.
  e({ id: 'e-aisha-1', contact: 'c-aisha-okafor', conf: 'm2020-usa-2025', date: '2025-10-28', rep: 'noa', name: 'Aisha Okafor', company: 'Flutterwave', title: 'Head of Treasury', email: 'aisha.okafor@flutterwave.com', interest: 'warm', intent: 'evaluating', pain: ['Cross-border payouts', 'Settlement timing'], notes: 'NGN and KES volatility on merchant payouts. Wants the Africa case study.', next: 'Send case study', done: true, synced: '30107' }),
  e({ id: 'e-aisha-2', contact: 'c-aisha-okafor', conf: 'm2020-europe-2026', date: '2026-06-04', rep: 'daniel', name: 'Aisha Okafor', company: 'Flutterwave', title: 'Head of Treasury', interest: 'warm', intent: 'evaluating', notes: 'Read the case study. Wants to bring the CFO into the next call.', next: 'Intro to CFO' }),

  // ── Tomoko Nakamura, Trip.com: new.
  e({ id: 'e-tomoko-1', contact: 'c-tomoko-nakamura', conf: 'm2020-usa-2025', date: '2025-10-27', rep: 'maya', name: 'Tomoko Nakamura', company: 'Trip.com', title: 'Senior Manager, FX & Treasury', interest: 'warm', intent: 'curious', pain: ['Guaranteed local pricing'], notes: 'Trip.com prices in 30 currencies; asked how we handle JPY.', synced: '30108' }),

  // ── David Cohen, Payoneer: two touches, one next step done.
  e({ id: 'e-davidc-1', contact: 'c-david-cohen', conf: 'pay360-2026', date: '2026-03-26', rep: 'daniel', name: 'David Cohen', company: 'Payoneer', title: 'Director of Treasury', email: 'dcohen@payoneer.com', interest: 'warm', intent: 'evaluating', pain: ['Cross-border payouts'], notes: 'Payoneer pays freelancers in 70 currencies. Interested in hedging the float.', next: 'Send deck', done: true }),
  e({ id: 'e-davidc-2', contact: 'c-david-cohen', conf: 'eurofinance-itm-2026', date: '2026-09-16', rep: 'daniel', name: 'David Cohen', company: 'Payoneer', title: 'Director of Treasury', interest: 'warm', intent: 'evaluating', notes: 'Liked the deck. Timing is Q2 next year after their TMS migration.', next: 'Follow up in a month' }),

  // ── Hannah Schmidt, TUI: three touches, curious every time. Tire-kicker.
  e({ id: 'e-hannah-1', contact: 'c-hannah-schmidt', conf: 'm2020-europe-2025', date: '2025-06-05', rep: 'daniel', name: 'Hannah Schmidt', company: 'TUI Group', title: 'Head of Treasury Operations', interest: 'warm', intent: 'curious', notes: 'Big treasury, many banks. Polite interest.', synced: '30109' }),
  e({ id: 'e-hannah-2', contact: 'c-hannah-schmidt', conf: 'm2020-europe-2026', date: '2026-06-04', rep: 'daniel', name: 'Hannah Schmidt', company: 'TUI Group', title: 'Head of Treasury Operations', interest: 'warm', intent: 'curious', notes: 'Asked for the deck again.', next: 'Send deck' }),
  e({ id: 'e-hannah-3', contact: 'c-hannah-schmidt', conf: 'eurofinance-itm-2026', date: '2026-09-17', rep: 'daniel', name: 'Hannah Schmidt', company: 'TUI Group', title: 'Head of Treasury Operations', interest: 'warm', intent: 'curious', notes: 'Third time. Still "interesting". No project, no budget, no owner.' }),

  // ── Carlos Mendes, dLocal: strongly warming.
  e({ id: 'e-carlos-1', contact: 'c-carlos-mendes', conf: 'm2020-usa-2025', date: '2025-10-29', rep: 'maya', name: 'Carlos Mendes', company: 'dLocal', title: 'VP Treasury', email: 'carlos.mendes@dlocal.com', interest: 'hot', intent: 'evaluating', pain: ['FX margin leakage', 'Cross-border payouts'], notes: 'LatAm currencies: BRL, MXN, COP, ARS. Losing margin on payout timing.', next: 'Book demo', done: true, synced: '30110' }),
  e({ id: 'e-carlos-2', contact: 'c-carlos-mendes', conf: 'fintech-meetup-2026', date: '2026-04-01', rep: 'maya', name: 'Carlos Mendes', company: 'dLocal', title: 'VP Treasury', interest: 'hot', intent: 'budget', pain: ['FX margin leakage'], notes: 'Demo done. Budget line exists for H2. Asked for pricing on BRL and MXN first.', next: 'Send pricing', done: true }),

  // ── One-off meetings and shorter arcs.
  e({ id: 'e-sophie-1', contact: 'c-sophie-laurent', conf: 'm2020-europe-2026', date: '2026-06-03', rep: 'tom', name: 'Sophie Laurent', company: 'eDreams ODIGEO', title: 'Treasury Manager', email: 'slaurent@edreamsodigeo.com', interest: 'warm', intent: 'evaluating', pain: ['Guaranteed local pricing'], notes: 'OTA selling flights in 40 markets. Wants to lock fares in local currency at booking.', next: 'Send case study' }),
  e({ id: 'e-mark-1', contact: 'c-mark-thompson', conf: 'm2020-usa-2025', date: '2025-10-27', rep: 'noa', name: 'Mark Thompson', company: 'Paysafe', title: 'SVP Payments', interest: 'cold', intent: 'curious', notes: 'Senior but not engaged. Took a card.', synced: '30111' }),
  e({ id: 'e-mark-2', contact: 'c-mark-thompson', conf: 'pay360-2026', date: '2026-03-25', rep: 'tom', name: 'Mark Thompson', company: 'Paysafe', title: 'SVP Payments', interest: 'cold', intent: 'curious', notes: 'Same as Vegas. Polite, distracted.' }),

  // ── Nadia Hussain, Checkout.com: the four-touch arc from curious to champion.
  e({ id: 'e-nadia-1', contact: 'c-nadia-hussain', conf: 'm2020-europe-2025', date: '2025-06-04', rep: 'noa', name: 'Nadia Hussain', company: 'Checkout.com', title: 'Head of FX', email: 'nadia.hussain@checkout.com', interest: 'warm', intent: 'evaluating', pain: ['Multi-currency pricing', 'Bank FX spreads'], notes: 'Runs FX for merchant settlement. Comparing bank forwards to embedded hedging.', next: 'Send deck', done: true, synced: '30112' }),
  e({ id: 'e-nadia-2', contact: 'c-nadia-hussain', conf: 'pay360-2026', date: '2026-03-26', rep: 'tom', name: 'Nadia Hussain', company: 'Checkout.com', title: 'Head of FX', interest: 'warm', intent: 'evaluating', notes: 'Deck landed well internally. Wants a technical session with her PMs.', next: 'Book demo', done: true }),
  e({ id: 'e-nadia-3', contact: 'c-nadia-hussain', conf: 'm2020-europe-2026', date: '2026-06-03', rep: 'noa', name: 'Nadia Hussain', company: 'Checkout.com', title: 'Head of FX', interest: 'hot', intent: 'budget', pain: ['Multi-currency pricing'], notes: 'Demo done. Budget approved for a merchant pilot in EUR/GBP/USD.', next: 'Send pricing', done: true }),
  e({ id: 'e-nadia-4', contact: 'c-nadia-hussain', conf: 'eurofinance-itm-2026', date: '2026-09-18', rep: 'noa', name: 'Nadia Hussain', company: 'Checkout.com', title: 'Head of FX', interest: 'hot', intent: 'champion', notes: 'Introduced us to two of her merchants at the bar. Pilot paperwork with legal.', next: 'Follow up in a month' }),

  e({ id: 'e-ben-1', contact: 'c-ben-adler', conf: 'm2020-europe-2026', date: '2026-06-02', rep: 'tom', name: 'Ben Adler', company: 'Kiwi.com', title: 'CFO', email: 'ben.adler@kiwi.com', interest: 'warm', intent: 'evaluating', pain: ['Guaranteed local pricing', 'FX margin leakage'], notes: 'Virtual interlining means they buy tickets in one currency and sell in another. FX is a P&L line he wants gone.', next: 'Send pricing' }),
  e({ id: 'e-ravi-1', contact: 'c-ravi-krishnan', conf: 'fintech-meetup-2026', date: '2026-03-31', rep: 'maya', name: 'Ravi Krishnan', company: 'Nium', title: 'Director, Treasury', interest: 'warm', intent: 'curious', notes: 'Nium does its own FX. Curious whether we complement or compete.' }),
  e({ id: 'e-ravi-2', contact: 'c-ravi-krishnan', conf: 'eurofinance-itm-2026', date: '2026-09-17', rep: 'daniel', name: 'Ravi Krishnan', company: 'Nium', title: 'Director, Treasury', interest: 'warm', intent: 'curious', notes: 'Still curious, still no project.', next: 'Send deck' }),
  e({ id: 'e-julia-1', contact: 'c-julia-novak', conf: 'eurofinance-itm-2026', date: '2026-09-16', rep: 'daniel', name: 'Julia Novak', company: 'Zalando', title: 'Senior Treasury Analyst', email: 'julia.novak@zalando.de', interest: 'warm', intent: 'evaluating', pain: ['Manual hedging'], notes: 'Hedging 15 currencies for cross-border e-commerce; wants to reduce manual work.', next: 'Send case study' }),
  e({ id: 'e-ahmed-1', contact: 'c-ahmed-el-sayed', conf: 'm2020-usa-2025', date: '2025-10-28', rep: 'daniel', name: 'Ahmed El-Sayed', company: 'Fawry', title: 'Head of Payments', interest: 'warm', intent: 'curious', pain: ['Settlement timing'], notes: 'EGP volatility is the whole conversation in Egypt.', synced: '30113' }),
  e({ id: 'e-liwei-1', contact: 'c-li-wei', conf: 'm2020-europe-2026', date: '2026-06-04', rep: 'noa', name: 'Li Wei', company: 'Ant International', title: 'Senior Director, Cross-Border', interest: 'warm', intent: 'evaluating', pain: ['Cross-border payouts'], notes: 'Alipay+ merchant settlement across 20 currencies. Long procurement cycle.', next: 'Follow up in a month' }),
  e({ id: 'e-emma-1', contact: 'c-emma-jones', conf: 'eurofinance-itm-2026', date: '2026-09-18', rep: 'noa', name: 'Emma Jones', company: 'easyJet', title: 'Group Treasury Manager', email: 'emma.jones@easyjet.com', interest: 'hot', intent: 'budget', pain: ['Bank FX spreads'], notes: 'USD fuel, EUR revenue, GBP reporting. Wants to compare us with bank forwards on a 12-month program.', next: 'Book demo' }),
  e({ id: 'e-pierre-1', contact: 'c-pierre-dubois', conf: 'pay360-2026', date: '2026-03-25', rep: 'daniel', name: 'Pierre Dubois', company: 'Ebury', title: 'Head of Partnerships', interest: 'cold', intent: 'curious', notes: 'Competitor. Polite.' }),
  e({ id: 'e-anna-1', contact: 'c-anna-kowalski', conf: 'm2020-europe-2026', date: '2026-06-03', rep: 'daniel', name: 'Anna Kowalski', company: 'Vinted', title: 'Treasury Lead', email: 'anna.kowalski@vinted.com', interest: 'warm', intent: 'evaluating', pain: ['FX margin leakage'], notes: 'Marketplace payouts in 20 currencies. Wants to see the payout hedging flow.', next: 'Send deck', done: true }),
  e({ id: 'e-michaelb-1', contact: 'c-michael-brown', conf: 'm2020-usa-2025', date: '2025-10-27', rep: 'maya', name: 'Michael Brown', company: 'Global Payments', title: 'VP Product', interest: 'warm', intent: 'curious', notes: 'Product, not treasury. Wants to understand embedded FX for merchants.', synced: '30114' }),
  e({ id: 'e-michaelb-2', contact: 'c-michael-brown', conf: 'fintech-meetup-2026', date: '2026-04-01', rep: 'maya', name: 'Michael Brown', company: 'Global Payments', title: 'VP Product', interest: 'warm', intent: 'curious', notes: 'Same conversation. Asked for the deck.', next: 'Send deck' }),
  e({ id: 'e-yael-1', contact: 'c-yael-shapira', conf: 'eurofinance-itm-2026', date: '2026-09-17', rep: 'noa', name: 'Yael Shapira', company: 'Wix Payments', title: 'Head of Payments Finance', email: 'yael.shapira@wix.com', interest: 'hot', intent: 'evaluating', pain: ['Cross-border payouts', 'Multi-currency pricing'], notes: 'Israeli company. Merchant payouts in 15 currencies. Wants to see multi-currency payout hedging.', next: 'Book demo', done: true }),
  e({ id: 'e-kenji-1', contact: 'c-kenji-sato', conf: 'm2020-usa-2025', date: '2025-10-28', rep: 'maya', name: 'Kenji Sato', company: 'Rakuten Travel', title: 'Finance Manager', interest: 'cold', intent: 'curious', notes: 'Inbound travel to Japan; JPY weakness helps them right now.', synced: '30115' }),
  e({ id: 'e-olivia-1', contact: 'c-olivia-martin', conf: 'pay360-2026', date: '2026-03-26', rep: 'tom', name: 'Olivia Martin', company: 'Travelport', title: 'Director, Treasury', email: 'olivia.martin@travelport.com', interest: 'warm', intent: 'evaluating', pain: ['Multi-currency pricing'], notes: 'GDS with agency settlement in many currencies. Wants the travel case study.', next: 'Send case study', done: true }),
  e({ id: 'e-olivia-2', contact: 'c-olivia-martin', conf: 'm2020-europe-2026', date: '2026-06-03', rep: 'tom', name: 'Olivia Martin', company: 'Travelport', title: 'Director, Treasury', interest: 'warm', intent: 'evaluating', notes: 'Case study landed. Wants a demo with her agency settlement team.', next: 'Book demo' }),
  e({ id: 'e-samuel-1', contact: 'c-samuel-okoro', conf: 'm2020-europe-2026', date: '2026-06-02', rep: 'daniel', name: 'Samuel Okoro', company: 'Interswitch', title: 'CFO', email: 'samuel.okoro@interswitchgroup.com', interest: 'hot', intent: 'budget', pain: ['Settlement timing', 'Cross-border payouts'], notes: 'NGN exposure on cross-border card settlement. Has budget this year.', next: 'Send pricing' }),
  e({ id: 'e-laura-1', contact: 'c-laura-rossi', conf: 'm2020-europe-2025', date: '2025-06-03', rep: 'daniel', name: 'Laura Rossi', company: 'Mollie', title: 'Treasury Manager', interest: 'warm', intent: 'curious', notes: 'Mollie merchants mostly EUR; some GBP and PLN. Early.', synced: '30116' }),
  e({ id: 'e-laura-2', contact: 'c-laura-rossi', conf: 'm2020-europe-2026', date: '2026-06-04', rep: 'noa', name: 'Laura Rossi', company: 'Mollie', title: 'Treasury Manager', email: 'laura.rossi@mollie.com', interest: 'warm', intent: 'evaluating', pain: ['Multi-currency pricing'], notes: 'Now expanding to GBP and CHF merchants; the FX question is real this year.', next: 'Send deck', done: true }),
  e({ id: 'e-ivan-1', contact: 'c-ivan-petrov', conf: 'm2020-europe-2025', date: '2025-06-05', rep: 'noa', name: 'Ivan Petrov', company: 'Unlimit', title: 'Head of Treasury', interest: 'warm', intent: 'curious', notes: 'Interested in principle.', synced: '30117' }),
  e({ id: 'e-ivan-2', contact: 'c-ivan-petrov', conf: 'pay360-2026', date: '2026-03-25', rep: 'tom', name: 'Ivan Petrov', company: 'Unlimit', title: 'Head of Treasury', interest: 'warm', intent: 'curious', notes: 'Interested in principle. Again.' }),
  e({ id: 'e-ivan-3', contact: 'c-ivan-petrov', conf: 'm2020-europe-2026', date: '2026-06-02', rep: 'noa', name: 'Ivan Petrov', company: 'Unlimit', title: 'Head of Treasury', interest: 'warm', intent: 'curious', notes: 'Wants to "stay in touch".' }),
  e({ id: 'e-grace-1', contact: 'c-grace-kim', conf: 'afp-2025', date: '2025-10-27', rep: 'maya', name: 'Grace Kim', company: 'Coupang', title: 'Treasury Director', email: 'grace.kim@coupang.com', interest: 'warm', intent: 'evaluating', pain: ['Manual hedging'], notes: 'KRW/USD program run by hand. Wants automation.', next: 'Send deck', done: true, synced: '30118' }),
  e({ id: 'e-thomasb-1', contact: 'c-thomas-berg', conf: 'afp-2025', date: '2025-10-28', rep: 'maya', name: 'Thomas Berg', company: 'Spotify', title: 'Group Treasurer', interest: 'warm', intent: 'curious', notes: 'Large program, sophisticated team. Curious about our pricing model.', synced: '30119' }),
  e({ id: 'e-thomasb-2', contact: 'c-thomas-berg', conf: 'eurofinance-itm-2026', date: '2026-09-16', rep: 'noa', name: 'Thomas Berg', company: 'Spotify', title: 'Group Treasurer', email: 'thomas.berg@spotify.com', interest: 'warm', intent: 'evaluating', pain: ['Treasury headcount'], notes: 'Evaluating whether to outsource part of the hedging workflow. Wants a demo with his team.', next: 'Book demo' }),
];

interface C {
  id: string;
  name: string;
  company: string;
  title?: string;
  aliases?: string[];
  linkedin?: string;
  hubspot?: string;
}

function contactFrom(c: C): Contact {
  const own = SEED_ENCOUNTERS.filter((x) => x.contactId === c.id).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const latest = own[own.length - 1];
  return {
    id: c.id,
    canonicalName: c.name,
    aliases: [...new Set([c.name, ...(c.aliases ?? []), ...own.map((x) => x.name)])],
    emails: [...new Set(own.map((x) => x.email).filter((x): x is string => !!x))],
    phones: [...new Set(own.map((x) => x.phone).filter((x): x is string => !!x))],
    linkedin: c.linkedin,
    currentCompany: latest?.company ?? c.company,
    currentTitle: latest?.title ?? c.title,
    encounterIds: own.map((x) => x.id),
    hubspotContactId: c.hubspot ?? own.find((x) => x.hubspot?.contactId)?.hubspot?.contactId,
  };
}

export const SEED_CONTACTS: Contact[] = [
  { id: 'c-sarah-chen', name: 'Sarah Chen', company: 'Worldpay', linkedin: 'https://www.linkedin.com/in/sarah-chen-treasury/' },
  { id: 'c-robert-muller', name: 'Robert Müller', company: 'Nuvei' },
  { id: 'c-priya-raman', name: 'Priya Raman', company: 'Airwallex' },
  { id: 'c-yonatan-levy', name: 'Yonatan Levy', company: 'Rapyd' },
  { id: 'c-james-smith-stripe', name: 'James Smith', company: 'Stripe' },
  { id: 'c-james-smith-barclays', name: 'James Smith', company: 'Barclays' },
  { id: 'c-james-smith-hsbc', name: 'James Smith', company: 'HSBC' },
  { id: 'c-maria-garcia-lopez', name: 'Maria Garcia Lopez', company: 'Hotelbeds' },
  { id: 'c-omar-haddad', name: 'Omar Haddad', company: 'WebBeds' },
  { id: 'c-elena-petrova', name: 'Elena Petrova', company: 'Wise' },
  { id: 'c-lukas-weber', name: 'Lukas Weber', company: 'Delivery Hero' },
  { id: 'c-aisha-okafor', name: 'Aisha Okafor', company: 'Flutterwave' },
  { id: 'c-tomoko-nakamura', name: 'Tomoko Nakamura', company: 'Trip.com' },
  { id: 'c-david-cohen', name: 'David Cohen', company: 'Payoneer' },
  { id: 'c-hannah-schmidt', name: 'Hannah Schmidt', company: 'TUI Group' },
  { id: 'c-carlos-mendes', name: 'Carlos Mendes', company: 'dLocal' },
  { id: 'c-sophie-laurent', name: 'Sophie Laurent', company: 'eDreams ODIGEO' },
  { id: 'c-mark-thompson', name: 'Mark Thompson', company: 'Paysafe' },
  { id: 'c-nadia-hussain', name: 'Nadia Hussain', company: 'Checkout.com' },
  { id: 'c-ben-adler', name: 'Ben Adler', company: 'Kiwi.com' },
  { id: 'c-ravi-krishnan', name: 'Ravi Krishnan', company: 'Nium' },
  { id: 'c-julia-novak', name: 'Julia Novak', company: 'Zalando' },
  { id: 'c-ahmed-el-sayed', name: 'Ahmed El-Sayed', company: 'Fawry' },
  { id: 'c-li-wei', name: 'Li Wei', company: 'Ant International' },
  { id: 'c-emma-jones', name: 'Emma Jones', company: 'easyJet' },
  { id: 'c-pierre-dubois', name: 'Pierre Dubois', company: 'Ebury' },
  { id: 'c-anna-kowalski', name: 'Anna Kowalski', company: 'Vinted' },
  { id: 'c-michael-brown', name: 'Michael Brown', company: 'Global Payments' },
  { id: 'c-yael-shapira', name: 'Yael Shapira', company: 'Wix Payments' },
  { id: 'c-kenji-sato', name: 'Kenji Sato', company: 'Rakuten Travel' },
  { id: 'c-olivia-martin', name: 'Olivia Martin', company: 'Travelport' },
  { id: 'c-samuel-okoro', name: 'Samuel Okoro', company: 'Interswitch' },
  { id: 'c-laura-rossi', name: 'Laura Rossi', company: 'Mollie' },
  { id: 'c-ivan-petrov', name: 'Ivan Petrov', company: 'Unlimit' },
  { id: 'c-grace-kim', name: 'Grace Kim', company: 'Coupang' },
  { id: 'c-thomas-berg', name: 'Thomas Berg', company: 'Spotify' },
].map(contactFrom);

/** Chips offered in the capture form. Editable here. */
export const PAIN_POINTS = [
  'Manual hedging',
  'Multi-currency pricing',
  'FX margin leakage',
  'Cross-border payouts',
  'Settlement timing',
  'Guaranteed local pricing',
  'Bank FX spreads',
  'Treasury headcount',
];

export const NEXT_STEPS = ['Send deck', 'Book demo', 'Intro to CFO', 'Send case study', 'Send pricing', 'Follow up in a month'];
