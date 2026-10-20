import type { Point } from '../geom'
import { gaussian } from '../rng'

// Hand drift (8 units/s random walk => sigma 8*sqrt(t)) plus release tremor (sigma 3).
export function blindPoint(rng: () => number, pressed: Point, holdMs: number): Point {
  const s = Math.hypot(8 * Math.sqrt(holdMs / 1000), 3)
  return { x: pressed.x + gaussian(rng, s), y: pressed.y + gaussian(rng, s) }
}
