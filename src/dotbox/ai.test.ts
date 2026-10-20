import { describe, expect, it } from 'vitest'
import { makeRng } from '../rng'
import { aiEdge, completes, giveaway, safe } from './ai'
import { legalEdges, newDotBox, type DotBox, type Edge } from './rules'

const h = (r: number, c: number): Edge => ({ o: 'h', r, c })
const v = (r: number, c: number): Edge => ({ o: 'v', r, c })
/** mark edges drawn without claiming boxes */
const draw = (g: DotBox, es: Edge[]): DotBox => {
  const c = { ...g, h: g.h.map((x) => [...x]), v: g.v.map((x) => [...x]) }
  for (const e of es) c[e.o][e.r][e.c] = 'you'
  return c
}

describe('aiEdge', () => {
  it('takes an available box', () => {
    const g = draw(newDotBox(2, 2, 'cpu'), [h(0, 0), h(1, 0), v(0, 0)])
    expect(aiEdge(makeRng(3), g)).toEqual(v(0, 1))
  })
  it('avoids a third side when a safe edge exists', () => {
    // box (0,0) has 2 sides; only v(0,1)/h(1,0)-type edges there are unsafe
    const g = draw(newDotBox(2, 2, 'cpu'), [h(0, 0), v(0, 0)])
    for (let s = 0; s < 20; s++) {
      const e = aiEdge(makeRng(s), g)
      expect(e).not.toEqual(v(0, 1))
      expect(e).not.toEqual(h(1, 0))
    }
  })
  it('only unsafe edges: picks a minimal giveaway', () => {
    // 2x4, no box has 3 sides; every free edge touches a 2-sided box.
    const g = draw(newDotBox(2, 4, 'cpu'), [
      h(0, 2), h(0, 3), h(1, 0), h(1, 1), h(1, 2), h(1, 3), h(2, 0), h(2, 1), h(2, 2), h(2, 3), v(0, 1),
    ])
    const free = legalEdges(g)
    expect(free.some((e) => completes(g, e))).toBe(false) // step 1 n/a
    expect(free.some((e) => safe(g, e))).toBe(false) // step 2 n/a
    const gs = free.map((e) => giveaway(g, e))
    expect(Math.min(...gs)).toBeLessThan(Math.max(...gs)) // choice matters
    for (let s = 0; s < 20; s++) {
      const e = aiEdge(makeRng(s), g)
      expect(giveaway(g, e)).toBe(Math.min(...gs))
    }
  })
})
