import { useEffect, useState } from 'react'
import { load, save } from './storage'
import { strings } from './strings'
import { setMuted } from './sound'
import { Bench } from './bench/Bench'

export default function App() {
  const [saved, setSaved] = useState(load)
  const [screen, setScreen] = useState<'bench' | 'notebook'>('bench')
  useEffect(() => {
    save(saved)
    setMuted(saved.muted)
  }, [saved])
  if (screen === 'bench') return <Bench saved={saved} setSaved={setSaved} onOpenNotebook={() => setScreen('notebook')} />
  // Task 10 replaces this placeholder with the notebook.
  return (
    <main className="screen">
      <div className="sheet placeholder">
        <h1>{strings.index.title}</h1>
        <p>{strings.notebookSoon}</p>
        <button type="button" className="close" onClick={() => setScreen('bench')}>{strings.buttons.toBench}</button>
      </div>
    </main>
  )
}
