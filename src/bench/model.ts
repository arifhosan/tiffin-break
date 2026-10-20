import { DEFAULT_SAVED, type ItemId, type Saved } from '../storage'
import { segPointDist, type Point } from '../geom'

export const BENCH_W = 600
export const BENCH_H = 800
export const MAX_STROKES = 300

const clamp = (v: number, hi: number) => Math.max(0, Math.min(hi, v))

export function moveItem(s: Saved, id: ItemId, x: number, y: number): Saved {
  return { ...s, items: { ...s.items, [id]: { ...s.items[id], x: clamp(x, BENCH_W), y: clamp(y, BENCH_H) } } }
}

export function normalizeItems(s: Saved): Saved {
  const items = { ...s.items }
  for (const k of Object.keys(items) as ItemId[]) items[k] = { ...items[k], x: clamp(items[k].x, BENCH_W), y: clamp(items[k].y, BENCH_H) }
  return { ...s, items }
}

type P = [number, number]

// Ramer-Douglas-Peucker (recursive: strokes are short, a few hundred points).
export function simplify(pts: P[], eps = 1.5): P[] {
  if (pts.length < 3) return pts
  const a = { x: pts[0][0], y: pts[0][1] }
  const b = { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] }
  let maxD = 0
  let at = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const { d } = segPointDist(a, b, { x: pts[i][0], y: pts[i][1] })
    if (d > maxD) { maxD = d; at = i }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]]
  return [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)]
}

export function addStroke(s: Saved, pts: P[], id: string): Saved {
  if (pts.length < 2) return s
  return { ...s, strokes: [...s.strokes, { id, pts: simplify(pts) }].slice(-MAX_STROKES) }
}

export function eraseAt(s: Saved, p: Point, r = 8): Saved {
  const hit = (pts: P[]) =>
    pts.some((q, i) => {
      const a = { x: q[0], y: q[1] }
      const b = pts[i + 1] ? { x: pts[i + 1][0], y: pts[i + 1][1] } : a
      return segPointDist(a, b, p).d <= r
    })
  return { ...s, strokes: s.strokes.filter((st) => !hit(st.pts)) }
}

export function resetBench(s: Saved): Saved {
  return { ...structuredClone(DEFAULT_SAVED), name: s.name, muted: s.muted, best: s.best }
}
