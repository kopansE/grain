import { NavLink, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { CAPTURE_ITEM, NAV_ITEMS, SETTINGS_ITEM, type NavItem } from './nav';
import { LogoMark, Wordmark } from './Logo';

function SideLink({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const active = item.match(pathname);
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.92rem] font-medium transition-colors',
        active ? 'text-ink' : 'text-ink-muted hover:text-ink',
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-surface-2 ring-1 ring-line-strong"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
      <Icon className={cn('relative z-10 h-[18px] w-[18px]', active ? 'text-accent' : 'text-ink-dim group-hover:text-ink-muted')} strokeWidth={1.9} />
      <span className="relative z-10">{item.label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:w-[236px] lg:shrink-0 lg:flex-col lg:border-r lg:border-line lg:bg-bg-elevated/60 lg:px-4 lg:py-5">
      <NavLink to="/" className="flex items-center gap-3 px-2">
        <LogoMark />
        <Wordmark className="text-[1.05rem]" />
      </NavLink>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <SideLink key={item.to} item={item} />
        ))}
      </nav>

      <div className="mt-6">
        <NavLink
          to={CAPTURE_ITEM.to}
          className="flex items-center justify-between rounded-xl bg-accent px-3.5 py-3 text-[0.92rem] font-semibold text-bg shadow-glow-accent transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <span className="flex items-center gap-2">
            <CAPTURE_ITEM.icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
            {CAPTURE_ITEM.label}
          </span>
          <span className="rounded-md bg-bg/15 px-1.5 py-0.5 font-mono text-[10px] tracking-wide">PHONE</span>
        </NavLink>
      </div>

      <div className="mt-auto flex flex-col gap-1">
        <SideLink item={SETTINGS_ITEM} />
        <p className="px-3 pt-3 text-[11px] leading-relaxed text-ink-dim">
          Data lives in this browser. Export from Settings to share.
        </p>
      </div>
    </aside>
  );
}

export function MobileTabBar() {
  const { pathname } = useLocation();
  const items = [NAV_ITEMS[0], NAV_ITEMS[1], CAPTURE_ITEM, NAV_ITEMS[3], NAV_ITEMS[2]];
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-line px-2 pt-2 safe-bottom lg:hidden">
      {items.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        const isCapture = item === CAPTURE_ITEM;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn('flex min-w-[56px] flex-col items-center gap-1 rounded-xl px-2 py-1 text-[10.5px] font-medium', active ? 'text-accent' : 'text-ink-dim')}
          >
            {isCapture ? (
              <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-bg shadow-glow-accent">
                <Icon className="h-5 w-5" strokeWidth={2.4} />
              </span>
            ) : (
              <Icon className="h-5 w-5" strokeWidth={1.9} />
            )}
            <span>{item.short}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
