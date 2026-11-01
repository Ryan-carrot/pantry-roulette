# Pantry Roulette

This is the public production repo for [pantryroulette.com](https://pantryroulette.com). `~/projects/CLAUDE.md` still governs every agent working here, and nothing below relaxes it.

- Work on a feature branch. Never commit to `main`.
- Never push. Ryan reviews every branch and pushes it himself.
- Add no new dependency without a note in the PR explaining why.
- Keep the tests green: `npx vitest run`, `npx tsc --noEmit` and `npm run build` pass before every commit.
- No `innerHTML`. Build DOM with the `el()` helper in `src/ui/el.ts`.
- Record every design decision, with its reason, in `docs/DECISIONS.md`.
