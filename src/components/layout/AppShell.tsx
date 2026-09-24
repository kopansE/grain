import { Outlet, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { MobileTabBar, Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Toaster } from '@/components/ui/Toast';

export function AppShell() {
  const { pathname } = useLocation();
  // Animate on section change, not on every nested id change.
  const sectionKey = '/' + (pathname.split('/')[1] ?? '');

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={sectionKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto w-full max-w-[1440px]"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MobileTabBar />
      <Toaster />
    </div>
  );
}
