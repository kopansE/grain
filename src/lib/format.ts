const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(iso: string): { d: number; m: number; y: number } {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { d: d ?? 1, m: (m ?? 1) - 1, y: y ?? 1970 };
}

export function fmtDate(iso: string, withYear = true): string {
  const { d, m, y } = parts(iso);
  return `${d} ${MONTHS[m]}${withYear ? ' ' + y : ''}`;
}

/** "18–21 Oct 2026", "28 Oct – 1 Nov 2026", "15 Oct 2026". */
export function fmtDateRange(start: string, end: string, withYear = true): string {
  const a = parts(start);
  const b = parts(end);
  const year = withYear ? ` ${b.y}` : '';
  if (start === end) return `${a.d} ${MONTHS[a.m]}${year}`;
  if (a.m === b.m && a.y === b.y) return `${a.d}–${b.d} ${MONTHS[a.m]}${year}`;
  if (a.y === b.y) return `${a.d} ${MONTHS[a.m]} – ${b.d} ${MONTHS[b.m]}${year}`;
  return `${a.d} ${MONTHS[a.m]} ${a.y} – ${b.d} ${MONTHS[b.m]} ${b.y}`;
}

export function fmtMonthYear(iso: string): string {
  const { m, y } = parts(iso);
  return `${MONTHS[m]} ${y}`;
}

export function fmtUsd(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function fmtUsdCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export function fmtNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function daysUntil(iso: string, today: string): number {
  return Math.round((Date.parse(iso) - Date.parse(today)) / 86_400_000);
}

/** "in 24 days", "today", "tomorrow", "3 days ago", "in 2 months". */
export function fmtRelativeDays(n: number): string {
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  const abs = Math.abs(n);
  const unit = abs >= 60 ? `${Math.round(abs / 30)} months` : abs >= 14 ? `${Math.round(abs / 7)} weeks` : `${abs} days`;
  return n > 0 ? `in ${unit}` : `${unit} ago`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${fmtDate(iso)}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
