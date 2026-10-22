import { DEFAULT_SAVED, type ItemId, type Saved } from '../storage'
import { segPointDist, type Point } from '../geom'

export const BENCH_W = 600
export const BENCH_H = 800
export const MAX_STROKES = 300

// Half width and height of each item's art (bench/items.tsx, hit areas included), before its rotation.
const HALF: Record<ItemId, [number, number]> = {
  notebook: [109, 142], bookBangla: [79, 106], bookMath: [79, 106], bookEnglish: [79, 106],
  pen: [18, 88], pencil: [18, 90], eraser: [40, 28], geometry: [95, 52], tiffin: [74, 64],
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Keeps the item's whole rotated bounding box on the bench, not just its centre. */
function fit(id: ItemId, it: Saved['items'][ItemId], x: number, y: number) {
  const [w, h] = HALF[id]
  const a = (it.rot * Math.PI) / 180
  const c = Math.abs(Math.cos(a))
  const sn = Math.abs(Math.sin(a))
  const hw = w * c + h * sn
  const hh = w * sn + h * c
  return { ...it, x: clamp(x, hw, BENCH_W - hw), y: clamp(y, hh, BENCH_H - hh) }
}

export function moveItem(s: Saved, id: ItemId, x: number, y: number): Saved {
  return { ...s, items: { ...s.items, [id]: fit(id, s.items[id], x, y) } }
}

export function normalizeItems(s: Saved): Saved {
  const items = { ...s.items }
  for (const k of Object.keys(items) as ItemId[]) items[k] = fit(k, items[k], items[k].x, items[k].y)
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
  const strokes = s.strokes.filter((st) => !hit(st.pts))
  return strokes.length === s.strokes.length ? s : { ...s, strokes }
}

export function resetBench(s: Saved): Saved {
  return { ...structuredClone(DEFAULT_SAVED), name: s.name, muted: s.muted, best: s.best }
}
