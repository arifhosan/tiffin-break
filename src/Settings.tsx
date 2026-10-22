import { useEffect, useRef, type Dispatch, type MouseEvent, type SetStateAction } from 'react'
import type { Saved } from './storage'
import { strings } from './strings'
import { resetBench } from './bench/model'

/** Closes a modal <dialog> on a click on its backdrop: the click lands on the dialog element, outside its box. */
export function closeOnBackdrop(e: MouseEvent<HTMLDialogElement>) {
  const d = e.currentTarget
  const r = d.getBoundingClientRect()
  if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close()
}

type Props = { saved: Saved; setSaved: Dispatch<SetStateAction<Saved>>; onClose: () => void }

export function Settings({ saved, setSaved, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  const t = strings.settings
  return (
    <dialog ref={ref} className="sheet" aria-labelledby="settings-title" onClose={onClose} onClick={closeOnBackdrop}>
      <h2 id="settings-title">{t.title}</h2>
      <button type="button" role="switch" aria-checked={!saved.muted} aria-label={t.sound} className="row-btn" onClick={() => setSaved((s) => ({ ...s, muted: !s.muted }))}>
        <span aria-hidden="true">{saved.muted ? t.soundOff : t.soundOn}</span>
        <span className="knob" aria-hidden="true" />
      </button>
      <button type="button" className="row-btn danger"
        onClick={() => { if (confirm(t.confirmReset)) { setSaved(resetBench); ref.current?.close() } }}>
        {t.reset}
      </button>
      <h3>{t.credits}</h3>
      <p>{t.fonts}</p>
      <button type="button" className="close" onClick={() => ref.current?.close()}>{strings.buttons.close}</button>
    </dialog>
  )
}
