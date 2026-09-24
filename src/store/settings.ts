import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const MODEL_OPTIONS = [
  { id: 'claude-opus-5', label: 'Claude Opus 5 (default, best judgment)' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (faster)' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fastest)' },
] as const;

export interface SettingsState {
  /** Stored only in this browser. Sent per request to the proxy, never to a third party. */
  anthropicKey: string;
  hubspotToken: string;
  model: string;
  currentRepId: string;
  /** True once the user has dismissed the first-run intro. */
  onboarded: boolean;
  update: (patch: Partial<Omit<SettingsState, 'update'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      anthropicKey: '',
      hubspotToken: '',
      model: 'claude-opus-5',
      currentRepId: 'noa',
      onboarded: false,
      update: (patch) => set(patch),
    }),
    { name: 'orbit.settings' },
  ),
);

/** Demo mode = no user key in this browser. The host may still have a fallback key; the UI learns that from /api/ai ping. */
export const selectHasAnthropicKey = (s: SettingsState) => s.anthropicKey.trim().length > 0;
export const selectHasHubspotToken = (s: SettingsState) => s.hubspotToken.trim().length > 0;
