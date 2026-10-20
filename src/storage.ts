export type ItemId = 'notebook' | 'bookBangla' | 'bookMath' | 'bookEnglish' | 'pen' | 'pencil' | 'eraser' | 'geometry' | 'tiffin'
export type Stroke = { id: string; pts: [number, number][] }
export type Saved = {
  v: 1
  items: Record<ItemId, { x: number; y: number; rot: number }>
  strokes: Stroke[]
  name: string
  muted: boolean
  best: { cricket?: number; football?: number; dotbox?: number }
}

const KEY = 'tb.v1'

// Messy desk inside 600 x 800 (item centres).
export const DEFAULT_SAVED: Saved = {
  v: 1,
  items: {
    notebook: { x: 300, y: 380, rot: -4 },
    bookBangla: { x: 160, y: 190, rot: 8 },
    bookMath: { x: 400, y: 150, rot: -12 },
    bookEnglish: { x: 470, y: 270, rot: 15 },
    pen: { x: 110, y: 560, rot: -35 },
    pencil: { x: 190, y: 640, rot: 22 },
    eraser: { x: 330, y: 650, rot: -10 },
    geometry: { x: 480, y: 560, rot: 6 },
    tiffin: { x: 300, y: 730, rot: 0 },
  },
  strokes: [],
  name: '',
  muted: false,
  best: {},
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x)

export function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!isObj(raw) || raw.v !== 1) return DEFAULT_SAVED
    const items = { ...DEFAULT_SAVED.items }
    if (isObj(raw.items))
      for (const k of Object.keys(items) as ItemId[]) {
        const it = raw.items[k]
        if (isObj(it) && num(it.x) && num(it.y) && num(it.rot)) items[k] = { x: it.x as number, y: it.y as number, rot: it.rot as number }
      }
    const best: Saved['best'] = {}
    if (isObj(raw.best))
      for (const g of ['cricket', 'football', 'dotbox'] as const) if (num(raw.best[g])) best[g] = raw.best[g] as number
    return {
      v: 1,
      items,
      strokes: Array.isArray(raw.strokes) ? (raw.strokes as Stroke[]) : DEFAULT_SAVED.strokes,
      name: typeof raw.name === 'string' ? raw.name : DEFAULT_SAVED.name,
      muted: typeof raw.muted === 'boolean' ? raw.muted : DEFAULT_SAVED.muted,
      best,
    }
  } catch {
    return DEFAULT_SAVED
  }
}

export function save(s: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable: game still works */
  }
}

export function recordBest(s: Saved, game: 'cricket' | 'football' | 'dotbox', value: number): Saved {
  return { ...s, best: { ...s.best, [game]: Math.max(s.best[game] ?? value, value) } }
}
