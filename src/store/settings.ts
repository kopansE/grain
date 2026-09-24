import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GeoPoint, ScoringWeights } from '@/domain/types';
import { DEFAULT_WEIGHTS } from '@/domain/scoring';
import { HOME_BASES } from '@/lib/geo';

export const MODEL_OPTIONS = [
  { id: 'claude-opus-5', label: 'Claude Opus 5', hint: 'Default. Best judgment.' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', hint: 'Faster.' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', hint: 'Fastest, cheapest.' },
] as const;

export interface SettingsState {
  /** Stored only in this browser. Sent per request to the proxy, never to a third party. */
  anthropicKey: string;
  hubspotToken: string;
  model: string;
  currentRepId: string;
  weights: ScoringWeights;
  presetId: string;
  homeBase: GeoPoint;
  annualBudgetUsd: number;
  /** True once the user has dismissed the first-run intro. */
  onboarded: boolean;
  /** Set by the ping check when the host has a fallback key, so demo mode can switch off without a user key. */
  hostHasAnthropicKey: boolean;
  hostHasHubspotToken: boolean;
  update: (patch: Partial<Omit<SettingsState, 'update' | 'setWeights'>>) => void;
  setWeights: (weights: ScoringWeights, presetId?: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      anthropicKey: '',
      hubspotToken: '',
      model: 'claude-opus-5',
      currentRepId: 'noa',
      weights: DEFAULT_WEIGHTS,
      presetId: 'pipeline',
      homeBase: HOME_BASES.TLV,
      annualBudgetUsd: 350_000,
      onboarded: false,
      hostHasAnthropicKey: false,
      hostHasHubspotToken: false,
      update: (patch) => set(patch),
      setWeights: (weights, presetId = 'custom') => set({ weights, presetId }),
    }),
    { name: 'orbit.settings', version: 1 },
  ),
);

/** Live AI is available when the user has a key, or the host has one. Otherwise AI features show demo responses. */
export const selectAiLive = (s: SettingsState) => s.anthropicKey.trim().length > 0 || s.hostHasAnthropicKey;
export const selectHubspotLive = (s: SettingsState) => s.hubspotToken.trim().length > 0 || s.hostHasHubspotToken;
