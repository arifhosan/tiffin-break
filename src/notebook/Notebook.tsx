import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { recordBest, type Saved } from '../storage'
import { bn, strings } from '../strings'
import { useReducedMotion } from '../motion'
import { play } from '../sound'
import { Notebook as Khata } from '../bench/items'
import { ResultLayer } from '../games/Result'
import * as placeholder from '../games/placeholders'
import * as Cricket from '../cricket/Cricket'
import * as Football from '../football/Football'
import type { GameId, GameSlot } from '../games/types'

type Props = { saved: Saved; setSaved: Dispatch<SetStateAction<Saved>>; onClose: () => void }
type View = 'cover' | 'index' | GameId

/**
 * Mount point for the games: each game module exports its page size `W`, `H` (and `landscape` for a spread that
 * turns on a portrait phone) next to its component. Tasks 11-13 change one line each, e.g.
 * `cricket: { W: Cricket.W, H: Cricket.H, Game: Cricket.Cricket },` after `import * as Cricket from '../cricket/Cricket'`.
 * The game SVG is what gets shared (svgToPng): every <text> needs an explicit fontFamily, and CSS classes don't reach the image.
 */
export const games: Record<GameId, GameSlot> = {
  cricket: { W: Cricket.W, H: Cricket.H, landscape: true, Game: Cricket.Cricket },
  football: { W: Football.W, H: Football.H, landscape: true, Game: Football.Football },
  dotbox: placeholder.dotbox,
}
const IDS = Object.keys(games) as GameId[]

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
  const leaving = useRef(false)
  const timer = useRef(0)
  const [layer, setLayer] = useState<HTMLDivElement | null>(null)
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
    leaving.current = false
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

  useEffect(() => () => clearTimeout(timer.current), [])

  const openGame = (id: GameId) => {
    play('rustle')
    setView(id)
  }
  const leave = () => {
    if (leaving.current) return
    leaving.current = true
    const el = zoom.current
    const from = game
    const end = (e: TransitionEvent) => { if (e.target === el) done() } // transitionend bubbles up from the game
    const done = () => {
      clearTimeout(timer.current)
      el?.removeEventListener('transitionend', end)
      returnTo.current = from
      setView('index')
    }
    if (!el || !index.current || reduce) return done()
    if (layer) layer.style.visibility = 'hidden' // the upright Result layer doesn't shrink with the page
    overIndex(el, index.current)
    el.addEventListener('transitionend', end)
    timer.current = window.setTimeout(done, ZOOM_MS)
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
          <div className="stage" data-landscape={games[game].landscape || undefined}
            style={{ '--ar': games[game].W / games[game].H } as CSSProperties}>
            <div ref={zoom} className="zoom">
              <ResultLayer.Provider value={layer}>
                {layer && <Game name={saved.name} onBest={(v) => setSaved((s) => recordBest(s, game, v))} onExit={leave} />}
              </ResultLayer.Provider>
            </div>
            <div ref={setLayer} className="zoom-layer" />
          </div>
        </>
      )}
    </dialog>
  )
}
