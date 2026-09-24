import type { Intent, Interest } from '@/domain/types';
import { NEXT_STEPS, PAIN_POINTS } from '@/data/seed/contacts';

/**
 * Heuristic extraction from a spoken or typed sentence. This is the
 * no-key fallback; with an Anthropic key the AI extractor takes over and
 * does the job properly. Kept deliberately simple and conservative.
 */
export interface ParsedLead {
  name?: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  interest: Interest;
  intent: Intent;
  painPoints: string[];
  nextStep?: string;
}

const TITLE_RE =
  /\b((?:group |global |senior |sr\.? |head of |vp (?:of )?|vice president(?: of)? |director(?: of)? |chief |)(?:treasurer|treasury|cfo|coo|ceo|finance|payments?|fx|partnerships?|product|operations|analyst|manager|lead)(?: (?:manager|director|lead|analyst|officer|analyst))?)\b/i;

const STOP = /\b(who|she|he|they|wants?|want|is|are|was|said|asked|needs?|looking|interested|hedg\w*|runs?|from|at|and|but|we|i|our|their|his|her|about)\b/i;

const SMALL_WORDS = new Set(['of', 'and', 'the', 'for', 'at', 'in', 'to', 'a']);
const ACRONYMS = new Set(['cfo', 'ceo', 'coo', 'cto', 'vp', 'svp', 'evp', 'fx', 'md']);

function cap(s: string): string {
  return s
    .split(/\s+/)
    .map((w, i) => {
      const lw = w.toLowerCase();
      if (ACRONYMS.has(lw)) return lw.toUpperCase();
      if (i > 0 && SMALL_WORDS.has(lw)) return lw;
      return w.length > 1 && w === lw ? w[0]!.toUpperCase() + w.slice(1) : w;
    })
    .join(' ');
}

function cut(s: string): string {
  // Cut a captured phrase at the first stop word or punctuation.
  const m = s.match(STOP);
  let out = m && m.index !== undefined ? s.slice(0, m.index) : s;
  out = out.split(/[,.;!?]/)[0] ?? out;
  return out.trim().replace(/\s+/g, ' ');
}

export function quickParse(text: string): ParsedLead {
  const t = text.replace(/\s+/g, ' ').trim();
  const lower = t.toLowerCase();
  const out: ParsedLead = { interest: 'warm', intent: 'curious', painPoints: [] };

  const email = t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (email) out.email = email[0].toLowerCase();
  const phone = t.match(/\+?\d[\d\s().-]{7,}\d/);
  if (phone) out.phone = phone[0].trim();

  // "met Sarah Chen from Adyen", "spoke to Omar at WebBeds", "just talked with Ben Adler of Kiwi"
  const verb = t.match(/\b(?:met|meet|talked (?:to|with)|spoke (?:to|with)|chatted (?:to|with)|this is|with)\s+/i);
  if (verb && verb.index !== undefined) {
    const rest = t.slice(verb.index + verb[0].length);
    const m = rest.match(/^([A-Z][\w'-]+(?:\s+[A-Z][\w'-]+){0,2})/);
    if (m) out.name = cap(cut(m[1]!));
  }
  if (!out.name) {
    // First two capitalized words of the sentence as a last resort, unless the sentence opens with a verb.
    const m = t.match(/^([A-Z][\w'-]+\s+[A-Z][\w'-]+)/);
    if (m && !/^(met|meet|talked|spoke|chatted|just|saw)\b/i.test(t)) out.name = m[1];
  }

  const compM = t.match(/\b(?:from|at|of|with)\s+([A-Z][\w.&'-]*(?:\s+[A-Z][\w.&'-]*){0,3})/);
  if (compM && (!out.name || !compM[1]!.startsWith(out.name))) out.company = cut(compM[1]!);
  if (out.company && out.name && out.company === out.name) out.company = undefined;

  const titleM = t.match(TITLE_RE);
  if (titleM) out.title = cap(titleM[1]!.trim());

  if (/\b(hot|very interested|wants? a demo|ready to buy|budget approved|sign|urgent|asap)\b/.test(lower)) out.interest = 'hot';
  else if (/\b(cold|not interested|just looking|tire.?kick|polite|browsing|no project)\b/.test(lower)) out.interest = 'cold';

  if (/\b(champion|introduce us|intro(?:duce)? (?:me|us)|bring (?:in|the) cfo|internal sponsor)\b/.test(lower)) out.intent = 'champion';
  else if (/\b(budget|approved|procurement|pilot|contract|pricing|q[1-4])\b/.test(lower)) out.intent = 'budget';
  else if (/\b(evaluat\w*|compar\w*|demo|trial|assess\w*|looking at|shortlist)\b/.test(lower)) out.intent = 'evaluating';

  const painMap: [RegExp, string][] = [
    [/manual|spreadsheet|by hand/, 'Manual hedging'],
    [/multi.?currency|local currenc|price in|pricing in/, 'Multi-currency pricing'],
    [/margin|leak/, 'FX margin leakage'],
    [/payout|pay out|paying (?:hotels|suppliers|merchants)/, 'Cross-border payouts'],
    [/settle|settlement|timing/, 'Settlement timing'],
    [/guarantee|lock (?:in|the) (?:price|rate|fare)/, 'Guaranteed local pricing'],
    [/spread|bank fx|banks? (?:charge|rate)/, 'Bank FX spreads'],
    [/headcount|team of|small team|understaffed/, 'Treasury headcount'],
  ];
  for (const [re, label] of painMap) if (re.test(lower) && PAIN_POINTS.includes(label)) out.painPoints.push(label);

  const nextMap: [RegExp, string][] = [
    [/\bdemo\b/, 'Book demo'],
    [/pricing|quote|proposal/, 'Send pricing'],
    [/case stud/, 'Send case study'],
    [/\bdeck\b|slides|one.?pager|brochure/, 'Send deck'],
    [/\bcfo\b|intro/, 'Intro to CFO'],
    [/next month|in a month|follow up later|after (?:the )?(?:quarter|summer|holidays)/, 'Follow up in a month'],
  ];
  for (const [re, label] of nextMap) {
    if (re.test(lower) && NEXT_STEPS.includes(label)) {
      out.nextStep = label;
      break;
    }
  }
  return out;
}
