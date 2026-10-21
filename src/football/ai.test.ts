import { describe, expect, it } from 'vitest'
import { aiPass, aiPlace, FORMATIONS, JITTER } from './ai'
import { applyPass, applyWobble, newFootballMatch, place, type FootballMatch } from './match'
import { MAX_LEN, MOUTH, W, resolvePass, shotEnd, validPlacement, type Dot } from './rules'
import { makeRng } from '../rng'
import { other } from '../geom'

const d = (id: string, team: 'you' | 'cpu', x: number, y: number): Dot => ({ id, team, x, y })
const play = (dots: Dot[], x: number, y: number): FootballMatch => ({
  ...newFootballMatch(1, 'cpu'), dots, phase: 'play', possession: 'cpu', ball: { x, y, dotId: 'c' }, lines: 2,
})
const run = (m: FootballMatch) => {
  const { angle, length } = aiPass(makeRng(1), m)
  return resolvePass(m.dots, m.ball.dotId, m.ball, shotEnd(m.ball, angle, length), 'cpu')
}

// A spread-out human dot, slid down until it is a legal spot next to the cpu's.
const human = (m: FootballMatch, i: number) => {
  let y = 40 + ((i * 97) % 420)
  while (!validPlacement(m.dots, { x: 100 + ((i * 50) % 600), y })) y = ((y + 31) % 470) + 10
  return { x: 100 + ((i * 50) % 600), y }
}

describe('ai', () => {
  it('aiPlace never throws through place', () => {
    for (let s = 0; s < 100; s++) {
      const rng = makeRng(s)
      let m = newFootballMatch(1, 'you')
      for (let i = 0; i < 12; i++) {
        const p = m.placingTurn === 'cpu' ? aiPlace(rng, m) : i === 0 ? { x: 40, y: 250 } : human(m, i)
        m = place(m, p.x, p.y)
      }
      expect(m.phase).toBe('play')
    }
  })
  it('scores into an empty lane within 133, from line 3 on', () => {
    const m = play([d('c', 'cpu', 100, 250)], 100, 250)
    expect(run(m).kind).toBe('goal')
    expect(aiPass(makeRng(1), m).length).toBeLessThanOrEqual(MAX_LEN)
  })
  it('on line 1 a goal is only a save: it passes to a teammate instead', () => {
    const dots = [d('c', 'cpu', 100, 250), d('t', 'cpu', 160, 400)]
    expect(run({ ...play(dots, 100, 250), lines: 0 }).kind).toBe('complete')
  })
  it('puts its keeper in its own D-box first', () => {
    for (let s = 0; s < 50; s++) {
      const p = aiPlace(makeRng(s), newFootballMatch(1, 'cpu'))
      expect(validPlacement([], p, 'cpu')).toBe(true)
      expect(p.x).toBeGreaterThanOrEqual(720)
      expect(p.x).toBeLessThanOrEqual(790)
    }
  })
  it('passes to an open teammate when goal lanes are blocked', () => {
    const dots = [d('c', 'cpu', 150, 250), d('t', 'cpu', 150, 450), d('y1', 'you', 100, 250), d('y2', 'you', 100, 200), d('y3', 'you', 100, 300), d('y4', 'you', 60, 230), d('y5', 'you', 60, 270)]
    expect(run(play(dots, 150, 250)).kind).toBe('complete')
  })
  it('every template point is valid at every jitter extreme', () => {
    for (const t of FORMATIONS) for (const p of t) for (const dx of [-JITTER, JITTER]) for (const dy of [-JITTER, JITTER]) {
      expect(validPlacement([], { x: p.x + dx, y: p.y + dy })).toBe(true)
    }
  })
  it('places a keeper then 5 cpu dots on one template', () => {
    const away = [[40, 40], [40, 460], [760, 40], [760, 460], [400, 30], [400, 470]]
    for (let s = 0; s < 30; s++) {
      const rng = makeRng(s)
      let m = newFootballMatch(1, 'you')
      for (let i = 0; i < 12; i++) {
        const p = m.placingTurn === 'cpu' ? aiPlace(rng, m) : i === 0 ? { x: 40, y: 250 } : { x: away[i >> 1][0], y: away[i >> 1][1] }
        m = place(m, p.x, p.y)
      }
      const cpu = m.dots.filter((x) => x.team === 'cpu')
      expect(cpu[0].keeper).toBe(true)
      expect(FORMATIONS.some((t) => cpu.slice(1).every((c, i) => Math.abs(c.x - t[i].x) <= JITTER && Math.abs(c.y - t[i].y) <= JITTER))).toBe(true)
    }
  })
  it('every template has two forwards in shot range of the human goal', () => {
    // shots only go in from about x <= 110 (BACKLOG play-test); jitter can add 15
    for (const t of FORMATIONS) expect(t.filter((p) => p.x <= 110 && p.y >= MOUTH[0] - 30 && p.y <= MOUTH[1] + 30).length).toBe(2)
  })
  it('the cpu scores in a seeded sim against its own mirror', () => {
    // The human side plays the cpu AI mirrored (x -> W - x, teams swapped).
    const flip = (m: FootballMatch): FootballMatch => ({
      ...m, possession: other(m.possession), ball: { ...m.ball, x: W - m.ball.x },
      dots: m.dots.map((d) => ({ ...d, team: other(d.team), x: W - d.x })),
    })
    let cpu = 0
    for (let s = 0; s < 20; s++) {
      const rng = makeRng(s)
      let m = newFootballMatch(1, s % 2 ? 'you' : 'cpu')
      while (m.phase === 'placement') {
        const p = m.placingTurn === 'cpu' ? aiPlace(rng, m) : (({ x, y }) => ({ x: W - x, y }))(aiPlace(rng, flip(m)))
        m = place(m, p.x, p.y)
      }
      for (let i = 0; i < 300 && m.phase === 'play'; i++) {
        const p = m.possession === 'cpu' ? aiPass(rng, m) : (({ angle, length }) => ({ angle: Math.PI - angle, length }))(aiPass(rng, flip(m)))
        const w = applyWobble(rng, p.angle, p.length)
        const to = shotEnd(m.ball, w.angle, w.length)
        m = applyPass(m, { x: m.ball.x, y: m.ball.y }, to, resolvePass(m.dots, m.ball.dotId, m.ball, to, m.possession))
      }
      cpu += m.score.cpu
    }
    expect(cpu).toBeGreaterThanOrEqual(5)
  })
})
