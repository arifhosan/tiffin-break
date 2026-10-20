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
  latest.current = saved
  useEffect(() => {
    const t = setTimeout(() => save(saved), 250)
    return () => clearTimeout(t)
  }, [saved])
  useEffect(() => {
    const flush = () => save(latest.current)
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
