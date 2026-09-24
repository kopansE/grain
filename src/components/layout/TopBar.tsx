import { NavLink, useLocation } from 'react-router';
import { Search, Sparkles } from 'lucide-react';
import { useSettings, selectAiLive } from '@/store/settings';
import { pageTitle } from './nav';
import { LogoMark } from './Logo';
import { usePalette } from './CommandPalette';

export function TopBar() {
  const { pathname } = useLocation();
  const hasKey = useSettings(selectAiLive);
  const repId = useSettings((s) => s.currentRepId);
  const openPalette = usePalette((s) => s.setOpen);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/70 px-4 backdrop-blur-md lg:px-8">
      <NavLink to="/" className="lg:hidden">
        <LogoMark className="h-7 w-7" />
      </NavLink>
      <h1 className="text-[0.95rem] font-semibold tracking-tight text-ink">{pageTitle(pathname)}</h1>

      <div className="ml-auto flex items-center gap-2">
        {!hasKey && (
          <NavLink
            to="/settings"
            className="hidden items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent-bright sm:flex"
            title="AI features show pre-generated answers until you add an Anthropic key in Settings"
          >
            <Sparkles className="h-3 w-3" />
            Demo mode
          </NavLink>
        )}
        <button
          type="button"
          onClick={() => openPalette(true)}
          className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[12.5px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          title="Search events, people and actions"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded border border-line bg-bg px-1.5 font-mono text-[10px] text-ink-dim sm:inline">⌘K</kbd>
        </button>
        <NavLink
          to="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-soft font-semibold text-teal ring-1 ring-teal/30"
          title="Current rep. Change in Settings."
        >
          {repId.slice(0, 1).toUpperCase()}
        </NavLink>
      </div>
    </header>
  );
}
