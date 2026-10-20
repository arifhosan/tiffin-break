import { dist, other, segPointDist, type Point, type Side } from '../geom'

export const W = 800
export const H = 500
export const DOT_R = 10
export const HIT_R = 12
export const CATCH_R = 22
export const MOUTH = [190, 310] as const
export const DBOX = { depth: 80, y0: 150, y1: 350 } as const
export const MIN_GAP = 30
export const EDGE = 10
export const THROW_IN = 10
export const MAX_LEN = 133 // a third of the pitch: no line can cross it alone, so no goal from the kick-off

// keeper: the side's first placement, inside its own D-box (you defend x = 0, cpu defends x = W).
export type Dot = { id: string; team: Side; x: number; y: number; keeper?: true }
export type PassResult = (
  | { kind: 'complete'; to: Dot }
  | { kind: 'intercepted'; by: Dot; at: Point }
  | { kind: 'goal'; scorer: Side; at: Point }
  | { kind: 'out'; at: Point; restart: Point }
) & { ray?: { from: Point; to: Point } }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const clampIn = (p: Point): Point => ({ x: clamp(p.x, EDGE, W - EDGE), y: clamp(p.y, EDGE, H - EDGE) })
const inMouth = (y: number) => y >= MOUTH[0] && y <= MOUTH[1]

// `keeper`: the side whose goalkeeper this is. It must sit in that side's own D-box; every other dot stays out of both.
export function validPlacement(dots: Dot[], c: { x: number; y: number }, keeper?: Side): boolean {
  if (c.x < EDGE || c.x > W - EDGE || c.y < EDGE || c.y > H - EDGE) return false
  const inY = c.y >= DBOX.y0 && c.y <= DBOX.y1
  if (keeper) {
    if (!inY || (keeper === 'you' ? c.x > DBOX.depth : c.x < W - DBOX.depth)) return false
  } else if ((c.x <= DBOX.depth || c.x >= W - DBOX.depth) && inY) return false
  return dots.every((d) => dist(d, c) >= MIN_GAP)
}

export function shotEnd(from: Point, angle: number, length: number): Point {
  return { x: from.x + Math.cos(angle) * length, y: from.y + Math.sin(angle) * length }
}

type Exit = { t: number; at: Point; restart: Point; xEdge: boolean }

// First t in [0,1] where a -> a+d leaves the pitch, or null if it stays inside.
function exitOf(a: Point, d: Point): Exit | null {
  const cands: { t: number; xEdge: boolean; inward: Point }[] = []
  const axis = (v: number, dv: number, max: number, xEdge: boolean) => {
    const dir = (s: number): Point => (xEdge ? { x: s, y: 0 } : { x: 0, y: s })
    if (v + dv < 0) cands.push({ t: -v / dv, xEdge, inward: dir(THROW_IN) })
    else if (v + dv > max) cands.push({ t: (max - v) / dv, xEdge, inward: dir(-THROW_IN) })
  }
  axis(a.x, d.x, W, true)
  axis(a.y, d.y, H, false)
  if (!cands.length) return null
  const c = cands.reduce((m, e) => (e.t < m.t || (e.t === m.t && e.xEdge) ? e : m))
  const at = { x: a.x + d.x * c.t, y: a.y + d.y * c.t }
  return { t: c.t, at, restart: clampIn({ x: at.x + c.inward.x, y: at.y + c.inward.y }), xEdge: c.xEdge }
}

export function resolvePass(dots: Dot[], fromDotId: string | null, from: Point, to: Point, team: Side): PassResult {
  const live = dots.filter((d) => d.id !== fromDotId)
  const d = { x: to.x - from.x, y: to.y - from.y }

  // Events along the segment: [t, tie priority (lower wins), result]
  const events: [number, number, PassResult][] = []
  let hit: { dot: Dot; t: number } | null = null
  for (const o of live) {
    if (o.team === team) continue
    const s = segPointDist(from, to, o)
    if (s.d <= HIT_R && (!hit || s.t < hit.t)) hit = { dot: o, t: s.t }
  }
  if (hit) events.push([hit.t, 0, { kind: 'intercepted', by: hit.dot, at: { x: from.x + d.x * hit.t, y: from.y + d.y * hit.t } }])
  const ex = exitOf(from, d)
  if (ex) {
    if (ex.xEdge && inMouth(ex.at.y)) {
      const scorer = (ex.at.x >= W) === (team === 'you') ? team : other(team)
      events.push([ex.t, 1, { kind: 'goal', scorer, at: ex.at }])
    } else events.push([ex.t, 2, { kind: 'out', at: ex.at, restart: ex.restart }])
  }
  if (events.length) return events.sort((a, b) => a[0] - b[0] || a[1] - b[1])[0][2]

  let near: Dot | null = null
  for (const o of live) {
    if (o.team === team && dist(o, to) <= CATCH_R && (!near || dist(o, to) < dist(near, to))) near = o
  }
  if (near) return { kind: 'complete', to: near }

  const len = Math.hypot(d.x, d.y)
  if (len === 0) return { kind: 'out', at: from, restart: clampIn(from) }

  // Empty-space ray: ignores goals; its first pitch exit is `out`.
  const rd = { x: (d.x / len) * 2000, y: (d.y / len) * 2000 }
  const rx = exitOf(to, rd)
  const end = rx ? rx.at : { x: to.x + rd.x, y: to.y + rd.y }
  let rh: { dot: Dot; t: number } | null = null
  for (const o of live) {
    const s = segPointDist(to, end, o)
    if (s.d <= HIT_R && (!rh || s.t < rh.t)) rh = { dot: o, t: s.t }
  }
  if (rh) {
    const at = { x: rh.dot.x, y: rh.dot.y }
    const ray = { from: to, to: at }
    return rh.dot.team === team ? { kind: 'complete', to: rh.dot, ray } : { kind: 'intercepted', by: rh.dot, at, ray }
  }
  return { kind: 'out', at: end, restart: rx ? rx.restart : clampIn(end), ray: { from: to, to: end } }
}
