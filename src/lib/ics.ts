import type { Conference } from '@/domain/types';

function icsDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '');
}

function nextDay(iso: string): string {
  return new Date(Date.parse(iso) + 86_400_000).toISOString().slice(0, 10);
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** All-day calendar entries, one per conference. Opens in Google Calendar, Outlook and Apple Calendar. */
export function toIcs(conferences: Conference[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Grain Orbit//EN', 'CALSCALE:GREGORIAN'];
  for (const c of conferences) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:orbit-${c.id}@grain`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART;VALUE=DATE:${icsDate(c.startDate)}`,
      `DTEND;VALUE=DATE:${icsDate(nextDay(c.endDate))}`,
      `SUMMARY:${esc(c.name)}`,
      `LOCATION:${esc(`${c.city}, ${c.country}`)}`,
      `DESCRIPTION:${esc(`${c.description}${c.url ? `\n${c.url}` : ''}\nPlanned in Grain Orbit.`)}`,
      ...(c.url ? [`URL:${c.url}`] : []),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcs(conferences: Conference[], filename: string) {
  const blob = new Blob([toIcs(conferences)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
