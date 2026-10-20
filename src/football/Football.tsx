import { memo, useContext, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { dist, type Point, type Side } from '../geom'
import { wobblyCircle, wobblyLine } from '../ink'
import { Page } from '../Page'
import { useReducedMotion } from '../motion'
import { makeRng } from '../rng'
import { shareOrDownload } from '../share'
import { play } from '../sound'
import { bn, strings } from '../strings'
import { Result, ResultLayer } from '../games/Result'
import type { GameProps } from '../games/types'
import { aiPass, aiPlace } from './ai'
import { applyPass, applyWobble, DOTS_PER_TEAM, footballWinner, newFootballMatch, place, type FootballMatch, type Target, type Trail } from './match'
import { DBOX, DOT_R, H, MOUTH, W, resolvePass, shotEnd, validPlacement, type Dot } from './rules'

export { H, W }
const s = strings.football
const c = strings.cricket // shared match words: নতুন ম্যাচ, টস করো, খেলা শুরু, তুমি, সিপিইউ
const ATMA = "'Atma', sans-serif"
const GALADA = "'Galada', 'Atma', sans-serif"
const LINE_MS = 450 // one pen line (the CSS duration is --t-ball, the ball glides with it)
const STROKE_MS = 70 // the pitch draws in one stroke after another
const PLACE_MS = 400 // the CPU puts down its X
const CPU_MS = 600 // the CPU thinks before passing
const SHOUT_MS = 1200
const MIN_DRAG_PX = 8 // shorter is a cancelled drag
const MAX_DRAG_PX = 120
const GRAB = 30 // page units around the ball that start a drag
const GRAB_PX = 22 // ...but never under 22 screen px on a small screen

type Phase = 'setup' | 'toss' | 'cpuToss' | 'play' | 'done'
type Step = 'draw' | 'place' | 'cpuPlace' | 'aim' | 'cpu' | 'pass' | 'shout' | 'done'
type Kind = 'complete' | 'intercepted' | 'goal' | 'out' | 'handover'
type Shot = { angle: number; length: number }

/**
 * The slingshot: the line goes opposite the drag. The drag is measured in page units (pointer -> page through the
 * inverse CTM, so a turned spread maps too) and converted to screen px with the CTM's scale (px per unit);
 * 0-120 px -> 60-450 units, linear, clamped. Under 8 px is a cancel.
 */
export function aim(drag: Point, scale: number): Shot | null {
  const px = Math.hypot(drag.x, drag.y) * scale
  if (px < MIN_DRAG_PX) return null
  return { angle: Math.atan2(-drag.y, -drag.x), length: 60 + (390 * Math.min(px, MAX_DRAG_PX)) / MAX_DRAG_PX }
}

/** The tally next to the ball: the line about to be drawn by the side in possession. */
export const tally = (lines: number): string => s.tally[Math.min(lines, 2)]

const inkOf = (t: Side) => (t === 'you' ? 'var(--ink)' : 'var(--ink-black)')
const halo = { stroke: 'var(--paper)', strokeWidth: 6, strokeLinejoin: 'round', paintOrder: 'stroke' } as const

// The pitch in ballpoint, ruled across both pages: border, halfway line on the spine, centre circle and spot, D-boxes, goals.
const Pitch = memo(function Pitch({ seed }: { seed: number }) {
  const strokes = useMemo(() => {
    const r = makeRng(seed)
    const L = (x1: number, y1: number, x2: number, y2: number) => wobblyLine(x1, y1, x2, y2, r, 1)
    const e = 3 // the border sits just inside the page edge
    const box = (x0: number, x1: number) => [L(x0, DBOX.y0, x1, DBOX.y0), L(x1, DBOX.y0, x1, DBOX.y1), L(x1, DBOX.y1, x0, DBOX.y1)]
    return [
      L(e, e, W - e, e), L(W - e, e, W - e, H - e), L(W - e, H - e, e, H - e), L(e, H - e, e, e),
      L(W / 2, e, W / 2, H - e),
      wobblyCircle(W / 2, H / 2, 60, r, 1.2, 32),
      ...box(e, DBOX.depth), ...box(W - e, W - DBOX.depth),
    ]
  }, [seed])
  const net = (x0: number, x1: number) => (
    <g stroke="var(--ink)" strokeWidth={0.8} opacity={0.6}>
      {[0, 1, 2, 3, 4, 5, 6].map((k) => <line key={k} x1={x0} x2={x1} y1={MOUTH[0] + k * 20} y2={MOUTH[0] + k * 20} />)}
      {[0, 1].map((k) => <line key={'v' + k} x1={x0 + (x1 - x0) * (k + 0.5) / 2} x2={x0 + (x1 - x0) * (k + 0.5) / 2} y1={MOUTH[0]} y2={MOUTH[1]} />)}
    </g>
  )
  return (
    <g aria-hidden="true">
      {strokes.map((d, i) => (
        <path key={i} className="ck-draw" d={d} pathLength={1} fill="none" stroke="var(--ink)" strokeWidth={1.7}
          strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: `${i * STROKE_MS}ms` }} />
      ))}
      <g className="ck-write" style={{ animationDelay: `${strokes.length * STROKE_MS}ms` }}>
        <circle cx={W / 2} cy={H / 2} r={3.5} fill="var(--ink)" />
        {net(3, 17)}
        {net(W - 3, W - 17)}
        {[0, W].map((x) => (
          <line key={x} x1={x} x2={x} y1={MOUTH[0]} y2={MOUTH[1]} stroke="var(--ink)" strokeWidth={7} />
        ))}
      </g>
    </g>
  )
})
const DRAW_MS = 12 * STROKE_MS + 300 // the 12 strokes above, then the spot and goals fade in

const Players = memo(function Players({ dots }: { dots: Dot[] }) {
  return (
    <g aria-hidden="true">
      {dots.map((d, i) => {
        const r = makeRng(1000 + i)
        return (
          <g key={d.id} className="ck-dot" data-id={d.id} data-x={d.x.toFixed(1)} data-y={d.y.toFixed(1)}>
            {d.team === 'you' ? (
              <path d={wobblyCircle(d.x, d.y, DOT_R, r, 0.8, 14)} fill="none" stroke={inkOf('you')} strokeWidth={2.2} />
            ) : (
              <path d={wobblyLine(d.x - 7, d.y - 7, d.x + 7, d.y + 7, r, 0.6) + ' ' + wobblyLine(d.x + 7, d.y - 7, d.x - 7, d.y + 7, r, 0.6)}
                fill="none" stroke={inkOf('cpu')} strokeWidth={2.4} strokeLinecap="round" />
            )}
          </g>
        )
      })}
    </g>
  )
})

// Every pen line stays on the page. Only a newly mounted one animates, so the old ones cost nothing on later renders.
const Trails = memo(function Trails({ trail, seed }: { trail: Trail[]; seed: number }) {
  return (
    <g aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {trail.map((t, i) => {
        const r = makeRng(seed + 7 * i)
        return (
          <g key={i} className="fb-trail" stroke={inkOf(t.team)}>
            <path className="ck-draw" d={wobblyLine(t.from.x, t.from.y, t.to.x, t.to.y, r, 1.4)} pathLength={1} strokeWidth={1.8}
              style={{ animationDuration: 'var(--t-ball)' }} />
            {t.ray && (
              <path className="ck-write" d={`M${t.ray.from.x.toFixed(1)},${t.ray.from.y.toFixed(1)} L${t.ray.to.x.toFixed(1)},${t.ray.to.y.toFixed(1)}`}
                strokeWidth={1.6} strokeDasharray="0.5 6" style={{ animationDelay: 'var(--t-ball)' }} />
            )}
          </g>
        )
      })}
    </g>
  )
})

export function Football(props: GameProps) {
  const [round, setRound] = useState(0)
  return <Match key={round} {...props} onAgain={() => setRound((r) => r + 1)} />
}

function Match({ name, onBest, onExit, onAgain }: GameProps & { onAgain: () => void }) {
  const layer = useContext(ResultLayer)
  const reduce = useReducedMotion()
  const svg = useRef<SVGSVGElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const aimLine = useRef<SVGGElement>(null)
  const [rng] = useState(() => makeRng(Date.now())) // one per match; the rules stay pure
  const alive = useRef(true)
  const timers = useRef(new Set<number>())
  const tapWait = useRef<((p: Point) => void) | null>(null)
  const passWait = useRef<((sh: Shot) => void) | null>(null)
  const press = useRef<{ at: Point; id: number } | null>(null)

  const [phase, setPhase] = useState<Phase>('setup')
  const [target, setTarget] = useState<Target>(1)
  const [m, setM] = useState<FootballMatch | null>(null)
  const [seed, setSeed] = useState(0)
  const [ball, setBall] = useState<Point>({ x: W / 2, y: H / 2 })
  const [step, setStep] = useState<Step>('draw')
  const [prompt, setPrompt] = useState('')
  const [shout, setShout] = useState<string | null>(null)
  const [kind, setKind] = useState<Kind | null>(null)
  const [pulse, setPulse] = useState<{ at: Point; key: number } | null>(null)
  const [bad, setBad] = useState<{ at: Point; key: number } | null>(null)

  useEffect(() => {
    alive.current = true
    const ts = timers.current
    return () => {
      alive.current = false
      ts.forEach(clearTimeout)
    }
  }, [])
  useEffect(() => { panel.current?.querySelector('button')?.focus() }, [phase])

  const wait = (ms: number) => new Promise<void>((ok) => {
    const id = window.setTimeout(() => { timers.current.delete(id); if (alive.current) ok() }, ms)
    timers.current.add(id)
  }) // a match left midway just stops: its timers are cleared and the awaits never resume
  const say = (st: Step, p = '') => { setStep(st); setPrompt(p) }

  async function pass(cur: FootballMatch, n: number): Promise<FootballMatch> {
    const team = cur.possession
    let shot: Shot
    if (team === 'you') {
      say('aim', s.aim)
      shot = await new Promise<Shot>((r) => (passWait.current = r))
    } else {
      say('cpu', s.cpuPasses)
      await wait(CPU_MS)
      shot = aiPass(rng, cur)
    }
    const w = applyWobble(rng, shot.angle, shot.length)
    const from = { x: cur.ball.x, y: cur.ball.y }
    const to = shotEnd(from, w.angle, w.length)
    const r = resolvePass(cur.dots, cur.ball.dotId, from, to, team)
    const next = applyPass(cur, from, to, r)
    const k: Kind = r.kind === 'complete' && next.possession !== team ? 'handover' : r.kind
    say('pass')
    play('scratch')
    setM(next)
    let at: Point = r.ray ? r.ray.from : r.kind === 'complete' ? r.to : r.at // where the line put the ball
    setBall({ x: at.x, y: at.y })
    await wait(reduce ? 0 : LINE_MS)
    if (r.ray) {
      at = r.ray.to
      setBall({ x: at.x, y: at.y })
      await wait(reduce ? 0 : LINE_MS)
    }
    setKind(k)
    const text = k === 'goal' ? strings.shout.goal : k === 'intercepted' ? s.tackle : k === 'out' ? s.throwIn : k === 'handover' ? s.threeDone : null
    if (r.kind === 'intercepted') setPulse({ at: r.at, key: n })
    if (r.kind === 'goal' && next.phase !== 'done') play(r.scorer === 'you' ? 'cheer' : 'groan') // at the end, Result cheers
    if (text) {
      setShout(text)
      say('shout', text)
      await wait(SHOUT_MS)
      setShout(null)
    } else say('pass', s.pass)
    setPulse(null)
    if (next.ball.x !== at.x || next.ball.y !== at.y) {
      setBall({ x: next.ball.x, y: next.ball.y }) // a restart, a handover or back to the centre spot
      await wait(reduce ? 0 : LINE_MS)
    }
    return next
  }

  async function run(kickoff: Side) {
    let cur = newFootballMatch(target, kickoff)
    setSeed(Math.floor(rng() * 2 ** 31))
    setM(cur)
    setPhase('play')
    say('draw')
    play('bell')
    await wait(reduce ? 0 : DRAW_MS)
    let n = 0
    while (cur.phase === 'placement') {
      let p: Point
      if (cur.placingTurn === 'you') {
        say('place', `${s.place} ${bn(DOTS_PER_TEAM - cur.dots.filter((d) => d.team === 'you').length)} ${s.people}`)
        p = await new Promise<Point>((r) => (tapWait.current = r))
        while (!validPlacement(cur.dots, p)) {
          setBad({ at: p, key: n++ })
          say('place', s.badSpot)
          p = await new Promise<Point>((r) => (tapWait.current = r))
        }
        setBad(null)
      } else {
        say('cpuPlace', s.cpuPlaces)
        await wait(PLACE_MS)
        p = aiPlace(rng, cur)
      }
      play('scratch')
      cur = place(cur, p.x, p.y)
      setM(cur)
    }
    while (cur.phase === 'play') cur = await pass(cur, n++)
    const won = footballWinner(cur) === 'you'
    if (won) onBest(cur.score.you - cur.score.cpu)
    say('done', `${won ? s.won.you : s.won.cpu} ${bn(cur.score.you)} – ${bn(cur.score.cpu)}`)
    setPhase('done')
  }
  const start = (kickoff: Side) => void run(kickoff)

  const local = (e: { clientX: number; clientY: number }): Point => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse())
    return { x: p.x, y: p.y }
  }
  const scale = () => { const k = svg.current!.getScreenCTM()!; return Math.hypot(k.a, k.b) } // screen px per page unit
  const showAim = (sh: Shot | null) => {
    const g = aimLine.current
    if (!g) return
    g.style.visibility = sh ? 'visible' : 'hidden'
    if (!sh || !m) return
    const end = shotEnd(m.ball, sh.angle, sh.length)
    const ln = g.firstElementChild!
    ln.setAttribute('x1', String(m.ball.x)); ln.setAttribute('y1', String(m.ball.y))
    ln.setAttribute('x2', end.x.toFixed(1)); ln.setAttribute('y2', end.y.toFixed(1))
  }

  const down = (e: RPointerEvent<SVGRectElement>) => {
    const p = local(e)
    const tap = tapWait.current
    if (tap) {
      tapWait.current = null
      return tap(p)
    }
    if (!passWait.current || press.current || !m) return
    if (dist(p, m.ball) > Math.max(GRAB, GRAB_PX / scale())) return
    e.currentTarget.setPointerCapture(e.pointerId)
    press.current = { at: p, id: e.pointerId }
  }
  const drag = (e: RPointerEvent<SVGRectElement>) => {
    const pr = press.current
    if (!pr || pr.id !== e.pointerId) return null
    const p = local(e)
    return aim({ x: p.x - pr.at.x, y: p.y - pr.at.y }, scale())
  }
  const move = (e: RPointerEvent<SVGRectElement>) => { if (press.current) showAim(drag(e)) }
  const up = (e: RPointerEvent<SVGRectElement>) => {
    if (press.current?.id !== e.pointerId) return
    const sh = drag(e)
    press.current = null
    showAim(null)
    const done = passWait.current
    if (!sh || !done) return // a short drag is a cancel: still your turn
    passWait.current = null
    done(sh)
  }
  const cancel = () => { press.current = null; showAim(null) }

  const scoreLine = m && (
    <text x={W / 2} y={32} textAnchor="middle" fontSize={24} fontFamily={ATMA} fill="var(--ink)" {...halo} data-score={`${m.score.you}-${m.score.cpu}`}>
      {name ? <tspan fontFamily="'Patrick Hand', 'Atma', sans-serif">{name}</tspan> : <tspan>{c.you}</tspan>}
      <tspan> {bn(m.score.you)} – {bn(m.score.cpu)} </tspan>
      <tspan fill="var(--ink-black)">{c.cpu}</tspan>
    </text>
  )
  const trails = useMemo(() => m && <Trails trail={m.trail} seed={seed} />, [m?.trail, seed])
  const showTally = m && m.phase === 'play' && (step === 'aim' || step === 'cpu')
  const tx = ball.x > W - 60 ? ball.x - 18 : ball.x + 18
  const ty = ball.y < 60 ? ball.y + 30 : ball.y - 16
  const winner = m && phase === 'done' ? footballWinner(m) : null

  return (
    <>
      <Page ref={svg} width={W} height={H}>
        <title>{s.pitch}</title>
        <line x1={W / 2} x2={W / 2} y1={0} y2={H} stroke="var(--shade)" strokeWidth={3} />
        {m && <Pitch seed={seed} />}
        {trails}
        {m && <Players dots={m.dots} />}
        {pulse && <circle key={pulse.key} className="fb-pulse" cx={pulse.at.x} cy={pulse.at.y} r={16} fill="none" stroke="var(--stamp)" strokeWidth={2.5} />}
        {bad && <circle key={bad.key} className="fb-shake" cx={bad.at.x} cy={bad.at.y} r={DOT_R} fill="none" stroke="var(--stamp)" strokeWidth={2.2} strokeDasharray="4 3" />}
        {m && m.phase !== 'placement' && (
          <circle className="fb-ball" r={5.5} fill="var(--ink-black)" stroke="var(--paper)" strokeWidth={1.5}
            style={{ transform: `translate(${ball.x}px, ${ball.y}px)` }} data-ball={`${m.ball.x.toFixed(1)},${m.ball.y.toFixed(1)}`} />
        )}
        {showTally && (
          <text x={tx} y={ty} textAnchor="middle" fontSize={17} fontFamily={ATMA} fill={inkOf(m.possession)} {...halo} strokeWidth={4} aria-hidden="true">
            {tally(m.lines)}
          </text>
        )}
        <g ref={aimLine} style={{ visibility: 'hidden' }} aria-hidden="true">
          <line stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="6 6" opacity={0.55} strokeLinecap="round" />
        </g>
        {scoreLine}
        {shout && (
          <text className="ck-shout" x={W / 2} y={H / 2 + 18} textAnchor="middle" fontSize={shout === strings.shout.goal ? 84 : 52}
            fontFamily={GALADA} fill={shout === strings.shout.goal ? 'var(--stamp)' : 'var(--ink)'} {...halo} strokeWidth={10} aria-hidden="true">
            {shout}
          </text>
        )}
        {phase === 'play' && prompt && step !== 'shout' && step !== 'pass' && (
          <text x={W / 2} y={H - 16} textAnchor="middle" fontSize={20} fontFamily={ATMA} fill={step === 'place' && bad ? 'var(--stamp)' : 'var(--ink)'}
            {...halo} aria-hidden="true">{prompt}</text>
        )}
        {(step === 'place' || step === 'aim') && (
          <rect className="fb-input" width={W} height={H} fill="transparent"
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} />
        )}
      </Page>
      <p className="sr-only" role="status" data-step={step} data-kind={kind ?? undefined} data-trails={m?.trail.length ?? 0}>{prompt}</p>

      {layer && phase !== 'play' && phase !== 'done' && createPortal(
        <div className="ck-setup">
          <div ref={panel} className="ck-panel" role="group" aria-labelledby="fb-title">
            <h2 id="fb-title" className="ck-title">{c.newMatch}</h2>
            {phase === 'setup' && (
              <>
                <p id="fb-goals">{s.askGoals}</p>
                <div className="ck-choices" role="group" aria-labelledby="fb-goals">
                  {([1, 3, 5] as const).map((g) => (
                    <button key={g} type="button" className="btn" aria-pressed={target === g} onClick={() => setTarget(g)}>
                      {bn(g)} {s.goals}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn primary" onClick={() => setPhase(rng() < 0.5 ? 'toss' : 'cpuToss')}>{c.toss}</button>
              </>
            )}
            {phase !== 'setup' && (
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
        <Result svgRef={svg} title={strings.shout.end} outcome={winner === 'you' ? 'win' : 'loss'}
          onShare={(png) => shareOrDownload(png, 'tiffin-break-football.png', `${strings.appName}: ${strings.game.football}`)}
          onAgain={onAgain} onIndex={onExit} />
      )}
    </>
  )
}
