import { describe, expect, it } from 'vitest'
import { makeRng } from '../rng'
import { aiEdge } from './ai'
import { newDotBox, type DotBox, type Edge } from './rules'

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
  it('only unsafe edges: avoids the long chain', () => {
    // 2x4. Top row: a 4-chain (v(0,*) free). Bottom: every box has exactly 2 sides.
    const g = draw(newDotBox(2, 4, 'cpu'), [
      ...[0, 1, 2, 3].flatMap((c) => [h(0, c), h(1, c)]),
      h(2, 0), h(2, 1), h(2, 2), h(2, 3), v(1, 3),
    ])
    for (let s = 0; s < 20; s++) {
      const e = aiEdge(makeRng(s), g)
      expect(e.o === 'v' && e.r === 0).toBe(false)
    }
  })
})
