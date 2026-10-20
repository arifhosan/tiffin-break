# Tiffin Break Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static browser game: a top-down school-bench hub, Spin Cricket, and Pass Football against the computer, with notebook-page PNG sharing.

**Architecture:** Vite + React 19 + TypeScript SPA. Game rules are pure TS modules (state + move → state) unit-tested with Vitest; the AI only emits moves. React components render SVG and animate with CSS transforms / `stroke-dashoffset`. All randomness comes from one seeded RNG per match.

**Tech Stack:** Vite, React 19, TypeScript, Vitest, plain CSS, Web Audio API, Cloudflare Pages (static).

**Spec:** `docs/superpowers/specs/2026-10-20-tiffin-break-design.md`. Read it before any task; zone tables, constants and rules there are authoritative.

## Global Constraints

- Runtime deps: `react`, `react-dom` only. Dev deps: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `@types/react`, `@types/react-dom`. Nothing else without asking.
- No backend, router, state library, game engine, analytics, or external network calls at runtime (fonts are self-hosted).
- Fonts: Patrick Hand (Latin) and Galada (Bangla), SIL OFL, `.woff2` files in `public/fonts/`, credited in settings.
- All user-visible text lives in `src/strings.ts` (Banglish: English UI, Bangla shouts).
- All randomness goes through `makeRng(seed)` from `src/rng.ts`; never `Math.random()` in rules or AI.
- Layout fits 360 px wide; centred, max 480 px wide on desktop. Pointer events (mouse + touch).
- `prefers-reduced-motion: reduce` → spin and line-draw animations jump to their end state.
- Tappable things are `<button>` (or `role="button"` + `tabIndex=0`) with accessible names and a visible focus ring.
- localStorage access is wrapped in try/catch; the game works without it.
- Node 20+. Commands: `npm test` (vitest run), `npm run dev`, `npm run build`.

## Review Focus

1. **Football: a line touching an opponent AND crossing the goal mouth** → the earlier event along the segment wins (an interception in front of the goal is not a goal). Test in Task 6.
2. **Football: the ray after an empty-space stop hits no dot** → falls back to the out rule at the ray's exit point, opponent nearest the exit gets the ball. Test in Task 6.
3. **Cricket: a tap outside the ground or exactly on a zone boundary** → WIDE for r ≥ 190; a boundary point belongs to the zone starting there (r = 130 is outer, angle 45° is sector 1). Test in Task 3.
4. **Cricket: the chase passes the target mid-over** → the match ends immediately with "won by N wickets", with no further balls. Equal totals → tie. Test in Task 4.
5. **Share on a desktop browser without file-share support** → PNG downloads, and the handwriting font is present in the image (not a fallback serif). Manual check in Task 9.

---

### Task 1: Project scaffold, RNG, strings

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore` (add `node_modules`, `dist`, `.superpowers/`), `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/rng.ts`, `src/strings.ts`, `public/fonts/PatrickHand-Regular.woff2`, `public/fonts/Galada-Regular.woff2`
- Test: `src/rng.test.ts`

**Interfaces:**
- Produces: `makeRng(seed: number): () => number` (mulberry32, returns [0,1)); `gaussian(rng: () => number, sigma: number): number` (Box–Muller, mean 0); `strings` (a plain `as const` object); `type Screen = 'bench' | 'cricket' | 'football'` in `App.tsx`.

- [ ] **Step 1:** `git init` is already done. Scaffold with `npm create vite@latest . -- --template react-ts`, delete the template demo files, then `npm i -D vitest`. Add the script `"test": "vitest run"`.
- [ ] **Step 2:** Download Patrick Hand and Galada `.woff2` (Google Fonts, OFL) into `public/fonts/`. Declare both with `@font-face` in `styles.css`. Set CSS variables `--ink: #1d3fa0`, `--paper: #fdfcf6`, `--rule: #b9d2ec`, `--wood: #7a4b2a`, and a body background.
- [ ] **Step 3: Write the failing test** `src/rng.test.ts`:
```ts
import { makeRng, gaussian } from './rng'
test('same seed, same sequence', () => {
  const a = makeRng(42), b = makeRng(42)
  expect([a(), a(), a()]).toEqual([b(), b(), b()])
})
test('values in [0,1)', () => {
  const r = makeRng(1)
  for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1) }
})
test('gaussian has roughly the right spread', () => {
  const r = makeRng(7); const xs = Array.from({ length: 5000 }, () => gaussian(r, 2))
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length)
  expect(Math.abs(mean)).toBeLessThan(0.1); expect(sd).toBeGreaterThan(1.8); expect(sd).toBeLessThan(2.2)
})
```
- [ ] **Step 4:** Run `npm test` and expect it to FAIL (module not found).
- [ ] **Step 5:** Implement `src/rng.ts`. Implement `src/strings.ts` with every label used in the spec (bench items, setup options, toss, shouts `six: 'ছক্কা!'`, `out: 'আউট!'`, `goal: 'গোল!'`, `matchOver: 'টিফিন শেষ!'`, result templates, share/play again/back, settings, credits). Implement `App.tsx` with `useState<Screen>('bench')`, rendering placeholder components.
- [ ] **Step 6:** Run `npm test` and expect PASS. Run `npm run dev` and confirm the page loads with the handwriting font.
- [ ] **Step 7:** Commit `chore: scaffold vite react app with seeded rng and strings`.

### Task 2: Ink helpers and Notebook page

**Files:**
- Create: `src/ink.ts`, `src/Notebook.tsx`
- Test: `src/ink.test.ts`

**Interfaces:**
- Consumes: `makeRng`.
- Produces:
  - `wobblyLine(x1: number, y1: number, x2: number, y2: number, rng: () => number, amp?: number): string`, an SVG path `d`. Default amp is 1.2. It starts exactly at (x1,y1) and ends exactly at (x2,y2), with 3–6 intermediate points offset perpendicular by up to ±amp.
  - `wobblyCircle(cx: number, cy: number, r: number, rng: () => number, amp?: number): string`, a closed path `d`.
  - `<Notebook width height children/>`: an `<svg>` with a ruled-paper background (lines every 18 units, red margin line). It forwards `ref` to the `<svg>`.

- [ ] **Step 1: Failing tests:**
  - `wobblyLine` with the same seed returns the same string.
  - The path starts with `M0,0` and ends with `100,0` for `wobblyLine(0,0,100,0, makeRng(3))`. Format numbers to 1 decimal place.
  - The `wobblyCircle` path ends with `Z`.
- [ ] **Step 2:** Run and expect FAIL.
- [ ] **Step 3:** Implement `ink.ts` and `Notebook.tsx`.
- [ ] **Step 4:** Run and expect PASS.
- [ ] **Step 5:** Commit `feat: hand-drawn ink helpers and notebook page`.

### Task 3: Cricket field, spin physics, landing

**Files:**
- Create: `src/geom.ts` (`export type Point = { x: number; y: number }`), `src/cricket/rules.ts`
- Test: `src/cricket/rules.test.ts`

**Interfaces:**
- Produces:
  - re-exports `Point` from `src/geom.ts`
  - `type Outcome = { kind: 'runs'; runs: 0|1|2|3|4|6 } | { kind: 'out'; how: 'bowled'|'caught'|'run out' } | { kind: 'wide' }`
  - `type Spin = { power: number; dir: 1 | -1; startAngle: number }`
  - Constants `GROUND_R = 190`, `MID_R = 130`, `INNER_R = 60`, `PITCH = { w: 24, h: 70 }`, `MID_SECTORS: Outcome[]`, `OUTER_SECTORS: Outcome[]` (values from spec §6)
  - `outcomeAt(p: Point): Outcome`
  - `spinDuration(s: Spin): number` (seconds)
  - `angleAt(s: Spin, t: number): number` (radians; clamps t to the duration)
  - `finalAngle(s: Spin): number`
  - `quarterTurnTimes(s: Spin): number[]` (seconds at which the page has turned another π/2)
  - `toPage(screen: Point, pageAngle: number): Point` (rotate by −pageAngle about the origin)
  - `toScreen(page: Point, pageAngle: number): Point` (the inverse)

- [ ] **Step 1: Failing tests:**
  - `outcomeAt({x:0,y:0})` → bowled.
  - `outcomeAt({x:40,y:0})` → 0 runs.
  - `outcomeAt({x:100,y:1})` → sector 0 of the middle ring → 1 run.
  - `outcomeAt({x:0,y:160})` → angle 90° → outer sector 2 → 6 runs.
  - `outcomeAt({x:130,y:0.001})` → outer sector 0 → 4 runs (Review Focus 3).
  - Angle exactly 45° at r = 100 (`{x:70.71,y:70.72}`) → middle sector 1 → 2 runs.
  - `outcomeAt({x:190,y:0})` → wide.
  - `outcomeAt({x:300,y:300})` → wide.
  - `spinDuration({power:0,dir:1,startAngle:0})` ≈ 1.0, and with power 1 ≈ 2.667 (toBeCloseTo, 3 decimals).
  - `finalAngle` for power 0 equals `0.75 * 2π` turns (toBeCloseTo).
  - `angleAt(s, 99) === finalAngle(s)`.
  - dir −1 mirrors dir 1.
  - `quarterTurnTimes` for power 0 has length 3 (the third equals the stop time; count with a 1e-9 tolerance) and is strictly increasing.
  - `toScreen(toPage(p, a), a)` ≈ p.
- [ ] **Step 2:** Run and expect FAIL.
- [ ] **Step 3:** Implement. Angle convention: `atan2(y, x)` normalised to [0, 2π), sector `= floor(angle / (π/4))`. Physics: `ω0 = 2π(1.5+2.5p)`, `α = 3π`, `θ(t) = start + dir(ω0 t − ½ α t²)`.
- [ ] **Step 4:** Run and expect PASS.
- [ ] **Step 5:** Commit `feat(cricket): field zones, spin physics, landing`.

### Task 4: Cricket match state

**Files:**
- Create: `src/cricket/match.ts`
- Test: `src/cricket/match.test.ts`

**Interfaces:**
- Consumes: `Outcome`, `Point` (Task 3).
- Produces:
  - `type Side = 'you' | 'cpu'`
  - `type Overs = 1 | 2 | 5`
  - `WICKETS: Record<Overs, number> = {1:2, 2:3, 5:5}`
  - `type Ball = { outcome: Outcome; at: Point }`
  - `type Innings = { batting: Side; runs: number; wickets: number; legalBalls: number; balls: Ball[] }`
  - `type CricketMatch = { overs: Overs; innings: [Innings] | [Innings, Innings]; done: boolean }`
  - `newCricketMatch(overs: Overs, firstBat: Side): CricketMatch`
  - `applyBall(m: CricketMatch, ball: Ball): CricketMatch` (pure)
  - `currentInnings(m): Innings`
  - `target(m): number | null` (first innings runs + 1, during the chase)
  - `cricketResult(m): null | { winner: Side | 'tie'; margin: string }` (margin `"by N runs"` / `"by N wickets"` / `""`)

- [ ] **Step 1: Failing tests:**
  - A wide adds 1 run and does not increment `legalBalls`.
  - After 6 legal balls in a 1-over match, a second innings starts with the other side batting.
  - 2 outs in a 1-over first innings ends it early.
  - Chase passes the target on ball 3: `done === true`, `cricketResult` → winner is the chaser, margin `"by 2 wickets"` with 0 down. Applying another ball after `done` throws (Review Focus 4).
  - Equal totals after both innings → `{winner:'tie', margin:''}`.
  - The defending side wins "by N runs".
- [ ] **Step 2:** Run and expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run and expect PASS.
- [ ] **Step 5:** Commit `feat(cricket): match state and result`.

### Task 5: Cricket AI

**Files:**
- Create: `src/cricket/ai.ts`
- Test: `src/cricket/ai.test.ts`

**Interfaces:**
- Consumes: `Spin`, `finalAngle`, `toScreen`, `outcomeAt`, `toPage` (Task 3); `gaussian`.
- Produces:
  - `aiSpin(rng, startAngle: number): Spin` (power uniform in [0.3, 1], dir random)
  - `aiAim(rng, s: Spin): Point` (a screen point: picks a random outer 6-sector centre at r = 160, rotates it by `finalAngle(s) + gaussian(rng, 0.45)`)

- [ ] **Step 1: Failing tests:**
  - `aiSpin` power is always in [0.3, 1].
  - Simulate 2000 balls (`aiSpin`, then `aiAim`, then `outcomeAt(toPage(aim, finalAngle(spin)))`). Mean runs per legal ball is in [0.8, 3.0], and the out rate is in [0.05, 0.35].
- [ ] **Step 2:** Run and expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run and expect PASS. If the bands fail, tune σ only, not the zone table, and note the new σ in the spec.
- [ ] **Step 5:** Commit `feat(cricket): computer bowler and batsman`.

### Task 6: Football rules

**Files:**
- Create: `src/football/rules.ts`
- Test: `src/football/rules.test.ts`

**Interfaces:**
- Consumes: `Point` from `src/geom.ts` (Task 3).
- Produces:
  - Constants `W=400`, `H=600`, `DOT_R=10`, `HIT_R=12`, `CATCH_R=22`, `MOUTH=[140,260]`, `BOX={x0:100,x1:300,depth:80}`, `MIN_GAP=30`, `EDGE=10`
  - `type Team = 'you' | 'cpu'` (`you` defends y = H)
  - `type Dot = { id: string; team: Team; x: number; y: number }`
  - `type PassResult = { kind:'complete'; to: Dot } | { kind:'intercepted'; by: Dot; at: Point } | { kind:'goal'; scorer: Team; at: Point } | { kind:'out'; to: Dot; at: Point }`
  - `validPlacement(dots: Dot[], c: Dot): boolean`
  - `shotEnd(from: Point, angle: number, length: number): Point`
  - `resolvePass(dots: Dot[], fromDotId: string | null, from: Point, to: Point, team: Team): PassResult`

- [ ] **Step 1: Failing tests.** Build small dot layouts inline, one case per rule in spec §7:
  - complete within 22 of a teammate
  - intercepted when an opponent is within 12 of the segment
  - a teammate on the segment is ignored
  - goal through the top mouth for `you`
  - own goal through the bottom mouth → `scorer:'cpu'`
  - out off the side edge → nearest opponent to the exit point
  - empty-space stop → ray hits a teammate → complete
  - empty-space stop → ray hits an opponent → intercepted
  - **Review Focus 1:** an opponent at (200, 100), just outside the top goal box, with a line from (200,200) to (200,−50) → intercepted, not goal
  - **Review Focus 2:** empty-space stop, ray hits nothing → out at the ray's exit, nearest opponent
  - `validPlacement` rejects: wrong half, inside a goal box, closer than 30 to another dot, within 10 of the edge
- [ ] **Step 2:** Run and expect FAIL.
- [ ] **Step 3:** Implement. Use segment–point distance via projection `t ∈ [0,1]`, and collect events with their `t`. Goal-line crossing: solve for y = 0 / y = H along the segment and check x is in `MOUTH`. Out: the first `t` where x or y leaves [0, W]×[0, H]. The earliest `t` wins. For the ray, reuse the same walker on the segment from `to` to `to + dir·1000`, with dots of both teams as hits and goals ignored.
- [ ] **Step 4:** Run and expect PASS.
- [ ] **Step 5:** Commit `feat(football): pass resolution and placement rules`.

### Task 7: Football match state and AI

**Files:**
- Create: `src/football/match.ts`, `src/football/ai.ts`
- Test: `src/football/match.test.ts`, `src/football/ai.test.ts`

**Interfaces:**
- Consumes: everything from Task 6; `makeRng`, `gaussian`.
- Produces:
  - `DOTS_PER_TEAM = 6`
  - `type Target = 1 | 3 | 5`
  - `type FootballMatch = { target: Target; dots: Dot[]; score: Record<Team, number>; phase: 'placement' | 'play' | 'done'; placingTurn: Team; possession: Team; ball: { dotId: string | null; x: number; y: number } }`
  - `newFootballMatch(target: Target, kickoff: Team): FootballMatch` (placement phase, `you` places first; `kickoff` is stored as the possession for the first play)
  - `place(m, x: number, y: number): FootballMatch` (throws on invalid; alternates; moves to play after 12 dots, ball at (200, 300))
  - `applyPass(m, r: PassResult): FootballMatch`
  - `footballWinner(m): Team | null`
  - `applyWobble(rng, angle: number, length: number): { angle: number; length: number }` (σ 0.07 rad, 8%)
  - `aiPlace(rng, m): { x: number; y: number }` (3 formation templates for the cpu half, ±15 jitter, retried until `validPlacement`)
  - `aiPass(rng, m): { angle: number; length: number }` (72 angles × lengths [100, 200, 300, 400], scoring per spec §7; cpu attacks y = H)

- [ ] **Step 1: Failing tests.**
  - **match:**
    - 12 placements move the phase to play.
    - A goal increments the score, resets the ball to the centre with `dotId:null`, and gives possession to the conceding team.
    - Reaching the target sets `done` and `footballWinner`.
    - A complete pass keeps possession; an interception swaps it.
  - **ai:**
    - `aiPlace` called 6 times via `place` always yields valid placements (100 seeds).
    - With an open lane and the ball at (200, 500) for cpu (no dots between it and the bottom mouth), `aiPass` → `resolvePass` without wobble gives `goal`.
    - When the only forward lane is blocked by a `you` dot, `aiPass` chooses a `complete` pass.
- [ ] **Step 2:** Run and expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run and expect PASS.
- [ ] **Step 5:** Commit `feat(football): match flow and computer player`.

### Task 8: Sound, Bench hub, game screens

**Files:**
- Create: `src/sound.ts`, `src/bench/Bench.tsx`, `src/Settings.tsx`, `src/cricket/Cricket.tsx`, `src/football/Football.tsx`, `src/Scorecard.tsx`
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: all rules, match and AI modules; `Notebook`, `wobblyLine`, `wobblyCircle`; `strings`.
- Produces:
  - `play(name: 'rustle' | 'thud' | 'scratch' | 'bell' | 'cheer' | 'groan'): void`
  - `setMuted(m: boolean): void`, `isMuted(): boolean` (persisted under the localStorage key `tb.muted`)
  - `<Bench onPick={(s: 'cricket' | 'football') => void} />`
  - `<Cricket onExit={() => void} />`
  - `<Football onExit={() => void} />`
  - `<Scorecard lines={string[]} />` (an SVG `<g>`)
  - Each game exposes its `<svg>` ref to the result phase for sharing (Task 9).

- [ ] **Step 1: `sound.ts`.** Create the AudioContext lazily on the first `play`. Synthesise each sound: rustle = 60 ms band-passed noise; thud = 80 Hz sine with a fast decay; scratch = high-passed noise; bell = 880 Hz + 1320 Hz sines decaying over 1.2 s; cheer and groan = noise sweeps.
- [ ] **Step 2: `Bench.tsx`.** Top-down desk per spec §5:
  - Two exercise-book buttons and a pen button that opens `Settings`.
  - A tiffin box that wiggles on tap.
  - Scratched-name decoration.
  - `Settings` has a sound toggle and font credits (Patrick Hand and Galada, SIL OFL).
- [ ] **Step 3: `Cricket.tsx`.** Phases: setup (overs 1/2/5, default 1) → toss → balls → result.
  - **Rotation:** the page rotates via CSS `transform: rotate()` driven by `requestAnimationFrame` sampling `angleAt`. Play `rustle` at each `quarterTurnTimes`, and `thud` at the end.
  - **Bowling:** when you bowl, flick power = `clamp(speed_px_per_ms / 2, 0, 1)`; the direction comes from the sign of the cross product of the flick vector and the radius vector.
  - **Batting:** while you bat, a black blink overlay covers the page from the flick until your tap. Your tap is converted to page coordinates with `getScreenCTM().inverse()`, then jitter (σ = 6), then `toPage`.
  - **After each ball:** draw an ink dot (`wobblyCircle` r = 3), flash the zone, and show the shout from `strings`.
  - **Result:** `Scorecard` inside the SVG, with Share, Play again and Back buttons.
  - **Reduced motion:** jump straight to `finalAngle`.
- [ ] **Step 4: `Football.tsx`.** Phases: setup (first to 1/3/5, default 1) → toss → placement (tap to place, invalid taps shake) → play → result.
  - **Passing:** a slingshot drag from the ball (max 120 px → length 60–400), then `applyWobble`, `shotEnd` and `resolvePass`.
  - **Drawing:** draw the segment with `wobblyLine` and animate it with `stroke-dashoffset` while `scratch` plays.
  - **Empty-space rule:** for rule 5, draw the extension as a dotted line.
  - **Interceptions:** pulse the intercepting dot.
  - **CPU turns:** wait 600 ms, then `aiPass`.
  - **Result:** the page keeps all lines; `Scorecard` reads "You 3 – 1 CPU".
- [ ] **Step 5: Manual verification** (`npm run dev`, at 360 px and desktop widths):
  - A full 1-over cricket match and a first-to-1 football match both finish and show the result.
  - Tapping outside the ground shows WIDE.
  - Mute persists after a reload.
  - All bench buttons are reachable by Tab with a visible focus ring.
  - Reduced-motion emulation (DevTools rendering panel) skips the animations.
- [ ] **Step 6:** Commit `feat: bench hub, sound, cricket and football screens`.

### Task 9: Share image and release build

**Files:**
- Create: `src/share.ts`, `README.md`
- Modify: `src/cricket/Cricket.tsx`, `src/football/Football.tsx` (wire up the Share button)

**Interfaces:**
- Produces:
  - `svgToPng(svg: SVGSVGElement, scale?: number): Promise<Blob>` (default scale 2; clones the SVG, injects `<style>` with both fonts as base64 `@font-face` fetched from `/fonts/*.woff2`, serialises, loads into an `Image`, draws on a canvas, returns `toBlob('image/png')`)
  - `shareOrDownload(blob: Blob, filename: string, text: string): Promise<'shared' | 'downloaded'>` (`navigator.canShare?.({ files: [file] })` → `navigator.share`, otherwise an `<a download>` click)

- [ ] **Step 1:** Implement `share.ts` and wire the Share buttons (`tiffin-break-cricket.png` / `tiffin-break-football.png`; text from `strings`). If the user cancels the share sheet (`AbortError`), do nothing.
- [ ] **Step 2: Manual verification (Review Focus 5):**
  - On desktop Chrome, Share downloads a PNG at 2× size. The PNG shows the ruled page, every ink mark, the scorecard, and the Patrick Hand and Galada glyphs (not a fallback font).
  - On an Android phone (or Chrome DevTools device mode with Web Share), the share sheet opens with the image.
- [ ] **Step 3:** Run `npm test` (all PASS) and `npm run build` (no type errors). Then `npx vite preview` and play one match of each game from the production build.
- [ ] **Step 4:** Write `README.md`: what the game is, `npm i` / `npm run dev` / `npm test` / `npm run build`, and deploying with `npx wrangler pages deploy dist --project-name tiffin-break`. Do not run the deploy without the user's go-ahead.
- [ ] **Step 5:** Commit `feat: share notebook page as image; readme`.
