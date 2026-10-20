export type GameId = 'cricket' | 'football' | 'dotbox'
export type GameProps = { name: string; onBest: (value: number) => void; onExit: () => void }
