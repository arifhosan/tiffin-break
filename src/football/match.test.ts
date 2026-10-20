import { describe, expect, it } from 'vitest'
import { applyPass, applyWobble, footballWinner, newFootballMatch, place, type FootballMatch } from './match'
import type { Dot } from './rules'
import { makeRng } from '../rng'

const spots = [[100, 50], [700, 50], [100, 450], [700, 450], [300, 50], [500, 50], [300, 450], [500, 450], [300, 250], [500, 250], [200, 100], [600, 100]]
const full = (target: 1 | 3 | 5 = 3) => spots.reduce((m, [x, y]) => place(m, x, y), newFootballMatch(target, 'you'))
const goal = (scorer: 'you' | 'cpu') => ({ kind: 'goal' as const, scorer, at: { x: 800, y: 250 } })
const P = { x: 0, y: 0 }

describe('place', () => {
  it('12 placements start play', () => {
    const m = full()
    expect(m.phase).toBe('play')
    expect(m.ball).toEqual({ x: 400, y: 250, dotId: null })
    expect(m.dots[0].id).toBe('you-0')
    expect(m.dots[1].id).toBe('cpu-0')
  })
  it('throws on invalid spot and wrong phase', () => {
    expect(() => place(newFootballMatch(1, 'you'), 40, 250)).toThrow()
    expect(() => place(full(), 50, 50)).toThrow()
    expect(() => applyPass(newFootballMatch(1, 'you'), P, P, goal('you'))).toThrow()
  })
})

describe('applyPass', () => {
  it('goal: score, centre, conceder kicks off', () => {
    const m = applyPass(full(), P, P, goal('you'))
    expect(m.score.you).toBe(1)
    expect(m.ball).toEqual({ x: 400, y: 250, dotId: null })
    expect(m.possession).toBe('cpu')
    expect(m.lines).toBe(0)
  })
  it('reaching target is done with a winner', () => {
    const m = applyPass(full(1), P, P, goal('you'))
    expect(m.phase).toBe('done')
    expect(footballWinner(m)).toBe('you')
    expect(footballWinner(full())).toBeNull()
  })
  it('complete keeps possession, intercepted swaps', () => {
    const m = full()
    const to: Dot = m.dots[2]
    const c = applyPass(m, P, to, { kind: 'complete', to })
    expect(c.possession).toBe('you')
    expect(c.lines).toBe(1)
    expect(c.ball.dotId).toBe('you-1')
    const by = m.dots[1]
    const i = applyPass(m, P, P, { kind: 'intercepted', by, at: { x: 5, y: 5 } })
    expect(i.possession).toBe('cpu')
    expect(i.ball.dotId).toBeNull()
    expect(i.trail).toHaveLength(1)
  })
  it('3rd complete line hands the ball to the opponent dot nearest the end', () => {
    let m: FootballMatch = { ...full(), lines: 2 }
    const to = { x: 490, y: 240 }
    m = applyPass(m, P, to, { kind: 'complete', to: m.dots[0] })
    expect(m.possession).toBe('cpu')
    expect(m.ball.dotId).toBe('cpu-4') // (500,250)
    expect(m.lines).toBe(0)
  })
})

it('applyWobble is deterministic per seed', () => {
  expect(applyWobble(makeRng(1), 1, 100)).toEqual(applyWobble(makeRng(1), 1, 100))
})
