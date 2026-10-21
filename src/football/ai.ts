import { dist, type Point } from '../geom'
import { makeRng } from '../rng'
import { applyWobble, type FootballMatch } from './match'
import { DBOX, H, MAX_LEN, W, resolvePass, shotEnd, validPlacement, type PassResult } from './rules'

// Five outfield cpu positions each, after the keeper (cpu defends x = 800, attacks x = 0).
// Each has two forwards in shot range of the human goal (shots only go in from about x <= 110), and the
// first point tells the templates apart (aiPlace re-derives the template from it).
export const FORMATIONS: Point[][] = [
  [{ x: 100, y: 200 }, { x: 100, y: 300 }, { x: 230, y: 250 }, { x: 380, y: 120 }, { x: 380, y: 380 }],
  [{ x: 600, y: 250 }, { x: 110, y: 170 }, { x: 110, y: 330 }, { x: 250, y: 120 }, { x: 350, y: 300 }],
  [{ x: 690, y: 250 }, { x: 105, y: 205 }, { x: 105, y: 295 }, { x: 250, y: 140 }, { x: 400, y: 330 }],
]
export const JITTER = 15
const KEEPER = { x: 760, y: 250 } // the cpu keeper stands in its D-box, jittered

export function aiPlace(rng: () => number, m: FootballMatch): { x: number; y: number } {
  // The template is re-derived from the first cpu dot so later calls stay on the same one.
  const mine = m.dots.filter((d) => d.team === 'cpu')
  if (!mine.length) {
    for (let i = 0; i < 50; i++) {
      const c = { x: KEEPER.x + (rng() * 2 - 1) * JITTER, y: KEEPER.y + (rng() * 2 - 1) * JITTER }
      if (validPlacement(m.dots, c, 'cpu')) return c
    }
    for (let y = DBOX.y0 + 10; y < DBOX.y1; y += 10) if (validPlacement(m.dots, { x: 760, y }, 'cpu')) return { x: 760, y }
    throw new Error('no valid keeper placement')
  }
  const f = mine[1]
  const found = f ? FORMATIONS.findIndex((t) => Math.abs(t[0].x - f.x) <= JITTER && Math.abs(t[0].y - f.y) <= JITTER) : -1
  const tpl = FORMATIONS[found >= 0 ? found : Math.floor(rng() * FORMATIONS.length)]
  const base = tpl[mine.length - 1]
  for (let i = 0; i < 50; i++) {
    const c = { x: base.x + (rng() * 2 - 1) * JITTER, y: base.y + (rng() * 2 - 1) * JITTER }
    if (validPlacement(m.dots, c)) return c
  }
  for (let x = 20; x < W; x += 20) for (let y = 20; y < H; y += 20) if (validPlacement(m.dots, { x, y })) return { x, y }
  throw new Error('no valid placement')
}

// counts: a goal only stands from the 3rd line on; before that it is a save, a turnover at the goal mouth.
// Every turnover (and a pass on the last line, which hands the ball over too) scores by how far from the
// cpu goal the opponent gets the ball, so equally bad options never pick a short line into touch.
function score(r: PassResult, from: Point, lastLine: boolean, counts: boolean): number {
  if (r.kind === 'goal' && counts) return r.scorer === 'cpu' ? 1000 : -1000
  if (r.kind === 'complete' && !lastLine) return 100 + (from.x - r.to.x)
  return -200 + 0.1 * dist(r.kind === 'complete' ? r.to : r.at, { x: W, y: H / 2 })
}

// The cpu's hand wobbles like yours: each candidate is scored over these fixed wobbles (the first is none),
// so it prefers lines that still work when they land a little off.
const WOBBLES = [{ angle: 0, length: 1 }, ...Array.from({ length: 11 }, (_, i, r = makeRng(7 + i)) => applyWobble(r, 0, 1))]

export function aiPass(rng: () => number, m: FootballMatch): { angle: number; length: number } {
  const from = { x: m.ball.x, y: m.ball.y }
  let best = -Infinity
  let picks: { angle: number; length: number }[] = []
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * 2 * Math.PI
    for (const length of [1, 2, 3, 4].map((k) => (k * MAX_LEN) / 4)) {
      let s = 0
      for (const w of WOBBLES) {
        const to = shotEnd(from, angle + w.angle, Math.min(length * w.length, MAX_LEN * 1.08))
        s += score(resolvePass(m.dots, m.ball.dotId, from, to, 'cpu'), from, m.lines === 4, m.lines >= 2)
      }
      if (s > best) { best = s; picks = [] }
      if (s === best) picks.push({ angle, length })
    }
  }
  return picks[Math.floor(rng() * picks.length)]
}
