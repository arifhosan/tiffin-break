import { describe, it, expect } from 'vitest'
import { spinDuration, angleAt, finalAngle, quarterTurnTimes, toPage, toScreen, type Spin } from './spin'

const s0: Spin = { power: 0, dir: 1, startAngle: 0 }
describe('spin', () => {
  it('duration', () => {
    expect(spinDuration(s0)).toBeCloseTo(1, 9)
    expect(spinDuration({ ...s0, power: 1 })).toBeCloseTo(2.667, 3)
  })
  it('final angle, clamping, mirroring', () => {
    expect(finalAngle(s0)).toBeCloseTo(1.5 * Math.PI, 9)
    expect(angleAt(s0, 99)).toBe(finalAngle(s0))
    expect(finalAngle({ ...s0, dir: -1 })).toBeCloseTo(-finalAngle(s0), 9)
  })
  it('quarter turns', () => {
    const q = quarterTurnTimes(s0)
    expect(q).toHaveLength(3)
    expect(q[0]).toBeLessThan(q[1])
    expect(q[1]).toBeLessThan(q[2])
    q.forEach((t, i) => expect(angleAt(s0, t)).toBeCloseTo(((i + 1) * Math.PI) / 2, 9))
  })
  it('toScreen inverts toPage', () => {
    const p = { x: 30, y: -70 }
    const r = toScreen(toPage(p, 1.234), 1.234)
    expect(r.x).toBeCloseTo(p.x, 9)
    expect(r.y).toBeCloseTo(p.y, 9)
  })
})
