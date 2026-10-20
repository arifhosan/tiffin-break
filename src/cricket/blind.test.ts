import { describe, it, expect } from 'vitest'
import { makeRng } from '../rng'
import { blindPoint } from './blind'

describe('blindPoint', () => {
  it('drift + tremor spread at 1s hold', () => {
    const rng = makeRng(7)
    const xs = Array.from({ length: 4000 }, () => blindPoint(rng, { x: 0, y: 0 }, 1000).x)
    const mean = xs.reduce((a, b) => a + b) / xs.length
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length)
    expect(sd).toBeGreaterThan(7.5)
    expect(sd).toBeLessThan(9.6)
    expect(Math.abs(mean)).toBeLessThan(0.5)
  })
})
