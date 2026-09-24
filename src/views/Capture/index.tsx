import { NavLink } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Placeholder } from '@/components/ui/Placeholder';

export default function Capture() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-4">
      <NavLink to="/" className="flex items-center gap-2 text-sm text-ink-muted">
        <ArrowLeft className="h-4 w-4" /> Back to Orbit
      </NavLink>
      <Placeholder title="Show floor mode" phase={6} blurb="Voice, card, or thumbs. Under 20 seconds per lead." />
    </div>
  );
}
