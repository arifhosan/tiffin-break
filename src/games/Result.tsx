import { createContext, useContext, useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { strings } from '../strings'
import { play } from '../sound'
import { svgToPng } from '../share'

/**
 * Where Result draws: an upright layer over the zoomed page, provided by the Notebook, so a spread turned
 * 90 degrees on a portrait phone still gets upright buttons. Without a provider, Result renders in place.
 */
export const ResultLayer = createContext<HTMLElement | null>(null)

type Props = {
  svgRef: RefObject<SVGSVGElement | null>
  title: string
  outcome: 'win' | 'loss' | 'tie'
  /** Gets the finished page as a 2x PNG; the game picks the filename and returns shareOrDownload(...). */
  onShare: (png: Blob) => Promise<'shared' | 'downloaded' | 'cancelled'>
  onAgain: () => void
  onIndex: () => void
}

/** End-of-match overlay: a stamp over the finished page, then the three choices. */
export function Result({ svgRef, title, outcome, onShare, onAgain, onIndex }: Props) {
  const layer = useContext(ResultLayer)
  const first = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('') // filled after mount: a live region that mounts already filled isn't reliably read
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (outcome !== 'tie') play(outcome === 'win' ? 'cheer' : 'groan')
    setSaid(`${title} ${strings.result[outcome]}`)
    first.current?.focus()
  }, [outcome, title])

  const share = async () => {
    if (!svgRef.current || busy) return
    setBusy(true)
    setMsg('')
    try {
      const r = await onShare(await svgToPng(svgRef.current))
      if (r === 'downloaded') setMsg(strings.share.saved)
    } catch (e) {
      console.error('share failed', e)
      setMsg(strings.share.failed)
    } finally {
      setBusy(false)
    }
  }

  // aria-disabled, not disabled, while busy: disabling the focused button would drop focus to <body>.
  const ui = (
    <div className="result" role="group" aria-labelledby="result-title">
      <p id="result-title" className="stamp" aria-hidden="true">{title}</p>
      <p className="verdict" aria-hidden="true">{strings.result[outcome]}</p>
      <p className="sr-only" role="status">{said}</p>
      <div className="result-actions">
        <button ref={first} type="button" className="btn primary" onClick={share} aria-disabled={busy} aria-busy={busy}>{strings.buttons.share}</button>
        <button type="button" className="btn" onClick={onAgain}>{strings.buttons.again}</button>
        <button type="button" className="btn" onClick={onIndex}>{strings.buttons.toIndex}</button>
      </div>
      <p className="result-msg" aria-live="polite">{msg}</p>
    </div>
  )
  return layer ? createPortal(ui, layer) : ui
}
