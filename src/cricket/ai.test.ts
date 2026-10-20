import { describe, it, expect } from 'vitest'
import { makeRng } from '../rng'
import { toPage, finalAngle } from './spin'
import { makeField } from './field'
import { blindPoint } from './blind'
import { aiSpin, aiDrop } from './ai'
import { resolveDrop, type BallOutcome } from './match'

describe('ai', () => {
  it('spin and drop ranges', () => {
    const rng = makeRng(3)
    for (let i = 0; i < 500; i++) {
      const s = aiSpin(rng, 1)
      expect(s.power).toBeGreaterThanOrEqual(0.3)
      expect(s.power).toBeLessThanOrEqual(1)
      expect([1, -1]).toContain(s.dir)
      const d = aiDrop(rng)
      expect(Math.hypot(d.pressed.x, d.pressed.y)).toBeLessThanOrEqual(175)
      expect(d.holdMs).toBeGreaterThanOrEqual(300)
      expect(d.holdMs).toBeLessThanOrEqual(1200)
    }
  })
  it('simulated balls are sane', () => {
    const rng = makeRng(42)
    const f = makeField(rng)
    let angle = 0
    let legal = 0, runs = 0, outs = 0
    for (let i = 0; i < 2000; i++) {
      const s = aiSpin(rng, angle)
      angle = finalAngle(s)
      const drop = () => {
        const d = aiDrop(rng)
        return toPage(blindPoint(rng, d.pressed, d.holdMs), angle)
      }
      let o: BallOutcome | { kind: 'appeal' } = resolveDrop(f, drop(), false)
      if (o.kind === 'appeal') o = resolveDrop(f, drop(), true)
      expect(['runs', 'extra', 'out']).toContain(o.kind)
      if (o.kind === 'extra') continue
      legal++
      if (o.kind === 'runs') runs += o.runs
      else if (o.kind === 'out') outs++
    }
    expect(runs / legal).toBeGreaterThanOrEqual(0.3)
    expect(runs / legal).toBeLessThanOrEqual(3.0)
    expect(outs / legal).toBeGreaterThanOrEqual(0.05)
    expect(outs / legal).toBeLessThanOrEqual(0.6)
  })
})
