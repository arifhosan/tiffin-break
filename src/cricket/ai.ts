import type { Point } from '../geom'
import type { Spin } from './spin'

export const aiSpin = (rng: () => number, startAngle: number): Spin => ({
  power: 0.3 + 0.7 * rng(),
  dir: rng() < 0.5 ? 1 : -1,
  startAngle,
})

export function aiDrop(rng: () => number): { pressed: Point; holdMs: number } {
  const r = 175 * Math.sqrt(rng())
  const th = 2 * Math.PI * rng()
  return { pressed: { x: r * Math.cos(th), y: r * Math.sin(th) }, holdMs: 300 + 900 * rng() }
}
