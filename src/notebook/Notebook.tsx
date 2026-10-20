import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type CSSProperties, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { recordBest, type Saved } from '../storage'
import { bn, strings } from '../strings'
import { useReducedMotion } from '../motion'
import { play } from '../sound'
import { Page } from '../Page'
import { Notebook as Khata } from '../bench/items'
import { Result } from '../games/Result'
import { shareOrDownload } from '../share'
import type { GameId, GameProps } from '../games/types'

type Props = { saved: Saved; setSaved: Dispatch<SetStateAction<Saved>>; onClose: () => void }
type View = 'cover' | 'index' | GameId

/**
 * Mount point for the games. Each slot is the game's page (or spread) size in SVG units; the zoom container
 * keeps that aspect ratio, and `landscape` turns it 90 degrees on a portrait screen.
 * Tasks 11-13 replace one `Game` each, e.g. `Game: Cricket`.
 */
export const games: Record<GameId, { w: number; h: number; landscape?: boolean; Game: ComponentType<GameProps> }> = {
  cricket: { w: 800, h: 560, Game: (p) => <Placeholder id="cricket" {...p} /> },
  football: { w: 800, h: 500, landscape: true, Game: (p) => <Placeholder id="football" {...p} /> },
  dotbox: { w: 600, h: 800, Game: (p) => <Placeholder id="dotbox" {...p} /> },
}
const IDS = Object.keys(games) as GameId[]

// Temporary page until the real game is mounted: its name, the player's name, and the shared Result (to try sharing).
function Placeholder({ id, name, onExit }: GameProps & { id: GameId }) {
  const ref = useRef<SVGSVGElement>(null)
  const [round, setRound] = useState(0)
  const { w, h } = games[id]
  return (
    <>
      <Page ref={ref} width={w} height={h}>
        <text x={w / 2} y={h * 0.2} textAnchor="middle" fontSize={56} fontFamily="'Galada', 'Atma', sans-serif" fill="var(--ink)">{strings.game[id]}</text>
        <text x={w / 2} y={h * 0.2 + 48} textAnchor="middle" fontSize={26} fontFamily="'Atma', sans-serif" fill="var(--ink)">{strings.soonGame}</text>
        {name && <text x={w - 40} y={h - 30} textAnchor="end" fontSize={32} fontFamily="'Patrick Hand', 'Atma', sans-serif" fill="var(--ink)">{name}</text>}
      </Page>
      <Result key={round} svgRef={ref} title={strings.shout.end} outcome="tie"
        onShare={(png) => shareOrDownload(png, `tiffin-break-${id}.png`, `${strings.appName}: ${strings.game[id]}`)}
        onAgain={() => setRound((r) => r + 1)} onIndex={onExit} />
    </>
  )
}

// The zoomed page drawn back over the index page box: used as the start of the zoom in and the end of the zoom out.
function overIndex(el: HTMLElement, index: HTMLElement) {
  const a = index.getBoundingClientRect()
  const b = el.getBoundingClientRect()
  el.style.translate = `${a.x + a.width / 2 - (b.x + b.width / 2)}px ${a.y + a.height / 2 - (b.y + b.height / 2)}px`
  el.style.scale = String(a.width / b.width)
  el.style.rotate = '-4deg'
  el.style.opacity = '0.3'
}
const ZOOM_MS = 600 // fallback if transitionend never fires; the transition itself is --t-zoom

export function Notebook({ saved, setSaved, onClose }: Props) {
  const dlg = useRef<HTMLDialogElement>(null)
  const index = useRef<HTMLDivElement>(null)
  const zoom = useRef<HTMLDivElement>(null)
  const openBtn = useRef<HTMLButtonElement>(null)
  const returnTo = useRef<GameId | null>(null)
  const reduce = useReducedMotion()
  const [view, setView] = useState<View>('cover')
  const [editing, setEditing] = useState(!saved.name)
  const game = view === 'cover' || view === 'index' ? null : view

  useEffect(() => {
    const d = dlg.current
    if (d && !d.open) d.showModal()
    d?.querySelector('input')?.focus() // showModal focuses the first button; on the first open the name comes first
  }, [])

  // Zoom in: start over the index entry's page, then let the CSS transition run to the resting place.
  useLayoutEffect(() => {
    const el = zoom.current
    if (!game || reduce || !el || !index.current) return
    el.style.transition = 'none'
    overIndex(el, index.current)
    el.getBoundingClientRect() // commit the start state before the transition comes back
    el.style.transition = el.style.translate = el.style.scale = el.style.rotate = el.style.opacity = ''
  }, [game]) // only when a game opens

  // Back on the index: focus the entry of the game just left.
  useEffect(() => {
    if (view !== 'index' || !returnTo.current) return
    index.current?.querySelector<HTMLElement>(`[data-game="${returnTo.current}"]`)?.focus()
    returnTo.current = null
  }, [view])

  const openGame = (id: GameId) => {
    play('rustle')
    setView(id)
  }
  const leave = () => {
    const el = zoom.current
    const from = game
    const done = () => {
      clearTimeout(t)
      el?.removeEventListener('transitionend', done)
      returnTo.current = from
      setView('index')
    }
    let t = 0
    if (!el || !index.current || reduce) return done()
    overIndex(el, index.current)
    el.addEventListener('transitionend', done)
    t = window.setTimeout(done, ZOOM_MS)
  }

  const saveName = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const name = String(new FormData(e.currentTarget).get('name') ?? '').trim()
    if (!name) return
    setSaved((s) => ({ ...s, name }))
    setEditing(false)
    openBtn.current?.focus()
  }

  const Game = game && games[game].Game

  return (
    <dialog ref={dlg} className="nb" aria-label={strings.bench.notebook} data-game={game ?? undefined}
      onCancel={(e) => { if (game) { e.preventDefault(); leave() } }} onClose={onClose}>
      <div className="nb-col" inert={!!game}>
        {view === 'cover' ? (
          <>
            <div className="nb-page cover">
              <svg viewBox="-110 -145 220 290" aria-hidden="true"><Khata name={saved.name} /></svg>
              <button ref={openBtn} type="button" className="cover-open" aria-label={strings.cover.open}
                onClick={() => { play('rustle'); setView('index') }} />
              <button type="button" className="cover-label" aria-label={strings.cover.editName} onClick={() => setEditing(true)} />
            </div>
            {editing ? (
              <form className="name-form" onSubmit={saveName}>
                <label htmlFor="nb-name">{strings.cover.askName}</label>
                <div className="name-row">
                  <input id="nb-name" name="name" defaultValue={saved.name} maxLength={20} required pattern=".*\S.*"
                    autoComplete="off" autoFocus />
                  <button type="submit" className="btn primary">{strings.cover.save}</button>
                </div>
              </form>
            ) : (
              <p className="nb-hint">{strings.cover.hint}</p>
            )}
          </>
        ) : (
          <div ref={index} className="nb-page page">
            <h2 id="nb-index" className="index-title">{strings.index.title}</h2>
            <nav aria-labelledby="nb-index">
              {IDS.map((id, i) => (
                <button key={id} type="button" className="entry" data-game={id} autoFocus={i === 0} onClick={() => openGame(id)}>
                  <span>{strings.index[id]}</span>
                  {saved.best[id] !== undefined && <span className="best">{strings.index.best} {bn(saved.best[id])}</span>}
                </button>
              ))}
              <button type="button" className="entry" disabled>{strings.index.soon}</button>
            </nav>
          </div>
        )}
        <button type="button" className="btn on-dark" onClick={() => dlg.current?.close()}>{strings.buttons.toBench}</button>
      </div>
      {game && Game && (
        <>
          <button type="button" className="btn on-dark back" onClick={leave} autoFocus>{strings.back}</button>
          <div ref={zoom} className="zoom" data-landscape={games[game].landscape || undefined}
            style={{ '--ar': games[game].w / games[game].h } as CSSProperties}>
            <Game name={saved.name} onBest={(v) => setSaved((s) => recordBest(s, game, v))} onExit={leave} />
          </div>
        </>
      )}
    </dialog>
  )
}
