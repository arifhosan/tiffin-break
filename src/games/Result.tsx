import { useEffect, useState, type RefObject } from 'react'
import { strings } from '../strings'
import { play } from '../sound'
import { svgToPng } from '../share'

type Props = {
  svgRef: RefObject<SVGSVGElement | null>
  title: string
  outcome: 'win' | 'loss' | 'tie'
  /** Gets the finished page as a 2x PNG; the game picks the filename and calls shareOrDownload. */
  onShare: (png: Blob) => Promise<unknown>
  onAgain: () => void
  onIndex: () => void
}

/** End-of-match overlay: sits over the finished page inside the zoom container. */
export function Result({ svgRef, title, outcome, onShare, onAgain, onIndex }: Props) {
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (outcome !== 'tie') play(outcome === 'win' ? 'cheer' : 'groan')
  }, [outcome])

  const share = async () => {
    if (!svgRef.current || busy) return
    setBusy(true)
    try {
      await onShare(await svgToPng(svgRef.current))
    } catch (e) {
      console.error('share failed', e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="result" role="group" aria-labelledby="result-title">
      <p id="result-title" className="stamp" role="status">{title}</p>
      <div className="result-actions">
        <button type="button" className="btn primary" onClick={share} disabled={busy} aria-busy={busy}>{strings.buttons.share}</button>
        <button type="button" className="btn" onClick={onAgain}>{strings.buttons.again}</button>
        <button type="button" className="btn" onClick={onIndex}>{strings.buttons.toIndex}</button>
      </div>
    </div>
  )
}
