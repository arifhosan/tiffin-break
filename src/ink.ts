// 1 decimal, trailing ".0" stripped (0 -> "0", 12.5 -> "12.5")
const f = (n: number) => n.toFixed(1).replace(/\.0$/, '').replace(/^-0$/, '0')

/** Hand-drawn line: starts/ends exactly at the endpoints, 3-6 perpendicular wobbles of up to ±amp. */
export function wobblyLine(x1: number, y1: number, x2: number, y2: number, rng: () => number, amp = 1.2): string {
  const n = 3 + Math.floor(rng() * 4)
  const len = Math.hypot(x2 - x1, y2 - y1) || 1
  const nx = -(y2 - y1) / len
  const ny = (x2 - x1) / len
  let d = `M${f(x1)},${f(y1)}`
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1)
    const o = (rng() * 2 - 1) * amp
    d += ` L${f(x1 + (x2 - x1) * t + nx * o)},${f(y1 + (y2 - y1) * t + ny * o)}`
  }
  return `${d} L${f(x2)},${f(y2)}`
}

/** Hand-drawn closed circle: 16-gon with radius jitter of ±amp. */
export function wobblyCircle(cx: number, cy: number, r: number, rng: () => number, amp = 1.2): string {
  const n = 16
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const rr = r + (rng() * 2 - 1) * amp
    return `${f(cx + rr * Math.cos(a))},${f(cy + rr * Math.sin(a))}`
  })
  return `M${pts.join(' L')} Z`
}
