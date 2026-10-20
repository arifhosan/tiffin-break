import { forwardRef, useMemo } from 'react'
import type { Point, Side } from '../geom'
import { wobblyCircle, wobblyLine } from '../ink'
import { makeRng } from '../rng'
import { bn, strings } from '../strings'
import { INNER, R, WEDGES, type Field as FieldT, type Label } from './field'

/** The field page is the right half of the 800 x 560 spread; the wheel turns about its centre. */
export const CX = 600
export const CY = 290
const STEP = (2 * Math.PI) / WEDGES
const DEG = 180 / Math.PI
const LINE_MS = 70 // one more ink stroke every 70 ms as the field is drawn in
const FONT = "'Atma', sans-serif"

export type Dot = { at: Point; by: Side }
export type Flash = { ring: 'inner' | 'outer'; wedge: number; key: number }

const text = (l: Label) =>
  l.kind === 'runs' ? bn(l.runs) : l.kind === 'out' ? strings.cricket.label.out : strings.cricket.label[l.kind]

function sector(ring: 'inner' | 'outer', w: number) {
  const [r0, r1] = ring === 'inner' ? [0, INNER] : [INNER, R]
  const p = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`
  const a0 = w * STEP
  const a1 = a0 + STEP
  return `M${p(r0, a0)} L${p(r1, a0)} A${r1},${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0},${r0} 0 0 0 ${p(r0, a0)} Z`
}

// One cell's label, written along the radius (turned so it never reads upside down on the unturned page).
function CellLabel({ l, ring, w }: { l: Label; ring: 'inner' | 'outer'; w: number }) {
  const a = (w + 0.5) * STEP
  const r = ring === 'inner' ? 57 : 138
  let deg = a * DEG
  if (deg > 90 && deg < 270) deg += 180
  const inner = ring === 'inner'
  const big = l.kind === 'runs'
  const size = big ? (inner ? 19 : 28) : inner ? 12 : 17
  const fill = l.kind === 'out' ? 'var(--stamp)' : 'var(--ink)'
  return (
    <g transform={`translate(${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}) rotate(${deg.toFixed(1)})`}
      fill={fill} fontFamily={FONT} textAnchor="middle" dominantBaseline="central">
      {l.kind === 'out' ? (
        <>
          <text y={inner ? -5 : -8} fontSize={size} fontFamily={FONT}>{text(l)}</text>
          <text y={inner ? 6 : 9} fontSize={inner ? 9 : 13} fontFamily={FONT}>{strings.cricket.how[l.how]}</text>
        </>
      ) : (
        <text fontSize={size} fontFamily={FONT}>{text(l)}</text>
      )}
    </g>
  )
}

type Props = { field: FieldT; seed: number; angle: number; dots: Dot[]; flash: Flash | null }

/** The wheel, in page coordinates about (CX, CY): radials and both circles in wobbly ballpoint, the 32 labels, the ink dots. */
export const FieldWheel = forwardRef<SVGGElement, Props>(function FieldWheel({ field, seed, angle, dots, flash }, ref) {
  const strokes = useMemo(() => {
    const rng = makeRng(seed)
    return [
      wobblyCircle(0, 0, R, rng, 1.6, 48), // finer than the default 16-gon: a big circle must not read as a polygon
      wobblyCircle(0, 0, INNER, rng, 1.2, 32),
      ...Array.from({ length: WEDGES }, (_, k) => wobblyLine(0, 0, R * Math.cos(k * STEP), R * Math.sin(k * STEP), rng, 1)),
    ]
  }, [seed])
  const labelsAt = strokes.length * LINE_MS
  return (
    <g ref={ref} transform={`translate(${CX} ${CY}) rotate(${(angle * DEG).toFixed(2)})`} aria-hidden="true">
      {flash && <path key={flash.key} className="ck-flash" d={sector(flash.ring, flash.wedge)} fill="var(--ink)" opacity={0.18} />}
      {strokes.map((d, i) => (
        <path key={i} className="ck-draw" d={d} pathLength={1} fill="none" stroke="var(--ink)" strokeWidth={1.7}
          strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: `${i * LINE_MS}ms` }} />
      ))}
      {(['outer', 'inner'] as const).map((ring) =>
        field[ring].map((l, w) => (
          <g key={ring + w} className="ck-write" style={{ animationDelay: `${labelsAt + w * 25}ms` }}
            data-cell={`${ring}-${w}`} data-label={l.kind === 'runs' ? l.runs : l.kind}>
            <CellLabel l={l} ring={ring} w={w} />
          </g>
        )),
      )}
      {dots.map((d, i) => (
        <circle key={i} className="ck-dot" cx={d.at.x.toFixed(1)} cy={d.at.y.toFixed(1)} r={4.5}
          fill={d.by === 'you' ? 'var(--ink)' : 'var(--ink-black)'} data-by={d.by} />
      ))}
    </g>
  )
})

/** How long the field takes to draw in (the first ball waits for it). */
export const DRAW_MS = (WEDGES + 2) * LINE_MS + WEDGES * 25 + 400
