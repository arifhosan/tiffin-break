import { describe, it, expect } from 'vitest'
import { makeRng } from './rng'
import { wobblyLine, wobblyCircle } from './ink'

describe('ink', () => {
  it('wobblyLine starts/ends exactly and is deterministic', () => {
    const d = wobblyLine(0, 0, 100, 0, makeRng(3))
    expect(d.startsWith('M0,0')).toBe(true)
    expect(d.endsWith('100,0')).toBe(true)
    expect(wobblyLine(0, 0, 100, 0, makeRng(3))).toBe(d)
  })
  it('wobblyCircle closes', () => {
    expect(wobblyCircle(50, 50, 10, makeRng(1)).endsWith('Z')).toBe(true)
  })
})
