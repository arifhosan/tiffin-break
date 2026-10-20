import { describe, it, expect } from 'vitest'
import { segPointDist, rotate, other } from './geom'

describe('geom', () => {
  it('segPointDist perpendicular', () => {
    expect(segPointDist({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 3 })).toEqual({ d: 3, t: 0.5 })
  })
  it('clamps t to 1 beyond the end', () => {
    const r = segPointDist({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 14, y: 3 })
    expect(r.t).toBe(1)
    expect(r.d).toBe(5)
  })
  it('rotate quarter turn', () => {
    const p = rotate({ x: 1, y: 0 }, Math.PI / 2)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(1)
  })
  it('other flips side', () => {
    expect(other('you')).toBe('cpu')
  })
})
