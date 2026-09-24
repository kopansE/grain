import { Route, Routes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import CommandCenter from '@/views/CommandCenter';
import Explore from '@/views/Explore';
import Plan from '@/views/Plan';
import Capture from '@/views/Capture';
import Relationships from '@/views/Relationships';
import Discover from '@/views/Discover';
import Settings from '@/views/Settings';

export default function App() {
  return (
    <Routes>
      {/* Show-floor mode is full screen: no sidebar, no top bar. */}
      <Route path="/capture" element={<Capture />} />

      <Route element={<AppShell />}>
        <Route index element={<CommandCenter />} />
        <Route path="/conferences" element={<Explore />} />
        <Route path="/conferences/:id" element={<Explore />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/contacts" element={<Relationships />} />
        <Route path="/contacts/:id" element={<Relationships />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<CommandCenter />} />
      </Route>
    </Routes>
  );
}
