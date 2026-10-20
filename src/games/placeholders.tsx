import { useRef, useState } from 'react'
import { strings } from '../strings'
import { Page } from '../Page'
import { shareOrDownload } from '../share'
import { Result } from './Result'
import type { GameId, GameProps, GameSlot } from './types'

// Temporary pages until Tasks 11-13 mount the games: the game's name, the player's name, and the shared Result (to try sharing).
function Placeholder({ id, W, H, name, onExit }: GameProps & { id: GameId; W: number; H: number }) {
  const ref = useRef<SVGSVGElement>(null)
  const [round, setRound] = useState(0)
  return (
    <>
      <Page ref={ref} width={W} height={H}>
        <text x={W / 2} y={H * 0.2} textAnchor="middle" fontSize={56} fontFamily="'Galada', 'Atma', sans-serif" fill="var(--ink)">{strings.game[id]}</text>
        <text x={W / 2} y={H * 0.2 + 48} textAnchor="middle" fontSize={26} fontFamily="'Atma', sans-serif" fill="var(--ink)">{strings.soonGame}</text>
        {name && <text x={W - 40} y={H - 30} textAnchor="end" fontSize={32} fontFamily="'Patrick Hand', 'Atma', sans-serif" fill="var(--ink)">{name}</text>}
      </Page>
      <Result key={round} svgRef={ref} title={strings.shout.end} outcome="tie"
        onShare={(png) => shareOrDownload(png, `tiffin-break-${id}.png`, `${strings.appName}: ${strings.game[id]}`)}
        onAgain={() => setRound((r) => r + 1)} onIndex={onExit} />
    </>
  )
}

const slot = (id: GameId, W: number, H: number, landscape?: boolean): GameSlot =>
  ({ W, H, landscape, Game: (p) => <Placeholder id={id} W={W} H={H} {...p} /> })

export const dotbox = slot('dotbox', 600, 800)
