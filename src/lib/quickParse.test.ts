import { describe, expect, it } from 'vitest';
import { quickParse } from './quickParse';

describe('quickParse', () => {
  it('extracts the Sarah Chen transcript', () => {
    const p = quickParse('Met Sarah Chen from Adyen, head of treasury, they hedge EUR manually, wants a demo in Q1');
    expect(p.name).toBe('Sarah Chen');
    expect(p.company).toBe('Adyen');
    expect(p.title?.toLowerCase()).toContain('head of treasury');
    expect(p.painPoints).toContain('Manual hedging');
    expect(p.nextStep).toBe('Book demo');
    expect(p.interest).toBe('hot');
    expect(p.intent).toBe('budget');
  });

  it('handles "talked to X at Y" and emails', () => {
    const p = quickParse('Talked to Omar Haddad at WebBeds, CFO, omar@webbeds.com, wants pricing');
    expect(p.name).toBe('Omar Haddad');
    expect(p.company).toBe('WebBeds');
    expect(p.email).toBe('omar@webbeds.com');
    expect(p.nextStep).toBe('Send pricing');
    expect(p.title).toBe('CFO');
  });

  it('is conservative on junk', () => {
    const p = quickParse('nice booth');
    expect(p.name).toBeUndefined();
    expect(p.company).toBeUndefined();
    expect(p.interest).toBe('warm');
  });
});
