import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ArcAi, Conference, ConferenceStatus, Contact, Encounter, HubspotSync, Rep } from '@/domain/types';
import { SEED_CONFERENCES, SEED_CONTACTS, SEED_ENCOUNTERS, SEED_REPS, SEED_VERSION } from '@/data/seed';

/**
 * All user data. Persisted to localStorage under one key so Export/Import is
 * a single JSON blob. Scores, arcs and clusters are derived, never stored.
 */

export function newId(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

export interface DataSnapshot {
  version: number;
  exportedAt: string;
  conferences: Conference[];
  encounters: Encounter[];
  contacts: Contact[];
  reps: Rep[];
}

export interface DataState {
  seedVersion: number;
  conferences: Conference[];
  encounters: Encounter[];
  contacts: Contact[];
  reps: Rep[];

  // Conferences
  addConference: (c: Conference) => void;
  updateConference: (id: string, patch: Partial<Conference>) => void;
  setConferenceStatus: (id: string, status: ConferenceStatus) => void;
  toggleRep: (conferenceId: string, repId: string) => void;
  removeConference: (id: string) => void;

  // Encounters and contacts
  /** Saves an encounter. Links to `contactId` when given, otherwise creates a new contact. Returns the contact id. */
  addEncounter: (e: Omit<Encounter, 'contactId'> & { contactId?: string }, contactId?: string) => string;
  updateEncounter: (id: string, patch: Partial<Encounter>) => void;
  setNextStepDone: (encounterId: string, done: boolean) => void;
  setHubspotSync: (encounterId: string, sync: HubspotSync, hubspotContactId?: string) => void;
  relinkEncounter: (encounterId: string, contactId: string) => void;
  mergeContacts: (intoId: string, fromId: string) => void;
  unmergeContact: (id: string) => void;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  setArcAi: (contactId: string, ai: ArcAi | undefined) => void;

  // Reps
  upsertRep: (rep: Rep) => void;
  removeRep: (id: string) => void;

  // Data management
  resetToSeed: () => void;
  exportSnapshot: () => DataSnapshot;
  importSnapshot: (snap: DataSnapshot) => void;
}

function contactFromEncounter(e: Encounter, id: string): Contact {
  return {
    id,
    canonicalName: e.name,
    aliases: [e.name],
    emails: e.email ? [e.email] : [],
    phones: e.phone ? [e.phone] : [],
    linkedin: e.linkedin,
    currentCompany: e.company,
    currentTitle: e.title,
    encounterIds: [e.id],
  };
}

/** Fold an encounter's identifiers into a contact. The latest encounter wins for company and title. */
function absorb(contact: Contact, e: Encounter, all: Encounter[]): Contact {
  const own = all.filter((x) => x.contactId === contact.id || x.id === e.id);
  const latest = own.reduce((m, x) => (x.capturedAt > m.capturedAt ? x : m), e);
  return {
    ...contact,
    aliases: contact.aliases.includes(e.name) ? contact.aliases : [...contact.aliases, e.name],
    emails: e.email && !contact.emails.includes(e.email) ? [...contact.emails, e.email] : contact.emails,
    phones: e.phone && !contact.phones.includes(e.phone) ? [...contact.phones, e.phone] : contact.phones,
    linkedin: contact.linkedin ?? e.linkedin,
    currentCompany: latest.company,
    currentTitle: latest.title ?? contact.currentTitle,
    encounterIds: contact.encounterIds.includes(e.id) ? contact.encounterIds : [...contact.encounterIds, e.id],
  };
}

const seedState = () => ({
  seedVersion: SEED_VERSION,
  conferences: SEED_CONFERENCES,
  encounters: SEED_ENCOUNTERS,
  contacts: SEED_CONTACTS,
  reps: SEED_REPS,
});

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      addConference: (c) => set((s) => ({ conferences: [...s.conferences, c] })),
      updateConference: (id, patch) => set((s) => ({ conferences: s.conferences.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      setConferenceStatus: (id, status) => get().updateConference(id, { status }),
      toggleRep: (conferenceId, repId) =>
        set((s) => ({
          conferences: s.conferences.map((c) =>
            c.id === conferenceId
              ? { ...c, assignedRepIds: c.assignedRepIds.includes(repId) ? c.assignedRepIds.filter((r) => r !== repId) : [...c.assignedRepIds, repId] }
              : c,
          ),
        })),
      removeConference: (id) => set((s) => ({ conferences: s.conferences.filter((c) => c.id !== id) })),

      addEncounter: (input, contactId) => {
        const s = get();
        const id = input.id || newId('e');
        const targetId = contactId ?? input.contactId ?? newId('c');
        const encounter: Encounter = { ...input, id, contactId: targetId, hubspot: input.hubspot ?? { status: 'unsynced' } };
        const existing = s.contacts.find((c) => c.id === targetId);
        const contacts = existing
          ? s.contacts.map((c) => (c.id === targetId ? absorb(c, encounter, s.encounters) : c))
          : [...s.contacts, contactFromEncounter(encounter, targetId)];
        set({ encounters: [...s.encounters, encounter], contacts });
        return targetId;
      },
      updateEncounter: (id, patch) => set((s) => ({ encounters: s.encounters.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      setNextStepDone: (encounterId, done) => get().updateEncounter(encounterId, { nextStepDone: done }),
      setHubspotSync: (encounterId, sync, hubspotContactId) =>
        set((s) => {
          const enc = s.encounters.find((e) => e.id === encounterId);
          return {
            encounters: s.encounters.map((e) => (e.id === encounterId ? { ...e, hubspot: sync } : e)),
            contacts: hubspotContactId && enc ? s.contacts.map((c) => (c.id === enc.contactId ? { ...c, hubspotContactId } : c)) : s.contacts,
          };
        }),
      relinkEncounter: (encounterId, contactId) =>
        set((s) => {
          const enc = s.encounters.find((e) => e.id === encounterId);
          if (!enc || enc.contactId === contactId) return {};
          const moved: Encounter = { ...enc, contactId };
          const encounters = s.encounters.map((e) => (e.id === encounterId ? moved : e));
          let contacts = s.contacts.map((c) =>
            c.id === enc.contactId ? { ...c, encounterIds: c.encounterIds.filter((x) => x !== encounterId) } : c,
          );
          const target = contacts.find((c) => c.id === contactId);
          contacts = target ? contacts.map((c) => (c.id === contactId ? absorb(c, moved, encounters) : c)) : [...contacts, contactFromEncounter(moved, contactId)];
          // Drop contacts left with no encounters.
          contacts = contacts.filter((c) => c.encounterIds.length > 0);
          return { encounters, contacts };
        }),
      mergeContacts: (intoId, fromId) =>
        set((s) => {
          if (intoId === fromId) return {};
          const into = s.contacts.find((c) => c.id === intoId);
          const from = s.contacts.find((c) => c.id === fromId);
          if (!into || !from) return {};
          const encounters = s.encounters.map((e) => (e.contactId === fromId ? { ...e, contactId: intoId } : e));
          const own = encounters.filter((e) => e.contactId === intoId).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
          const latest = own[own.length - 1];
          const merged: Contact = {
            ...into,
            aliases: [...new Set([...into.aliases, ...from.aliases])],
            emails: [...new Set([...into.emails, ...from.emails])],
            phones: [...new Set([...into.phones, ...from.phones])],
            linkedin: into.linkedin ?? from.linkedin,
            currentCompany: latest?.company ?? into.currentCompany,
            currentTitle: latest?.title ?? into.currentTitle,
            encounterIds: own.map((e) => e.id),
            mergedFrom: [...(into.mergedFrom ?? []), fromId],
            hubspotContactId: into.hubspotContactId ?? from.hubspotContactId,
          };
          return {
            encounters,
            // Keep the merged-away contact around (with no encounters) so unmerge can restore it.
            contacts: s.contacts.map((c) => (c.id === intoId ? merged : c.id === fromId ? { ...c, encounterIds: [] } : c)),
          };
        }),
      unmergeContact: (id) =>
        set((s) => {
          const contact = s.contacts.find((c) => c.id === id);
          const fromId = contact?.mergedFrom?.[contact.mergedFrom.length - 1];
          const from = fromId ? s.contacts.find((c) => c.id === fromId) : undefined;
          if (!contact || !fromId || !from) return {};
          // Encounters whose recorded name/company match the old contact's aliases go back.
          const goingBack = s.encounters.filter((e) => e.contactId === id && from.aliases.includes(e.name) && !contact.aliases.filter((a) => !from.aliases.includes(a)).includes(e.name));
          const backIds = new Set(goingBack.map((e) => e.id));
          const encounters = s.encounters.map((e) => (backIds.has(e.id) ? { ...e, contactId: fromId } : e));
          return {
            encounters,
            contacts: s.contacts.map((c) =>
              c.id === id
                ? { ...c, encounterIds: c.encounterIds.filter((x) => !backIds.has(x)), mergedFrom: contact.mergedFrom!.slice(0, -1) }
                : c.id === fromId
                  ? { ...c, encounterIds: goingBack.map((e) => e.id) }
                  : c,
            ),
          };
        }),
      updateContact: (id, patch) => set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      setArcAi: (contactId, ai) => set((s) => ({ contacts: s.contacts.map((c) => (c.id === contactId ? { ...c, arcAi: ai } : c)) })),

      upsertRep: (rep) => set((s) => ({ reps: s.reps.some((r) => r.id === rep.id) ? s.reps.map((r) => (r.id === rep.id ? rep : r)) : [...s.reps, rep] })),
      removeRep: (id) => set((s) => ({ reps: s.reps.filter((r) => r.id !== id) })),

      resetToSeed: () => set(seedState()),
      exportSnapshot: () => {
        const s = get();
        return { version: SEED_VERSION, exportedAt: new Date().toISOString(), conferences: s.conferences, encounters: s.encounters, contacts: s.contacts, reps: s.reps };
      },
      importSnapshot: (snap) =>
        set({
          seedVersion: SEED_VERSION,
          conferences: snap.conferences ?? [],
          encounters: snap.encounters ?? [],
          contacts: snap.contacts ?? [],
          reps: snap.reps?.length ? snap.reps : SEED_REPS,
        }),
    }),
    {
      name: 'orbit.data',
      version: 1,
      partialize: (s) => ({ seedVersion: s.seedVersion, conferences: s.conferences, encounters: s.encounters, contacts: s.contacts, reps: s.reps }),
      merge: (persisted, current) => {
        const p = persisted as Partial<DataState> | undefined;
        // Re-seed when the bundled seed moved on, unless the user has captured their own leads.
        const userLeads = (p?.encounters ?? []).some((e) => e.source !== 'seed');
        if (!p || (p.seedVersion !== SEED_VERSION && !userLeads)) return { ...current, ...seedState() };
        return { ...current, ...p };
      },
    },
  ),
);
