import { dist, type Point } from '../geom'
import type { FootballMatch } from './match'
import { DBOX, H, MAX_LEN, W, resolvePass, shotEnd, validPlacement, type PassResult } from './rules'

// Five outfield cpu positions each, after the keeper (cpu defends x = 800, attacks x = 0).
export const FORMATIONS: Point[][] = [
  [{ x: 700, y: 80 }, { x: 700, y: 420 }, { x: 520, y: 250 }, { x: 380, y: 120 }, { x: 380, y: 380 }],
  [{ x: 600, y: 100 }, { x: 600, y: 250 }, { x: 600, y: 400 }, { x: 350, y: 175 }, { x: 350, y: 325 }],
  [{ x: 690, y: 250 }, { x: 500, y: 60 }, { x: 500, y: 440 }, { x: 400, y: 250 }, { x: 250, y: 130 }],
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

const turnover = (r: Exclude<PassResult, { kind: 'goal' }>): Point => (r.kind === 'complete' ? r.to : r.at)

// counts: a goal only stands from the 3rd line on; before that it is a save, a turnover at the goal mouth.
function score(r: PassResult, from: Point, lastLine: boolean, counts: boolean): number {
  if (r.kind === 'goal' && counts) return r.scorer === 'cpu' ? 1000 : -1000
  if (r.kind === 'goal') return -200 + 0.1 * dist(r.at, { x: W, y: H / 2 })
  if (lastLine) return -200 + 0.1 * dist(turnover(r), { x: W, y: H / 2 })
  return r.kind === 'complete' ? 100 + (from.x - r.to.x) : -200
}

export function aiPass(rng: () => number, m: FootballMatch): { angle: number; length: number } {
  const from = { x: m.ball.x, y: m.ball.y }
  let best = -Infinity
  let picks: { angle: number; length: number }[] = []
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * 2 * Math.PI
    for (const length of [1, 2, 3, 4].map((k) => (k * MAX_LEN) / 4)) {
      const r = resolvePass(m.dots, m.ball.dotId, from, shotEnd(from, angle, length), 'cpu')
      const s = score(r, from, m.lines === 4, m.lines >= 2)
      if (s > best) { best = s; picks = [] }
      if (s === best) picks.push({ angle, length })
    }
  }
  return picks[Math.floor(rng() * picks.length)]
}
