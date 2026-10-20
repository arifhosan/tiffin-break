import { useContext, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { toSvg, type Point } from '../geom'
import { Page } from '../Page'
import { useReducedMotion } from '../motion'
import { makeRng } from '../rng'
import { shareOrDownload } from '../share'
import { play } from '../sound'
import { bn, strings } from '../strings'
import { Result, ResultLayer } from '../games/Result'
import type { GameProps } from '../games/types'
import { aiDrop, aiSpin } from './ai'
import { blindPoint } from './blind'
import { hitAt, makeField } from './field'
import { applyBall, cricketResult, currentInnings, newCricketMatch, resolveDrop, WICKETS, type BallOutcome, type CricketMatch, type Overs } from './match'
import { angleAt, finalAngle, flickSpin, quarterTurnTimes, spinDuration, toPage, type Spin } from './spin'
import { CX, CY, DRAW_MS, FieldWheel, type Flash } from './Wheel'
import { Scorecard } from './Scorecard'

export const W = 800
export const H = 560
const s = strings.cricket
const LID_MS = 450 // eyelids closing or opening (the CSS transition is --t-lid)
const LISTEN_MS = 500 // dark and quiet for a moment before the bowl
const CPU_MS = 650 // the CPU "thinks" before putting its pen down
const REVEAL_MS = 1500
const BREAK_MS = 1800
const FLICK_WINDOW = 80 // ms of pointer history that sets the flick velocity
const MIN_FLICK = 20 // page units: shorter is a tap, not a bowl

type Phase = 'setup' | 'toss' | 'cpuToss' | 'play' | 'done'
type Step = 'draw' | 'flick' | 'spin' | 'listen' | 'pen' | 'cpu' | 'reveal' | 'break' | 'done'
type Drop = { pressed: Point; holdMs: number }
type Shout = { text: string; sub?: string }

function call(o: BallOutcome, appealed: boolean): Shout {
  if (o.kind === 'out') return { text: strings.shout.out, sub: s.how[o.how] }
  if (o.kind === 'extra') return { text: s.call[o.what] }
  if (o.runs === 0) return { text: appealed ? s.call.notOut : s.call.dot }
  return { text: o.runs === 6 ? strings.shout.six : o.runs === 4 ? s.call.four : `${bn(o.runs)} ${s.call.run}` }
}

function resultLine(m: CricketMatch) {
  const r = cricketResult(m)
  if (!r) return ''
  if (r.winner === 'tie' || !r.by) return s.tie
  return `${r.winner === 'you' ? s.you : s.cpu} ${bn(r.n)} ${s.by[r.by]} ${s.won[r.winner]}`
}

export function Cricket(props: GameProps) {
  const [round, setRound] = useState(0)
  return <Match key={round} {...props} onAgain={() => setRound((r) => r + 1)} />
}

// Rejection reason for a match whose page was left; the only error `start` ignores.
const GONE = new Error('page left')

function Match({ name, onBest, onExit, onAgain }: GameProps & { onAgain: () => void }) {
  const layer = useContext(ResultLayer)
  const reduce = useReducedMotion()
  const svg = useRef<SVGSVGElement>(null)
  const wheel = useRef<SVGGElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const rng = useRef(makeRng(Date.now())).current // one per match; the rules stay pure
  const alive = useRef(true)
  const angle = useRef(0)
  const penWait = useRef<((d: Drop) => void) | null>(null)
  const press = useRef<{ p: Point; t: number } | null>(null)
  const flickWait = useRef<((sp: Spin) => void) | null>(null)
  const trail = useRef<{ p: Point; t: number }[]>([])

  const [phase, setPhase] = useState<Phase>('setup')
  const [overs, setOvers] = useState<Overs>(1)
  const [m, setM] = useState<CricketMatch | null>(null)
  const [seed, setSeed] = useState(0)
  const [shownAngle, setShownAngle] = useState(0)
  const [lids, setLids] = useState<'open' | 'closed' | 'opening'>('open')
  const [step, setStep] = useState<Step>('draw')
  const [prompt, setPrompt] = useState('')
  const [shout, setShout] = useState<Shout | null>(null)
  const [flash, setFlash] = useState<Flash | null>(null)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  useEffect(() => { panel.current?.querySelector('button')?.focus() }, [phase])

  const wait = (ms: number) => new Promise<void>((ok, stop) => setTimeout(() => (alive.current ? ok() : stop(GONE)), ms))
  const say = (st: Step, p = '') => { setStep(st); setPrompt(p) }

  // Pointer position relative to the wheel centre, unturned (the "screen" frame of spin.ts). getScreenCTM includes the
  // CSS rotation of the spread on a portrait phone.
  const local = (e: { clientX: number; clientY: number }): Point => {
    const p = toSvg(svg.current!, e.clientX, e.clientY)
    return { x: p.x - CX, y: p.y - CY }
  }

  // The page turns: rAF samples angleAt, a rustle on every quarter turn (panned to the spin's side), a thud at the stop.
  const spinPage = (sp: Spin) =>
    new Promise<void>((ok, stop) => {
      const quarters = quarterTurnTimes(sp)
      const end = spinDuration(sp)
      const t0 = performance.now()
      let q = 0
      const tick = (now: number) => {
        if (!alive.current) return stop(GONE)
        const t = (now - t0) / 1000
        for (; q < quarters.length && quarters[q] <= t; q++) play('rustle', sp.dir)
        const a = reduce ? finalAngle(sp) : angleAt(sp, t)
        wheel.current?.setAttribute('transform', `translate(${CX} ${CY}) rotate(${((a * 180) / Math.PI).toFixed(2)})`)
        if (t < end) return void requestAnimationFrame(tick)
        play('thud')
        angle.current = finalAngle(sp)
        setShownAngle(angle.current)
        ok()
      }
      requestAnimationFrame(tick)
    })

  async function ball(cur: CricketMatch): Promise<CricketMatch> {
    const youBat = currentInnings(cur).batting === 'you'
    let sp: Spin
    if (youBat) {
      setLids('closed')
      say('listen', s.listen)
      await wait(LID_MS + LISTEN_MS)
      sp = aiSpin(rng, angle.current)
    } else {
      say('flick', s.flick)
      sp = await new Promise<Spin>((r) => (flickWait.current = r))
      say('spin')
    }
    await spinPage(sp)

    let outcome: BallOutcome | undefined
    let appealed = false
    let at: Point = { x: 0, y: 0 }
    while (!outcome) {
      let d: Drop
      if (youBat) {
        say('pen', appealed ? s.redrop : s.penDown)
        d = await new Promise<Drop>((r) => (penWait.current = r))
      } else {
        say('cpu', s.cpuDrops)
        d = aiDrop(rng)
        await wait(CPU_MS + d.holdMs)
      }
      play('scratch')
      at = toPage(blindPoint(rng, d.pressed, d.holdMs), angle.current)
      const r = resolveDrop(cur.field, at, appealed)
      if (r.kind !== 'appeal') outcome = r
      else {
        appealed = true
        setShout({ text: s.appeal })
        if (!youBat) await wait(REVEAL_MS)
      }
    }
    setShout(null)
    if (youBat) {
      setLids('opening')
      await wait(reduce ? 0 : LID_MS)
      setLids('open')
    }
    const next = applyBall(cur, { outcome, at })
    setM(next)
    const h = hitAt(cur.field, at)
    setFlash(h.kind === 'cell' ? { ring: h.ring, wedge: h.wedge, key: next.innings.length * 1000 + currentInnings(next).balls.length } : null)
    const c = call(outcome, appealed)
    setShout(c)
    say('reveal', [c.text, c.sub].filter(Boolean).join(' '))
    await wait(REVEAL_MS)
    setShout(null)
    setFlash(null)
    return next
  }

  async function run(youFirst: boolean) {
    const field = makeField(rng)
    let cur = newCricketMatch(overs, field, youFirst ? 'you' : 'cpu')
    setSeed(Math.floor(rng() * 2 ** 31))
    setM(cur)
    setPhase('play')
    say('draw')
    play('bell')
    await wait(reduce ? 300 : DRAW_MS)
    while (!cur.done) {
      const before = cur.innings.length
      cur = await ball(cur)
      if (!cur.done && cur.innings.length !== before) {
        setShout({ text: s.inningsBreak, sub: `${s.target} ${bn(cur.innings[0].runs + 1)}` })
        say('break', `${s.inningsBreak} ${s.target} ${bn(cur.innings[0].runs + 1)}`)
        await wait(BREAK_MS)
        setShout(null)
      }
    }
    onBest(cur.innings.find((i) => i.batting === 'you')!.runs)
    say('done', resultLine(cur))
    setPhase('done')
  }
  const start = (youFirst: boolean) => {
    run(youFirst).catch((err) => {
      if (err === GONE) return // the page was left mid-match
      console.error('cricket failed', err)
      onExit()
    })
  }

  // You bat: press = pen touches down, release = pen lifted (the drift grows with the hold).
  const lidDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!penWait.current || press.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    press.current = { p: local(e), t: e.timeStamp }
  }
  const lidUp = (e: RPointerEvent<HTMLDivElement>) => {
    const pr = press.current
    const done = penWait.current
    if (!pr || !done) return
    press.current = null
    penWait.current = null
    done({ pressed: pr.p, holdMs: Math.max(0, e.timeStamp - pr.t) })
  }

  // You bowl: a flick on the field page.
  const flickDown = (e: RPointerEvent<SVGRectElement>) => {
    if (!flickWait.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    trail.current = [{ p: local(e), t: e.timeStamp }]
  }
  const flickMove = (e: RPointerEvent<SVGRectElement>) => {
    if (trail.current.length) trail.current.push({ p: local(e), t: e.timeStamp })
  }
  const flickUp = (e: RPointerEvent<SVGRectElement>) => {
    const tr = trail.current
    trail.current = []
    const done = flickWait.current
    if (!tr.length || !done) return
    const last = { p: local(e), t: e.timeStamp }
    const from = tr.find((x) => last.t - x.t <= FLICK_WINDOW) ?? tr[tr.length - 1]
    const dt = Math.max(1, last.t - from.t)
    if (Math.hypot(last.p.x - tr[0].p.x, last.p.y - tr[0].p.y) < MIN_FLICK) return
    flickWait.current = null
    done(flickSpin(tr[0].p, { x: (last.p.x - from.p.x) / dt, y: (last.p.y - from.p.y) / dt }, angle.current))
  }

  const dots = m ? m.innings.flatMap((inn) => inn.balls.map((b) => ({ at: b.at, by: inn.batting }))) : []
  const result = m && phase === 'done' ? cricketResult(m) : null
  const shoutOnPage = lids === 'open' && shout

  return (
    <>
      <Page ref={svg} width={W} height={H}>
        <line x1={400} x2={400} y1={0} y2={H} stroke="var(--shade)" strokeWidth={3} />
        <Scorecard m={m} overs={overs} name={name} result={m && phase === 'done' ? resultLine(m) : ''} />
        <title>{s.field}</title>
        <clipPath id="ck-field-page"><rect x={400} y={0} width={400} height={H} /></clipPath>
        {m && (
          <g clipPath="url(#ck-field-page)">{/* a pen that misses the page leaves no ink on the scorecard */}
            <FieldWheel ref={wheel} field={m.field} seed={seed} angle={shownAngle} dots={dots} flash={flash} />
          </g>
        )}
        {step === 'flick' && (
          <rect className="ck-flick" x={400} y={0} width={400} height={H} fill="transparent"
            onPointerDown={flickDown} onPointerMove={flickMove} onPointerUp={flickUp} onPointerCancel={() => (trail.current = [])} />
        )}
        {shoutOnPage && (
          <g className="ck-shout" fill={shout.text === strings.shout.out ? 'var(--stamp)' : 'var(--ink)'} textAnchor="middle" aria-hidden="true">
            <text x={CX} y={66} fontSize={52} fontFamily="'Galada', 'Atma', sans-serif">{shout.text}</text>
            {shout.sub && <text x={CX} y={90} fontSize={20} fontFamily="'Atma', sans-serif">{shout.sub}</text>}
          </g>
        )}
        {phase === 'play' && lids === 'open' && prompt && step !== 'reveal' && step !== 'break' && (
          <text x={CX} y={530} textAnchor="middle" fontSize={20} fontFamily="'Atma', sans-serif" fill="var(--ink)" aria-hidden="true">{prompt}</text>
        )}
      </Page>
      <p className="sr-only" role="status" data-step={step}>{prompt}</p>

      {layer && phase !== 'play' && phase !== 'done' && createPortal(
        <div className="ck-setup">
          <div ref={panel} className="ck-panel" role="group" aria-labelledby="ck-title">
            <h2 id="ck-title" className="ck-title">{s.newMatch}</h2>
            {phase === 'setup' && (
              <>
                <p id="ck-overs">{s.askOvers}</p>
                <div className="ck-choices" role="group" aria-labelledby="ck-overs">
                  {([1, 2, 5] as const).map((n) => (
                    <button key={n} type="button" className="btn" aria-pressed={overs === n} onClick={() => setOvers(n)}>
                      {bn(n)} {s.overs}
                    </button>
                  ))}
                </div>
                <p className="ck-note">{bn(WICKETS[overs])} {s.wickets}</p>
                <button type="button" className="btn primary" onClick={() => setPhase(rng() < 0.5 ? 'toss' : 'cpuToss')}>{s.toss}</button>
              </>
            )}
            {phase === 'toss' && (
              <>
                <p>{s.youWonToss} {s.choose}</p>
                <div className="ck-choices">
                  <button type="button" className="btn primary" onClick={() => start(true)}>{s.bat}</button>
                  <button type="button" className="btn primary" onClick={() => start(false)}>{s.bowl}</button>
                </div>
              </>
            )}
            {phase === 'cpuToss' && (
              <>
                <p>{s.cpuWonToss}</p>
                <button type="button" className="btn primary" onClick={() => start(false)}>{s.start}</button>
              </>
            )}
          </div>
        </div>,
        layer,
      )}

      {layer && lids !== 'open' && createPortal(
        <div className="ck-lids" data-opening={lids === 'opening' || undefined} onPointerDown={lidDown} onPointerUp={lidUp}
          onPointerCancel={() => (press.current = null)} onContextMenu={(e) => e.preventDefault()}>
          <div className="ck-lids-say" aria-hidden="true">
            {shout && <p className="ck-lids-shout">{shout.text}</p>}
            <p>{prompt}</p>
          </div>
        </div>,
        layer,
      )}

      {result && (
        <Result svgRef={svg} title={strings.shout.end}
          outcome={result.winner === 'tie' ? 'tie' : result.winner === 'you' ? 'win' : 'loss'}
          onShare={(png) => shareOrDownload(png, 'tiffin-break-cricket.png', `${strings.appName}: ${strings.game.cricket}`)}
          onAgain={onAgain} onIndex={onExit} />
      )}
    </>
  )
}
