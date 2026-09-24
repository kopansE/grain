import type { Rep } from '@/domain/types';

/** Fictional sales team. Names are placeholders; edit freely in Settings. */
export const SEED_REPS: Rep[] = [
  { id: 'noa', name: 'Noa Barak', initials: 'NB', color: '#e8a94a', homeBase: 'TLV', role: 'Head of Sales' },
  { id: 'daniel', name: 'Daniel Cohen', initials: 'DC', color: '#5ecbb8', homeBase: 'TLV', role: 'Account Executive, EMEA' },
  { id: 'maya', name: 'Maya Levin', initials: 'ML', color: '#8593f5', homeBase: 'NYC', role: 'Account Executive, Americas' },
  { id: 'tom', name: 'Tom Reilly', initials: 'TR', color: '#f07082', homeBase: 'LON', role: 'Account Executive, UK & Travel' },
];
