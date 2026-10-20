import { other, type Point, type Side } from '../geom'
import { hitAt, onLine, type Field, type OutHow } from './field'

export type BallOutcome =
  | { kind: 'runs'; runs: 0 | 1 | 2 | 3 | 4 | 6 }
  | { kind: 'extra'; what: 'wide' | 'noball' }
  | { kind: 'out'; how: OutHow | 'stumped' }

export function resolveDrop(f: Field, p: Point, isRedrop: boolean): BallOutcome | { kind: 'appeal' } {
  if (!isRedrop && onLine(p)) return { kind: 'appeal' }
  const h = hitAt(f, p)
  if (isRedrop) return h.kind === 'cell' && h.label.kind !== 'out' ? { kind: 'runs', runs: 0 } : { kind: 'out', how: 'lbw' }
  if (h.kind === 'off') return { kind: 'out', how: 'stumped' }
  const l = h.label
  if (l.kind === 'dot') return { kind: 'runs', runs: 0 }
  if (l.kind === 'wide' || l.kind === 'noball') return { kind: 'extra', what: l.kind }
  return l
}

export type Overs = 1 | 2 | 5
export const WICKETS = { 1: 2, 2: 3, 5: 5 } as const
export type Ball = { outcome: BallOutcome; at: Point }
export type Innings = { batting: Side; runs: number; wickets: number; legalBalls: number; balls: Ball[] }
export type CricketMatch = { overs: Overs; field: Field; innings: [Innings] | [Innings, Innings]; done: boolean }

const fresh = (batting: Side): Innings => ({ batting, runs: 0, wickets: 0, legalBalls: 0, balls: [] })

export const newCricketMatch = (overs: Overs, field: Field, firstBat: Side): CricketMatch => ({
  overs,
  field,
  innings: [fresh(firstBat)],
  done: false,
})

export const currentInnings = (m: CricketMatch): Innings => m.innings[m.innings.length - 1]
export const target = (m: CricketMatch): number | null => (m.innings.length === 2 ? m.innings[0].runs + 1 : null)

export function applyBall(m: CricketMatch, b: Ball): CricketMatch {
  if (m.done) throw new Error('match is over')
  const o = b.outcome
  const cur = currentInnings(m)
  const i: Innings = {
    ...cur,
    balls: [...cur.balls, b],
    runs: cur.runs + (o.kind === 'runs' ? o.runs : o.kind === 'extra' ? 1 : 0),
    wickets: cur.wickets + (o.kind === 'out' ? 1 : 0),
    legalBalls: cur.legalBalls + (o.kind === 'extra' ? 0 : 1),
  }
  const over = i.legalBalls >= m.overs * 6 || i.wickets >= WICKETS[m.overs]
  if (m.innings.length === 2) {
    const innings: [Innings, Innings] = [m.innings[0], i]
    return { ...m, innings, done: over || i.runs > m.innings[0].runs }
  }
  return over ? { ...m, innings: [i, fresh(other(i.batting))] } : { ...m, innings: [i] }
}

export function cricketResult(m: CricketMatch): null | { winner: Side | 'tie'; by: 'runs' | 'wickets' | null; n: number } {
  if (!m.done || m.innings.length < 2) return null
  const [a, c] = m.innings
  if (c.runs > a.runs) return { winner: c.batting, by: 'wickets', n: WICKETS[m.overs] - c.wickets }
  if (a.runs > c.runs) return { winner: a.batting, by: 'runs', n: a.runs - c.runs }
  return { winner: 'tie', by: null, n: 0 }
}
