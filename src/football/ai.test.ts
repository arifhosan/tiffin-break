import { describe, expect, it } from 'vitest'
import { aiPass, aiPlace } from './ai'
import { newFootballMatch, place, type FootballMatch } from './match'
import { resolvePass, shotEnd, type Dot } from './rules'
import { makeRng } from '../rng'

const d = (id: string, team: 'you' | 'cpu', x: number, y: number): Dot => ({ id, team, x, y })
const play = (dots: Dot[], x: number, y: number): FootballMatch => ({
  ...newFootballMatch(1, 'cpu'), dots, phase: 'play', possession: 'cpu', ball: { x, y, dotId: 'c' },
})
const run = (m: FootballMatch) => {
  const { angle, length } = aiPass(makeRng(1), m)
  return resolvePass(m.dots, m.ball.dotId, m.ball, shotEnd(m.ball, angle, length), 'cpu')
}

describe('ai', () => {
  it('aiPlace never throws through place', () => {
    for (let s = 0; s < 100; s++) {
      const rng = makeRng(s)
      let m = newFootballMatch(1, 'you')
      for (let i = 0; i < 12; i++) {
        const p = m.placingTurn === 'cpu' ? aiPlace(rng, m) : { x: 100 + ((i * 50) % 600), y: 40 + ((i * 97) % 420) }
        m = place(m, p.x, p.y)
      }
      expect(m.phase).toBe('play')
    }
  })
  it('scores into an empty lane', () => {
    expect(run(play([d('c', 'cpu', 150, 250)], 150, 250)).kind).toBe('goal')
  })
  it('passes to an open teammate when goal lanes are blocked', () => {
    const dots = [d('c', 'cpu', 150, 250), d('t', 'cpu', 150, 450), d('y1', 'you', 100, 250), d('y2', 'you', 100, 200), d('y3', 'you', 100, 300), d('y4', 'you', 60, 230), d('y5', 'you', 60, 270)]
    expect(run(play(dots, 150, 250)).kind).toBe('complete')
  })
})
