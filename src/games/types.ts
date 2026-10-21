import type { ComponentType } from 'react'

export type GameId = 'cricket' | 'football' | 'dotbox'
export type GameProps = { name: string; onBest: (value: number) => void; onExit: () => void }
/**
 * What the notebook mounts: the page (or spread) size in SVG units, and the game. `landscape` turns it on a portrait screen;
 * `tall` is an upright page size used instead on a portrait screen (the game picks its layout with `usePortrait()`).
 */
export type GameSlot = { W: number; H: number; landscape?: boolean; tall?: { W: number; H: number }; Game: ComponentType<GameProps> }
