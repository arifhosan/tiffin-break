import { describe, expect, it } from 'vitest'
import { applyPass, applyWobble, footballWinner, MAX_LINES, newFootballMatch, place, type FootballMatch } from './match'
import { MAX_LEN, resolvePass, shotEnd, validPlacement, W, type Dot } from './rules'
import { makeRng } from '../rng'

const spots = [[40, 250], [760, 250], [100, 450], [700, 450], [300, 50], [500, 50], [300, 450], [500, 450], [300, 250], [500, 250], [200, 100], [600, 100]]
const full = (target: 1 | 3 | 5 = 3) => spots.reduce((m, [x, y]) => place(m, x, y), newFootballMatch(target, 'you'))
const third = (m: FootballMatch): FootballMatch => ({ ...m, lines: 2 }) // the next line is the 3rd: a goal counts
const goal = (scorer: 'you' | 'cpu') => ({ kind: 'goal' as const, scorer, at: { x: 800, y: 250 } })
const P = { x: 0, y: 0 }

describe('place', () => {
  it('12 placements start play', () => {
    const m = full()
    expect(m.phase).toBe('play')
    expect(m.ball).toEqual({ x: 400, y: 250, dotId: null })
    expect(m.dots[0].id).toBe('you-0')
    expect(m.dots[1].id).toBe('cpu-0')
    expect(m.dots.filter((d) => d.keeper).map((d) => d.id)).toEqual(['you-0', 'cpu-0'])
  })
  it('throws on invalid spot and wrong phase', () => {
    expect(() => place(newFootballMatch(1, 'you'), 400, 250)).toThrow()
    expect(() => place(full(), 50, 50)).toThrow()
    expect(() => applyPass(newFootballMatch(1, 'you'), P, P, goal('you'))).toThrow()
  })
})

describe('goalkeeper', () => {
  it('the first placement must be inside your own D-box, the rest outside both', () => {
    const m0 = newFootballMatch(1, 'you')
    expect(() => place(m0, 100, 250)).toThrow() // just outside the box
    expect(() => place(m0, 760, 250)).toThrow() // the other side's box
    expect(() => place(m0, 40, 100)).toThrow() // right x, but above the box
    const m1 = place(m0, 40, 250)
    expect(m1.dots[0]).toMatchObject({ id: 'you-0', keeper: true })
    expect(() => place(m1, 40, 250)).toThrow() // cpu keeper into your box
    const m2 = place(m1, 760, 250)
    expect(() => place(m2, 40, 330)).toThrow() // a non-keeper in a D-box
    expect(() => place(m2, 780, 200)).toThrow()
    expect(place(m2, 200, 250).dots[2].keeper).toBeUndefined()
  })
  it('validPlacement keeper boxes honour the edges and the gap', () => {
    expect(validPlacement([], { x: 80, y: 150 }, 'you')).toBe(true)
    expect(validPlacement([], { x: 5, y: 250 }, 'you')).toBe(false)
    expect(validPlacement([], { x: 720, y: 350 }, 'cpu')).toBe(true)
    expect(validPlacement([], { x: 719, y: 250 }, 'cpu')).toBe(false)
    expect(validPlacement([], { x: 795, y: 250 }, 'cpu')).toBe(false)
  })
})

describe('applyPass', () => {
  it('goal: score, centre, conceder kicks off', () => {
    const m = applyPass(third(full()), P, P, goal('you'))
    expect(m.score.you).toBe(1)
    expect(m.ball).toEqual({ x: 400, y: 250, dotId: null })
    expect(m.possession).toBe('cpu')
    expect(m.lines).toBe(0)
  })
  it('a kick-off line into the goal is a save: ball on the defending keeper, no score', () => {
    const m = applyPass(full(), P, P, goal('you')) // lines 0 -> line 1
    expect(m.score).toEqual({ you: 0, cpu: 0 })
    expect(m.possession).toBe('cpu')
    expect(m.ball).toEqual({ x: 760, y: 250, dotId: 'cpu-0' })
    expect(m.lines).toBe(0)
    expect(m.phase).toBe('play')
    const own = applyPass(full(), P, P, goal('cpu')) // your line into your own goal: your keeper saves
    expect(own).toMatchObject({ score: { you: 0, cpu: 0 }, possession: 'you', ball: { x: 40, y: 250, dotId: 'you-0' } })
  })
  it('line 2 still saves, line 3 counts, line 5 counts', () => {
    expect(applyPass({ ...full(), lines: 1 }, P, P, goal('you')).score.you).toBe(0)
    expect(applyPass({ ...full(), lines: 2 }, P, P, goal('you')).score.you).toBe(1)
    expect(applyPass({ ...full(), lines: 4 }, P, P, goal('cpu')).score.cpu).toBe(1)
  })
  it('reaching target is done with a winner', () => {
    const m = applyPass(third(full(1)), P, P, goal('you'))
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
  it('5th complete line hands the ball to the opponent dot nearest the end', () => {
    expect(MAX_LINES).toBe(5)
    let m: FootballMatch = full()
    for (let i = 0; i < 4; i++) { // lines 1-4 keep the ball
      m = applyPass(m, P, P, { kind: 'complete', to: m.dots[2] })
      expect(m).toMatchObject({ possession: 'you', lines: i + 1 })
    }
    const to = { x: 490, y: 240 }
    m = applyPass(m, P, to, { kind: 'complete', to: m.dots[0] })
    expect(m.possession).toBe('cpu')
    expect(m.ball.dotId).toBe('cpu-4') // (500,250)
    expect(m.lines).toBe(0)
  })
})

// I2: a human aims so the preview line just reaches the goal line; with wobble that must still score most of the time.
it('a human shot on line 3 that is aimed at the goal line usually scores', () => {
  const rng = makeRng(7)
  const shots = [[700, 120, 205], [690, 380, 295], [660, 250, 205], [730, 130, 220]] // shooter x, y, aimed mouth y
  let goals = 0, n = 0
  for (const [x, y, gy] of shots) {
    const m: FootballMatch = { ...full(), lines: 2, ball: { x, y, dotId: 'you-9' } }
    const dots = [...m.dots.filter((d) => d.team === 'you' || d.keeper), { id: 'you-9', team: 'you' as const, x, y }]
    for (let i = 0; i < 250; i++, n++) {
      const w = applyWobble(rng, Math.atan2(gy - y, W - x), Math.hypot(W - x, gy - y))
      const to = shotEnd({ x, y }, w.angle, w.length)
      goals += applyPass({ ...m, dots }, { x, y }, to, resolvePass(dots, 'you-9', { x, y }, to, 'you')).score.you
    }
  }
  expect(goals / n).toBeGreaterThan(0.85)
})

it('applyWobble never exceeds 133 x 1.08', () => {
  for (let s = 0; s < 500; s++) expect(applyWobble(makeRng(s), 0, MAX_LEN).length).toBeLessThanOrEqual(MAX_LEN * 1.08)
})

it('applyWobble is deterministic per seed', () => {
  expect(applyWobble(makeRng(1), 1, 100)).toEqual(applyWobble(makeRng(1), 1, 100))
})
