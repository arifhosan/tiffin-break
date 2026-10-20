import { shuffle } from '../rng'
import { boxesOf, legalEdges, playEdge, sidesOf, type DotBox, type Edge } from './rules'

const completes = (g: DotBox, e: Edge) => boxesOf(g, e).some(([r, c]) => sidesOf(g, r, c) === 3)
const safe = (g: DotBox, e: Edge) => boxesOf(g, e).every(([r, c]) => sidesOf(g, r, c) < 2)

/** Boxes the opponent claims after e, taking completing edges greedily. */
function giveaway(g: DotBox, e: Edge): number {
  let s = playEdge(g, e)
  const start = s.score.you + s.score.cpu
  for (;;) {
    const c = legalEdges(s).find((x) => completes(s, x))
    if (!c) return s.score.you + s.score.cpu - start
    s = playEdge(s, c)
  }
}

export function aiEdge(rng: () => number, g: DotBox): Edge {
  const all = legalEdges(g)
  const win = all.find((e) => completes(g, e))
  if (win) return win
  const ok = all.filter((e) => safe(g, e))
  if (ok.length) return ok[Math.floor(rng() * ok.length)]
  const scored = shuffle(rng, all).map((e) => ({ e, n: giveaway(g, e) }))
  return scored.reduce((a, b) => (b.n < a.n ? b : a)).e
}
