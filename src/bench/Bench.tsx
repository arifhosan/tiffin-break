import { memo, useRef, useState, type Dispatch, type KeyboardEvent, type PointerEvent, type SetStateAction } from 'react'
import { type ItemId, type Saved } from '../storage'
import { strings } from '../strings'
import { makeRng } from '../rng'
import { wobblyCircle } from '../ink'
import { play } from '../sound'
import { toSvg } from '../geom'
import { Settings } from '../Settings'
import { ITEM_ART, ItemDefs } from './items'
import { BENCH_H, BENCH_W, addStroke, eraseAt, moveItem } from './model'

type Mode = 'move' | 'draw' | 'erase'
type P = [number, number]
type Props = { saved: Saved; setSaved: Dispatch<SetStateAction<Saved>>; onOpenNotebook: () => void }

// Paint order: books under the khata, small things on top. A dragged item rises to the top.
const IDS: ItemId[] = ['bookBangla', 'bookMath', 'bookEnglish', 'notebook', 'geometry', 'tiffin', 'pencil', 'eraser', 'pen']
const TAP_PX = 6
const ERASE_R = 12
const KEY_STEP = 10

// Wood grain, plank seams and an ink stain: fixed art, generated once.
const rng = makeRng(2013)
const GRAIN = Array.from({ length: 64 }, (_, i) => {
  let y = (i + rng()) * (BENCH_H / 64)
  let d = `M-10,${y.toFixed(1)}`
  for (let x = 30; x <= BENCH_W + 40; x += 40) d += ` Q${x - 20},${(y + (rng() - 0.5) * 6).toFixed(1)} ${x},${(y += (rng() - 0.5) * 3).toFixed(1)}`
  return { d, w: 0.5 + rng() * 1.6, o: 0.12 + rng() * 0.22 }
})
const STAIN = wobblyCircle(512, 118, 17, rng, 5)
const DROPS = [[540, 98, 3], [494, 142, 2.2], [536, 140, 1.6]]
const path = (pts: P[]) => 'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' L')

const Board = memo(function Board() {
  return (
    <g aria-hidden="true">
      <rect width={BENCH_W} height={BENCH_H} rx={10} fill="var(--wood)" />
      <g fill="none" stroke="var(--wood-grain)">
        {GRAIN.map((g, i) => <path key={i} d={g.d} strokeWidth={g.w} opacity={g.o} />)}
        {[0, 1, 2, 3].map((k) => <ellipse key={k} cx={150} cy={470} rx={9 + k * 7} ry={4 + k * 3.5} strokeWidth={1.2} opacity={0.35 - k * 0.06} />)}
        {[0, 1, 2].map((k) => <ellipse key={k} cx={440} cy={760} rx={7 + k * 6} ry={3 + k * 3} strokeWidth={1.2} opacity={0.3 - k * 0.07} />)}
      </g>
      {[267, 534].map((y) => (
        <g key={y}>
          <line x1={0} x2={BENCH_W} y1={y} y2={y} stroke="var(--wood-seam)" strokeWidth={3} />
          <line x1={0} x2={BENCH_W} y1={y + 2.5} y2={y + 2.5} stroke="var(--wood-light)" strokeWidth={1} opacity={0.5} />
        </g>
      ))}
      <g fill="var(--wood-scratch)" stroke="var(--wood-seam)" strokeWidth={0.6} opacity={0.75} fontFamily="'Atma', sans-serif">
        <text x={52} y={330} fontSize={26} transform="rotate(-8 52 330)">{strings.art.carveNames}</text>
        <text x={470} y={420} fontSize={22} transform="rotate(84 470 420)">{strings.art.carveYear}</text>
        <text x={66} y={772} fontSize={30}>{strings.art.carveInitial}</text>
      </g>
      <g fill="none" stroke="var(--wood-scratch)" strokeWidth={2} opacity={0.6} strokeLinecap="round">
        <rect x={56} y={744} width={36} height={38} transform="rotate(-4 74 763)" />
        <path d="M262,316 c-12,-14 -30,2 0,22 c30,-20 12,-36 0,-22" />
        <path d="M560,560 l22,-6 M556,570 l26,-4 M554,582 l20,-2" />
      </g>
      <path d={STAIN} fill="var(--ink)" opacity={0.55} />
      {DROPS.map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} fill="var(--ink)" opacity={0.55} />)}
      <rect width={BENCH_W} height={BENCH_H} rx={10} fill="none" stroke="var(--wood-seam)" strokeWidth={6} />
    </g>
  )
})

const Strokes = memo(function Strokes({ strokes }: { strokes: Saved['strokes'] }) {
  return <>{strokes.map((s) => <path key={s.id} d={path(s.pts)} />)}</>
})

export function Bench({ saved, setSaved, onOpenNotebook }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [mode, setMode] = useState<Mode>('move')
  const [order, setOrder] = useState(IDS)
  const liveEl = useRef<SVGPathElement>(null) // the stroke being drawn: set directly, no React re-render
  const [wiggle, setWiggle] = useState(0)
  const [settings, setSettings] = useState(false)
  const g = useRef<{ id?: ItemId; sx: number; sy: number; dx: number; dy: number; moved: boolean; pts?: P[] } | null>(null)

  const toBench = (e: { clientX: number; clientY: number }): P => {
    const p = toSvg(svg.current!, e.clientX, e.clientY)
    return [p.x, p.y]
  }
  const panOf = (id: ItemId) => saved.items[id].x / (BENCH_W / 2) - 1

  const tap = (id: ItemId) => {
    const pan = panOf(id)
    if (id === 'pen') { setMode((m) => (m === 'draw' ? 'move' : 'draw')); play('scratch', pan) }
    else if (id === 'eraser') { setMode((m) => (m === 'erase' ? 'move' : 'erase')); play('rustle', pan) }
    else if (id === 'notebook') { play('rustle', pan); onOpenNotebook() }
    else if (id === 'geometry') { play('rattle', pan); setSettings(true) }
    else if (id === 'tiffin') { setWiggle((w) => w + 1); play('rattle', pan) }
    else play('rustle', pan)
  }

  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    const id = (e.target as Element).closest<SVGGElement>('[data-item]')?.dataset.item as ItemId | undefined
    if (!id && mode === 'move') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = toBench(e)
    const at = { sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, moved: false }
    if (id) {
      g.current = { ...at, id, dx: saved.items[id].x - x, dy: saved.items[id].y - y }
      setOrder((o) => [...o.filter((k) => k !== id), id])
    } else if (mode === 'draw') {
      g.current = { ...at, pts: [[x, y]] }
      play('scratch', x / (BENCH_W / 2) - 1)
    } else {
      g.current = at
      setSaved((s) => eraseAt(s, { x, y }, ERASE_R))
    }
  }

  const move = (e: PointerEvent<SVGSVGElement>) => {
    const c = g.current
    if (!c) return
    if (c.id && !c.moved && Math.hypot(e.clientX - c.sx, e.clientY - c.sy) < TAP_PX) return
    c.moved = true
    const [x, y] = toBench(e)
    if (c.id) { const id = c.id; setSaved((s) => moveItem(s, id, x + c.dx, y + c.dy)) }
    else if (c.pts) { c.pts.push([x, y]); if (c.pts.length > 1) liveEl.current?.setAttribute('d', path(c.pts)) }
    else setSaved((s) => eraseAt(s, { x, y }, ERASE_R))
  }

  const up = (cancel: boolean) => {
    const c = g.current
    g.current = null
    liveEl.current?.setAttribute('d', '')
    if (!c || cancel) return
    if (c.id) c.moved ? play('thud', panOf(c.id)) : tap(c.id)
    else if (c.pts) { const pts = c.pts; setSaved((s) => addStroke(s, pts, `s${Date.now()}`)) }
  }

  const key = (id: ItemId) => (e: KeyboardEvent) => {
    const arrows: Record<string, P> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(id) }
    else if (arrows[e.key]) {
      e.preventDefault()
      const [dx, dy] = arrows[e.key]
      setSaved((s) => moveItem(s, id, s.items[id].x + dx * KEY_STEP, s.items[id].y + dy * KEY_STEP))
    }
  }

  const hint =
    mode === 'draw' ? `${strings.bench.drawMode}। ${strings.bench.drawHint}`
    : mode === 'erase' ? `${strings.bench.eraseMode}। ${strings.bench.eraseHint}`
    : strings.bench.moveHint

  return (
    <main className="screen">
      <header className="bar">
        <h1 className="title">{strings.appName}</h1>
        <p className="hint" aria-live="polite">{hint}</p>
      </header>
      <svg ref={svg} className="bench" data-mode={mode} viewBox={`0 0 ${BENCH_W} ${BENCH_H}`} role="group" aria-label={strings.bench.board}
        onPointerDown={down} onPointerMove={move} onPointerUp={() => up(false)} onPointerCancel={() => up(true)}>
        <defs><ItemDefs /></defs>
        <Board />
        <g className="strokes" fill="none" stroke="var(--ink)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <Strokes strokes={saved.strokes} />
          <path ref={liveEl} />
        </g>
        {order.map((id) => {
          const it = saved.items[id]
          const tool = id === 'pen' || id === 'eraser'
          const active = (id === 'pen' && mode === 'draw') || (id === 'eraser' && mode === 'erase')
          return (
            <g key={id} data-item={id} role="button" tabIndex={0} aria-label={strings.bench[id]} aria-pressed={tool ? active : undefined}
              className={active ? 'item lifted' : 'item'} transform={`translate(${it.x} ${it.y}) rotate(${it.rot})`} onKeyDown={key(id)}>
              <g key={id === 'tiffin' ? wiggle : 0} className={id === 'tiffin' && wiggle ? 'art wiggle' : 'art'}>
                {ITEM_ART[id]({ name: saved.name })}
              </g>
            </g>
          )
        })}
      </svg>
      {settings && <Settings saved={saved} setSaved={setSaved} onClose={() => setSettings(false)} />}
    </main>
  )
}
