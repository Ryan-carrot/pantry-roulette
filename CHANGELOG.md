# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [2.0.0] — 2026-11-01

A full rebuild in TypeScript with tests, and a new design. Same idea, same ten vibes, same data source; your saved recipes carry over.

### Added

- A visible spin: a reel runs through the candidate recipes while they load and decelerates onto the pick. It never lands in under 1.7 s and, on a slow connection, skips the landing past 2.5 s so it never feels like a hang.
- A vibe dial: ten options on a swipeable rail, with a "See all ten" grid. Built from radio inputs, so it works from the keyboard and with screen readers.
- A recipe sheet built for cooking from a phone: ingredients you can tick off with a running count, numbered steps at 18px, and Save, Print and Close pinned to the bottom edge.
- A cook-time estimate read from the instructions, shown as "under 30", "30–60" or "over 60 min", labelled as an estimate, or a dash when the recipe mentions no times.
- "Surprise me": a random recipe, re-rolled past ones you have already seen, through the same reel and card.
- An "everything seen" state: when every recipe for your ingredients has been shown, the app says so and offers to clear your history in one tap.
- After a spin the page scrolls so the whole card, buttons included, is on screen.
- A per-session cache of recipe details, so a repeat spin makes no detail requests for recipes it has already loaded.
- A 15 s timeout on every TheMealDB request, a connection-failure message distinct from "nothing found", and a note under the card naming any ingredient whose search failed.
- `prefers-reduced-motion` support for every animation.
- 208 unit tests across the data model, vibe engine, scoring, API layer, storage and every UI component.

### Changed

- New design system: aubergine-black surfaces, one gold accent for the things you press, green for saved and checked, coral for problems; Bricolage Grotesque for names, Archivo for reading. Every value is a token in `src/styles/tokens.css`; see `design/SYSTEM.md`.
- The vibe engine reads each recipe's real instructions. Keyword and length scoring work for the first time, so vibe scores now separate recipes instead of sitting at 10 to 20%.
- The `simple` vibe's weights sum to 1.0, like every other vibe; it could previously never score above 0.9.
- Recipes you have already seen are left out of the pick rather than down-weighted, so every spin shows something new until there is nothing new.
- Ties are broken by matched ingredients, then name, so the same input always gives the same pick.
- Searches across four or five ingredients give each ingredient a fair share of the candidates; before, only the first three counted.
- The card says "X of Y ingredients", "N% score" and "N% vibe". Nothing is labelled "match" any more.
- Saved recipes, the seen list and recently viewed are keyed by TheMealDB id, so two meals with the same name no longer collide. Saves from v1 keep working.
- Saved recipes are capped at 50, with a message when the list is full.
- "Reset Suggestions" is now "Clear seen history", which is what it does.
- Recently viewed thumbnails are real buttons, the recipe view returns focus to whatever opened it, and printing survives a blocked pop-up.
- Recipes with no instructions say "No description available."

### Removed

- The "30 mins" cook time on every recipe. TheMealDB has no cook-time data; v1 showed a constant.
- Emoji in the interface.
- The unused local recipe list and its dead code.

### Fixed

- All 24 bugs listed in [BUGS_RESOLVED.md](BUGS_RESOLVED.md), each mapped to the commit that fixed it. Among them: the vibe engine never seeing instructions, unencoded ingredient searches, the misleading "% match" figure, the broken favourites remove button, corrupt saved data crashing the page, recipe names able to inject markup, a silent crash when every lookup failed, network errors shown as "nothing found", and double spins from the keyboard.

## [1.0.1] — 2026-06-14

### Added

- Print recipe button in the modal with a clean print layout.
- Recently viewed recipes section with localStorage persistence.

## [1.0.0] — 2026-04-26

### Added

- Initial release: ingredient search against TheMealDB, ten vibes, favourites, seen-recipe tracking with reset, full-recipe modal with focus trap, accessibility audit, Open Graph image, custom domain.
