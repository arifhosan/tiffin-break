# Tiffin Break (টিফিন ব্রেক)

A browser game that recreates the pen-and-paper games Bangladeshi students played on the school bench in the 2010s.
- **Audience:** people who were BD school students in the 2010s, now gamers and CS students. **Not** mobile gamers: never add PUBG/CODM/Free Fire tie-ins.
- **Goal:** a polished showcase piece that people share as a nostalgia post on Facebook and Messenger.

## Source of truth
- `docs/superpowers/specs/2026-10-20-tiffin-break-design.md` is the spec (v2.2). It's authoritative for rules and values. Tags: `[user]` means the user decided it, `[call]` means the designer chose it (can be changed), `[md]` means it came from the AI-written notes file.
- `docs/superpowers/plans/2026-10-20-tiffin-break.md` is the original implementation plan (done).
- `bangladeshi_classroom_games_specifications.md` is untracked AI-written notes. Use them only where the user's memory is silent. **The user's own recollection always wins.**

## Commands
```
npm run dev      # dev server
npm test         # vitest (all rules and logic)
npm run build    # tsc + vite build into dist/tiffin-break/
npx wrangler deploy   # Cloudflare Worker static assets; only when the user says so
```
- **Deploy target:** https://arifhosan.me/tiffin-break/. The route `arifhosan.me/tiffin-break*` is in `wrangler.jsonc`, and the rest of the domain belongs to the portfolio Worker.
- Keep `base: './'` and `outDir: dist/tiffin-break` in `vite.config.ts`.

## Architecture
- Vite + React 19 + TypeScript + SVG, with plain CSS (`src/styles.css`).
- No router, state library, game engine, backend or analytics.
- Runtime deps: `react` and `react-dom` only. Ask before adding any dependency.
- **Rules are pure TS:**
  - `*/rules.ts`, `*/match.ts`, `cricket/{field,spin,blind}.ts`, `bench/model.ts`: state plus a move in, new state out, no DOM, unit-tested.
  - `*/ai.ts` only produces moves.
- **Randomness:** only through `makeRng(seed)` (`src/rng.ts`). Never call `Math.random()` in rules or AI.
- **Screens:**
  - `bench/Bench.tsx` is the rearrangeable, drawable desk.
  - `notebook/Notebook.tsx` is the cover with the name label, the index, and the zoom. It holds the `games` mount map.
  - The games are `cricket/Cricket.tsx`, `football/Football.tsx` and `dotbox/DotBoxGame.tsx`.
  - `games/Result.tsx` is the end overlay, drawn in an upright layer.
- **Game screens all follow one pattern:**
  - a `round` key for Play again
  - one sequential async turn loop
  - single-slot input refs (no double-apply)
  - an `alive` ref plus tracked timers cleared on unmount
  - `onBest` called once
  - setup and toss panels portalled into the upright layer
- **Phones never need rotating.** A `GameSlot` with `tall: {W,H}` gets an upright page on portrait screens (the game picks its layout with `usePortrait()` from `src/motion.ts`). Cricket re-lays out; football draws its landscape pitch turned inside the tall SVG. Landscape spreads show on landscape screens.
- **Pointer to SVG:** always use `toSvg()` from `src/geom.ts`, passing the element whose coordinates you want (e.g. football's turned pitch group).
- **Persistence:** one localStorage key, `tb.v1`, accessed only through `src/storage.ts` (validated, try/catch). App saves debounced, with a flush on pagehide.
- **Sharing:** `src/share.ts` (`svgToPng`, `shareOrDownload`).
  - Every `<text>` in a game SVG needs an explicit `fontFamily`. CSS classes don't reach the exported PNG.
  - Desktop downloads the image; touch devices use the share sheet.

## Conventions
- **All visible text is Bengali** and lives in `src/strings.ts`. Show numbers with `bn()` (Bangla digits). Player names may be Latin, and Dot Box initials are English.
- **Fonts:** Atma (Bengali UI), Galada (shouts), Patrick Hand (Latin names). They're SIL OFL; see `public/fonts/OFL.txt`.
- **Colours** are CSS tokens by intent in `styles.css`. No hard-coded colours in components, and no emoji anywhere.
- No brand names, logos or NCTB textbook art. All covers are our own lookalikes.
- **Interactive items** are real buttons, or `role="button"` with `tabIndex=0`, with a Bengali `aria-label` and a visible focus ring. Respect `prefers-reduced-motion`.
- **Code style:** minimal, "ponytail" style. Use stdlib and native platform features first, add no speculative abstractions, and leave one runnable check per non-trivial piece of logic.
- **Commits:** small, frequent, conventional. The default branch is `master`, and the remote is `github.com/arifhosan/tiffin-break`.
- **UI checks:** the ux-ui-agent-skills plugin's Playwright drives installed Chrome (`channel: 'chrome'`). End scripts with `process.exit`, because `browser.close()` hangs on this machine.

## Game rules in brief (full detail in spec §7–§8b)
- **খাতায় ক্রিকেট:** a circle split into 16 wedges, each cut by an inner ring, so 32 cells. The layout is random per match.
  - The bowler spins the page. The batsman's eyes close *before* the spin, they hear it panned in stereo, then press, hold and release to drop the pen blind.
  - Off the circle is out. A line touch triggers an LBW appeal and one blind re-drop.
- **খাতায় ফুটবল (v2.3):**
  - 6 fixed players per side, one of them a goalkeeper, placed first inside its own D-box.
  - The longest slingshot line is 133.
  - Up to 5 lines per possession, then the opponent gets the ball.
  - Goals count only on lines 3–5. Earlier lines are saved, and the keeper gets the ball.
  - A line stopping within 22 short of a goal mouth, with no opponent in the way, rolls in (v2.3).
  - Touching an opponent loses the ball. Stopping in empty space sends the ball to the next player in that direction.
- **ডট বক্স:** classic dots and boxes, grid size 2–10 by 2–10, with English initials in claimed boxes.

## Open follow-ups
The full, prioritised list of open points, feedback and improvements is in **`docs/BACKLOG.md`**. The headlines:
- Football v2.3 balance is tuned in simulation only; it needs a hand play-test on a phone.
- Game input and the focus ring are only verified in Chrome. Safari/Firefox checks need the user's OK to download Playwright WebKit/Firefox.
- Small known issues:
  - Cricket and Dot Box have no keyboard play.
  - Leaving a game mid-match doesn't ask for confirmation.
  - A bench item can be dragged half off the edge.
- The Chor-Police chit game and Pen Fight are deferred (see spec §2).
