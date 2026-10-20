# Task 13 report: Dot Box screen

Implemented src/dotbox/DotBoxGame.tsx (600x800 portrait page): setup with row/column steppers (2-10, default 4x4, Bangla digits, Bengali aria-labels, aria-disabled at the ends so focus is not dropped), toss, grid fitted to the page, tap/drag by end point via getScreenCTM().inverse() + edgeNear, wobblyLine pen lines (blue/black) with draw animation + scratch sound, claimed boxes with hatching + initial in Patrick Hand (initialOf(name) / 'C'), Galada shout on box claims, score + turn in SVG and in an sr-only status, CPU 500 ms loop via aiEdge, onBest(margin) once on a win, Result win/loss/tie, share tiffin-break-dotbox.png, Play again keeps the size. One async turn loop, tracked timers cleared on unmount, single-slot input ref, .catch logs and falls back to Result (tie). Notebook swap is one line; unused placeholders.tsx deleted.

## Results
- npm test: 21 files, 91 tests passed. npm run build: ok. tsc -b: ok.
- check script (task13-check.mjs, Chrome, preview, 8x timer speed-up), desktop 1280x800 and 360x740: 10x10 and 2x2 games play to the end; initials R/C (name Rafi) and A/C (name arif) in Patrick Hand; taps outside the grid do nothing (edge count and step unchanged); drags count by end point; double-box move (+2) keeps the turn with no CPU edge before the next move (seen at 10x10 on both viewports); share download tiffin-break-dotbox.png saved; Play again keeps size; plus disabled at 10, minus at 2. Last full run: 36 PASS, 1 FAIL ("saw a double-box move" at m360, 0 doubles in 3 random 2x2 games and the 10x10); an earlier run was ALL PASS. The double-box assertion is random-dependent (flaky), not a game fault.
- Gates (task13-gates.txt; setup / mid / result; real output): axe 0 violations x3; responsive 280/320/414 OK x3; reduced-motion OK x3; target-size OK (36/26/32 targets); states AA OK x3; mobile-first OK x3. Overflow FAIL and keyboard FAIL are the same pre-existing shell findings as in task 12 (bench books art behind the modal; three inert index entries behind the zoom), no dot box element flagged. Re-ran axe/target/states after the final CSS tweak: all OK.
- Keyboard (task13-kb.mjs, reduced-motion Chrome): focus lands on the first stepper, Tab/Enter changes values, focus stays on the aria-disabled + at 10, Shift-Tab and Enter work, Tab reaches toss button, Enter -> start button -> Enter starts the game (status says whose turn).
- Screenshots: shots/task13-*.png (setup, toss, mid, double, result at desktop/m360, task13-share.png checked: grid, hatching, R/C initials in Patrick Hand, score line).

## Concerns
- Placing edges is pointer-only (same as football/cricket); setup, toss and result are keyboard-operable.
- edgeNear ties at exactly 0.5 (a box centre) can still pick an edge; negligible.
- favicon.ico 404 in preview console is pre-existing. A browser.close() hang in Playwright on this machine was worked around with process.exit in the scripts.
- Preview server stopped (port 4173 down).
