import type { Conference, ConferenceStatus, Region, Vertical } from '@/domain/types';

/**
 * Sample conference database, built from public information on 2026-09-24.
 * Dates marked `datesConfirmed: false` are estimated from the prior year's
 * pattern because the organizer had not announced them yet. ICP inputs
 * (0–10) are the author's estimates and are editable inside the app.
 */

const CITY = {
  lasVegas: { city: 'Las Vegas', country: 'United States', countryCode: 'US', region: 'NA' as Region, lat: 36.1699, lng: -115.1398 },
  amsterdam: { city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', region: 'EMEA' as Region, lat: 52.3676, lng: 4.9041 },
  bangkok: { city: 'Bangkok', country: 'Thailand', countryCode: 'TH', region: 'APAC' as Region, lat: 13.7563, lng: 100.5018 },
  riyadh: { city: 'Riyadh', country: 'Saudi Arabia', countryCode: 'SA', region: 'MEA' as Region, lat: 24.7136, lng: 46.6753 },
  miami: { city: 'Miami Beach', country: 'United States', countryCode: 'US', region: 'NA' as Region, lat: 25.7907, lng: -80.13 },
  singapore: { city: 'Singapore', country: 'Singapore', countryCode: 'SG', region: 'APAC' as Region, lat: 1.3521, lng: 103.8198 },
  newYork: { city: 'New York', country: 'United States', countryCode: 'US', region: 'NA' as Region, lat: 40.7128, lng: -74.006 },
  london: { city: 'London', country: 'United Kingdom', countryCode: 'GB', region: 'EMEA' as Region, lat: 51.5074, lng: -0.1278 },
  berlin: { city: 'Berlin', country: 'Germany', countryCode: 'DE', region: 'EMEA' as Region, lat: 52.52, lng: 13.405 },
  dubai: { city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', region: 'MEA' as Region, lat: 25.2048, lng: 55.2708 },
  hongKong: { city: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', region: 'APAC' as Region, lat: 22.3193, lng: 114.1694 },
  paris: { city: 'Paris', country: 'France', countryCode: 'FR', region: 'EMEA' as Region, lat: 48.8566, lng: 2.3522 },
  nationalHarbor: { city: 'National Harbor', country: 'United States', countryCode: 'US', region: 'NA' as Region, lat: 38.7823, lng: -77.0164 },
  rome: { city: 'Rome', country: 'Italy', countryCode: 'IT', region: 'EMEA' as Region, lat: 41.9028, lng: 12.4964 },
  toronto: { city: 'Toronto', country: 'Canada', countryCode: 'CA', region: 'NA' as Region, lat: 43.6532, lng: -79.3832 },
  bridgetown: { city: 'Bridgetown', country: 'Barbados', countryCode: 'BB', region: 'LATAM' as Region, lat: 13.0975, lng: -59.6167 },
  kigali: { city: 'Kigali', country: 'Rwanda', countryCode: 'RW', region: 'MEA' as Region, lat: -1.9441, lng: 30.0619 },
  liverpool: { city: 'Liverpool', country: 'United Kingdom', countryCode: 'GB', region: 'EMEA' as Region, lat: 53.4084, lng: -2.9916 },
  copenhagen: { city: 'Copenhagen', country: 'Denmark', countryCode: 'DK', region: 'EMEA' as Region, lat: 55.6761, lng: 12.5683 },
  telAviv: { city: 'Tel Aviv', country: 'Israel', countryCode: 'IL', region: 'IL' as Region, lat: 32.0853, lng: 34.7818 },
  fortLauderdale: { city: 'Fort Lauderdale', country: 'United States', countryCode: 'US', region: 'NA' as Region, lat: 26.1224, lng: -80.1373 },
  macao: { city: 'Macao', country: 'Macao', countryCode: 'MO', region: 'APAC' as Region, lat: 22.1987, lng: 113.5439 },
  sanDiego: { city: 'San Diego', country: 'United States', countryCode: 'US', region: 'NA' as Region, lat: 32.7157, lng: -117.1611 },
  spokane: { city: 'Spokane', country: 'United States', countryCode: 'US', region: 'NA' as Region, lat: 47.6588, lng: -117.426 },
  barcelona: { city: 'Barcelona', country: 'Spain', countryCode: 'ES', region: 'EMEA' as Region, lat: 41.3874, lng: 2.1686 },
  sanMateo: { city: 'San Mateo', country: 'United States', countryCode: 'US', region: 'NA' as Region, lat: 37.563, lng: -122.3255 },
  lisbon: { city: 'Lisbon', country: 'Portugal', countryCode: 'PT', region: 'EMEA' as Region, lat: 38.7223, lng: -9.1393 },
  helsinki: { city: 'Helsinki', country: 'Finland', countryCode: 'FI', region: 'EMEA' as Region, lat: 60.1699, lng: 24.9384 },
  sanFrancisco: { city: 'San Francisco', country: 'United States', countryCode: 'US', region: 'NA' as Region, lat: 37.7749, lng: -122.4194 },
  vancouver: { city: 'Vancouver', country: 'Canada', countryCode: 'CA', region: 'NA' as Region, lat: 49.2827, lng: -123.1207 },
  boston: { city: 'Boston', country: 'United States', countryCode: 'US', region: 'NA' as Region, lat: 42.3601, lng: -71.0589 },
  frankfurt: { city: 'Frankfurt', country: 'Germany', countryCode: 'DE', region: 'EMEA' as Region, lat: 50.1109, lng: 8.6821 },
};

type CityKey = keyof typeof CITY;

interface Seed {
  id: string;
  series: string;
  name: string;
  dates: [string, string];
  at: CityKey;
  verticals: Vertical[];
  audience: number;
  url?: string;
  blurb: string;
  icp: [verticalFit: number, buyerDensity: number, seniority: number];
  ticket: number;
  booth?: number;
  status?: ConferenceStatus;
  reps?: string[];
  history?: Conference['history'];
  estimated?: boolean;
}

function c(s: Seed): Conference {
  const place = CITY[s.at];
  return {
    id: s.id,
    series: s.series,
    name: s.name,
    startDate: s.dates[0],
    endDate: s.dates[1],
    ...place,
    verticals: s.verticals,
    audienceSize: s.audience,
    url: s.url,
    description: s.blurb,
    icpInputs: { verticalFit: s.icp[0], buyerDensity: s.icp[1], seniority: s.icp[2] },
    costs: { ticketUsd: s.ticket, boothUsd: s.booth },
    status: s.status ?? 'considering',
    assignedRepIds: s.reps ?? [],
    history: s.history,
    source: 'seed',
    datesConfirmed: !s.estimated,
  };
}

export const SEED_CONFERENCES: Conference[] = [
  // ───────────────────────── Payments & fintech ─────────────────────────
  c({
    id: 'm2020-usa-2026', series: 'Money20/20', name: 'Money20/20 USA 2026', dates: ['2026-10-18', '2026-10-21'], at: 'lasVegas',
    verticals: ['payments', 'fintech', 'banking'], audience: 13000, url: 'https://us.money2020.com/',
    blurb: 'The flagship. Banks, card networks, PSPs and cross-border payment companies in force; 7 in 10 attendee companies send decision-makers.',
    icp: [8, 7, 8], ticket: 3500, booth: 45000, status: 'planned', reps: ['noa', 'daniel', 'maya'],
    history: [{ year: 2025, leads: 41, pipelineUsd: 1200000, notes: 'Booth in the Payments Hall. Best US event for PSP pipeline.' }, { year: 2024, leads: 33, pipelineUsd: 800000 }],
  }),
  c({
    id: 'm2020-usa-2027', series: 'Money20/20', name: 'Money20/20 USA 2027', dates: ['2027-10-19', '2027-10-21'], at: 'lasVegas',
    verticals: ['payments', 'fintech', 'banking'], audience: 13500, url: 'https://us.money2020.com/',
    blurb: 'Same audience, new venue: Las Vegas Convention Center and Resorts World. Dates provisional.',
    icp: [8, 7, 8], ticket: 3600, booth: 45000, estimated: true,
    history: [{ year: 2025, leads: 41, pipelineUsd: 1200000 }, { year: 2024, leads: 33, pipelineUsd: 800000 }],
  }),
  c({
    id: 'm2020-europe-2027', series: 'Money20/20', name: 'Money20/20 Europe 2027', dates: ['2027-06-08', '2027-06-10'], at: 'amsterdam',
    verticals: ['payments', 'fintech', 'banking'], audience: 8000, url: 'https://europe.money2020.com/',
    blurb: "Europe's largest fintech and payments gathering. Strong PSP, acquirer and cross-border presence; 2,200+ companies.",
    icp: [8, 8, 8], ticket: 3000, booth: 35000, status: 'planned', reps: ['noa', 'tom'],
    history: [{ year: 2026, leads: 38, pipelineUsd: 950000, notes: 'Walk-the-floor plus 14 pre-booked meetings.' }, { year: 2025, leads: 29, pipelineUsd: 600000 }],
  }),
  c({
    id: 'm2020-asia-2027', series: 'Money20/20', name: 'Money20/20 Asia 2027', dates: ['2027-04-27', '2027-04-29'], at: 'bangkok',
    verticals: ['payments', 'fintech', 'banking'], audience: 5500, url: 'https://asia.money2020.com/',
    blurb: 'APAC banks, PSPs and cross-border remittance players. The fastest-growing Money20/20 edition.',
    icp: [7, 6, 6], ticket: 2200, booth: 20000,
  }),
  c({
    id: 'm2020-me-2027', series: 'Money20/20', name: 'Money20/20 Middle East 2027', dates: ['2027-09-14', '2027-09-16'], at: 'riyadh',
    verticals: ['payments', 'fintech', 'banking'], audience: 38000, url: 'https://money2020middleeast.com/',
    blurb: 'Government-backed regional showcase. Banks, PSPs and 600+ investors. The 38,000 figure is the organizer\'s broad projection including trade visitors.',
    icp: [7, 6, 6], ticket: 1800, booth: 25000, status: 'planned', reps: ['noa', 'daniel'],
  }),
  c({
    id: 'fintech-meetup-2027', series: 'Fintech Meetup', name: 'Fintech Meetup 2027', dates: ['2027-02-22', '2027-02-24'], at: 'lasVegas',
    verticals: ['fintech', 'payments', 'banking'], audience: 5000, url: 'https://www.fintechmeetup.com/',
    blurb: 'Built around structured 1:1 meetings. Banks, credit unions, fintechs and investors; 36% C-level. Little travel-industry attendance.',
    icp: [7, 6, 7], ticket: 2900,
    history: [{ year: 2026, leads: 24, pipelineUsd: 480000, notes: 'The meetings format works: 31 scheduled, 24 qualified.' }],
  }),
  c({
    id: 'sibos-2026', series: 'Sibos', name: 'Sibos 2026', dates: ['2026-09-28', '2026-10-01'], at: 'miami',
    verticals: ['banking', 'treasury', 'payments'], audience: 12500, url: 'https://www.sibos.com/',
    blurb: "SWIFT's flagship. Commercial and central banks, corporate treasurers and CFOs. First Sibos in Miami.",
    icp: [8, 7, 8], ticket: 3200, booth: 60000, status: 'planned', reps: ['maya'],
  }),
  c({
    id: 'sibos-2027', series: 'Sibos', name: 'Sibos 2027', dates: ['2027-09-20', '2027-09-23'], at: 'singapore',
    verticals: ['banking', 'treasury', 'payments'], audience: 12500, url: 'https://www.sibos.com/',
    blurb: 'Same banking and treasury-heavy audience, in the APAC banking hub. Third time Singapore hosts.',
    icp: [8, 7, 8], ticket: 3200, booth: 60000,
  }),
  c({
    id: 'finovate-fall-2027', series: 'Finovate', name: 'FinovateFall 2027', dates: ['2027-09-13', '2027-09-15'], at: 'newYork',
    verticals: ['fintech', 'banking'], audience: 2200, url: 'https://informaconnect.com/finovatefall/',
    blurb: 'Live demo format. Half the room is banks; two in three attendees are director level or above. Payments vendors mostly exhibit.',
    icp: [5, 4, 7], ticket: 2500, status: 'planned', reps: ['noa', 'maya'],
  }),
  c({
    id: 'finovate-europe-2027', series: 'Finovate', name: 'FinovateEurope 2027', dates: ['2027-02-09', '2027-02-10'], at: 'london',
    verticals: ['fintech', 'banking'], audience: 1100, url: 'https://informaconnect.com/finovateeurope/',
    blurb: '1,000+ senior attendees, 600+ from banks. Banks are the buyers here, not PSPs.',
    icp: [5, 4, 7], ticket: 2200, estimated: true,
  }),
  c({
    id: 'pay360-2027', series: 'Pay360', name: 'Pay360 2027', dates: ['2027-04-21', '2027-04-22'], at: 'london',
    verticals: ['payments', 'fintech'], audience: 6000, url: 'https://pay360event.com/',
    blurb: "The UK's largest dedicated payments event. PSPs, acquirers and banks; 60% VP level or above. Co-located merchant track.",
    icp: [9, 8, 7], ticket: 1400, booth: 15000, status: 'planned', reps: ['tom'],
    history: [{ year: 2026, leads: 27, pipelineUsd: 520000, notes: 'Small booth paid for itself twice over.' }],
  }),
  c({
    id: 'mpe-2027', series: 'MPE', name: 'MPE Merchant Payments Ecosystem 2027', dates: ['2027-03-09', '2027-03-11'], at: 'berlin',
    verticals: ['payments', 'ecommerce', 'travel'], audience: 1700, url: 'https://www.merchantpaymentsecosystem.com/',
    blurb: "Europe's merchant-payments conference. PSPs and acquirers meet travel and e-commerce merchants directly. 20th edition.",
    icp: [8, 8, 6], ticket: 2400,
  }),
  c({
    id: 'seamless-me-2027', series: 'Seamless', name: 'Seamless Middle East 2027', dates: ['2027-05-24', '2027-05-26'], at: 'dubai',
    verticals: ['payments', 'ecommerce', 'fintech'], audience: 25000, url: 'https://www.dwtc.com/en/events/seamless-2027/',
    blurb: 'Broad digital-commerce, retail and payments trade show. PSPs, banks and e-commerce merchants; less treasury.',
    icp: [6, 5, 4], ticket: 900, booth: 12000, status: 'planned', reps: ['daniel'],
  }),
  c({
    id: 'sff-2026', series: 'Singapore Fintech Festival', name: 'Singapore Fintech Festival 2026', dates: ['2026-11-18', '2026-11-20'], at: 'singapore',
    verticals: ['fintech', 'payments', 'banking'], audience: 75000, url: 'https://www.fintechfestival.sg/',
    blurb: "The world's largest fintech event. Banks, PSPs, 840+ regulator bodies, cross-border and remittance firms. Treasurers are a niche here.",
    icp: [7, 5, 6], ticket: 1300,
  }),
  c({
    id: 'sff-2027', series: 'Singapore Fintech Festival', name: 'Singapore Fintech Festival 2027', dates: ['2027-11-17', '2027-11-19'], at: 'singapore',
    verticals: ['fintech', 'payments', 'banking'], audience: 75000, url: 'https://www.fintechfestival.sg/',
    blurb: 'Same audience mix as 2026. Dates estimated from the mid-November pattern.',
    icp: [7, 5, 6], ticket: 1300, estimated: true,
  }),
  c({
    id: 'hkfw-2026', series: 'Hong Kong FinTech Week', name: 'Hong Kong FinTech Week 2026', dates: ['2026-11-02', '2026-11-06'], at: 'hongKong',
    verticals: ['fintech', 'payments', 'banking'], audience: 45000, url: 'https://www.fintechweek.hk/',
    blurb: 'A cross-border payments hub event given Hong Kong\'s Greater Bay Area role. Banks, PSPs, remittance firms, HKMA.',
    icp: [7, 5, 6], ticket: 1100,
  }),
  c({
    id: 'hkfw-2027', series: 'Hong Kong FinTech Week', name: 'Hong Kong FinTech Week 2027', dates: ['2027-11-01', '2027-11-05'], at: 'hongKong',
    verticals: ['fintech', 'payments', 'banking'], audience: 45000, url: 'https://www.fintechweek.hk/',
    blurb: 'Same profile as 2026. Dates estimated from the early-November pattern.',
    icp: [7, 5, 6], ticket: 1100, estimated: true,
  }),
  c({
    id: 'paris-fintech-forum-2027', series: 'Paris Fintech Forum', name: 'Paris Fintech Forum 2027', dates: ['2027-01-26', '2027-01-27'], at: 'paris',
    verticals: ['fintech', 'banking', 'payments'], audience: 2600, url: 'https://members.parisfintechforum.com/',
    blurb: 'Historically bank and PSP CEO-heavy. The organizer has shifted to smaller invite-only formats; verify the 2027 flagship exists before booking.',
    icp: [6, 5, 8], ticket: 1900, estimated: true,
  }),
  c({
    id: 'nacha-payments-2027', series: 'Nacha Smarter Faster Payments', name: 'Nacha Smarter Faster Payments 2027', dates: ['2027-04-11', '2027-04-14'], at: 'nationalHarbor',
    verticals: ['payments', 'banking'], audience: 2300, url: 'https://payments.nacha.org/',
    blurb: 'US banks, credit unions, ACH participants and processors, plus corporate payments-operations staff. Cross-border is secondary.',
    icp: [6, 5, 5], ticket: 1800,
  }),
  c({
    id: 'ebaday-2027', series: 'EBAday', name: 'EBAday 2027', dates: ['2027-06-15', '2027-06-16'], at: 'rome',
    verticals: ['banking', 'payments'], audience: 1400, url: 'https://www.ebaday.com/',
    blurb: 'Euro Banking Association and Finextra. Almost entirely bank transaction-banking and payments professionals plus PSPs.',
    icp: [7, 6, 6], ticket: 1500,
  }),
  c({
    id: 'moneylive-summit-2027', series: 'MoneyLIVE Summit', name: 'MoneyLIVE Summit 2027', dates: ['2027-03-02', '2027-03-03'], at: 'london',
    verticals: ['banking', 'payments', 'fintech'], audience: 2000, url: 'https://moneylive-insights.com/events/summit/',
    blurb: "Europe's senior banking and payments event. 60% from financial institutions, 75% director level or above.",
    icp: [6, 5, 8], ticket: 2000,
  }),
  c({
    id: 'fintech-week-london-2027', series: 'Fintech Week London', name: 'Fintech Week London 2027', dates: ['2027-09-06', '2027-09-10'], at: 'london',
    verticals: ['fintech'], audience: 1100, url: 'https://fintechweek.london/',
    blurb: 'Founder and investor heavy festival. Banks and PSPs attend, but it skews to startups and VCs.',
    icp: [5, 3, 6], ticket: 600, estimated: true,
  }),
  c({
    id: 'payments-canada-2027', series: 'Payments Canada Summit', name: 'Payments Canada Summit 2027', dates: ['2027-05-04', '2027-05-06'], at: 'toronto',
    verticals: ['payments', 'banking', 'treasury'], audience: 2000, url: 'https://www.thesummit.ca/',
    blurb: "Canada's flagship payments conference. Banks, PSPs, fintechs and corporate treasury and payments professionals.",
    icp: [6, 5, 5], ticket: 1500,
  }),
  c({
    id: 'fintech-islands-2027', series: 'Fintech Islands', name: 'Fintech Islands 2027', dates: ['2027-01-21', '2027-01-23'], at: 'bridgetown',
    verticals: ['fintech', 'payments'], audience: 600, url: 'https://www.fintechislands.com/',
    blurb: 'Boutique Caribbean fintech conference with a cross-border remittance focus. Founder and investor heavy.',
    icp: [5, 5, 6], ticket: 1200, estimated: true,
  }),
  c({
    id: 'africa-fintech-summit-2026', series: 'Africa Fintech Summit', name: 'Africa Fintech Summit 2026', dates: ['2026-11-18', '2026-11-20'], at: 'kigali',
    verticals: ['fintech', 'payments'], audience: 1400, url: 'https://africafintechsummit.com/',
    blurb: 'Pan-African flagship. Mobile money and cross-border payment companies are the core theme, alongside banks, regulators and DFIs.',
    icp: [6, 6, 5], ticket: 800,
  }),
  c({
    id: 'fintech-americas-2027', series: 'Fintech Americas', name: 'Fintech Americas 2027', dates: ['2027-03-16', '2027-03-18'], at: 'miami',
    verticals: ['fintech', 'banking', 'payments'], audience: 2000, url: 'https://www.fintechamericas.co/',
    blurb: 'Latin America and Caribbean banks, fintechs and payment processors. Strong cross-border and remittance presence.',
    icp: [6, 6, 6], ticket: 1600,
  }),
  c({
    id: 'fxb-summit-2026', series: 'FxB Summit', name: 'Future Cross-Border Payments Summit 2026', dates: ['2026-10-15', '2026-10-15'], at: 'dubai',
    verticals: ['payments'], audience: 300, url: 'https://fxbsummit.com/',
    blurb: 'Purpose-built cross-border payments summit. Central banks, banks, PSPs, wallets and money transfer operators. Tiny and dense.',
    icp: [9, 9, 6], ticket: 700,
  }),

  // ───────────────────────── Treasury (highest ICP) ─────────────────────────
  c({
    id: 'eurofinance-itm-2027', series: 'EuroFinance', name: 'EuroFinance International Treasury Management 2027', dates: ['2027-10-06', '2027-10-08'], at: 'amsterdam',
    verticals: ['treasury'], audience: 2600, url: 'https://www.eurofinance.com/international-treasury-event/',
    blurb: 'The flagship corporate treasury event. 2,600+ treasurers and CFOs from 60+ countries; banks and FX providers as sponsors. Our best room.',
    icp: [10, 9, 9], ticket: 3800, booth: 30000, status: 'planned', reps: ['noa', 'daniel'],
    history: [{ year: 2026, leads: 34, pipelineUsd: 1400000, notes: 'Barcelona. Highest pipeline per lead of any event.' }, { year: 2025, leads: 26, pipelineUsd: 900000 }],
  }),
  c({
    id: 'afp-2026', series: 'AFP', name: 'AFP 2026 Annual Conference', dates: ['2026-11-08', '2026-11-11'], at: 'lasVegas',
    verticals: ['treasury'], audience: 7000, url: 'https://conference.financialprofessionals.org/',
    blurb: 'The largest US treasury conference. Treasurers, CFOs, controllers and FP&A; banks and treasury vendors on the exhibit floor.',
    icp: [9, 8, 8], ticket: 2400, booth: 25000, status: 'planned', reps: ['maya'],
    history: [{ year: 2025, leads: 22, pipelineUsd: 700000, notes: 'Boston. US corporates with EUR and GBP exposure.' }],
  }),
  c({
    id: 'act-annual-2027', series: 'ACT', name: 'ACT Annual Conference 2027', dates: ['2027-05-11', '2027-05-12'], at: 'liverpool',
    verticals: ['treasury'], audience: 1100, url: 'https://www.treasurers.org/events/conferences',
    blurb: "The UK's largest treasury conference. Corporate treasurers and finance directors; city rotates, dates estimated.",
    icp: [9, 8, 8], ticket: 1300, estimated: true,
  }),
  c({
    id: 'eurofinance-americas-2027', series: 'EuroFinance', name: 'EuroFinance Treasury & Cash Management Americas 2027', dates: ['2027-06-02', '2027-06-04'], at: 'miami',
    verticals: ['treasury'], audience: 800, url: 'https://www.eurofinance.com/international-treasury-cash-management-summit-miami/',
    blurb: 'Regional Americas treasury summit. Treasurers, CFOs and finance directors from US and LatAm corporates.',
    icp: [9, 8, 8], ticket: 2600,
  }),
  c({
    id: 'eurofinance-africa-me-2027', series: 'EuroFinance', name: 'EuroFinance Treasury Africa & Middle East 2027', dates: ['2027-03-02', '2027-03-02'], at: 'london',
    verticals: ['treasury'], audience: 150, url: 'https://www.eurofinance.com/treasury-cash-management-summit-africa-middle-east/',
    blurb: 'Closed-door, one-day summit for treasurers with Africa and Middle East responsibility. Hosted in London. 150 people, all buyers.',
    icp: [9, 9, 9], ticket: 1200,
  }),
  c({
    id: 'treasury360-nordic-2027', series: 'Treasury 360', name: 'Treasury 360° Nordic 2027', dates: ['2027-05-13', '2027-05-13'], at: 'copenhagen',
    verticals: ['treasury'], audience: 500, url: 'https://treasury360nordic.com/',
    blurb: 'Free one-day Nordic treasury conference. Corporate treasurers and finance teams; banks and treasury tech sponsor.',
    icp: [8, 7, 6], ticket: 0,
  }),

  // ───────────────────────── Israel (home turf) ─────────────────────────
  c({
    id: 'fintech-week-tlv-2026', series: 'Fintech Week Tel Aviv', name: 'Fintech Week Tel Aviv 2026', dates: ['2026-10-28', '2026-10-29'], at: 'telAviv',
    verticals: ['fintech', 'payments', 'banking'], audience: 1200, url: 'https://www.fintechweektelaviv.com/',
    blurb: "Israel's flagship fintech week. Founders, banks, PSPs, investors and regulators. Zero travel cost.",
    icp: [6, 5, 6], ticket: 300, status: 'planned', reps: ['noa', 'daniel'],
  }),
  c({
    id: 'fintech-junction-2027', series: 'Fintech Junction', name: 'FinTech Junction 2027', dates: ['2027-07-07', '2027-07-07'], at: 'telAviv',
    verticals: ['fintech', 'payments'], audience: 1500, url: 'https://events.lynx.co/fintech-junction/',
    blurb: "Israel's leading fintech conference. Local founders, banks and PSPs. The month moves around; verify before booking.",
    icp: [6, 5, 6], ticket: 250, estimated: true,
  }),

  // ───────────────────────── Travel (wholesalers, airlines, OTAs) ─────────────────────────
  c({
    id: 'phocuswright-2026', series: 'Phocuswright', name: 'The Phocuswright Conference 2026', dates: ['2026-11-17', '2026-11-19'], at: 'fortLauderdale',
    verticals: ['travel'], audience: 1500, url: 'https://www.phocuswrightconference.com/',
    blurb: 'Senior travel-tech executives, OTAs, wholesalers, airlines and travel investors. The room where travel distribution deals happen.',
    icp: [7, 7, 8], ticket: 3900, status: 'planned', reps: ['tom'],
  }),
  c({
    id: 'phocuswright-2027', series: 'Phocuswright', name: 'The Phocuswright Conference 2027', dates: ['2027-11-16', '2027-11-18'], at: 'fortLauderdale',
    verticals: ['travel'], audience: 1500, url: 'https://www.phocuswrightconference.com/',
    blurb: 'Same travel-tech and OTA audience. City rotates and is not yet announced; dates estimated.',
    icp: [7, 7, 8], ticket: 3900, estimated: true,
  }),
  c({
    id: 'itb-berlin-2027', series: 'ITB Berlin', name: 'ITB Berlin 2027', dates: ['2027-03-16', '2027-03-18'], at: 'berlin',
    verticals: ['travel'], audience: 100000, url: 'https://www.itb.com/en',
    blurb: "The world's largest travel trade show. Tour operators, wholesalers, DMOs, airlines and hoteliers. Huge, but buyers are diluted.",
    icp: [5, 6, 4], ticket: 500,
  }),
  c({
    id: 'wtm-london-2026', series: 'WTM', name: 'World Travel Market London 2026', dates: ['2026-11-03', '2026-11-05'], at: 'london',
    verticals: ['travel'], audience: 46500, url: 'https://www.wtm.com/london/en-gb.html',
    blurb: 'Global travel trade show. Tour operators, wholesalers and airlines; 5,500+ registered buyers.',
    icp: [5, 6, 4], ticket: 400,
  }),
  c({
    id: 'wtm-london-2027', series: 'WTM', name: 'World Travel Market London 2027', dates: ['2027-11-02', '2027-11-04'], at: 'london',
    verticals: ['travel'], audience: 46500, url: 'https://www.wtm.com/london/en-gb.html',
    blurb: 'Same travel-trade audience. Dates estimated from the first-week-of-November pattern.',
    icp: [5, 6, 4], ticket: 400, estimated: true,
  }),
  c({
    id: 'atm-dubai-2027', series: 'Arabian Travel Market', name: 'Arabian Travel Market 2027', dates: ['2027-05-03', '2027-05-06'], at: 'dubai',
    verticals: ['travel'], audience: 55000, url: 'https://www.wtm.com/atm/en-gb.html',
    blurb: 'Middle East travel trade show. Tour operators, wholesalers, airlines and hotels; back in its May slot.',
    icp: [5, 5, 4], ticket: 300,
  }),
  c({
    id: 'skift-global-forum-2027', series: 'Skift Global Forum', name: 'Skift Global Forum 2027', dates: ['2027-09-21', '2027-09-23'], at: 'newYork',
    verticals: ['travel'], audience: 1500, url: 'https://live.skift.com/skift-global-forum/',
    blurb: 'Travel C-suite: airlines, hospitality, OTAs and travel tech, with a real CFO contingent talking travel economics.',
    icp: [6, 5, 9], ticket: 3500, estimated: true,
  }),
  c({
    id: 'phocuswright-europe-2027', series: 'Phocuswright', name: 'Phocuswright Europe 2027', dates: ['2027-05-24', '2027-05-26'], at: 'london',
    verticals: ['travel'], audience: 700, url: 'https://www.phocuswrighteurope.com/',
    blurb: 'European travel-tech: OTAs, tour operators, suppliers and investors. Small room, right people.',
    icp: [7, 7, 7], ticket: 2900,
  }),
  c({
    id: 'iata-wfs-2026', series: 'IATA World Financial Symposium', name: 'IATA World Financial & Passenger Symposium 2026', dates: ['2026-10-28', '2026-10-29'], at: 'macao',
    verticals: ['travel', 'treasury', 'payments'], audience: 1300, url: 'https://www.iata.org/en/events/all/wfs--wps/',
    blurb: 'Airline CFOs, treasurers and payments executives from carriers worldwide. The definitive airline-finance room. Airlines live with FX exposure.',
    icp: [10, 9, 9], ticket: 2800,
  }),
  c({
    id: 'iata-wfs-2027', series: 'IATA World Financial Symposium', name: 'IATA World Financial & Passenger Symposium 2027', dates: ['2027-10-27', '2027-10-28'], at: 'macao',
    verticals: ['travel', 'treasury', 'payments'], audience: 1300, url: 'https://www.iata.org/en/events/all/wfs--wps/',
    blurb: 'Same airline-finance audience. Host city rotates and is not yet announced; dates estimated.',
    icp: [10, 9, 9], ticket: 2800, estimated: true,
  }),
  c({
    id: 'gbta-2027', series: 'GBTA Convention', name: 'GBTA Convention 2027', dates: ['2027-08-02', '2027-08-04'], at: 'sanDiego',
    verticals: ['travel'], audience: 5500, url: 'https://convention.gbta.org/',
    blurb: 'Corporate travel managers, TMCs and business-travel suppliers. Procurement buyers, not treasurers.',
    icp: [4, 3, 5], ticket: 2100,
  }),
  c({
    id: 'arival-360-2026', series: 'Arival', name: 'Arival 360 Spokane 2026', dates: ['2026-10-12', '2026-10-15'], at: 'spokane',
    verticals: ['travel'], audience: 1500, url: 'https://arival.travel/',
    blurb: 'Tour, activity and attraction operators plus the OTAs that distribute them. Operators sell in many currencies.',
    icp: [4, 4, 4], ticket: 1300,
  }),

  // ───────────────────────── Ecommerce & marketplaces ─────────────────────────
  c({
    id: 'shoptalk-spring-2027', series: 'Shoptalk', name: 'Shoptalk Spring 2027', dates: ['2027-03-22', '2027-03-24'], at: 'lasVegas',
    verticals: ['ecommerce'], audience: 10000, url: 'https://spring.shoptalk.com/',
    blurb: 'E-commerce merchants, retailers, brands and marketplaces; one in three attendees is C-suite. Payments vendors exhibit.',
    icp: [4, 4, 7], ticket: 3900,
  }),
  c({
    id: 'shoptalk-europe-2027', series: 'Shoptalk', name: 'Shoptalk Europe 2027', dates: ['2027-06-01', '2027-06-03'], at: 'barcelona',
    verticals: ['ecommerce'], audience: 4500, url: 'https://europe.shoptalk.com/',
    blurb: 'European retail and e-commerce brands and marketplaces. Cross-border sellers with FX margin leakage.',
    icp: [4, 4, 7], ticket: 2900,
  }),
  c({
    id: 'nrf-2027', series: 'NRF', name: "NRF 2027: Retail's Big Show", dates: ['2027-01-10', '2027-01-12'], at: 'newYork',
    verticals: ['ecommerce'], audience: 41000, url: 'https://nrfbigshow.nrf.com/',
    blurb: 'Retail and e-commerce executives at scale. Heavy payments-vendor presence. Big, noisy, few treasurers.',
    icp: [3, 3, 6], ticket: 2400,
  }),

  // ───────────────────────── General tech (deliberately low fit) ─────────────────────────
  c({
    id: 'saastr-annual-2027', series: 'SaaStr', name: 'SaaStr Annual 2027', dates: ['2027-05-11', '2027-05-12'], at: 'sanMateo',
    verticals: ['saas'], audience: 10000, url: 'https://www.saastrannual.com/',
    blurb: 'B2B SaaS founders, executives and VCs. Not our buyers.',
    icp: [1, 1, 5], ticket: 1500,
  }),
  c({
    id: 'web-summit-2026', series: 'Web Summit', name: 'Web Summit Lisbon 2026', dates: ['2026-11-09', '2026-11-12'], at: 'lisbon',
    verticals: ['saas'], audience: 71000, url: 'https://websummit.com/',
    blurb: 'Huge general tech and startup show. Fintech is a small slice of a very large crowd.',
    icp: [2, 1, 4], ticket: 1200,
  }),
  c({
    id: 'slush-2026', series: 'Slush', name: 'Slush 2026', dates: ['2026-11-18', '2026-11-19'], at: 'helsinki',
    verticals: ['saas'], audience: 13000, url: 'https://slush.org/',
    blurb: 'Nordic early-stage startup and VC audience. Not our buyers.',
    icp: [1, 1, 4], ticket: 900,
  }),
  c({
    id: 'techcrunch-disrupt-2026', series: 'TechCrunch Disrupt', name: 'TechCrunch Disrupt 2026', dates: ['2026-10-13', '2026-10-15'], at: 'sanFrancisco',
    verticals: ['saas'], audience: 10000, url: 'https://techcrunch.com/events/techcrunch-disrupt/',
    blurb: 'US startup founders and VCs. Not our buyers.',
    icp: [1, 1, 5], ticket: 1900,
  }),
  c({
    id: 'dreamforce-2027', series: 'Dreamforce', name: 'Dreamforce 2027', dates: ['2027-09-21', '2027-09-23'], at: 'sanFrancisco',
    verticals: ['saas'], audience: 40000, url: 'https://www.salesforce.com/dreamforce/',
    blurb: "Salesforce's ecosystem across every industry. A finance track exists, but the room is not ours.",
    icp: [2, 2, 6], ticket: 2500,
  }),
  c({
    id: 'web-summit-vancouver-2027', series: 'Web Summit', name: 'Web Summit Vancouver 2027', dates: ['2027-05-25', '2027-05-28'], at: 'vancouver',
    verticals: ['saas', 'fintech'], audience: 22000, url: 'https://vancouver.websummit.com/',
    blurb: 'North American general tech show, formerly Collision. A fintech track exists.',
    icp: [2, 1, 4], ticket: 1000,
  }),

  // ───────────────────────── Crypto ─────────────────────────
  c({
    id: 'consensus-miami-2027', series: 'Consensus', name: 'Consensus Miami 2027', dates: ['2027-05-04', '2027-05-06'], at: 'miami',
    verticals: ['crypto', 'payments'], audience: 15000, url: 'https://consensus.coindesk.com/',
    blurb: "CoinDesk's flagship. Stablecoin and crypto-payments companies are a real share, and some of them move serious cross-border volume.",
    icp: [3, 3, 6], ticket: 2000,
  }),
  c({
    id: 'consensus-hk-2027', series: 'Consensus', name: 'Consensus Hong Kong 2027', dates: ['2027-02-01', '2027-02-03'], at: 'hongKong',
    verticals: ['crypto'], audience: 11000, url: 'https://consensus-hongkong.coindesk.com/',
    blurb: 'Asia edition. Digital-asset and institutional finance; payments presence via stablecoins.',
    icp: [3, 2, 5], ticket: 1500,
  }),

  // ───────────────────────── Past editions we attended (history for scoring and contacts) ─────────────────────────
  c({
    id: 'm2020-europe-2025', series: 'Money20/20', name: 'Money20/20 Europe 2025', dates: ['2025-06-03', '2025-06-05'], at: 'amsterdam',
    verticals: ['payments', 'fintech', 'banking'], audience: 7500, url: 'https://europe.money2020.com/',
    blurb: 'Attended. Walk-the-floor, no booth.', icp: [8, 8, 8], ticket: 3000, status: 'attended', reps: ['noa', 'daniel'],
    history: [{ year: 2025, leads: 29, pipelineUsd: 600000 }],
  }),
  c({
    id: 'afp-2025', series: 'AFP', name: 'AFP 2025 Annual Conference', dates: ['2025-10-26', '2025-10-29'], at: 'boston',
    verticals: ['treasury'], audience: 7000, url: 'https://conference.financialprofessionals.org/',
    blurb: 'Attended. First AFP; small booth.', icp: [9, 8, 8], ticket: 2400, booth: 20000, status: 'attended', reps: ['maya'],
    history: [{ year: 2025, leads: 22, pipelineUsd: 700000 }],
  }),
  c({
    id: 'm2020-usa-2025', series: 'Money20/20', name: 'Money20/20 USA 2025', dates: ['2025-10-26', '2025-10-29'], at: 'lasVegas',
    verticals: ['payments', 'fintech', 'banking'], audience: 13000, url: 'https://us.money2020.com/',
    blurb: 'Attended. Booth in the Payments Hall.', icp: [8, 7, 8], ticket: 3500, booth: 45000, status: 'attended', reps: ['noa', 'daniel', 'maya'],
    history: [{ year: 2025, leads: 41, pipelineUsd: 1200000 }],
  }),
  c({
    id: 'pay360-2026', series: 'Pay360', name: 'Pay360 2026', dates: ['2026-03-25', '2026-03-26'], at: 'london',
    verticals: ['payments', 'fintech'], audience: 5500, url: 'https://pay360event.com/',
    blurb: 'Attended. Small booth.', icp: [9, 8, 7], ticket: 1400, booth: 15000, status: 'attended', reps: ['tom', 'daniel'],
    history: [{ year: 2026, leads: 27, pipelineUsd: 520000 }],
  }),
  c({
    id: 'fintech-meetup-2026', series: 'Fintech Meetup', name: 'Fintech Meetup 2026', dates: ['2026-03-30', '2026-04-01'], at: 'lasVegas',
    verticals: ['fintech', 'payments', 'banking'], audience: 5000, url: 'https://www.fintechmeetup.com/',
    blurb: 'Attended. Meetings format.', icp: [7, 6, 7], ticket: 2900, status: 'attended', reps: ['maya'],
    history: [{ year: 2026, leads: 24, pipelineUsd: 480000 }],
  }),
  c({
    id: 'm2020-europe-2026', series: 'Money20/20', name: 'Money20/20 Europe 2026', dates: ['2026-06-02', '2026-06-04'], at: 'amsterdam',
    verticals: ['payments', 'fintech', 'banking'], audience: 8000, url: 'https://europe.money2020.com/',
    blurb: 'Attended. Walk-the-floor plus 14 pre-booked meetings.', icp: [8, 8, 8], ticket: 3000, status: 'attended', reps: ['noa', 'tom', 'daniel'],
    history: [{ year: 2026, leads: 38, pipelineUsd: 950000 }],
  }),
  c({
    id: 'eurofinance-itm-2026', series: 'EuroFinance', name: 'EuroFinance International Treasury Management 2026', dates: ['2026-09-16', '2026-09-18'], at: 'barcelona',
    verticals: ['treasury'], audience: 2600, url: 'https://www.eurofinance.com/international-treasury-event/',
    blurb: 'Attended last week. Booth. Highest pipeline per lead of any event.', icp: [10, 9, 9], ticket: 3800, booth: 30000, status: 'attended', reps: ['noa', 'daniel'],
    history: [{ year: 2026, leads: 34, pipelineUsd: 1400000 }],
  }),
];

export const SEED_CONFERENCE_IDS = new Set(SEED_CONFERENCES.map((c) => c.id));
