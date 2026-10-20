export type Point = { x: number; y: number }
export type Side = 'you' | 'cpu'

export const other = (s: Side): Side => (s === 'you' ? 'cpu' : 'you')
export const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

export function segPointDist(a: Point, b: Point, p: Point): { d: number; t: number } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  return { d: dist(p, { x: a.x + t * dx, y: a.y + t * dy }), t }
}

export function rotate(p: Point, angle: number): Point {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c }
}

// Client (screen) pixels -> the SVG's own user units. The one place to patch if a browser mis-maps a rotated spread.
export function toSvg(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const p = new DOMPoint(clientX, clientY).matrixTransform(svg.getScreenCTM()!.inverse())
  return { x: p.x, y: p.y }
}
