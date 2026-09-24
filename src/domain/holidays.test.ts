import { describe, expect, it } from 'vitest';
import { holidayClashes } from './holidays';
import { SEED_CONFERENCES } from '@/data/seed/conferences';

describe('holidayClashes', () => {
  it('flags Money20/20 USA 2027 during Sukkot and Sibos 2026 during Sukkot', () => {
    const clashes = holidayClashes(SEED_CONFERENCES);
    const ids = clashes.map((k) => k.conference.id);
    expect(ids).toContain('m2020-usa-2027');
    expect(ids).toContain('sibos-2026');
    expect(clashes.find((k) => k.conference.id === 'm2020-usa-2027')!.overlaps).toBe(true);
  });
  it('ignores attended and skipped events', () => {
    const clashes = holidayClashes(SEED_CONFERENCES.map((c) => (c.id === 'sibos-2026' ? { ...c, status: 'skipped' as const } : c)));
    expect(clashes.map((k) => k.conference.id)).not.toContain('sibos-2026');
  });
});
