import { useEffect, useRef, useState } from 'react'
import { load, save } from './storage'
import { setMuted } from './sound'
import { Bench } from './bench/Bench'
import { Notebook } from './notebook/Notebook'

export default function App() {
  const [saved, setSaved] = useState(load)
  const [screen, setScreen] = useState<'bench' | 'notebook'>('bench')
  useEffect(() => setMuted(saved.muted), [saved.muted])
  // Debounced: a drag changes `saved` on every pointermove. Flushed when the page is hidden or closed.
  const latest = useRef(saved)
  const written = useRef(saved) // the state last on disk: flushing an unchanged state would clobber another tab's save
  latest.current = saved
  const write = () => { if (written.current !== latest.current) save((written.current = latest.current)) }
  useEffect(() => {
    const t = setTimeout(write, 250)
    return () => clearTimeout(t)
  }, [saved])
  useEffect(() => {
    const flush = write
    const hidden = () => document.visibilityState === 'hidden' && flush()
    addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', hidden)
    return () => { removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hidden) }
  }, [])
  // The bench stays behind the notebook (a modal dialog makes it inert) so it can fade back.
  return (
    <>
      <Bench saved={saved} setSaved={setSaved} onOpenNotebook={() => setScreen('notebook')} />
      {screen === 'notebook' && <Notebook saved={saved} setSaved={setSaved} onClose={() => setScreen('bench')} />}
    </>
  )
}
