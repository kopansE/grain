import type { Conference } from './types';

/**
 * Major Jewish holidays, for a team based in Tel Aviv: nobody wants to fly
 * out on Erev Rosh Hashanah or hold a booth during Sukkot. Dates are civil
 * dates of the holiday days (the eve before is implied). Verify each year.
 */
export interface Holiday {
  name: string;
  startDate: string;
  endDate: string;
}

export const ISRAEL_HOLIDAYS: Holiday[] = [
  { name: 'Rosh Hashanah', startDate: '2026-09-12', endDate: '2026-09-13' },
  { name: 'Yom Kippur', startDate: '2026-09-21', endDate: '2026-09-21' },
  { name: 'Sukkot & Simchat Torah', startDate: '2026-09-26', endDate: '2026-10-03' },
  { name: 'Pesach', startDate: '2027-04-22', endDate: '2027-04-29' },
  { name: 'Shavuot', startDate: '2027-06-11', endDate: '2027-06-11' },
  { name: 'Rosh Hashanah', startDate: '2027-10-02', endDate: '2027-10-03' },
  { name: 'Yom Kippur', startDate: '2027-10-11', endDate: '2027-10-11' },
  { name: 'Sukkot & Simchat Torah', startDate: '2027-10-16', endDate: '2027-10-23' },
];

export interface HolidayClash {
  conference: Conference;
  holiday: Holiday;
  /** True when the event overlaps the holiday itself; false when it only touches the eve or the day after (travel days). */
  overlaps: boolean;
}

const DAY = 86_400_000;

/** Planned or Anchor-worthy events that overlap a holiday, or sit within one travel day of it. */
export function holidayClashes(conferences: Conference[], holidays: Holiday[] = ISRAEL_HOLIDAYS): HolidayClash[] {
  const out: HolidayClash[] = [];
  for (const c of conferences) {
    if (c.status === 'skipped' || c.status === 'attended') continue;
    for (const h of holidays) {
      const overlaps = c.startDate <= h.endDate && h.startDate <= c.endDate;
      const hs = Date.parse(h.startDate) - DAY;
      const he = Date.parse(h.endDate) + DAY;
      const touches = Date.parse(c.startDate) <= he && hs <= Date.parse(c.endDate);
      if (overlaps || touches) {
        out.push({ conference: c, holiday: h, overlaps });
        break;
      }
    }
  }
  return out.sort((a, b) => a.conference.startDate.localeCompare(b.conference.startDate));
}
