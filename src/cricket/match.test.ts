import { describe, it, expect } from 'vitest'
import type { Field, Label } from './field'
import { resolveDrop, newCricketMatch, applyBall, currentInnings, target, cricketResult, type BallOutcome, type CricketMatch } from './match'

const dot: Label = { kind: 'dot' }
const field: Field = {
  outer: [{ kind: 'out', how: 'catch' }, ...Array<Label>(15).fill(dot)],
  inner: Array<Label>(16).fill(dot),
}
const at = { x: 0, y: 0 }
const run = (n: 0 | 1 | 2 | 3 | 4 | 6): BallOutcome => ({ kind: 'runs', runs: n })
const out: BallOutcome = { kind: 'out', how: 'bowled' }
const play = (m: CricketMatch, os: BallOutcome[]) => os.reduce((a, outcome) => applyBall(a, { outcome, at }), m)

describe('resolveDrop', () => {
  const p0 = { x: 100, y: 0 } // on the 0 degree radial, outer wedge 0 = out
  it('line touch on first drop is an appeal', () => expect(resolveDrop(field, p0, false)).toEqual({ kind: 'appeal' }))
  it('same point on a re-drop resolves from its cell', () =>
    expect(resolveDrop(field, p0, true)).toEqual({ kind: 'out', how: 'lbw' }))
  it('off the field', () => {
    const p = { x: 195, y: 50 }
    expect(resolveDrop(field, p, false)).toEqual({ kind: 'out', how: 'stumped' })
    expect(resolveDrop(field, p, true)).toEqual({ kind: 'out', how: 'lbw' })
  })
  it('cells map to outcomes', () => {
    const p = { x: -100, y: -30 }
    expect(resolveDrop(field, p, false)).toEqual(run(0))
    expect(resolveDrop(field, p, true)).toEqual(run(0))
    const f: Field = { outer: Array<Label>(16).fill({ kind: 'wide' }), inner: Array<Label>(16).fill({ kind: 'runs', runs: 6 }) }
    expect(resolveDrop(f, { x: -100, y: -30 }, false)).toEqual({ kind: 'extra', what: 'wide' })
    expect(resolveDrop(f, { x: -40, y: -30 }, false)).toEqual(run(6))
  })
})

describe('match', () => {
  const m0 = () => newCricketMatch(1, field, 'you')
  it('wide adds a run, not a ball', () => {
    const i = currentInnings(play(m0(), [{ kind: 'extra', what: 'wide' }]))
    expect([i.runs, i.legalBalls, i.balls.length]).toEqual([1, 0, 1])
  })
  it('6 legal balls end the innings', () => {
    let m = play(m0(), Array(5).fill(run(1)))
    expect(m.innings.length).toBe(1)
    m = play(m, [run(1)])
    expect(m.innings.length).toBe(2)
    expect(target(m)).toBe(7)
  })
  it('2 outs end a 1-over innings', () => {
    const m = play(m0(), [out, out])
    expect(m.innings.length).toBe(2)
    expect(currentInnings(m).batting).toBe('cpu')
  })
  it('chase passing target ends match by wickets', () => {
    let m = play(m0(), [run(2), run(0), run(0), run(0), run(0), run(0)]) // 2
    m = play(m, [run(1), run(0), run(2)])
    expect(m.done).toBe(true)
    expect(cricketResult(m)).toEqual({ winner: 'cpu', by: 'wickets', n: 2 })
    expect(() => applyBall(m, { outcome: run(1), at })).toThrow()
    expect(cricketResult(m0())).toBeNull()
  })
  it('tie', () => {
    const m = play(m0(), [run(1), ...Array(5).fill(run(0)), run(1), ...Array(5).fill(run(0))])
    expect(m.done).toBe(true)
    expect(cricketResult(m)).toEqual({ winner: 'tie', by: null, n: 0 })
  })
  it('defender wins by runs', () => {
    const m = play(m0(), [run(4), ...Array(5).fill(run(0)), run(1), ...Array(5).fill(run(0))])
    expect(cricketResult(m)).toEqual({ winner: 'you', by: 'runs', n: 3 })
  })
  it('a wide can win the chase', () => {
    const m = play(m0(), [run(1), ...Array(5).fill(run(0)), run(1), { kind: 'extra', what: 'wide' }])
    expect(m.done).toBe(true)
  })
})
