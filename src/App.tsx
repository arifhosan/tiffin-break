import { useEffect, useState } from 'react'
import { load, save } from './storage'
import { strings } from './strings'

export default function App() {
  const [saved] = useState(load)
  const [screen] = useState<'bench' | 'notebook'>('bench')
  useEffect(() => save(saved), [saved])
  return screen === 'bench' ? <div>{strings.appName}</div> : <div>{strings.index.title}</div>
}
