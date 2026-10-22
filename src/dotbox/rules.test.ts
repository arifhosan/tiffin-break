import { describe, expect, it } from 'vitest'
import { dotBoxWinner, edgeNear, legalEdges, newDotBox, playEdge, type DotBox, type Edge } from './rules'

const h = (r: number, c: number): Edge => ({ o: 'h', r, c })
const v = (r: number, c: number): Edge => ({ o: 'v', r, c })
const play = (g: DotBox, es: Edge[]) => es.reduce(playEdge, g)

describe('dotbox rules', () => {
  it('2x2 has 12 legal edges', () => {
    expect(legalEdges(newDotBox(2, 2, 'you'))).toHaveLength(12)
  })
  it('4th side claims, scores, keeps turn; plain line passes turn', () => {
    let g = play(newDotBox(2, 2, 'you'), [h(0, 0), v(0, 0), h(1, 0)]) // you, cpu, you
    expect(g.turn).toBe('cpu')
    g = playEdge(g, v(0, 1)) // cpu completes box (0,0)
    expect(g.boxes[0][0]).toBe('cpu')
    expect(g.score).toEqual({ you: 0, cpu: 1 })
    expect(g.turn).toBe('cpu')
  })
  it('shared edge claims two boxes', () => {
    // boxes (0,0) and (0,1) each missing only v(0,1)
    const g = play(newDotBox(2, 2, 'you'), [h(0, 0), h(1, 0), v(0, 0), h(0, 1), h(1, 1), v(0, 2)])
    const t = g.turn
    const g2 = playEdge(g, v(0, 1))
    expect(g2.score[t]).toBe(2)
    expect(g2.turn).toBe(t)
  })
  it('winner and tie', () => {
    let g = newDotBox(2, 2, 'you')
    for (const e of legalEdges(g)) if (dotBoxWinner(g) === null) g = playEdge(g, e)
    expect(dotBoxWinner(g)).toBe(g.score.you > g.score.cpu ? 'you' : g.score.you < g.score.cpu ? 'cpu' : 'tie')
    expect(g.score.you + g.score.cpu).toBe(4)
    expect(() => playEdge(g, h(0, 0))).toThrow()
    expect(dotBoxWinner({ ...g, score: { you: 2, cpu: 2 } })).toBe('tie')
    expect(dotBoxWinner({ ...g, score: { you: 3, cpu: 1 } })).toBe('you')
  })
  it('throws on taken / out of range / bad size', () => {
    const g = playEdge(newDotBox(2, 2, 'you'), h(0, 0))
    expect(() => playEdge(g, h(0, 0))).toThrow()
    expect(() => playEdge(g, h(3, 0))).toThrow()
    expect(() => newDotBox(1, 4, 'you')).toThrow()
    expect(() => newDotBox(11, 4, 'you')).toThrow()
  })
  it('edgeNear', () => {
    const g = newDotBox(2, 2, 'you')
    expect(edgeNear(g, { x: 0.5, y: 0.05 })).toEqual(h(0, 0))
    expect(edgeNear(g, { x: 5, y: 5 })).toBeNull()
    expect(edgeNear(playEdge(g, h(0, 0)), { x: 0.5, y: 0.05 })).toBeNull() // only taken edge within 0.5
    expect(edgeNear(playEdge(g, h(0, 0)), { x: 0.2, y: 0.1 })).toEqual(v(0, 0)) // taken h(0,0) skipped, free v(0,0) nearest
    expect(edgeNear(g, { x: 0.5, y: 0.5 })).toBeNull() // dead centre of a box: no side is nearer
    expect(edgeNear(g, { x: 0.3, y: 0.3 })).toBeNull() // corner of a box: top and left tie
    expect(edgeNear(g, { x: 0.5, y: 0.6 })).toBeNull() // past PICK from every edge
    expect(edgeNear(g, { x: 0.5, y: 0.25 })).toEqual(h(0, 0))
    expect(edgeNear(g, { x: 1.05, y: 0.3 })).toEqual(v(0, 1)) // a drag's end point near the line still counts
  })
})
