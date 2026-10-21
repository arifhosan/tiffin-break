import { describe, expect, it } from 'vitest'
import { resolvePass, validPlacement, type Dot } from './rules'

const you = (id: string, x: number, y: number): Dot => ({ id, team: 'you', x, y })
const cpu = (id: string, x: number, y: number): Dot => ({ id, team: 'cpu', x, y })

describe('resolvePass', () => {
  it('completes within 22 of the end', () => {
    const r = resolvePass([you('a', 100, 100), you('b', 300, 110)], 'a', { x: 100, y: 100 }, { x: 300, y: 130 }, 'you')
    expect(r).toMatchObject({ kind: 'complete', to: { id: 'b' } })
    expect(r.ray).toBeUndefined()
  })
  it('intercepts on an opponent near the segment', () => {
    const r = resolvePass([you('a', 100, 100), cpu('c', 200, 108)], 'a', { x: 100, y: 100 }, { x: 300, y: 100 }, 'you')
    expect(r).toMatchObject({ kind: 'intercepted', by: { id: 'c' }, at: { x: 200, y: 100 } })
  })
  it('ignores own dots on the segment', () => {
    const r = resolvePass([you('a', 100, 100), you('m', 200, 100), you('b', 300, 100)], 'a', { x: 100, y: 100 }, { x: 300, y: 100 }, 'you')
    expect(r).toMatchObject({ kind: 'complete', to: { id: 'b' } })
  })
  it('scores through the right mouth for you', () => {
    const r = resolvePass([you('a', 600, 250)], 'a', { x: 600, y: 250 }, { x: 820, y: 250 }, 'you')
    expect(r).toMatchObject({ kind: 'goal', scorer: 'you', at: { x: 800, y: 250 } })
  })
  it('own goal through the left mouth credits cpu', () => {
    const r = resolvePass([you('a', 200, 250)], 'a', { x: 200, y: 250 }, { x: -20, y: 250 }, 'you')
    expect(r).toMatchObject({ kind: 'goal', scorer: 'cpu' })
  })
  it('goes out through the top edge', () => {
    const r = resolvePass([you('a', 400, 100)], 'a', { x: 400, y: 100 }, { x: 400, y: -50 }, 'you')
    expect(r).toMatchObject({ kind: 'out', at: { x: 400, y: 0 }, restart: { x: 400, y: 10 } })
  })
  it('opponent in front of the goal intercepts, not goal', () => {
    const r = resolvePass([you('a', 600, 250), cpu('c', 770, 250)], 'a', { x: 600, y: 250 }, { x: 820, y: 250 }, 'you')
    expect(r.kind).toBe('intercepted')
  })
  it('ray hits an own dot', () => {
    const r = resolvePass([you('a', 100, 100), you('b', 400, 105)], 'a', { x: 100, y: 100 }, { x: 300, y: 100 }, 'you')
    expect(r).toMatchObject({ kind: 'complete', to: { id: 'b' }, ray: { from: { x: 300, y: 100 }, to: { x: 400, y: 105 } } })
  })
  it('ray hits an opponent at the dot', () => {
    const r = resolvePass([you('a', 100, 100), cpu('c', 500, 95)], 'a', { x: 100, y: 100 }, { x: 300, y: 100 }, 'you')
    expect(r).toMatchObject({ kind: 'intercepted', by: { id: 'c' }, at: { x: 500, y: 95 }, ray: { from: { x: 300, y: 100 } } })
  })
  it('ray through the mouth is out, not goal', () => {
    const r = resolvePass([you('a', 500, 250)], 'a', { x: 500, y: 250 }, { x: 600, y: 250 }, 'you')
    expect(r).toMatchObject({ kind: 'out', at: { x: 800, y: 250 }, restart: { x: 790, y: 250 }, ray: { from: { x: 600, y: 250 }, to: { x: 800, y: 250 } } })
  })
  it('a line stopping within 22 short of the mouth rolls in (I2)', () => {
    const r = resolvePass([you('a', 680, 200)], 'a', { x: 680, y: 200 }, { x: 785, y: 200 }, 'you')
    expect(r).toMatchObject({ kind: 'goal', scorer: 'you', at: { x: 800, y: 200 }, ray: { from: { x: 785, y: 200 }, to: { x: 800, y: 200 } } })
  })
  it('a keeper on the goal line stops the roll-in', () => {
    const r = resolvePass([you('a', 680, 200), cpu('k', 795, 200)], 'a', { x: 680, y: 200 }, { x: 785, y: 200 }, 'you')
    expect(r.kind).toBe('intercepted')
  })
  it('zero-length tap with no own dot nearby is out', () => {
    const r = resolvePass([you('a', 5, 5)], 'a', { x: 5, y: 5 }, { x: 5, y: 5 }, 'you')
    expect(r).toMatchObject({ kind: 'out', at: { x: 5, y: 5 }, restart: { x: 10, y: 10 } })
  })
})

describe('validPlacement', () => {
  const dots = [you('a', 400, 250)]
  it('rejects D-boxes, near dots and edges; accepts open spots', () => {
    expect(validPlacement(dots, { x: 40, y: 250 })).toBe(false)
    expect(validPlacement(dots, { x: 760, y: 250 })).toBe(false)
    expect(validPlacement(dots, { x: 420, y: 250 })).toBe(false)
    expect(validPlacement(dots, { x: 5, y: 100 })).toBe(false)
    expect(validPlacement(dots, { x: 700, y: 100 })).toBe(true)
  })
})
