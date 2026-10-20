import { describe, expect, it } from 'vitest'
import { gaussian, makeRng, shuffle } from './rng'

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = makeRng(42), b = makeRng(42)
    expect(Array.from({ length: 20 }, a)).toEqual(Array.from({ length: 20 }, b))
  })
  it('stays in [0,1)', () => {
    const r = makeRng(1)
    for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1) }
  })
  it('gaussian has mean ~0 and sd ~sigma', () => {
    const r = makeRng(7)
    const xs = Array.from({ length: 5000 }, () => gaussian(r, 2))
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length)
    expect(Math.abs(mean)).toBeLessThan(0.1)
    expect(sd).toBeGreaterThan(1.8)
    expect(sd).toBeLessThan(2.2)
  })
  it('shuffle keeps items and does not mutate', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8]
    const copy = [...xs]
    const out = shuffle(makeRng(3), xs)
    expect(xs).toEqual(copy)
    expect([...out].sort()).toEqual(copy)
  })
})
