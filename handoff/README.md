# Hand-code handoff pack

This folder is what you take to the production repo. It is written for you, Ryan: you know JavaScript and the original `app.js` / `vibes.js` / `style.css` intimately, and you have not read this sandbox's source. Nothing in the sandbox gets copied into production; you rebuild each piece by hand, using these documents to know what to build, why, and how to prove it works.

## What is in here

| File | What it is | Use it when |
|---|---|---|
| `HANDCODE_SPEC.md` | The build plan. Eight sections in build order, each item with a decision checkbox, what it fixes, where the working reference is, why it works that way, hand-code notes for vanilla JS, and the test that proves it. | Planning a sprint, building an item, writing its test. |
| `DECISIONS.md` | Every design decision from the rebuild, one line each with the reasoning, grouped by module. | Something in the spec looks arbitrary and you want the why. |
| `ISSUES_TO_CREATE.md` | Ready-to-paste GitHub issues for the bugs that have no issue yet (`BUGS_RESOLVED.md` #13 to #24), in the same shape as your Sprint 7 issues. | Filling the backlog before you start. |
| `REFERENCE_MAP.md` | Production function → sandbox file and function. | You want to see how a specific v1 function was replaced. |

Outside this folder, `../BUGS_RESOLVED.md` is the bug list the spec is built from, `../REPORT.md` is the long-form reasoning, and `../tests/` is the executable description of every behaviour.

## How to use it

1. Read `HANDCODE_SPEC.md` top to bottom once without deciding anything. It is ordered so that each section only depends on the ones before it: data model, then API, then scoring, then storage, then UI behaviour, then accessibility, then hygiene.
2. Go back and tick a decision on every item: Keep, Consider, or Skip. Keep means you will build it as described. Consider means you want it but not in this sprint, or in a smaller form (the hand-code notes usually offer one). Skip means you disagree or it does not apply to production; write a line in your own notes saying why so the decision is on record.
3. Create the issues from `ISSUES_TO_CREATE.md` for anything you marked Keep that does not already have an issue. Sprint 7 (#27 to #39) already covers thirteen of the items; the spec names the issue number on each.
4. Build one item at a time. For each: open the sandbox reference file to see a working version, read the why, write the test described in "Test to write" first if you are adding tests, then write the production code in your own style.
5. When an item is done, check it against the acceptance criteria on its issue and against the matching row of `BUGS_RESOLVED.md`.

## Reading order for the sandbox source, if you want to go deeper

The sandbox is TypeScript, but the logic reads as plain JavaScript with type annotations. Read in this order; each file is short.

1. `src/types.ts`: the shapes everything else uses.
2. `src/core/normalize.ts`, then `tests/normalize.test.ts`.
3. `src/core/vibes.ts` and `src/core/scoring.ts`, then their tests. This is the heart of the app.
4. `src/core/identity.ts`.
5. `src/api/mealdb.ts` and `src/api/loadRecipes.ts`, then `tests/mealdb.test.ts`.
6. `src/storage/storage.ts`, `recipeCodec.ts`, then the three stores.
7. `src/ui/el.ts`, then `resultCard.ts`, `modal.ts`, `print.ts`.
8. `src/main.ts`: the spin flow, which ties it all together. Read it last; it will make sense by then.

## What this pack does not cover

The UI design. The sandbox UI is a faithful copy of v1 so that behaviour could be compared like for like. The redesign is the next experiment (see `../ROADMAP.md`) and its brief comes from you. Section 8 of the spec is a stub until then.
