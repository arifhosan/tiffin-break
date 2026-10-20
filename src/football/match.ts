import { dist, other, type Point, type Side } from '../geom'
import { gaussian } from '../rng'
import { H, MAX_LEN, W, validPlacement, type Dot, type PassResult } from './rules'

export const DOTS_PER_TEAM = 6
export const MAX_LINES = 5
export type Target = 1 | 3 | 5
export type Trail = { from: Point; to: Point; team: Side; ray?: { from: Point; to: Point } }
export type FootballMatch = {
  target: Target
  dots: Dot[]
  score: Record<Side, number>
  phase: 'placement' | 'play' | 'done'
  placingTurn: Side
  kickoff: Side
  possession: Side
  ball: { x: number; y: number; dotId: string | null }
  lines: number
  trail: Trail[]
}

const CENTRE = { x: W / 2, y: H / 2 }

export function newFootballMatch(target: Target, kickoff: Side): FootballMatch {
  return {
    target, dots: [], score: { you: 0, cpu: 0 }, phase: 'placement', placingTurn: 'you', kickoff,
    possession: kickoff, ball: { ...CENTRE, dotId: null }, lines: 0, trail: [],
  }
}

export function place(m: FootballMatch, x: number, y: number): FootballMatch {
  if (m.phase !== 'placement') throw new Error('not in placement')
  const team = m.placingTurn
  const n = m.dots.filter((d) => d.team === team).length
  const keeper = n === 0 // each side's first dot is its goalkeeper
  if (!validPlacement(m.dots, { x, y }, keeper ? team : undefined)) throw new Error('invalid placement')
  const dots = [...m.dots, { id: `${team}-${n}`, team, x, y, ...(keeper && { keeper: true as const }) }]
  const next = { ...m, dots, placingTurn: other(team) }
  return dots.length < DOTS_PER_TEAM * 2 ? next : { ...next, phase: 'play', possession: m.kickoff, ball: { ...CENTRE, dotId: null }, lines: 0 }
}

export function applyPass(m: FootballMatch, from: Point, to: Point, r: PassResult): FootballMatch {
  if (m.phase !== 'play') throw new Error('not in play')
  const team = m.possession
  const trail = [...m.trail, { from, to, team, ...(r.ray && { ray: r.ray }) }]
  const lines = m.lines + 1
  const base = { ...m, trail }
  switch (r.kind) {
    case 'goal': {
      if (lines <= 2) { // lines 1-2 cannot score: the defending keeper saves it and starts again
        const keeper = m.dots.find((d) => d.team === other(r.scorer) && d.keeper)!
        return { ...base, ball: { x: keeper.x, y: keeper.y, dotId: keeper.id }, possession: keeper.team, lines: 0 }
      }
      const score = { ...m.score, [r.scorer]: m.score[r.scorer] + 1 }
      return {
        ...base, score, phase: score[r.scorer] >= m.target ? 'done' : 'play',
        ball: { ...CENTRE, dotId: null }, possession: other(r.scorer), lines: 0,
      }
    }
    case 'intercepted': {
      const onDot = r.at.x === r.by.x && r.at.y === r.by.y
      return { ...base, ball: { x: r.at.x, y: r.at.y, dotId: onDot ? r.by.id : null }, possession: other(team), lines: 0 }
    }
    case 'out':
      return { ...base, ball: { x: r.restart.x, y: r.restart.y, dotId: null }, possession: other(team), lines: 0 }
    case 'complete': {
      if (lines < MAX_LINES) return { ...base, ball: { x: r.to.x, y: r.to.y, dotId: r.to.id }, lines }
      const opp = m.dots.filter((d) => d.team !== team).reduce((a, b) => (dist(b, to) < dist(a, to) ? b : a))
      return { ...base, ball: { x: opp.x, y: opp.y, dotId: opp.id }, possession: other(team), lines: 0 }
    }
  }
}

export function footballWinner(m: FootballMatch): Side | null {
  return m.score.you >= m.target ? 'you' : m.score.cpu >= m.target ? 'cpu' : null
}

export function applyWobble(rng: () => number, angle: number, length: number): { angle: number; length: number } {
  return { angle: angle + gaussian(rng, 0.07), length: Math.min(length * (1 + gaussian(rng, 0.08)), MAX_LEN * 1.08) }
}
