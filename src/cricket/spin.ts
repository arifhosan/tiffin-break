import { rotate, type Point } from '../geom'

export type Spin = { power: number; dir: 1 | -1; startAngle: number }

const ALPHA = 3 * Math.PI
const omega0 = (s: Spin) => 2 * Math.PI * (1.5 + 2.5 * s.power)

export const spinDuration = (s: Spin): number => omega0(s) / ALPHA

export function angleAt(s: Spin, t: number): number {
  const u = Math.max(0, Math.min(t, spinDuration(s)))
  return s.startAngle + s.dir * (omega0(s) * u - 0.5 * ALPHA * u * u)
}

export const finalAngle = (s: Spin): number => angleAt(s, spinDuration(s))

// Times at which the page has turned k quarter turns (k = 1..n).
export function quarterTurnTimes(s: Spin): number[] {
  const w = omega0(s)
  const q = Math.PI / 2
  const n = Math.floor((w * w) / (2 * ALPHA) / q + 1e-9)
  return Array.from({ length: n }, (_, i) => {
    const d = (i + 1) * q
    return (w - Math.sqrt(Math.max(0, w * w - 2 * ALPHA * d))) / ALPHA
  })
}

export const toPage = (screen: Point, pageAngle: number): Point => rotate(screen, -pageAngle)
export const toScreen = (page: Point, pageAngle: number): Point => rotate(page, pageAngle)

/** The bowler's flick: from = where it started (relative to the centre), v = its velocity in page units per ms. */
export const flickSpin = (from: Point, v: Point, startAngle: number): Spin => ({
  power: Math.min(1, Math.hypot(v.x, v.y) / 2),
  dir: from.x * v.y - from.y * v.x < 0 ? -1 : 1,
  startAngle,
})
