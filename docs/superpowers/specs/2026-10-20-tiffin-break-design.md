# Tiffin Break — Design Spec

Date: 2026-10-20 · Status: draft for review

## 1. What and why

A browser game that recreates two pen-and-paper games Bangladeshi students played on the school bench in the 2010s. Neither game has an online version today (searched EN + Bangla, 2026-10-20).

- **Goal:** (A) a polished showcase piece and (B) a nostalgia piece people share on Facebook/Messenger.
- **Audience:** people who were BD school students in the 2010s — now gamers and CS students. Not aimed at mobile-game (PUBG/CODM/Free Fire) players.
- **Success:** someone opens it, plays a match in 2–3 minutes, and shares the notebook page image.

Decisions marked **[default]** were not discussed with the user; they are the designer's choice and can be overridden.

## 2. Scope

**v1 (this spec):** Bench hub, Spin Cricket, Pass Football — all against the computer. Choose match length. Share the final notebook page as a PNG. Banglish copy. Sound.

**Later (not v1):** challenge links (async, seed + score in URL), live online play, Bangla/English toggle, pen fight / Chor-Police-Babu-Dakat / dot-box, "Sir is coming!" panic button, replay GIF.

## 3. Look and feel

- **Style A · Real Notebook** (chosen). Flat top-down 2D everywhere. Wooden bench with scratched names, ruled exercise-book paper, blue ballpoint ink that wobbles like a real hand.
- Handwriting font **Patrick Hand** for Latin text, **Galada** for Bangla shouts. Both SIL OFL, self-hosted in `public/fonts/`. **[default]**
- Banglish copy: English UI, Bangla shouts ("ছক্কা!", "আউট!", "গোল!", "টিফিন শেষ!"). All strings live in `src/strings.ts`.
- Layout is portrait-first. It fits a 360 px wide phone and is centred on desktop at up to 480 px wide.
- `prefers-reduced-motion`: the page spin and line-draw animations jump to their end state. Sounds still play.

## 4. Architecture

- Vite + React 19 + TypeScript, plain CSS (`src/styles.css`). Vitest for tests. No router, state library, game engine, backend or analytics.
- Static build, hosted on Cloudflare Pages.
- Screens are one `useState` in `App.tsx`: `bench → cricket | football`. Each game component owns its own phases (setup → play → result).
- **Rules are pure TypeScript** (`*/rules.ts`, `*/match.ts`). Each takes state plus a move and returns new state, with no DOM. The AI (`*/ai.ts`) only produces moves, so a human remote opponent can replace it later.
- **Seeded RNG** (`rng.ts`, mulberry32) drives all randomness: AI choices, hand wobble, toss. One seed per match, so challenge links can replay a match later.
- Game graphics are SVG. Animations use CSS transforms and `stroke-dashoffset`. Pointer events cover both mouse and touch.

## 5. Bench hub

A top-down wooden desk SVG holding:
- **Cricket exercise book** → Spin Cricket
- **Football exercise book** → Pass Football
- **Pen** → settings: sound on/off, saved in localStorage (wrapped in try/catch); credits (font licences)
- **Tiffin box** → decorative only. It wiggles when tapped. **[default]**

Decoration: names scratched into the wood, an ink stain. Every tappable item is a real `<button>` (or has `role="button"`) with an accessible name, and shows a visible focus ring.

## 6. Spin Cricket

### User's rules
The bowler rotates the page. The batsman closes their eyes and puts the pen down (no sliding). The zone under the pen tip is the result.

### Field (page coordinates; origin at page centre; y points down; angle 0 = +x axis, increasing clockwise)
| Zone | Region | Result |
|---|---|---|
| Pitch | rectangle 24 × 70 centred at origin | OUT (bowled) |
| Inner | radius < 60 (outside the pitch) | 0 |
| Middle | 60 ≤ r < 130, eight 45° sectors (sector i covers [i·45°, (i+1)·45°)) | `[1, 2, 1, OUT caught, 2, 1, 3, OUT run out]` |
| Outer | 130 ≤ r < 190, eight 45° sectors | `[4, 0, 6, 4, OUT caught, 4, 6, 2]` |
| Off ground | r ≥ 190 | WIDE: +1 run, ball not counted, bowled again |

A point exactly on a boundary belongs to the zone whose range starts there. **[default — all zone values]**

### Spin physics
- Bowler input: power `p ∈ [0,1]` and direction `±1`.
- Starting angular speed `ω0 = 2π(1.5 + 2.5p)` rad/s, deceleration `α = 2π·1.5` rad/s².
- The spin lasts `ω0/α` seconds, about 1.0–2.7 s, which is about 0.75–5.3 turns.
- Each ball starts from the angle where the previous one stopped.

### One ball
1. **You bowl:** flick across the page. Power = flick speed, mapped to [0,1]; direction = the flick's sense of rotation. **CPU bowls:** `aiSpin`.
2. **The batsman's eyes close:** if you're batting, the screen fades to black with a blink animation. While the page spins, a paper-rustle sound plays at every quarter turn and a thud plays when it stops.
3. **You bat:** after the thud, tap anywhere to put the pen down. The tap point gets hand-shake jitter (Gaussian, σ = 6 page units). It is then turned into page coordinates by rotating it back by the page's final angle.
4. **The eyes open:** an ink dot appears where the pen landed, the zone flashes, and a shout plays ("ছক্কা!" on a 6, "আউট!" on an out).
- **CPU bats:** `aiAim` estimates the final angle with error σ = 0.45 rad and aims at a 6 zone.

### Match
- Overs: 1 / 2 / 5 (default 1) → wickets 2 / 3 / 5.
- Toss with the seeded RNG. If you win, you choose bat or bowl. If the CPU wins, it bats.
- An innings ends at `overs × 6` legal balls, when all wickets fall, or (in the chase) as soon as runs exceed the target.
- **Result:** the side with more runs wins, either "by N runs" or "by N wickets" (wickets left). Equal runs = tie.
- The page keeps every ink dot from the innings.

## 7. Pass Football

### User's rules
- Both sides place their players first, and the players stay fixed for the whole match.
- You slide the pen line from the ball toward one of your players.
- If the line touches an opponent's player, they get the ball.
- If the line stops in empty space, the ball goes to the next player in that direction, from either team.
- Goals only by sliding the line into the goal.

### Pitch
- 400 × 600 page units, portrait. You defend the bottom goal (y = 600) and attack the top (y = 0).
- Goal mouths: x ∈ [140, 260] on y = 0 and on y = 600.
- Goal box (no players allowed inside): 200 × 80 in front of each goal (x ∈ [100, 300]).
- Players: 6 per side **[default]**, drawn as ink dots with radius 10.

### Placement
- Turns alternate, and you place first.
- A dot must be in your own half, outside both goal boxes, at least 10 from the page edge, and at least 30 from any other dot.
- The CPU places from 3 formation templates, mirrored, with ±15 jitter.
- After 12 dots are placed: the ball sits at the centre (200, 300), and the toss winner kicks off.

### One pass
- Drag back from the ball like a slingshot. The direction is opposite to the drag. Drag distance 0–120 px maps to line length 60–400.
- Hand wobble is applied: angle + Gaussian(σ = 0.07 rad), length × (1 + Gaussian(σ = 0.08)). The same wobble applies to the CPU.

### Resolving a pass
Walk the segment from start to end. The **earliest** of these events along it wins:
1. **Intercepted:** an opponent dot within 12 of the segment. The opponent gets the ball at that dot.
2. **Goal:** the line crosses a goal line inside the goal mouth. If it's your own goal, it's a goal for the opponent.
3. **Out:** the line leaves the page anywhere else. The opponent gets the ball at their dot nearest the exit point. **[assumption — the user did not confirm]**

Teammate dots along the segment are ignored (the ball passes over them). The dot the pass starts from is always ignored.

If none of these happen, at the end point:
4. **Complete:** a teammate dot within 22 of the end point. The ball goes to the nearest one, and **you play again**.
5. **Next player in that direction:** extend the ray from the end point in the same direction. The first dot of either team within 12 of the ray gets the ball. A teammate means you play again; an opponent means it's their play. If the ray hits no dot before the page edge, apply rule 3 at the ray's exit point.

### Match
- First to 1 / 3 / 5 goals (default 1). **[default; changed from "first to 2" in chat so the options are 1/3/5]**
- After a goal, the ball returns to the centre and the side that conceded kicks off.
- **CPU passing (`aiPass`):** try 72 angles × 4 lengths through `resolvePass` without wobble, then score each:
  - goal = 1000
  - complete = 100 + progress toward the goal
  - intercepted or out = −200
  
  Pick the best, breaking ties with the RNG, then apply wobble.

## 8. Result and sharing

- **Result screen:** the final notebook page (every dot or line), plus a handwritten scorecard drawn **inside the SVG**. Examples: "You 23/1 (6) · CPU 19/2 (6) · You won by 4 runs", or "You 3 – 1 CPU".
- **Share image:** clone the SVG, inline the two fonts as base64 `@font-face`, draw it onto a canvas at 2× scale, and export a PNG. If `navigator.canShare({ files })` works, use `navigator.share`. Otherwise download it as `tiffin-break-<game>.png`.
- Buttons: Share image · Play again · Back to bench.

## 9. Sound
- All sounds are synthesised with the Web Audio API (no audio files): rustle, thud, pen scratch, school bell (match start), cheer, groan.
- The AudioContext is created on the first user gesture. A mute toggle is in settings.

## 10. Out of scope / non-goals
- Accounts, leaderboards, a backend or analytics.
- Keyboard play inside the two games (menus and buttons are fully keyboard-accessible).
- AI difficulty levels.
- Mobile-game tie-ins.
