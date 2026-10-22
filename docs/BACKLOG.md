# Backlog: open points, feedback, improvements

Collected on 2026-10-21 from the per-task reviews, the final whole-branch review, the hands-on play-test in Chrome, and the build process itself. Items already fixed are left out. Severity: **P1** fix before sharing widely · **P2** should fix · **P3** nice to have.

## Before the first public deploy
- **P1** Play a full match of each game by hand on a real phone (Android and iPhone). Every automated check so far ran in desktop Chrome.
- **P1** Check game input (portrait: upright pages, football's pitch turned inside its SVG; landscape: the spreads) and the bench focus ring in Safari/WebKit and Firefox. It's untested outside Chrome. The checks need the Playwright WebKit/Firefox downloads, or a real iPhone. If taps are off, fix it in one place: `toSvg()` in `src/geom.ts`.
- **P2** Add an `og:image` (a nice notebook-page PNG) so Facebook and Messenger link previews look good.

## Gameplay and balance
- **P2 Football balance (v2.3, sim only):** with the CPU aiming error (σ 0.2 rad) a realistic human wins about 49% of first-to-3 (careful 56%, sloppy 38%); the CPU scores on about 10% of its possessions. Confirm by hand on a phone. From a corner, a full-length pull still only fits for about half the into-pitch directions on a 360 px phone.
- **P2 Cricket LBW:** 16% of all drops appeal; 33% in the inner ring vs 11% in the outer (200k-drop sim). Consider a larger inner radius or fewer inner cells.
- **P3 Cricket on landscape phones:** the field takes half the spread, labels about 8 px (portrait is fine at 10+ px).
- **P2 Cricket balance:** the CPU batsman is pure luck (a random point). After people have played, tune it against real human scores so the game stays winnable but not trivial. The cell-count table in `field.ts` is the main lever.
- **P3 Dot Box:** the AI is decent but not chain-aware (no double-dealing); it beat a greedy human 19/20. A harder mode could come later.

## UX polish
- **P2 Keyboard play:** cricket (flick and lids) and Dot Box have no keyboard input at all, against the CLAUDE.md rule on interactive items.

- **P3 Bench:** in touch emulation, the first tap on an item right after dragging one fires no click (also before the 2026-10-22 fixes). Check on a real phone.
- **P3 Settings:** the reset still uses `confirm()`.

## Engineering
- **P2** Commit the end-to-end checks. The Playwright scripts that played every screen live in the gitignored `.superpowers/` folder, with hard-coded local paths. Move them to `e2e/` with relative paths, so flow, focus and pointer behaviour have a committed regression check. They run on the ux-ui plugin's Playwright, so package.json gains no dependency. Once they're committed, the test-only `data-*` attributes in the DOM earn their place.
- **P2** Add committed tests for the screen orchestration: turn order, double release, and CPU chaining. Today only the pure rules are unit-tested.
- **P3 Storage:** decide on a migration rule before any `tb.v2`. Right now a different version falls back to defaults and gets overwritten.
- **P3** Smaller test gaps the reviews noted:
  - field `hitAt` with negative y and the r = 85 boundary
  - a no-ball through `applyBall`
  - football mouth edges at 189/190/310/311 and the corner exits
  - `applyWobble` σ
  - `svgToPng` XML construction
  - `simplify` keeping a corner
  - a literal expected winner in the Dot Box full-board test
- **P3** Minor robustness:
  - `bn(NaN)` returns Latin text
  - `newDotBox` accepts non-integer sizes
  - `clamp` passes NaN through
- **P3** `src/sound.ts`'s `catch {}` hides real bugs in the sound recipes along with "no Web Audio".
- **P3** Decide on a licence for the project's own code. The repo has none, which means "all rights reserved".

## Later features (from the spec)
- Challenge links: the seed plus a score in the URL, so a friend plays the same match (the seeded RNG is already in place).
- Live online play with a friend.
- English toggle (all strings are already in `src/strings.ts`).
- Pen fight; the চিট game (চোর-পুলিশ-বাবু-ডাকাত), which needs computer players that can bluff believably; a "Sir is coming!" panic button; a replay GIF.

## Process feedback (how this was built)
- **Hands-on play beats green tests.** 92 passing tests and per-task reviews missed that the CPU scored straight from kick-off. The tests only checked that a match *finishes*, not that it's *playable*. For each game, add at least one "a human gets a turn" or "the first move can't end the game" check.
- **Re-check balance when rules change.** Tuning numbers (line length, cell counts, AI weights) were set before anyone played. Play-test after every rule change.
- **The md notes file is AI-written.** It had internal inconsistencies, such as a রাণী in the title with no রাণী role, and odd terms. Keep using it only where the user's memory is silent.
- **Chrome extension play-testing** only works while the Chrome window is in the foreground. Chrome throttles background tabs to 1 frame per second, which made the screenshots time out.
