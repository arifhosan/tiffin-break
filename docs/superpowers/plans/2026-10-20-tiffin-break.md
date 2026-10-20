# Tiffin Break Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static browser game with three things:
- a rearrangeable, drawable school bench that is remembered between visits
- a notebook with the player's name on it, used as the menu
- three pen-and-paper games against the computer: Spin Cricket, Pass Football and Dot Box, each shareable as a PNG of the page

**Architecture:**
- **App:** a Vite + React 19 + TypeScript single-page app.
- **Game logic:**
  - Rules, match flow and AI are pure TypeScript modules: state plus a move in, new state out. They are unit-tested with Vitest.
  - The AI only produces moves.
  - All randomness comes from one seeded RNG per match.
- **UI:** React components render SVG and animate with CSS transforms and `stroke-dashoffset`.
- **Persistence:** one localStorage key.

**Tech Stack:** Vite, React 19, TypeScript, Vitest, plain CSS, Web Audio API, Cloudflare Pages (static).

**Spec:** `docs/superpowers/specs/2026-10-20-tiffin-break-design.md`. Read it before every task. Its tables, constants and rules are authoritative, and the section numbers below (§) refer to it.

## Global Constraints

- **Dependencies:**
  - Runtime: `react` and `react-dom` only.
  - Dev: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `@types/react`, `@types/react-dom`.
  - Ask before adding anything else.
- **No infrastructure:** no backend, router, state library, game engine or analytics, and no runtime network calls except loading the app's own `/fonts/*`.
- **Fonts:** Atma (Bengali UI), Galada (shouts), Patrick Hand (Latin names). All SIL OFL, `.woff2` in `public/fonts/`, credited in settings.
- **Text:**
  - All visible text is Bengali and lives in `src/strings.ts`.
  - Numbers are shown in Bangla digits via `bn()`.
  - The only exception is a player name typed in English.
- **No brand names, logos or NCTB artwork** in any asset.
- **Randomness:** only through `makeRng(seed)`. Never call `Math.random()` in rules or AI.
- **Bench:** a 600 × 800 bench-unit SVG scaled to fit the window, surrounded by a classroom-floor pattern. It must work at 360 px wide.
- **Input:** pointer events only (mouse and touch).
- **`prefers-reduced-motion: reduce`:** spins, zooms and line drawing jump to their end state, and sounds still play.
- **Accessibility:** interactive items are `<button>`, or `role="button"` with `tabIndex=0`, with a Bengali `aria-label` and a visible focus ring.
- **Storage:** everything is under the localStorage key `tb.v1`. Every access goes through `src/storage.ts`, wrapped in try/catch.
- **Tooling:** Node 20+. `npm test` (vitest run), `npm run dev`, `npm run build`.

## Review Focus

1. **Blocked or corrupt localStorage:** private mode throws, or `tb.v1` holds `"{oops"` or a partial object → the game loads with defaults, merging any valid fields, and never shows a blank screen. Test in Task 1.
2. **LBW re-drop that lands on a line again** → it resolves as a plain drop, with no second appeal and no endless loop. Test in Task 5.
3. **Football: the 3rd line completes a pass but doesn't score** → possession still switches, to the opponent nearest where the line stopped, and the count resets. Test in Task 7.
4. **Dot Box: one line completes two boxes** → both are claimed, the score goes up by 2, and the same player plays again once. Test in Task 8.
5. **A name that is empty, only Bengali, or starts with a digit or space** → the Dot Box initial is "Y" or the first Latin letter, upper-cased. **A saved bench item outside the 600 × 800 board** (from an older version or bad data) → it is clamped back inside. Tests in Tasks 8 and 3.

---

### Task 1: Scaffold, RNG, strings, storage

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/rng.ts`, `src/strings.ts`, `src/storage.ts`, `public/fonts/Atma-Regular.woff2`, `public/fonts/Galada-Regular.woff2`, `public/fonts/PatrickHand-Regular.woff2`
- Modify: `.gitignore` (already has `node_modules`, `dist`, `.superpowers/`)
- Test: `src/rng.test.ts`, `src/strings.test.ts`, `src/storage.test.ts`

**Interfaces:**
- **Produces:**
  - `makeRng(seed: number): () => number` (mulberry32, returns values in [0,1))
  - `gaussian(rng: () => number, sigma: number): number`
  - `shuffle<T>(rng: () => number, xs: T[]): T[]` (Fisher–Yates, returns a copy)
  - `bn(n: number): string` (Bangla digits; keeps `-` and `.`)
  - `strings`: a nested `as const` object of every Bengali label
  - `type ItemId = 'notebook' | 'bookBangla' | 'bookMath' | 'bookEnglish' | 'pen' | 'pencil' | 'eraser' | 'geometry' | 'tiffin'`
  - `type Stroke = { id: string; pts: [number, number][] }`
  - `type Saved = { v: 1; items: Record<ItemId, { x: number; y: number; rot: number }>; strokes: Stroke[]; name: string; muted: boolean; best: { cricket?: number; football?: number; dotbox?: number } }`
  - `DEFAULT_SAVED: Saved` (a messy-desk layout of your choice, inside 600 × 800)
  - `load(): Saved`
  - `save(s: Saved): void`
  - `recordBest(s: Saved, game: 'cricket' | 'football' | 'dotbox', value: number): Saved` (keeps the max)

- [ ] **Step 1: Scaffold.**
  - Run `npm create vite@latest . -- --template react-ts` in the existing repo and delete the demo files.
  - Run `npm i -D vitest` and add the script `"test": "vitest run"`.
  - Download the three fonts (Google Fonts, OFL) as `.woff2` into `public/fonts/`.
  - In `styles.css`, add `@font-face` rules and the CSS variables `--ink:#1d3fa0; --ink-black:#222; --paper:#fdfcf6; --rule:#b9d2ec; --wood:#7a4b2a; --floor:#3b2a1e`, and set the body background to `var(--floor)`.
- [ ] **Step 2: Write the failing tests.**
  - **rng:**
    - Same seed gives the same sequence.
    - 1000 values all fall in [0,1).
    - 5000 values from `gaussian(r, 2)` have a mean whose absolute value is under 0.1, and an SD between 1.8 and 2.2.
    - `shuffle` keeps the same items (sorted equal) and doesn't mutate its input.
  - **strings:** `bn(2014) === '২০১৪'`, `bn(-3) === '-৩'`.
  - **storage** (Review Focus 1):
    - With a stubbed `localStorage` whose `getItem` throws → `load()` deep-equals `DEFAULT_SAVED`.
    - `getItem` returns `'{oops'` → `DEFAULT_SAVED`.
    - It returns `'{"v":1,"name":"Rafi"}'` → `name === 'Rafi'`, and every other field comes from the default.
    - `save` doesn't throw when `setItem` throws.
    - Calling `recordBest` with 10 and then 5 leaves `best.cricket === 10`.
- [ ] **Step 3:** Run `npm test` → FAIL (modules missing).
- [ ] **Step 4: Implement** `rng.ts`, `strings.ts`, `storage.ts`. `App.tsx` holds `const [saved, setSaved] = useState(load)`, calls `save(saved)` in an effect, and renders `<div>` placeholders for `screen: 'bench' | 'notebook'`.
- [ ] **Step 5:** Run `npm test` → PASS. Run `npm run dev` → the page loads on the floor colour.
- [ ] **Step 6:** Commit `chore: scaffold app with seeded rng, bengali strings, storage`.

### Task 2: Geometry, ink, ruled page

**Files:**
- Create: `src/geom.ts`, `src/ink.ts`, `src/Page.tsx`, `src/motion.ts`
- Test: `src/geom.test.ts`, `src/ink.test.ts`

**Interfaces:**
- **Produces:**
  - `type Point = { x: number; y: number }`
  - `type Side = 'you' | 'cpu'`
  - `other(s: Side): Side`
  - `dist(a: Point, b: Point): number`
  - `segPointDist(a: Point, b: Point, p: Point): { d: number; t: number }` (t in [0,1] along a→b)
  - `rotate(p: Point, angle: number): Point` (about the origin)
  - `wobblyLine(x1, y1, x2, y2, rng, amp = 1.2): string`: a path `d` that starts exactly at (x1,y1) and ends exactly at (x2,y2), with 3–6 perpendicular wobbles of up to ±amp, numbers to 1 decimal
  - `wobblyCircle(cx, cy, r, rng, amp = 1.2): string` (closed, ends with `Z`)
  - `<Page width height ref children />`: an `<svg>` with ruled paper (a line every 18 units, red margin line); `ref` is forwarded to the `<svg>`
  - `useReducedMotion(): boolean`

- [ ] **Step 1: Failing tests.**
  - `segPointDist({x:0,y:0},{x:10,y:0},{x:5,y:3})` → `{d:3, t:0.5}`.
  - A point beyond the end clamps t to 1.
  - `rotate({x:1,y:0}, Math.PI/2)` ≈ `{x:0,y:1}`.
  - `wobblyLine(0,0,100,0, makeRng(3))` starts with `M0,0`, ends with `100,0`, and is the same for the same seed.
  - `wobblyCircle` output ends with `Z`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: geometry, hand-drawn ink, ruled page`.

### Task 3: Bench model

**Files:**
- Create: `src/bench/model.ts`
- Test: `src/bench/model.test.ts`

**Interfaces:**
- **Consumes:** `Saved`, `Stroke`, `ItemId` (Task 1); `segPointDist` (Task 2).
- **Produces:**
  - `BENCH_W = 600`, `BENCH_H = 800`, `MAX_STROKES = 300`
  - `moveItem(s: Saved, id: ItemId, x: number, y: number): Saved` (clamps x to [0,600] and y to [0,800])
  - `normalizeItems(s: Saved): Saved` (clamps every item; called by `load`)
  - `simplify(pts: [number, number][], eps = 1.5): [number, number][]` (Ramer–Douglas–Peucker)
  - `addStroke(s: Saved, pts: [number, number][], id: string): Saved` (simplifies; ignores strokes with fewer than 2 points; drops the oldest beyond 300)
  - `eraseAt(s: Saved, p: Point, r = 8): Saved` (removes every stroke with any segment within r of p)
  - `resetBench(s: Saved): Saved` (default items, no strokes; keeps name, muted and best)

- [ ] **Step 1: Failing tests.**
  - `moveItem(..., 'pen', 900, -20)` → pen at (600, 0).
  - **Review Focus 5:** `load()` with saved `items.tiffin = {x:5000,y:5000,rot:0}` → tiffin clamped to (600,800). Wire `normalizeItems` into `load` in this task.
  - `simplify` of 100 collinear points → 2 points.
  - Adding 301 strokes keeps 300, and the first id is gone.
  - A 1-point stroke is ignored.
  - `eraseAt` on a point 5 away from a stroke removes it; 20 away keeps it.
  - `resetBench` keeps `name`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(bench): item moves, strokes, erase, reset`.

### Task 4: Cricket field and spin

**Files:**
- Create: `src/cricket/field.ts`, `src/cricket/spin.ts`
- Test: `src/cricket/field.test.ts`, `src/cricket/spin.test.ts`

**Interfaces:**
- **Consumes:** `Point`, `rotate`; `shuffle`, `makeRng`.
- **Produces (field.ts):**
  - `R = 190`, `INNER = 85`, `WEDGES = 16`, `LINE_TOUCH = 2.5`
  - `type OutHow = 'catch' | 'bowled' | 'lbw' | 'runout'`
  - `type Label = { kind: 'runs'; runs: 1|2|3|4|6 } | { kind: 'dot' } | { kind: 'wide' } | { kind: 'noball' } | { kind: 'out'; how: OutHow }`
  - `type Field = { outer: Label[]; inner: Label[] }` (index = wedge, 16 each)
  - `makeField(rng): Field`: shuffles the spec §7 table counts separately for each ring; each `out` gets a random `how`
  - `type Hit = { kind: 'cell'; ring: 'inner' | 'outer'; wedge: number; label: Label } | { kind: 'off' }`
  - `hitAt(f: Field, p: Point): Hit`: wedge `= floor(angle / (2π/16))`, where `angle = atan2(y,x)` normalised to [0,2π); inner if r < 85; off if r ≥ 190
  - `onLine(p: Point): boolean`: within 2.5 of any radial line at k·22.5° (for r ≤ 192.5), of r = 85, or of r = 190
- **Produces (spin.ts):**
  - `type Spin = { power: number; dir: 1 | -1; startAngle: number }`
  - `spinDuration(s): number`
  - `angleAt(s, t): number` (t clamped)
  - `finalAngle(s): number`
  - `quarterTurnTimes(s): number[]`
  - `toPage(screen: Point, pageAngle: number): Point = rotate(screen, -pageAngle)`
  - `toScreen(page: Point, pageAngle: number): Point`

- [ ] **Step 1: Failing tests.**
  - `makeField(makeRng(1))`:
    - outer labels counted by kind match `{dot:3,'1':3,'2':3,'3':1,'4':3,'6':0,out:2,wide:1,noball:0}`
    - inner labels match `{dot:4,'1':2,'2':2,'3':0,'4':2,'6':3,out:2,wide:0,noball:1}`
    - the same seed gives the same field
  - `hitAt`:
    - `{x:100,y:5}` → outer, wedge 0
    - `{x:0,y:50}` → inner, wedge 4
    - `{x:0,y:190}` → off
    - `{x:300,y:0}` → off
  - `onLine`:
    - `{x:100,y:1}` (near the 0° radial) → true
    - `{x:86,y:30}`: r ≈ 91.1 → false
    - `{x:0,y:84}` (near r = 85, but also on the 90° radial) → true
    - `{x:120,y:40}` → false
  - **spin:**
    - `spinDuration` is 1.0 at power 0 and ≈ 2.667 at power 1.
    - `finalAngle` at power 0 = 1.5π.
    - `angleAt(s, 99) === finalAngle(s)`.
    - dir −1 mirrors dir 1.
    - `quarterTurnTimes` at power 0 has length 3 (count with a 1e-9 tolerance) and is strictly increasing.
    - `toScreen(toPage(p,a),a)` ≈ p.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Physics: `ω0 = 2π(1.5+2.5p)`, `α = 3π`, `θ(t) = start + dir(ω0 t − ½αt²)`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(cricket): random wheel field and spin physics`.

### Task 5: Cricket balls, match, blind input, AI

**Files:**
- Create: `src/cricket/match.ts`, `src/cricket/blind.ts`, `src/cricket/ai.ts`
- Test: `src/cricket/match.test.ts`, `src/cricket/blind.test.ts`, `src/cricket/ai.test.ts`

**Interfaces:**
- **Consumes:** Task 4 exports; `Side`, `gaussian`.
- **Produces:**
  - `type BallOutcome = { kind: 'runs'; runs: 0|1|2|3|4|6 } | { kind: 'extra'; what: 'wide' | 'noball' } | { kind: 'out'; how: OutHow | 'stumped' }`
  - `resolveDrop(f: Field, p: Point, isRedrop: boolean): BallOutcome | { kind: 'appeal' }`:
    - First drop on a line → `appeal`.
    - Re-drop: lands on `out` or off the field → `out lbw`; anything else → `runs 0`. A line touch is ignored on a re-drop.
    - Normal drop: off → `out stumped`, `dot` → `runs 0`, wide/noball → `extra`, out → its `how`.
  - `type Overs = 1 | 2 | 5`, `WICKETS = {1:2, 2:3, 5:5}`
  - `type Ball = { outcome: BallOutcome; at: Point }`
  - `type Innings = { batting: Side; runs: number; wickets: number; legalBalls: number; balls: Ball[] }`
  - `type CricketMatch = { overs: Overs; field: Field; innings: [Innings] | [Innings, Innings]; done: boolean }`
  - `newCricketMatch(overs: Overs, field: Field, firstBat: Side): CricketMatch`
  - `applyBall(m, b: Ball): CricketMatch` (throws if `done`)
  - `currentInnings(m): Innings`
  - `target(m): number | null`
  - `cricketResult(m): null | { winner: Side | 'tie'; by: 'runs' | 'wickets' | null; n: number }`
  - `blindPoint(rng, pressed: Point, holdMs: number): Point`: `pressed` + Gaussian drift with σ per axis = `8·√(holdMs/1000)`, plus a Gaussian tremor with σ = 3
  - `aiSpin(rng, startAngle: number): Spin` (power uniform in [0.3,1], dir ±1)
  - `aiDrop(rng): { pressed: Point; holdMs: number }` (uniform over the disk r ≤ 175, holdMs uniform in [300,1200])

- [ ] **Step 1: Failing tests.**
  - **resolveDrop:**
    - A point on the 0° radial → `appeal`.
    - The same point with `isRedrop:true` resolves from its cell, not as an appeal (**Review Focus 2**).
    - Off the field normally → `out stumped`; off the field on a re-drop → `out lbw`.
  - **match:**
    - A wide adds 1 run with `legalBalls` unchanged.
    - 6 legal balls end a 1-over innings.
    - 2 outs end a 1-over innings early.
    - The chase passes the target on ball 3 → `done`, and the result is `{winner: chaser, by:'wickets', n:2}`; `applyBall` after that throws.
    - Equal totals → `{winner:'tie', by:null, n:0}`.
    - The defending side wins with `by:'runs'`.
  - **blind:** with `holdMs = 1000`, over 4000 samples, the x-offset SD is in [7.5, 9.6] (√(8²+3²) ≈ 8.54), and the mean is within ±0.5.
  - **ai:** across 2000 simulated balls (aiSpin → aiDrop → blindPoint → toPage by finalAngle → resolveDrop, resolving appeals with one more aiDrop), every outcome is valid, mean runs per legal ball is in [0.3, 3.0], and the out rate is in [0.05, 0.6].
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(cricket): ball resolution, lbw appeal, match, blind drop, ai`.

### Task 6: Football pass resolution

**Files:**
- Create: `src/football/rules.ts`
- Test: `src/football/rules.test.ts`

**Interfaces:**
- **Consumes:** `Point`, `Side`, `dist`, `segPointDist`.
- **Produces:**
  - Constants: `W=800`, `H=500`, `DOT_R=10`, `HIT_R=12`, `CATCH_R=22`, `MOUTH=[190,310]`, `DBOX={depth:80, y0:150, y1:350}`, `MIN_GAP=30`, `EDGE=10`, `THROW_IN=10`
  - `you` defends x = 0 and attacks x = 800.
  - `type Dot = { id: string; team: Side; x: number; y: number }`
  - `type PassResult = ({ kind: 'complete'; to: Dot } | { kind: 'intercepted'; by: Dot; at: Point } | { kind: 'goal'; scorer: Side; at: Point } | { kind: 'out'; at: Point; restart: Point }) & { ray?: { from: Point; to: Point } }`: `ray` is set only when the result came from the empty-space ray, and runs from the line's end to the hit or exit point
  - `validPlacement(dots: Dot[], c: { x: number; y: number }): boolean`: anywhere on the pitch, outside both D-boxes, ≥ 10 from the edge, ≥ 30 from any dot
  - `shotEnd(from: Point, angle: number, length: number): Point`
  - `resolvePass(dots: Dot[], fromDotId: string | null, from: Point, to: Point, team: Side): PassResult`
- **Algorithm** (spec §8 "Resolving a pass"):
  - **Collect events along the segment, each with its t:**
    - an opponent within 12 → `intercepted` at the projection point
    - crossing x = 0 or x = 800 with y in `MOUTH` → `goal`; through the defended side, the scorer is `other(team)`
    - leaving [0,W]×[0,H] anywhere else → `out`, with `restart` = the exit point moved 10 inward, perpendicular to the edge it crossed
  - The earliest t wins. The from-dot and own dots are ignored.
  - **If there are no events:**
    - an own dot within 22 of the end point → `complete` (nearest one)
    - otherwise walk the ray from `to` along the same direction up to 2000 units:
      - the first dot of either team within 12 → `complete` for own, `intercepted` (at the dot's position) for an opponent
      - a goal crossing on the ray counts as `out` at the ray's exit point
      - no hit → `out` at the ray's exit point

- [ ] **Step 1: Failing tests.** One small inline layout per rule:
  - complete within 22
  - intercepted when an opponent is within 12 of the segment, with `at` on the segment
  - an own dot on the segment is ignored
  - a goal through the right mouth for `you`
  - an own goal through the left mouth → `scorer:'cpu'`
  - out through the top edge → `restart.y === 10`
  - an opponent at (770,250) on a line (600,250)→(820,250) → intercepted, not goal
  - an empty-space stop whose ray hits an own dot → complete, with `ray` set
  - an empty-space stop whose ray hits an opponent → intercepted at the dot
  - an empty-space stop whose ray passes through the mouth and hits nobody → out (not goal)
  - `validPlacement` rejects:
    - a point in either D-box, e.g. (40,250) or (760,250)
    - a point within 30 of a dot
    - a point within 10 of the edge
    - and accepts (700,100), a spot in the opponent's half
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(football): pass resolution and placement rules`.

### Task 7: Football match, 3-pass rule, AI

**Files:**
- Create: `src/football/match.ts`, `src/football/ai.ts`
- Test: `src/football/match.test.ts`, `src/football/ai.test.ts`

**Interfaces:**
- **Consumes:** Task 6 exports; `gaussian`, `makeRng`.
- **Produces:**
  - `DOTS_PER_TEAM = 6`, `MAX_LINES = 3`, `type Target = 1 | 3 | 5`
  - `type Trail = { from: Point; to: Point; team: Side; ray?: { from: Point; to: Point } }`
  - `type FootballMatch = { target: Target; dots: Dot[]; score: Record<Side, number>; phase: 'placement' | 'play' | 'done'; placingTurn: Side; kickoff: Side; possession: Side; ball: { x: number; y: number; dotId: string | null }; lines: number; trail: Trail[] }`
  - `newFootballMatch(target: Target, kickoff: Side): FootballMatch`
  - `place(m, x: number, y: number): FootballMatch`: throws on an invalid spot; `placingTurn` alternates, starting with `you`; after 12 dots → `play`, ball at (400,250) with `dotId:null`, `possession = kickoff`, `lines = 0`
  - `applyPass(m, from: Point, to: Point, r: PassResult): FootballMatch`:
    - Pushes a `Trail` (copying `r.ray`) and increments `lines`.
    - **Goal:** score +1, ball to the centre, the conceding side kicks off, `lines = 0`.
    - **Intercepted:** the ball goes to `at` with `dotId` = `by.id` only if `at` equals the dot's position, otherwise `null`; possession swaps; `lines = 0`.
    - **Out:** the ball goes to `restart`, possession swaps, `lines = 0`.
    - **Complete:** the ball goes to the dot, and possession stays.
    - **3-pass rule:** if possession stayed and `lines === 3`, give the ball to the opponent's dot nearest `to`, swap possession, `lines = 0`.
    - Sets `done` when the target is reached.
  - `footballWinner(m): Side | null`
  - `applyWobble(rng, angle: number, length: number): { angle: number; length: number }` (σ 0.07 rad; length × (1 + N(0, 0.08)))
  - `aiPlace(rng, m): { x: number; y: number }`: 3 formation templates, ±15 jitter, retry until `validPlacement`, with up to 50 tries and then any valid grid point
  - `aiPass(rng, m): { angle: number; length: number }` (cpu attacks x = 0):
    - Evaluate 72 angles × lengths [112, 225, 337, 450] with `resolvePass`, without wobble.
    - Score: goal 1000; complete 100 + (from.x − to.x); intercepted or out −200.
    - When `m.lines === 2`, every non-goal outcome scores −200 + 0.1 × the distance from the turnover point to (800,250).
    - Pick the max, breaking ties with the RNG.

- [ ] **Step 1: Failing tests.**
  - **match:**
    - 12 valid placements → `play`.
    - An invalid `place` throws.
    - A goal → the score goes up, the ball is at the centre, and the conceder has possession.
    - Reaching the target → `done` and `footballWinner`.
    - Complete keeps possession; intercepted swaps it.
    - **Review Focus 3:** with `lines` at 2, a third `complete` swaps possession to the opponent's dot nearest the line's end, and `lines` resets to 0.
  - **ai:**
    - 100 seeds of 6 `aiPlace` calls through `place` never throw.
    - With the ball at (150,250) for the cpu and an empty lane to the left mouth, `aiPass` without wobble → `goal`.
    - When the only lanes toward goal are blocked by `you` dots but a teammate is open, `aiPass` → `complete`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(football): match flow, 3-pass rule, computer player`.

### Task 8: Dot Box rules, AI, initials

**Files:**
- Create: `src/dotbox/rules.ts`, `src/dotbox/ai.ts`, `src/name.ts`
- Test: `src/dotbox/rules.test.ts`, `src/dotbox/ai.test.ts`, `src/name.test.ts`

**Interfaces:**
- **Consumes:** `Side`, `other`, `Point`, `shuffle`.
- **Produces:**
  - `type Edge = { o: 'h' | 'v'; r: number; c: number }`:
    - `h` joins dot (r,c) to (r,c+1), with r ∈ 0..rows and c ∈ 0..cols−1
    - `v` joins (r,c) to (r+1,c), with r ∈ 0..rows−1 and c ∈ 0..cols
  - `type DotBox = { rows: number; cols: number; h: (Side | null)[][]; v: (Side | null)[][]; boxes: (Side | null)[][]; turn: Side; score: Record<Side, number> }`
  - `newDotBox(rows: number, cols: number, first: Side): DotBox` (throws unless 2 ≤ rows, cols ≤ 10)
  - `legalEdges(g): Edge[]`
  - `playEdge(g, e: Edge): DotBox`: throws if taken; claims the 0–2 boxes it completes; the turn stays if at least one was claimed
  - `dotBoxWinner(g): Side | 'tie' | null`
  - `edgeNear(g, p: Point): Edge | null`: p is in box units (dot (r,c) at (c, r)); returns the nearest free edge whose midpoint is within 0.5
  - `aiEdge(rng, g): Edge`, per spec §8b:
    1. A completing edge.
    2. Otherwise a random edge that leaves no box with 3 sides.
    3. Otherwise the edge minimising `giveaway(g, e)`, the number of boxes the opponent then claims by repeatedly taking completing edges.
  - `initialOf(name: string): string`: the first `[A-Za-z]` upper-cased, else `'Y'`. The CPU's initial is the constant `'C'` in `dotbox/rules.ts`.

- [ ] **Step 1: Failing tests.**
  - **rules:**
    - A 2×2 grid has 12 legal edges.
    - A 4th side claims the box, the score goes up, and the turn stays.
    - A non-completing line passes the turn.
    - **Review Focus 4:** the shared edge between two 3-sided boxes claims both, the score goes up by 2, and the turn stays.
    - A full board → winner, or `'tie'` on equal scores.
    - Playing a taken edge throws.
    - `newDotBox(1,4,'you')` and `newDotBox(11,4,'you')` throw.
    - `edgeNear(g,{x:0.5,y:0.05})` → `{o:'h', r:0, c:0}`.
    - `edgeNear(g,{x:5,y:5})` on a 2×2 grid → `null` (too far from any edge).
    - `edgeNear` skips edges that are already taken.
  - **ai:**
    - Takes an available box.
    - Avoids a third side when a safe edge exists.
    - In a position with only unsafe edges, picks the edge with the smallest giveaway.
  - **name (Review Focus 5):** `initialOf('rafi') === 'R'`, `initialOf('রাফি') === 'Y'`, `initialOf('') === 'Y'`, `initialOf('  9ab') === 'A'`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(dotbox): rules, computer player, initials`.

### Task 9: Sound and bench screen

**Files:**
- Create: `src/sound.ts`, `src/bench/Bench.tsx`, `src/bench/items.tsx`, `src/Settings.tsx`
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces:**
- **Consumes:** `Saved`, `save`, the bench model (Task 3), `wobblyLine`, `strings`.
- **Produces:**
  - `play(name: 'rustle' | 'thud' | 'scratch' | 'bell' | 'cheer' | 'groan' | 'rattle', pan = 0): void` (pan in [−1,1] via a `StereoPannerNode`)
  - `setMuted(m: boolean): void`
  - `<Bench saved setSaved onOpenNotebook={() => void} />`
  - `<Settings saved setSaved onClose />`
  - `items.tsx` exports one SVG component per `ItemId`:
    - brown kraft khata with a white label showing `saved.name`
    - textbooks titled বাংলা / গণিত / English
    - the pen, pencil and eraser
    - the geometry box
    - a steel tiffin box
    - no brand marks

- [ ] **Step 1: `sound.ts`.**
  - A lazy `AudioContext` on the first `play`.
  - `muted` is read from storage via `setMuted`.
  - Synthesise each sound:
    - rustle: 60 ms band-passed noise
    - thud: an 80 Hz decaying sine
    - scratch: high-passed noise
    - bell: 880 Hz + 1320 Hz over 1.2 s
    - cheer and groan: noise sweeps
    - rattle: three short clicks
- [ ] **Step 2: `Bench.tsx`.** An `<svg viewBox="0 0 600 800">` scaled to fit, on the floor background.
  - **Modes:** `move` (default), `draw` (pen tapped) and `erase` (eraser tapped). Tapping the active tool returns to `move`.
  - **Moving:** a pointer drag on an item → `moveItem`.
  - **Drawing:** a drag on the wood collects points (screen → bench via `getScreenCTM().inverse()`), and pointerup → `addStroke`.
  - **Erasing:** dragging calls `eraseAt`.
  - **Tapping items:** a tap (movement under 6 px) on the notebook → `onOpenNotebook`; on the geometry box → `Settings`; on the tiffin box → a CSS wiggle plus `play('rattle')`.
  - Strokes are rendered as ink paths.
- [ ] **Step 3: `Settings.tsx`:** a sound toggle, a reset button (`resetBench` after a `confirm`), and font credits.
- [ ] **Step 4: Manual check** (`npm run dev`, at 360 px and desktop widths):
  - Drag every item; draw and erase.
  - Reload → everything is restored.
  - The layout matches across widths.
  - Tab reaches every item with a visible focus ring.
- [ ] **Step 5:** Commit `feat: bench with rearranging, drawing, erasing, settings, sound`.

### Task 10: Notebook menu, zoom, result and share

**Files:**
- Create: `src/notebook/Notebook.tsx`, `src/games/types.ts`, `src/games/Result.tsx`, `src/share.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- **Consumes:** `Saved`, `recordBest`, `Page`, `strings`, `bn`, `useReducedMotion`.
- **Produces:**
  - `type GameProps = { name: string; onBest: (value: number) => void; onExit: () => void }`
  - `<Notebook saved setSaved onClose />`:
    - **Cover:** the label নাম / শ্রেণি / রোল. If `name` is empty, it shows an input to write it; tapping the label edits it.
    - **Index:** ১. খাতায় ক্রিকেট, ২. খাতায় ফুটবল, ৩. ডট বক্স, ৪. শীঘ্রই আসছে… (disabled), with `bn(best)` next to each game.
    - **Game:** the chosen game zooms to about 90% of the viewport via a CSS `transform` transition; the football spread is rotated 90° when the viewport is portrait. A back control "← সূচিপত্র" returns.
  - `<Result svgRef title="টিফিন শেষ!" outcome={'win' | 'loss' | 'tie'} onShare onAgain onIndex />` (plays `cheer` on a win, `groan` on a loss)
  - `svgToPng(svg: SVGSVGElement, scale = 2): Promise<Blob>` (clones the SVG, inlines the three fonts as base64 `@font-face` fetched from `/fonts/`, then canvas → `toBlob('image/png')`)
  - `shareOrDownload(blob: Blob, filename: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'>` (`AbortError` → `'cancelled'`)

- [ ] **Step 1:** Implement `Notebook.tsx` with placeholder game pages (`<Page>` with the game's name), plus `Result.tsx` and `share.ts`.
- [ ] **Step 2: Manual check (Review Focus: share):**
  - Bench → notebook → name entry → index → zoom into each placeholder → back → close.
  - Reduced-motion emulation skips the zoom.
  - A temporary Share on a placeholder downloads a 2× PNG on desktop Chrome, and the PNG shows the Atma and Patrick Hand glyphs, not a fallback font.
  - On Android Chrome, the share sheet opens.
- [ ] **Step 3:** Commit `feat: notebook menu with name label, index, zoom, result and share`.

### Task 11: Cricket screen

**Files:**
- Create: `src/cricket/Cricket.tsx`
- Modify: `src/notebook/Notebook.tsx` (mount it)

**Interfaces:**
- **Consumes:** Tasks 4–5, `GameProps`, `Result`, `play`, `wobblyCircle`, `wobblyLine`, `useReducedMotion`.
- **Produces:** `<Cricket {...GameProps} />`.

- [ ] **Step 1: Implement** the phases: setup (overs ১/২/৫, default ১) → toss (`makeRng(Date.now())` seed; if you win, choose ব্যাট/বল) → field drawn in ink → balls → result. The spread is the scorecard page (left) plus the field page (right).
  - **When you bat:**
    1. The eyelids close before the bowl, and the cursor is hidden (`cursor:none`; no touch marker).
    2. The CPU's `aiSpin` animates the rotation with `requestAnimationFrame` sampling `angleAt`, playing `play('rustle', dir)` at each quarter turn time, then `thud`.
    3. Press and hold, then release → `blindPoint(rng, pressed, holdMs)` → `toPage` → `resolveDrop`.
    4. On `appeal`, show "এলবিডব্লিউ আপিল!" and repeat step 3 with `isRedrop:true`.
    5. The eyes open: an ink dot, the cell flashes, and a Galada shout.
  - **When you bowl:** a flick on the page sets the power (`clamp(speed_px_per_ms / 2, 0, 1)`) and the direction (the sign of the cross product of the radius vector and the flick vector). The CPU bats via `aiDrop`, then `blindPoint`.
  - **Scorecard:** written ball by ball on the left page, with the player name and `bn()` digits.
  - **At the end:** `onBest(your best innings runs)` and `Result`.
  - **Sounds:** `play('bell')` when the match starts. `Result` plays `cheer` on a win and `groan` on a loss. The same applies to Tasks 12 and 13.
- [ ] **Step 2: Manual check:**
  - A full 1-over match finishes both innings.
  - Off-circle → আউট.
  - A line touch triggers the re-drop.
  - Stereo panning flips with the direction (headphones).
  - Reduced motion jumps straight to the final angle.
  - The shared PNG includes both pages.
- [ ] **Step 3:** Commit `feat(cricket): playable spin cricket page`.

### Task 12: Football screen

**Files:**
- Create: `src/football/Football.tsx`
- Modify: `src/notebook/Notebook.tsx`

**Interfaces:**
- **Consumes:** Tasks 6–7, `GameProps`, `Result`, `play`, `wobblyLine`, `wobblyCircle`.
- **Produces:** `<Football {...GameProps} />`.

- [ ] **Step 1: Implement** the phases: setup (first to ১/৩/৫, default ১) → toss → placement (tap to place an O; an invalid tap shakes; the CPU places an X 400 ms later) → play → result.
  - **Your pass:** a slingshot drag from the ball, mapping 0–120 px to a length of 60–450 → `applyWobble` → `shotEnd` → `resolvePass` → `applyPass`.
  - **Drawing:** each `Trail` is drawn with `wobblyLine`, animated with `stroke-dashoffset` while `scratch` plays, and any `ray` is drawn dotted.
  - **Feedback:** an intercepting dot pulses; ink tally marks show ১/৩, ২/৩, শট.
  - **CPU turns:** after 600 ms, `aiPass` → `applyWobble`.
  - **Score:** "তুমি N – M সিপিইউ" at the top of the spread.
  - **At the end:** `onBest(margin)` if you won, then `Result`.
- [ ] **Step 2: Manual check:**
  - A first-to-1 match completes.
  - The 3rd line hands over possession.
  - A throw-in restarts inside the line.
  - On a portrait phone, the spread is rotated and drags still map correctly.
- [ ] **Step 3:** Commit `feat(football): playable pass football spread`.

### Task 13: Dot Box screen

**Files:**
- Create: `src/dotbox/DotBoxGame.tsx`
- Modify: `src/notebook/Notebook.tsx`

**Interfaces:**
- **Consumes:** Task 8, `GameProps`, `Result`, `play`, `wobblyLine`.
- **Produces:** `<DotBoxGame {...GameProps} />`.

- [ ] **Step 1: Implement:**
  - **Setup:** two steppers, সারি (rows) and কলাম (columns), each ২–১০, default ৪ × ৪.
  - **Toss:** decides who starts.
  - **The grid:** fits the page.
  - **Your move:** a tap or drag → `edgeNear` → `playEdge`.
  - **Claimed boxes:** get the initial (`initialOf(name)` for you, `'C'` for the CPU) in Patrick Hand, plus light hatching in that side's ink (blue for you, black for the CPU).
  - **CPU move:** `aiEdge` after 500 ms, repeated while it keeps the turn.
  - **At the end:** `onBest(margin)` if you won, then `Result`.
- [ ] **Step 2: Manual check:**
  - A 2×2 and a 10×10 game both finish.
  - A double-box move gives exactly one extra turn.
  - Your initial appears from the label name.
- [ ] **Step 3:** Commit `feat(dotbox): playable dot box page`.

### Task 14: Release build

**Files:**
- Create: `README.md`

- [ ] **Step 1:** `npm test` → all PASS. `npm run build` → no type errors. `npx vite preview` → play one match of each game from the production build at 360 px and on desktop.
- [ ] **Step 2:** Write `README.md`: what the game is, `npm i` / `npm run dev` / `npm test` / `npm run build`, and deploying with `npx wrangler pages deploy dist --project-name tiffin-break`. **Do not run the deploy** without the user's go-ahead.
- [ ] **Step 3:** Commit `docs: readme and release check`.
