import { useEffect, useState } from 'react'
import { load, save } from './storage'
import { setMuted } from './sound'
import { Bench } from './bench/Bench'
import { Notebook } from './notebook/Notebook'

export default function App() {
  const [saved, setSaved] = useState(load)
  const [screen, setScreen] = useState<'bench' | 'notebook'>('bench')
  useEffect(() => {
    save(saved)
    setMuted(saved.muted)
  }, [saved])
  // The bench stays behind the notebook (a modal dialog makes it inert) so it can fade back.
  return (
    <>
      <Bench saved={saved} setSaved={setSaved} onOpenNotebook={() => setScreen('notebook')} />
      {screen === 'notebook' && <Notebook saved={saved} setSaved={setSaved} onClose={() => setScreen('bench')} />}
    </>
  )
}
