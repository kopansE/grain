import { CalendarRange, Orbit, Settings, Sparkles, Telescope, Users, Zap, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
  /** Matches nested routes such as /conferences/:id */
  match: (pathname: string) => boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Command Center', short: 'Home', icon: Orbit, match: (p) => p === '/' },
  { to: '/conferences', label: 'Explore', short: 'Explore', icon: Telescope, match: (p) => p.startsWith('/conferences') },
  { to: '/plan', label: 'Plan', short: 'Plan', icon: CalendarRange, match: (p) => p.startsWith('/plan') },
  { to: '/contacts', label: 'Relationships', short: 'People', icon: Users, match: (p) => p.startsWith('/contacts') },
  { to: '/discover', label: 'Discover', short: 'Discover', icon: Sparkles, match: (p) => p.startsWith('/discover') },
];

export const CAPTURE_ITEM: NavItem = {
  to: '/capture',
  label: 'Show floor mode',
  short: 'Capture',
  icon: Zap,
  match: (p) => p.startsWith('/capture'),
};

export const SETTINGS_ITEM: NavItem = {
  to: '/settings',
  label: 'Settings',
  short: 'Settings',
  icon: Settings,
  match: (p) => p.startsWith('/settings'),
};

export function pageTitle(pathname: string): string {
  const hit = [...NAV_ITEMS, CAPTURE_ITEM, SETTINGS_ITEM].find((n) => n.match(pathname));
  return hit?.label ?? 'Grain Orbit';
}
