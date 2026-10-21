# Tiffin Break — Design Spec

Date: 2026-10-20 · Status: v2.2 (football rules revised after play-test), for review (replaces v1 of the same date; builder-check answers folded in)

Labels used below:
- **[user]** the user decided it.
- **[md]** taken from `bangladeshi_classroom_games_specifications.md`. That file was AI-written, so we use it only where the designer was unsure.
- **[call]** the designer's choice. Can be overridden.

## 1. What and why

A browser game that recreates the pen-and-paper games Bangladeshi students played on the school bench in the early 2010s. In searches in English and Bangla (2026-10-20), we found no online version of Spin Cricket or Pass Football as they were played. Dot Box exists online, but not in this setting.

- **Goal:** (A) a polished showcase piece and (B) a nostalgia piece people share on Facebook and Messenger. [user]
- **Audience:** people who were BD school students in the 2010s, who are now gamers and CS students. Not aimed at PUBG/CODM/Free Fire players. [user]
- **Success:** someone sees their own bench, opens the notebook with their name on it, plays a match in 2–3 minutes, and shares the page.
- **Anti-goals:**
  - copying brand logos or NCTB textbook art
  - accounts, logins or a backend
  - anything that feels like a mobile-game clone

## 2. Scope

**v1:**
- The bench: rearrangeable, with drawing on it, and remembered between visits.
- The notebook as the menu.
- Spin Cricket, Pass Football and Dot Box, all against the computer.
- Choice of match length.
- Sharing the page as a PNG.
- Bengali text.
- Sound.

**Later (not v1):**
- Challenge links: the seed plus the score in the URL.
- Live online play.
- An English toggle.
- Pen fight.
- The চিট game (চোর-পুলিশ-বাবু-ডাকাত). Skipped [user]: playing it solo needs computer players that can bluff and be read, which hasn't been designed.
- A "Sir is coming!" button.
- A replay GIF.

## 3. Look, language, assets

- **Style: Real Notebook** [user]. Flat, top-down 2D everywhere: a wooden bench, a ruled exercise book, blue ballpoint ink that wobbles like a real hand.
- **Language: Bengali** [user]. All text is in Bengali, and numbers use Bangla digits (১২৩). The only exception is a name the player types in English. All strings live in `src/strings.ts`.
- **Fonts** [call], all SIL OFL and self-hosted in `public/fonts/`:
  - **Atma**: Bengali UI and handwriting
  - **Galada**: big shouts (ছক্কা!, আউট!, গোল!)
  - **Patrick Hand**: Latin-script names
- **Covers** [call]: our own drawn lookalikes, based on real BD covers found online ([user] asked us to look). No brand names, logos or NCTB artwork:
  - a brown kraft-paper khata with a white name label, after the classic Bashundhara exercise-book look
  - a floral khata
  - textbooks titled বাংলা, গণিত, English in the NCTB style
- **Layout** [call]:
  - The bench is a **fixed-proportion board, 3 : 4 portrait, 600 × 800 bench units**. It's scaled to fit the window, and every saved position and stroke is stored in bench units.
  - Any space around it (on a wide desktop) is filled with the classroom floor: a dark wood or tile pattern.
  - Works on a 360 px wide phone.
- **`prefers-reduced-motion`:** spins, zooms and line drawing jump straight to their end state. Sounds still play.

## 4. Architecture [call]

- Vite + React 19 + TypeScript, plain CSS, Vitest. No router, state library, game engine, backend or analytics. A static build on Cloudflare Pages.
- **Rules are pure TypeScript** (`*/rules.ts`, `*/match.ts`): state plus a move goes in, new state comes out, with no DOM. The AI (`*/ai.ts`) only produces moves, so a remote human can replace it later.
- **One seeded RNG per match** (mulberry32) drives AI choices, hand wobble, the toss and the cricket field layout.
- Graphics are SVG. Animations use CSS transforms and `stroke-dashoffset`. Pointer events handle both mouse and touch.
- **Persistence:** localStorage under one key, `tb.v1`, holding the bench layout, the drawn strokes, the player's name, mute and best scores. Every read and write is wrapped in try/catch, and the game works without it.

## 5. The bench (start screen)

**Items** [user]: textbooks, pens, a pencil, an eraser, a geometry box, the notebook and the tiffin box. The starting arrangement is a messy desk [call].

**What you can do:**

| Action | How | Source |
|---|---|---|
| Rearrange | Drag any item. It keeps its new position and a slight tilt. | [user] |
| Draw on the bench | Tap the **pen** to pick it up. You're now in draw mode: drawing with the mouse or finger leaves ink strokes on the wood. Tap the pen again to put it down. | [user] by hand; pen as the tool [call] |
| Erase | Tap the **eraser** to switch to erase mode. Rubbing over a stroke removes it. | [call] |
| Open the notebook | Tap it | [user] |
| Settings | Tap the **geometry box**: sound on/off, reset the bench, font credits | [call] |
| Tiffin box | Wiggles and rattles when tapped (decoration) | [user] back on the bench; behaviour [call] |

- **Remembered** [user]: positions, strokes and the name are saved after every change and restored on load, on that device and browser [call].
- Strokes are simplified, capped at 300, with the oldest dropped first [call].
- Every interactive item is a focusable button with a Bengali accessible name and a visible focus ring.

## 6. The notebook (game menu)

- **The cover is an exercise-book label:** নাম / শ্রেণি / রোল. On the first open, it asks your name once, and the name is written on the label in ballpoint [user]. Tap the label to edit it.
- **Opening it shows the index page** [user]: a handwritten list:
  - ১. খাতায় ক্রিকেট
  - ২. খাতায় ফুটবল
  - ৩. ডট বক্স
  - ৪. শীঘ্রই আসছে… (greyed out)
  
  Your best scores are shown next to the games: the highest cricket innings, and the biggest football and Dot Box win margins [call].
- **Tapping a game zooms in** [user]. The bench fades back and the game's page (or double page) smoothly grows and straightens until it fills most of the screen. A back control (← সূচিপত্র) zooms back out to the index, and closing the notebook returns you to the bench [call].
- **Football's double page:** on a portrait phone, it rotates 90° to fill the screen [call].

## 7. খাতায় ক্রিকেট (Spin Cricket)

### Field
- One big circle (radius 190 page units). There's **no pitch** [user].
- It's split into **16 equal triangles** from the centre [user: 8 or 16; 16 is the call].
- An **inner circle** (radius 85, about 20% of the area) cuts every triangle into an inner and an outer part, giving **32 cells** [user idea, adopted].
- **Cell labels** [md]: ১ ২ ৩ ৪ ৬, ডট, ওয়াইড, নো বল, আউট. Each আউট cell also names a type: ক্যাচ, বোল্ড, এলবিডব্লিউ or রান আউট [md].
- **A new random layout for each match**, shuffled from the seed and drawn in ink as the match starts [call]:

| | ডট | ১ | ২ | ৩ | ৪ | ৬ | আউট | ওয়াইড | নো বল |
|---|---|---|---|---|---|---|---|---|---|
| Outer cells (16) | 3 | 3 | 3 | 1 | 3 | 0 | 2 | 1 | 0 |
| Inner cells (16) | 4 | 2 | 2 | 0 | 2 | 3 | 2 | 0 | 1 |

  These counts are tuning numbers. The 6s are only in the small inner cells, so they're high-reward and hard to hit [call].

### Results
- **The pen lands outside the circle → আউট** (স্টাম্পড) [user].
- **ওয়াইড or নো বল** → +১ run, the ball doesn't count, and it's bowled again [call].
- **লাইন টাচ** [md]: the dot lands within 2.5 page units of any dividing line or the outer circle → **an LBW appeal**. The batsman immediately re-drops blind, without a new spin, using the same press-and-hold input [call].
  - The re-drop lands on আউট (or outside the circle) → **আউট (এলবিডব্লিউ)**.
  - Anything else → **নট আউট**, a dot ball.
  - That decision rule is my call.

### Spin physics [call]
- Bowler input: power `p ∈ [0,1]` and direction `±1`.
- Starting speed `ω0 = 2π(1.5 + 2.5p)` rad/s, deceleration `α = 3π` rad/s².
- The spin lasts about 1.0–2.7 s, which is about 0.75–5.3 turns.
- Each ball starts from the page's previous angle.

### One ball
0. **Your eyes close before the page turns** [user]. If you're batting, the eyelids close first, and the bowl happens while your screen is dark.
1. **The bowler rotates the page** [user].
   - **You bowl:** flick across the page. Power comes from the flick speed, and direction from the flick's rotation sense.
   - **CPU bowls:** random power between 0.3 and 1, random direction.
2. **The batsman's eyes close** [user].
   - **You bat:** the screen is already dark, and **the cursor or finger marker is hidden**. You only hear the spin: a page rustle on every quarter turn, **panned left or right in stereo to give away the direction** (clockwise to the right ear), then a thud when it stops [call]. This is how you learn to read a spin you can't see.
3. **Pen down, blind** [call, the method the user asked for]:
   - After the thud, **press and hold** where you think a good cell is. While you hold, your hand **drifts** in a slow random walk of about 8 page units per second, plus a tremor at release (σ = 3).
   - **Release** to put the pen down.
   - The point is converted to page coordinates by rotating it back by the page's final angle.
4. **Eyes open:** an ink dot appears, the cell flashes, and a shout plays.
- **CPU bats:** it is just as blind. It picks a uniformly random point inside radius 175, with the same drift and tremor as you. That makes its batting pure luck, the baseline a listening human should beat [call].

### Match
- Overs: ১ / ২ / ৫ (default ১) [user]. Wickets: ২ / ৩ / ৫ [call].
- Toss with the seeded RNG. If you win it, you choose to bat or bowl. If the CPU wins it, it bats.
- An innings ends at `overs × 6` legal balls, when all the wickets fall, or as soon as the chase passes the target.
- **Result:** the side with more runs wins "by N runs" or "by N wickets". Equal runs is a tie.
- **Scorecard on the facing page** [md]: a handwritten, ball-by-ball ledger (runs, overs, wickets), next to the field page with all its ink dots.

## 8. খাতায় ফুটবল (Pass Football)

### Rules [user] — unchanged
- Both sides place their players, and the players stay **fixed** for the whole match.
- You slide the pen line from the ball **toward your own player**.
- If the line touches an opponent → their play.
- If the line stops in empty space → the ball goes to the **next player in that direction**, from either team.
- **Goals only by sliding the line into the goal.**

### Pitch
- **Across the double page** [md]: 800 × 500 page units, landscape. The **halfway line is on the notebook's spine**.
- You defend the left goal and attack the right.
- Goal mouths: y ∈ [190, 310] on x = 0 and on x = 800.
- A D-box, 80 deep × 200 tall (y ∈ [150, 350]), in front of each goal. **Only that side's goalkeeper may stand inside its own D-box**; nobody else may stand in either D-box, so outfield dots can't wall off the goal [call; keeper rule by user, v2.2].
- Players: **6 per side** [md says 5–10; 6 is the call], drawn as small ink circles (radius 10). Yours are O, the CPU's are X [md marks].
- **A goalkeeper is mandatory** [user, v2.2]: one of the 6, placed first, inside its own D-box.

### Placement
- Players are placed one at a time, alternating, starting with you. Each side's **first** placement is its goalkeeper and must be inside its own D-box [user, v2.2].
- Every other player can go **anywhere on the pitch** outside both D-boxes, at least 10 from the edge and at least 30 from any other player. Own-half-only would make goals almost impossible, because every pass would end deep in your own half [call].
- The CPU places from 3 formation templates, with ±15 jitter. Each has two forwards within shot range of the human goal [call, v2.3].
- During placement a hint reads "শুট করতে গোলের কাছে খেলোয়াড় রাখো" [call, v2.3].
- The ball starts on the centre spot (400, 250), and the toss winner kicks off.

### One pass [call]
- **Your eyes stay open** while passing (the md's blind flick was not adopted).
- Drag back from the ball like a slingshot. The direction is opposite to the drag, and a drag of 0–120 px gives a line **20–133** units long. **The longest line is ⅓ of the centre-to-goal distance (400 / 3 ≈ 133)**, so no possession can reach a goal from the centre in fewer than 3 lines [user, v2.2].
- Hand wobble is applied: angle + Gaussian(σ = 0.07 rad), and length × (1 + Gaussian(σ = 0.08)). The CPU gets the same wobble.

### Resolving a pass
Walk the segment from start to end. The **earliest** of these events wins:
1. **ট্যাকল (interception):** an opponent player within 12 of the segment. The opponent gets the ball **at the touch point** [md].
2. **গোল:** the line crosses a goal line inside the mouth **on line 3, 4 or 5 of the possession**. Through your own goal, it counts for the opponent [call]. On lines 1–2 (which includes every kick-off and throw-in line) a line entering a goal mouth is **saved**: the defending goalkeeper gets the ball [user, v2.2].
3. **আউট:** the line leaves the pitch anywhere else → **a throw-in to the opponent from where it went out**, with the ball placed at least 100 units from every line, so a corner out moves inward on both axes and a phone has room to pull back [user, v2.3; was 10, md].

The player the pass starts from is ignored. Your own players along the line are passed over [call].

If none of those happen, look at the end point:
4. **Your player within 22 of the end point** → the pass is complete, the ball moves to them, and **you play again** [user].
4b. **Within 22 short of a goal mouth**, with no opponent on that last stretch → the ball **rolls in**, and rule 2 applies (goal on lines 3–5, save on 1–2). The hand wobble otherwise left about half of all shots aimed at the goal line short [call, v2.3].
5. **Empty space** → extend the ray in the same direction. The first player of either team within 12 of the ray gets the ball [user]. If it's yours, you play again; if it's theirs, it's their play. If the ray hits nobody before the edge, it counts as rule 3 at the point where the ray leaves the pitch. That includes a ray that leaves through a goal mouth: it is not a goal, because the line itself has to go in [call].

- Throw-ins and restarts after an interception start the next pass from a point, not from a player.

### 5-line rule [user, v2.2; was the 3-pass rule]
- A team gets **at most 5 lines per possession**. A kick-off or throw-in counts as line 1. Goals can only come on lines 3–5.
- If the 5th line doesn't score and the team still has the ball, possession passes to the opponent at **their player nearest to where that line stopped** [call].
- The count resets whenever possession changes.
- The page shows the count, as ink tally marks (১/৫ … ৫/৫) next to the ball.

### Match
- First to ১ / ৩ / ৫ goals (default ১) [user options, default call].
- After a goal, the ball goes back to the centre spot and the side that conceded kicks off.
- **CPU passing:** try 72 angles × 4 lengths through the resolver, each averaged over 12 fixed wobble samples, then score each:
  - goal = 1000
  - complete = 100 + progress toward the goal
  - intercepted or out = −200 + 0.1 × the distance from the CPU's own goal (lose it upfield, not at home) [call, v2.3]

  Pick the best, breaking ties with the RNG, then apply wobble.
  - On its 5th line, the CPU scores only goals and the chance of losing the ball near its own goal, because a completed pass is worthless on the last line [call].
- **Result:** the page keeps every ink line. The score is written at the top of the spread (e.g. "তুমি ৩ – ১ সিপিইউ").

## 8b. ডট বক্স (Dot Box / box making)

### Rules [user approved the standard game]
- A grid of dots is drawn on the page.
- Players take turns drawing **one line** between two neighbouring dots, across or down.
- Whoever draws the **fourth side** of a box claims it, writes their **initial** inside, and **takes another turn**.
- When every box is filled, whoever has the most boxes wins. Equal counts is a tie.

### Details
- **Grid size is customisable** [user]: rows and columns chosen separately, each from ২ to ১০ boxes. Default ৪ × ৪ [call]. Box size scales so the grid fits the page.
- **Initials are in English** [user]:
  - Yours is the first Latin letter of the name on your notebook label, upper-cased. If the name has no Latin letter, it's "Y" [call].
  - The computer's is "C" [call].
- **Ink:** your lines and boxes are blue, the computer's black. A claimed box gets the initial plus light hatching in that ink [call].
- **Input:** tap or drag between two neighbouring dots. The nearest free edge within about half a box is selected; otherwise nothing happens [call]. The line draws in wobbly ink with a scratch sound.
- **Who starts:** the toss winner [call].
- **Computer player** [call]:
  1. Take any box that can be completed.
  2. Otherwise, draw a line that doesn't create a box's third side.
  3. Otherwise, give away the fewest boxes: pick the move whose resulting chain is shortest.
  - One difficulty.
- **Best score:** the biggest win margin, in boxes [call].

## 9. Result and sharing [user: share as image]

- **End screen:** the finished page or spread, with a stamp-style shout (টিফিন শেষ!) and three buttons: শেয়ার, আবার খেলো, সূচিপত্রে ফেরো.
- **Share image:**
  - Clone the SVG of the page or spread (for cricket, the scorecard page plus the field page), inline the fonts as base64 `@font-face`, and export a PNG at 2× scale.
  - If `navigator.canShare({ files })` works, use `navigator.share`. Otherwise, download it as `tiffin-break-<game>.png`.
  - If the user cancels the share sheet, do nothing.
- Your name from the notebook label appears on the scorecard.

## 10. Sound [call]
- All sounds are synthesised with the Web Audio API (no files): page rustle, thud, pen scratch, school bell (match start), cheer, groan, tiffin-box rattle.
- The audio context is created on the first tap. A mute toggle is in settings.

## 11. Left to the builder
- Exact art, colours and coordinates of the bench items and covers, within the Real Notebook style.
- Animation timings and easing.
- The stroke simplification method, and file and module boundaries beyond those named in §4.

## 12. Non-goals
- Accounts, leaderboards, a backend or analytics.
- Keyboard play inside the games (menus and bench buttons are keyboard-accessible).
- AI difficulty levels.
- Syncing the bench across devices.
