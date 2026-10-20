import { memo, useContext, type ReactNode, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Point, Side } from '../geom'
import { wobblyLine } from '../ink'
import { Page } from '../Page'
import { useReducedMotion } from '../motion'
import { initialOf } from '../name'
import { makeRng } from '../rng'
import { shareOrDownload } from '../share'
import { play } from '../sound'
import { bn, strings } from '../strings'
import { Result, ResultLayer } from '../games/Result'
import type { GameProps } from '../games/types'
import { aiEdge } from './ai'
import { CPU_INITIAL, dotBoxWinner, edgeNear, newDotBox, playEdge, type DotBox, type Edge } from './rules'

export const W = 600
export const H = 800
const s = strings.dotbox
const c = strings.cricket // shared match words: নতুন ম্যাচ, টস করো, খেলা শুরু, তুমি, সিপিইউ
const ATMA = "'Atma', sans-serif"
const HAND = "'Patrick Hand', 'Atma', sans-serif"
const GALADA = "'Galada', 'Atma', sans-serif"
const CPU_MS = 500 // the CPU thinks before drawing
const SHOUT_MS = 900
const MIN = 2
const MAX = 10
// the grid sits right of the margin line, under the score, above the prompt
const AREA = { x: 64, y: 76, w: 496, h: 660 }

type Phase = 'setup' | 'toss' | 'cpuToss' | 'play' | 'done'
type Step = 'move' | 'cpu' | 'shout' | 'done'

const inkOf = (t: Side) => (t === 'you' ? 'var(--ink)' : 'var(--ink-black)')
const halo = { stroke: 'var(--paper)', strokeWidth: 6, strokeLinejoin: 'round', paintOrder: 'stroke' } as const

type Geo = { size: number; ox: number; oy: number }
const geoOf = (rows: number, cols: number): Geo => {
  const size = Math.min(AREA.w / cols, AREA.h / rows)
  return { size, ox: AREA.x + (AREA.w - size * cols) / 2, oy: AREA.y + (AREA.h - size * rows) / 2 }
}

// Every pen line stays on the page; only a newly mounted one animates (React keeps the old keys).
const Lines = memo(function Lines({ g, geo, seed }: { g: DotBox; geo: Geo; seed: number }) {
  const { size, ox, oy } = geo
  const out: ReactNode[] = []
  for (const o of ['h', 'v'] as const)
    g[o].forEach((row, r) => row.forEach((who, col) => {
      if (!who) return
      const x1 = ox + col * size, y1 = oy + r * size
      const [x2, y2] = o === 'h' ? [x1 + size, y1] : [x1, y1 + size]
      const d = wobblyLine(x1, y1, x2, y2, makeRng(seed + (o === 'h' ? 1 : 7919) * (r * 31 + col + 1)), 1.4)
      out.push(<path key={o + r + '-' + col} className="ck-draw" data-e={`${o},${r},${col}`} d={d} pathLength={1} stroke={inkOf(who)} strokeWidth={2.4} />)
    }))
  return <g aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">{out}</g>
})

const Boxes = memo(function Boxes({ g, geo, mine }: { g: DotBox; geo: Geo; mine: string }) {
  const { size: z, ox, oy } = geo
  return (
    <g aria-hidden="true">
      {g.boxes.map((row, r) => row.map((who, col) => {
        if (!who) return null
        const x = ox + col * z, y = oy + r * z
        const ds = [0.25, 0.5, 0.75].map((k) => k * z)
        return (
          <g key={r + '-' + col} className="ck-write" data-box={`${r},${col},${who}`}>
            <g stroke={inkOf(who)} strokeWidth={1} opacity={0.4} strokeLinecap="round">
              {ds.map((d) => <line key={d} x1={x + 3} y1={y + d} x2={x + d} y2={y + 3} />)}
              {ds.map((d) => <line key={'b' + d} x1={x + d} y1={y + z - 3} x2={x + z - 3} y2={y + d} />)}
            </g>
            <text x={x + z / 2} y={y + z / 2} dy="0.35em" textAnchor="middle" fontSize={z * 0.58} fontFamily={HAND}
              fill={inkOf(who)} {...halo} strokeWidth={4}>{who === 'you' ? mine : CPU_INITIAL}</text>
          </g>
        )
      }))}
    </g>
  )
})

export function DotBoxGame(props: GameProps) {
  const [round, setRound] = useState(0)
  const [size, setSize] = useState({ rows: 4, cols: 4 }) // survives Play again
  return <Match key={round} {...props} size={size} setSize={setSize} onAgain={() => setRound((r) => r + 1)} />
}

type Size = { rows: number; cols: number }

function Match({ name, onBest, onExit, onAgain, size, setSize }: GameProps & { onAgain: () => void; size: Size; setSize: (z: Size) => void }) {
  const layer = useContext(ResultLayer)
  const reduce = useReducedMotion()
  const svg = useRef<SVGSVGElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [rng] = useState(() => makeRng(Date.now())) // one per match; the rules stay pure
  const alive = useRef(true)
  const timers = useRef(new Set<number>())
  const edgeWait = useRef<((p: Point) => void) | null>(null)
  const mine = initialOf(name)

  const [phase, setPhase] = useState<Phase>('setup')
  const [g, setG] = useState<DotBox | null>(null)
  const [seed, setSeed] = useState(0)
  const [step, setStep] = useState<Step>('move')
  const [shout, setShout] = useState<string | null>(null)
  const [crashed, setCrashed] = useState(false)

  useEffect(() => {
    alive.current = true
    const ts = timers.current
    return () => {
      alive.current = false
      ts.forEach(clearTimeout)
    }
  }, [])
  useEffect(() => { panel.current?.querySelector<HTMLElement>('button')?.focus() }, [phase])

  const wait = (ms: number) => new Promise<void>((ok) => {
    const id = window.setTimeout(() => { timers.current.delete(id); if (alive.current) ok() }, ms)
    timers.current.add(id)
  }) // a game left midway just stops: its timers are cleared and the awaits never resume

  async function run(first: Side) {
    let cur = newDotBox(size.rows, size.cols, first)
    const geo = geoOf(size.rows, size.cols)
    setSeed(Math.floor(rng() * 2 ** 31))
    setG(cur)
    setPhase('play')
    play('bell')
    while (dotBoxWinner(cur) === null) {
      const who = cur.turn
      let e: Edge | null
      if (who === 'you') {
        setStep('move')
        do { // a tap far from any edge does nothing: keep waiting
          const p = await new Promise<Point>((r) => (edgeWait.current = r))
          e = edgeNear(cur, { x: (p.x - geo.ox) / geo.size, y: (p.y - geo.oy) / geo.size })
        } while (!e)
      } else {
        setStep('cpu')
        await wait(CPU_MS)
        e = aiEdge(rng, cur)
      }
      const before = cur.score[who]
      cur = playEdge(cur, e)
      setG(cur)
      play('scratch')
      if (cur.score[who] > before && dotBoxWinner(cur) === null) {
        setShout(who === 'you' ? s.gotYou : s.gotCpu)
        setStep('shout')
        await wait(reduce ? 400 : SHOUT_MS)
        setShout(null)
      }
    }
    const w = dotBoxWinner(cur)
    if (w === 'you') onBest(cur.score.you - cur.score.cpu)
    setStep('done')
    setPhase('done')
  }
  const start = (first: Side) => {
    run(first).catch((err) => {
      console.error('dot box failed', err)
      setCrashed(true)
      setPhase('done')
    })
  }

  const down = (e: RPointerEvent<SVGRectElement>) => e.currentTarget.setPointerCapture(e.pointerId)
  const up = (e: RPointerEvent<SVGRectElement>) => { // a drag counts by its end point; a tap is its own end point
    const done = edgeWait.current
    if (!done) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse())
    edgeWait.current = null
    done({ x: p.x, y: p.y })
  }
  const geo = useMemo(() => geoOf(size.rows, size.cols), [size.rows, size.cols])
  const turnText = step === 'cpu' ? s.cpuTurn : s.yourTurn
  const winner = phase === 'done' ? (crashed ? 'tie' : g ? dotBoxWinner(g) : null) : null
  const status = winner ? s.won[winner] : phase === 'play' ? turnText : ''

  const stepper = (key: 'rows' | 'cols') => (
    <div className="db-step" role="group" aria-label={s[key]}>
      <button type="button" className="btn" aria-label={`${s[key]} ${s.less}`} aria-disabled={size[key] <= MIN}
        onClick={() => size[key] > MIN && setSize({ ...size, [key]: size[key] - 1 })}>−</button>
      <output aria-label={s[key]}>{bn(size[key])}</output>
      <button type="button" className="btn" aria-label={`${s[key]} ${s.more}`} aria-disabled={size[key] >= MAX}
        onClick={() => size[key] < MAX && setSize({ ...size, [key]: size[key] + 1 })}>+</button>
    </div>
  )

  return (
    <>
      <Page ref={svg} width={W} height={H}>
        <title>{s.board}</title>
        {g && phase !== 'setup' && (
          <>
            <text x={W / 2} y={40} textAnchor="middle" fontSize={26} fontFamily={ATMA} fill="var(--ink)" {...halo} data-score={`${g.score.you}-${g.score.cpu}`}>
              <tspan fontFamily={HAND}>{mine}</tspan>
              <tspan> {bn(g.score.you)} – {bn(g.score.cpu)} </tspan>
              <tspan fill="var(--ink-black)" fontFamily={HAND}>{CPU_INITIAL}</tspan>
              {phase === 'play' && <tspan fill={step === 'cpu' ? 'var(--ink-black)' : 'var(--ink)'}> · {turnText}</tspan>}
            </text>
            <Boxes g={g} geo={geo} mine={mine} />
            <Lines g={g} geo={geo} seed={seed} />
            <g aria-hidden="true" fill="var(--ink-black)">
              {Array.from({ length: g.rows + 1 }, (_, r) => Array.from({ length: g.cols + 1 }, (_, col) => (
                <circle key={r + '-' + col} cx={geo.ox + col * geo.size} cy={geo.oy + r * geo.size} r={Math.min(4, geo.size / 8)} />
              )))}
            </g>
          </>
        )}
        {shout && (
          <text className="ck-shout" x={W / 2} y={H / 2} textAnchor="middle" fontSize={64} fontFamily={GALADA} fill="var(--stamp)"
            {...halo} strokeWidth={10} aria-hidden="true">{shout}</text>
        )}
        {phase === 'play' && step === 'move' && (
          <>
            <text x={W / 2} y={H - 18} textAnchor="middle" fontSize={20} fontFamily={ATMA} fill="var(--ink)" {...halo} aria-hidden="true">{s.aim}</text>
            <rect className="db-input" width={W} height={H} fill="transparent" onPointerDown={down} onPointerUp={up} />
          </>
        )}
      </Page>
      <p className="sr-only" role="status" data-step={step} data-boxes={g ? JSON.stringify(g.boxes) : undefined}>{status}</p>

      {layer && (phase === 'setup' || phase === 'toss' || phase === 'cpuToss') && createPortal(
        <div className="ck-setup">
          <div ref={panel} className="ck-panel" role="group" aria-labelledby="db-title">
            <h2 id="db-title" className="ck-title">{c.newMatch}</h2>
            {phase === 'setup' ? (
              <>
                <p>{s.rows}</p>
                {stepper('rows')}
                <p>{s.cols}</p>
                {stepper('cols')}
                <button type="button" className="btn primary" onClick={() => setPhase(rng() < 0.5 ? 'toss' : 'cpuToss')}>{c.toss}</button>
              </>
            ) : (
              <>
                <p>{phase === 'toss' ? s.youWonToss : s.cpuWonToss}</p>
                <button type="button" className="btn primary" onClick={() => start(phase === 'toss' ? 'you' : 'cpu')}>{c.start}</button>
              </>
            )}
          </div>
        </div>,
        layer,
      )}

      {winner && (
        <Result svgRef={svg} title={strings.shout.end} outcome={winner === 'you' ? 'win' : winner === 'cpu' ? 'loss' : 'tie'}
          onShare={(png) => shareOrDownload(png, 'tiffin-break-dotbox.png', `${strings.appName}: ${strings.game.dotbox}`)}
          onAgain={onAgain} onIndex={onExit} />
      )}
    </>
  )
}
