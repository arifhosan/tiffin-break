# Backlog: open points, feedback, improvements

Collected on 2026-10-21 from the per-task reviews, the final whole-branch review, the hands-on play-test in Chrome, and the build process itself. Items already fixed are left out. Severity: **P1** fix before sharing widely · **P2** should fix · **P3** nice to have.

## Before the first public deploy
- **P1** Play a full match of each game by hand on a real phone (Android and iPhone). Every automated check so far ran in desktop Chrome.
- **P1** Check game input (portrait: upright pages, football's pitch turned inside its SVG; landscape: the spreads) and the bench focus ring in Safari/WebKit and Firefox. It's untested outside Chrome. The checks need the Playwright WebKit/Firefox downloads, or a real iPhone. If taps are off, fix it in one place: `toSvg()` in `src/geom.ts`.
- **P2** Add an `og:image` (a nice notebook-page PNG) so Facebook and Messenger link previews look good.

## Gameplay and balance
- **P1 Football: the CPU can basically never score** (play-test 2026-10-21, before the v2.3 roll-in). No CPU formation has a player within one line of the human goal (nearest about 250 away). Browser: CPU 0 goals in 20 possessions. Sim, first-to-3: CPU 0 goals in 532 possessions, human wins 40/40, median 151 s. That is the real reason matches "run long".
  - Shots only score from about x 690–715 (outside the D-box); from x ≤ 650 the chance is 0%. The game gives no hint about placing a forward there.
  - When every option scores −200, the AI picks one at random, including 33-unit lines into touch. Wobble turns about 30% of planned ray passes into outs.
  - Sim tuning data: CPU with 2 forwards at x=100 → median 92 s, human wins 50%; plus wobble-aware AI → 82 s. First-to-1 today: 40 s.
  - Suggested order: CPU formations with forwards in shot range; break AI ties by field position; a placement hint (e.g. "শুট করতে গোলের কাছে খেলোয়াড় রাখো"). Shorter target or softer throw-ins are secondary.
- **P2 Cricket LBW:** 16% of all drops appeal; 33% in the inner ring vs 11% in the outer (200k-drop sim). Consider a larger inner radius or fewer inner cells.
- **P3 Cricket on landscape phones:** the field takes half the spread, labels about 8 px (portrait is fine at 10+ px).
- **P2 Cricket balance:** the CPU batsman is pure luck (a random point). After people have played, tune it against real human scores so the game stays winnable but not trivial. The cell-count table in `field.ts` is the main lever.
- **P3 Dot Box:** the AI is decent but not chain-aware (no double-dealing); it beat a greedy human 19/20. A harder mode could come later.

## UX polish
- **P2** Leaving a game mid-match (← সূচিপত্র) doesn't ask for confirmation, so progress is lost.
- **P2 Keyboard play:** cricket (flick and lids) and Dot Box have no keyboard input at all, against the CLAUDE.md rule on interactive items.
- **P2 Bench:** an item can be dragged half off the edge, because only its centre is clamped. Clamp by its bounding box.
- **P2 Bench:** ink drawn over a book sits on the wood underneath, so it stays hidden until the book is moved. Maybe draw ink on top, or show a hint.
- **P3 Name editing:** there's no cancel, and Esc closes the whole notebook.
- **P3** The settings dialog doesn't close when you click the backdrop.
- **P3 Dot Box:** a tap in the dead centre of a box picks one of its sides arbitrarily (the pick radius covers the whole box). On a 10x10 phone grid boxes are about 27 px.
- **P3 Dot Box:** the result never says who won on screen (screen-reader only), and the stamp covers the board.
- **P3 Cricket:** Play again resets the overs to 1.
- **P3 Bench:** there's no multi-touch `pointerId` filter, so a second finger can hijack a drag.
- **P3** A focused and "lifted" bench item loses its lift shadow, because the focus filter overrides it.
- **P3 Cricket scorecard (desktop spread):** with 4+ extras in an over, wrapped rows hit the 2nd-innings header, and at 5 overs the innings blocks overlap. The portrait page shows the last two rows per innings and is fine.
- **P3 Dot Box:** the crash fallback shows a "tie" result. Show an honest error message instead.
- **P3 Football:** the error fallback returns to the index rather than to a Result screen.

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
  - `load()` doesn't cap strokes at 300 (`addStroke` does)
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
