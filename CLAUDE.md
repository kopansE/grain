# Grain Orbit

Conference intelligence tool for Grain's sales team. Built for the "Sales AI Builder" home assignment (brief: `docs/assignment.docx`).

## Read first
- `docs/PLAN.md` is the spec. Follow its phases in order (§12) and commit at each phase boundary. Decisions in §0 are settled; do not reopen them.
- Before writing any code that calls Claude, load the `claude-api` skill to confirm model IDs and the web-search tool shape.
- Before writing charts, load the `dataviz` skill.

## Conventions
- TypeScript strict. Domain logic in `src/domain/` is pure (no React, no store imports) and unit-tested with vitest.
- Never hardcode API keys. Keys come from Settings (localStorage) or, as a server-side fallback, env vars read only inside `api/`.
- Every AI feature must work in demo mode (no key) via `src/data/seed/demoAi.ts`.
- Mobile first for `/capture`; test at 390px width.
- Commit messages: conventional prefix (`feat:`, `fix:`, `chore:`, `polish:`, `docs:`), imperative, one line.
- Run `npm run typecheck && npm run test && npm run build` before every commit.

## Audience reminder
The evaluators are not all engineers. The README is written for a non-technical salesperson. UI copy is plain English, no jargon.
