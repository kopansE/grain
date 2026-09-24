/**
 * Normalization for people, companies and identifiers. Everything the
 * matcher compares goes through here first, so a diacritic, a nickname or
 * a "Ltd" never decides whether two records are the same human.
 */

export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'sir', 'madam', 'mx', 'eng', 'adv', 'cpa']);

/** First-name short forms and cross-language spellings, mapped to one canonical form. */
export const NICKNAMES: Record<string, string> = {
  // English short forms
  bob: 'robert', rob: 'robert', robbie: 'robert', bobby: 'robert', bert: 'robert',
  liz: 'elizabeth', beth: 'elizabeth', betsy: 'elizabeth', eliza: 'elizabeth', lizzie: 'elizabeth', elisabeth: 'elizabeth',
  mike: 'michael', mikey: 'michael', mick: 'michael', micha: 'michael', michal: 'michael', mikhail: 'michael',
  bill: 'william', billy: 'william', will: 'william', willy: 'william', liam: 'william',
  jim: 'james', jimmy: 'james', jamie: 'james',
  dick: 'richard', rick: 'richard', richie: 'richard', ricky: 'richard',
  tom: 'thomas', tommy: 'thomas', thom: 'thomas',
  dan: 'daniel', danny: 'daniel', dani: 'daniel',
  dave: 'david', davey: 'david', dudu: 'david', dudi: 'david',
  steve: 'stephen', steven: 'stephen', stevie: 'stephen',
  chris: 'christopher', kit: 'christopher',
  matt: 'matthew', matty: 'matthew',
  nick: 'nicholas', nicky: 'nicholas', nicolas: 'nicholas',
  tony: 'anthony', ant: 'anthony', antony: 'anthony',
  andy: 'andrew', drew: 'andrew',
  alex: 'alexander', xander: 'alexander', sasha: 'alexander',
  ben: 'benjamin', benny: 'benjamin', benji: 'benjamin', binyamin: 'benjamin', benyamin: 'benjamin',
  joe: 'joseph', joey: 'joseph', yosef: 'joseph', yossi: 'joseph', yossef: 'joseph',
  ed: 'edward', eddie: 'edward', ted: 'edward', teddy: 'edward', ned: 'edward',
  ken: 'kenneth', kenny: 'kenneth',
  ron: 'ronald', ronnie: 'ronald',
  pat: 'patrick', paddy: 'patrick',
  kate: 'katherine', katie: 'katherine', kathy: 'katherine', cathy: 'katherine', catherine: 'katherine', kat: 'katherine',
  sue: 'susan', susie: 'susan', suzy: 'susan',
  peggy: 'margaret', meg: 'margaret', maggie: 'margaret',
  jen: 'jennifer', jenny: 'jennifer', jenn: 'jennifer',
  jess: 'jessica', jessie: 'jessica',
  becky: 'rebecca', becca: 'rebecca', rivka: 'rebecca',
  abby: 'abigail', abbie: 'abigail', avigail: 'abigail',
  charlie: 'charles', chuck: 'charles', chas: 'charles',
  greg: 'gregory', gregg: 'gregory',
  jon: 'jonathan', jonny: 'jonathan', johnny: 'jonathan', yonatan: 'jonathan', yoni: 'jonathan', yonathan: 'jonathan',
  sam: 'samuel', sammy: 'samuel', shmuel: 'samuel', shmulik: 'samuel',
  josh: 'joshua', yehoshua: 'joshua',
  jake: 'jacob', yaakov: 'jacob', yakov: 'jacob', kobi: 'jacob', koby: 'jacob',
  avi: 'abraham', avraham: 'abraham', abe: 'abraham', avram: 'abraham',
  itzik: 'isaac', yitzhak: 'isaac', itzhak: 'isaac', yitzchak: 'isaac', ike: 'isaac',
  moshe: 'moses', moses: 'moses', moishe: 'moses',
  eli: 'elijah', eliyahu: 'elijah', elias: 'elijah',
  sarah: 'sara', sara: 'sara',
  hannah: 'hanna', hanna: 'hanna', chana: 'hanna', anna: 'hanna',
  rachel: 'rachel', rahel: 'rachel',
  lea: 'leah', leah: 'leah',
  noah: 'noa', noa: 'noa',
  max: 'maximilian', maxim: 'maximilian',
  fred: 'frederick', freddie: 'frederick', friedrich: 'frederick',
  hans: 'johannes', johann: 'johannes',
  pete: 'peter', pedro: 'peter', pierre: 'peter', pietro: 'peter',
  paolo: 'paul', pablo: 'paul',
  juan: 'john', johan: 'john', jean: 'john', giovanni: 'john', ivan: 'john', jack: 'john',
};

/** Surname spelling variants and transliterations, mapped to one canonical form. */
export const SURNAME_VARIANTS: Record<string, string> = {
  levy: 'levi', levi: 'levi', lewy: 'levi',
  cohen: 'cohen', kohen: 'cohen', coen: 'cohen', cohn: 'cohen', kohn: 'cohen',
  mizrachi: 'mizrahi', mizrahi: 'mizrahi',
  shapira: 'shapiro', shapiro: 'shapiro', schapiro: 'shapiro',
  freedman: 'friedman', fridman: 'friedman', friedman: 'friedman', friedmann: 'friedman',
  mueller: 'muller', muller: 'muller', moller: 'muller',
  schmitt: 'schmidt', schmidt: 'schmidt', schmid: 'schmidt',
  meier: 'meyer', meyer: 'meyer', maier: 'meyer', mayer: 'meyer',
  weiss: 'weiss', weis: 'weiss', wyss: 'weiss',
  katz: 'katz', kats: 'katz',
  peretz: 'peretz', perets: 'peretz',
  mohammed: 'mohammed', mohamed: 'mohammed', muhammad: 'mohammed', mohammad: 'mohammed',
  haddad: 'haddad', hadad: 'haddad',
  goldberg: 'goldberg', goldenberg: 'goldberg',
  rosenberg: 'rosenberg', rozenberg: 'rosenberg',
  chen: 'chen', chan: 'chen',
  nguyen: 'nguyen', nguyễn: 'nguyen',
};

export interface NormalizedName {
  /** All tokens, lowercase, diacritics stripped, initials removed. */
  full: string;
  first: string;
  last: string;
  /** Middle tokens between first and last. */
  middle: string[];
  /** Single-letter tokens that were dropped, e.g. "S." → "s". */
  initials: string[];
  /** first with nickname expansion, last with surname variants. */
  canonicalFirst: string;
  canonicalLast: string;
  canonicalFull: string;
  tokens: string[];
}

export function normalizeName(raw: string): NormalizedName {
  let s = stripDiacritics(raw).toLowerCase().trim();
  // "Last, First" → "First Last"
  if (s.includes(',')) {
    const [last, first] = s.split(',').map((p) => p.trim());
    s = `${first ?? ''} ${last ?? ''}`;
  }
  s = s.replace(/[^a-z\s'-]/g, ' ').replace(/[-']/g, ' ').replace(/\s+/g, ' ').trim();
  const rawTokens = s.split(' ').filter(Boolean).filter((t) => !HONORIFICS.has(t));
  const initials = rawTokens.filter((t) => t.length === 1);
  let tokens = rawTokens.filter((t) => t.length > 1);
  if (tokens.length === 0) tokens = rawTokens;
  const first = tokens[0] ?? '';
  const last = tokens.length > 1 ? tokens[tokens.length - 1]! : '';
  const middle = tokens.slice(1, -1);
  const canonicalFirst = NICKNAMES[first] ?? first;
  const canonicalLast = SURNAME_VARIANTS[last] ?? last;
  return {
    full: tokens.join(' '),
    first,
    last,
    middle,
    initials,
    canonicalFirst,
    canonicalLast,
    canonicalFull: [canonicalFirst, ...middle, canonicalLast].filter(Boolean).join(' '),
    tokens,
  };
}

const LEGAL_SUFFIXES = new Set([
  'inc', 'incorporated', 'ltd', 'limited', 'llc', 'llp', 'plc', 'gmbh', 'ag', 'sa', 'sas', 'srl', 'bv', 'nv', 'co', 'corp', 'corporation',
  'company', 'holdings', 'holding', 'group', 'pty', 'pte', 'kk', 'oy', 'ab', 'as', 'spa', 'se', 'lp', 'the',
]);

/** Known brands that get written many ways. Keys are already normalized. */
export const COMPANY_ALIASES: Record<string, string> = {
  'fis worldpay': 'worldpay',
  'worldpay fis': 'worldpay',
  'worldpay from fis': 'worldpay',
  'checkout': 'checkout com',
  'checkoutcom': 'checkout com',
  'jp morgan': 'jpmorgan',
  'j p morgan': 'jpmorgan',
  'jpmorgan chase': 'jpmorgan',
  'jp morgan chase': 'jpmorgan',
  'jpm': 'jpmorgan',
  'paypal braintree': 'paypal',
  'braintree': 'paypal',
  'global payments': 'global payments',
  'adyen payments': 'adyen',
  'stripe payments': 'stripe',
  'nuvei payments': 'nuvei',
  'rapyd financial network': 'rapyd',
  'payoneer global': 'payoneer',
  'wise payments': 'wise',
  'transferwise': 'wise',
  'ebury partners': 'ebury',
  'hotelbeds group': 'hotelbeds',
  'webbeds': 'webbeds',
  'booking com': 'booking com',
  'booking holdings': 'booking com',
};

export function normalizeCompany(raw: string): string {
  let s = stripDiacritics(raw).toLowerCase();
  // Dotted abbreviations: "N.V." → "nv", "J.P. Morgan" → "jp morgan".
  s = s.replace(/\b(?:[a-z]\.){2,}/g, (m) => m.replace(/\./g, ''));
  s = s.replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  let tokens = s.split(' ').filter(Boolean);
  // Strip legal suffixes from the end (and a leading "the"), repeatedly.
  while (tokens.length > 1 && LEGAL_SUFFIXES.has(tokens[tokens.length - 1]!)) tokens.pop();
  while (tokens.length > 1 && tokens[0] === 'the') tokens.shift();
  const joined = tokens.join(' ');
  return COMPANY_ALIASES[joined] ?? joined;
}

const FREE_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'me.com',
  'proton.me', 'protonmail.com', 'aol.com', 'walla.co.il', 'walla.com', 'msn.com', 'mail.com', 'gmx.com', 'gmx.de', 'yandex.com', 'qq.com', '163.com',
]);

export function normalizeEmail(raw: string): string {
  const s = raw.trim().toLowerCase();
  const at = s.indexOf('@');
  if (at < 0) return s;
  let local = s.slice(0, at);
  const domain = s.slice(at + 1);
  const plus = local.indexOf('+');
  if (plus >= 0) local = local.slice(0, plus);
  if (domain === 'gmail.com' || domain === 'googlemail.com') local = local.replace(/\./g, '');
  return `${local}@${domain === 'googlemail.com' ? 'gmail.com' : domain}`;
}

/** Company domain from an email, or '' for free-mail providers and malformed input. */
export function emailDomain(raw: string): string {
  const s = raw.trim().toLowerCase();
  const at = s.indexOf('@');
  if (at < 0) return '';
  const domain = s.slice(at + 1);
  return FREE_MAIL.has(domain) ? '' : domain;
}

/** Digits only. Comparison uses the last nine digits so country codes and leading zeros don't matter. */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function phoneKey(raw: string): string {
  const digits = normalizePhone(raw);
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

/** "https://www.linkedin.com/in/sarah-chen-123/" → "sarah-chen-123". Bare slugs pass through. */
export function linkedinSlug(raw: string): string {
  const s = raw.trim().toLowerCase();
  const m = s.match(/linkedin\.com\/in\/([^/?#]+)/);
  if (m) return m[1]!;
  return s.replace(/^@/, '').replace(/\/+$/, '');
}

/** The company a domain implies: "adyen.com" → "adyen". */
export function companyFromDomain(domain: string): string {
  if (!domain) return '';
  const parts = domain.split('.');
  // drop TLD(s): take the first label unless it is a generic prefix
  const generic = new Set(['mail', 'email', 'corp', 'www']);
  const label = parts.find((p) => !generic.has(p)) ?? parts[0]!;
  return normalizeCompany(label);
}
