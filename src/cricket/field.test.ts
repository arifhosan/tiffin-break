import { describe, it, expect } from 'vitest'
import { makeRng } from '../rng'
import { makeField, hitAt, onLine, type Label } from './field'

const count = (ls: Label[]) => {
  const c: Record<string, number> = { dot: 0, '1': 0, '2': 0, '3': 0, '4': 0, '6': 0, out: 0, wide: 0, noball: 0 }
  for (const l of ls) c[l.kind === 'runs' ? String(l.runs) : l.kind]++
  return c
}

describe('field', () => {
  it('matches the spec counts and is deterministic', () => {
    const f = makeField(makeRng(1))
    expect(count(f.outer)).toEqual({ dot: 3, '1': 3, '2': 3, '3': 1, '4': 3, '6': 0, out: 2, wide: 1, noball: 0 })
    expect(count(f.inner)).toEqual({ dot: 4, '1': 2, '2': 2, '3': 0, '4': 2, '6': 3, out: 2, wide: 0, noball: 1 })
    expect(makeField(makeRng(1))).toEqual(f)
  })
  it('hitAt', () => {
    const f = makeField(makeRng(1))
    expect(hitAt(f, { x: 100, y: 5 })).toMatchObject({ ring: 'outer', wedge: 0 })
    expect(hitAt(f, { x: 0, y: 50 })).toMatchObject({ ring: 'inner', wedge: 4 })
    expect(hitAt(f, { x: 0, y: 190 })).toEqual({ kind: 'off' })
    expect(hitAt(f, { x: 300, y: 0 })).toEqual({ kind: 'off' })
  })
  it('onLine', () => {
    expect(onLine({ x: 100, y: 1 })).toBe(true)
    expect(onLine({ x: 86, y: 30 })).toBe(false)
    expect(onLine({ x: 0, y: 84 })).toBe(true)
    expect(onLine({ x: 120, y: 40 })).toBe(false)
  })
})
