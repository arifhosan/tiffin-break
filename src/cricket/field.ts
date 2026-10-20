import type { Point } from '../geom'
import { shuffle } from '../rng'

export const R = 190
export const INNER = 85
export const WEDGES = 16
export const LINE_TOUCH = 2.5

export type OutHow = 'catch' | 'bowled' | 'lbw' | 'runout'
export type Label =
  | { kind: 'runs'; runs: 1 | 2 | 3 | 4 | 6 }
  | { kind: 'dot' }
  | { kind: 'wide' }
  | { kind: 'noball' }
  | { kind: 'out'; how: OutHow }
export type Field = { outer: Label[]; inner: Label[] }
export type Hit = { kind: 'cell'; ring: 'inner' | 'outer'; wedge: number; label: Label } | { kind: 'off' }

type Counts = { dot: number; 1: number; 2: number; 3: number; 4: number; 6: number; out: number; wide: number; noball: number }
// Spec §7 table (tuning numbers).
export const OUTER_COUNTS: Counts = { dot: 3, 1: 3, 2: 3, 3: 1, 4: 3, 6: 0, out: 2, wide: 1, noball: 0 }
export const INNER_COUNTS: Counts = { dot: 4, 1: 2, 2: 2, 3: 0, 4: 2, 6: 3, out: 2, wide: 0, noball: 1 }

const HOWS: OutHow[] = ['catch', 'bowled', 'lbw', 'runout']

function ring(rng: () => number, c: Counts): Label[] {
  const labels: Label[] = []
  for (const [k, n] of Object.entries(c)) {
    for (let i = 0; i < n; i++) {
      labels.push(
        k === 'dot' || k === 'wide' || k === 'noball'
          ? { kind: k }
          : k === 'out'
            ? { kind: 'out', how: 'catch' }
            : { kind: 'runs', runs: Number(k) as 1 | 2 | 3 | 4 | 6 },
      )
    }
  }
  return shuffle(rng, labels).map((l) =>
    l.kind === 'out' ? { kind: 'out', how: HOWS[Math.floor(rng() * HOWS.length)] } : l,
  )
}

export function makeField(rng: () => number): Field {
  return { outer: ring(rng, OUTER_COUNTS), inner: ring(rng, INNER_COUNTS) }
}

const STEP = (2 * Math.PI) / WEDGES
const angleOf = (p: Point) => (Math.atan2(p.y, p.x) + 2 * Math.PI) % (2 * Math.PI)

export function hitAt(f: Field, p: Point): Hit {
  const r = Math.hypot(p.x, p.y)
  if (r >= R) return { kind: 'off' }
  const wedge = Math.min(WEDGES - 1, Math.floor(angleOf(p) / STEP))
  const ringName = r < INNER ? 'inner' : 'outer'
  return { kind: 'cell', ring: ringName, wedge, label: f[ringName][wedge] }
}

export function onLine(p: Point): boolean {
  const r = Math.hypot(p.x, p.y)
  if (r > R + LINE_TOUCH) return false
  if (Math.abs(r - INNER) <= LINE_TOUCH || Math.abs(r - R) <= LINE_TOUCH) return true
  const a = angleOf(p)
  const diff = Math.abs(a - Math.round(a / STEP) * STEP)
  return r * Math.sin(diff) <= LINE_TOUCH
}
