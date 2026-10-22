import { other, type Point, type Side } from '../geom'

export type Edge = { o: 'h' | 'v'; r: number; c: number }
export type DotBox = {
  rows: number
  cols: number
  h: (Side | null)[][]
  v: (Side | null)[][]
  boxes: (Side | null)[][]
  turn: Side
  score: Record<Side, number>
}

export const CPU_INITIAL = 'C'

const grid = (r: number, c: number): null[][] => Array.from({ length: r }, () => Array<null>(c).fill(null))

export function newDotBox(rows: number, cols: number, first: Side): DotBox {
  if (!(rows >= 2 && rows <= 10 && cols >= 2 && cols <= 10)) throw new Error('grid size out of range')
  return { rows, cols, h: grid(rows + 1, cols), v: grid(rows, cols + 1), boxes: grid(rows, cols), turn: first, score: { you: 0, cpu: 0 } }
}

export function legalEdges(g: DotBox): Edge[] {
  const out: Edge[] = []
  g.h.forEach((row, r) => row.forEach((x, c) => x === null && out.push({ o: 'h', r, c })))
  g.v.forEach((row, r) => row.forEach((x, c) => x === null && out.push({ o: 'v', r, c })))
  return out
}

/** Boxes (r,c) that edge e borders. */
export function boxesOf(g: DotBox, e: Edge): [number, number][] {
  const b: [number, number][] = e.o === 'h' ? [[e.r - 1, e.c], [e.r, e.c]] : [[e.r, e.c - 1], [e.r, e.c]]
  return b.filter(([r, c]) => r >= 0 && r < g.rows && c >= 0 && c < g.cols)
}

/** Number of drawn sides of box (r,c). */
export const sidesOf = (g: DotBox, r: number, c: number): number =>
  [g.h[r][c], g.h[r + 1][c], g.v[r][c], g.v[r][c + 1]].filter((x) => x !== null).length

export const dotBoxWinner = (g: DotBox): Side | 'tie' | null =>
  g.boxes.some((row) => row.some((x) => x === null))
    ? null
    : g.score.you === g.score.cpu
      ? 'tie'
      : g.score.you > g.score.cpu
        ? 'you'
        : 'cpu'

export function playEdge(g: DotBox, e: Edge): DotBox {
  if (dotBoxWinner(g) !== null) throw new Error('game over')
  if (g[e.o][e.r]?.[e.c] !== null) throw new Error('edge taken or out of range')
  const n: DotBox = { ...g, h: g.h.map((x) => [...x]), v: g.v.map((x) => [...x]), boxes: g.boxes.map((x) => [...x]), score: { ...g.score } }
  n[e.o][e.r][e.c] = g.turn
  let got = 0
  for (const [r, c] of boxesOf(n, e)) {
    if (sidesOf(n, r, c) === 4) {
      n.boxes[r][c] = g.turn
      got++
    }
  }
  n.score[g.turn] += got
  if (!got) n.turn = other(g.turn)
  return n
}

const PICK = 0.35 // a tap counts within this many boxes of a free edge...
const CLEAR = 0.1 // ...and only if that edge is clearly nearer than the next one (a box centre or a dot is ambiguous)

/** The free edge a tap at p (in box units) clearly points at, by distance to the segment, else null. */
export function edgeNear(g: DotBox, p: Point): Edge | null {
  const off = (a: number) => Math.max(0, Math.abs(a - 0.5) - 0.5) // distance past a segment's ends, along it
  const [a, b] = legalEdges(g)
    .map((e) => ({ e, d: e.o === 'h' ? Math.hypot(off(p.x - e.c), p.y - e.r) : Math.hypot(p.x - e.c, off(p.y - e.r)) }))
    .sort((x, y) => x.d - y.d)
  return a && a.d <= PICK && (!b || b.d - a.d >= CLEAR) ? a.e : null
}
