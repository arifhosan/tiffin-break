import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SAVED, load } from '../storage'
import { addStroke, eraseAt, moveItem, normalizeItems, resetBench, simplify } from './model'

afterEach(() => vi.unstubAllGlobals())
const stub = (json: unknown) => vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(json) })

describe('bench model', () => {
  it('moveItem keeps the whole item on the bench and does not mutate', () => {
    const before = structuredClone(DEFAULT_SAVED)
    const s = moveItem(DEFAULT_SAVED, 'tiffin', 900, -20) // tiffin: 74 x 64 half size, rot 0
    expect(s.items.tiffin).toMatchObject({ x: 526, y: 64 })
    expect(DEFAULT_SAVED).toEqual(before)
  })
  it('moveItem clamps by the rotated box', () => {
    const s = moveItem({ ...DEFAULT_SAVED, items: { ...DEFAULT_SAVED.items, pen: { x: 0, y: 0, rot: 90 } } }, 'pen', 0, 0)
    expect(s.items.pen.x).toBeCloseTo(88) // turned on its side: the pen's length runs along x
    expect(s.items.pen.y).toBeCloseTo(18)
  })
  it('the default desk already fits', () => {
    expect(normalizeItems(DEFAULT_SAVED)).toEqual(DEFAULT_SAVED)
  })
  it('load clamps out-of-range items', () => {
    stub({ v: 1, items: { tiffin: { x: 5000, y: 5000, rot: 0 } } })
    expect(load().items.tiffin).toMatchObject({ x: 526, y: 736 })
  })
  it('load keeps only the newest 300 strokes', () => {
    stub({ v: 1, strokes: Array.from({ length: 302 }, (_, i) => ({ id: `s${i}`, pts: [[0, 0], [1, 1]] })) })
    const { strokes } = load()
    expect(strokes).toHaveLength(300)
    expect(strokes[0].id).toBe('s2')
  })
  it('load returns fresh copies, never DEFAULT_SAVED', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{oops' })
    const a = load()
    expect(a).not.toBe(DEFAULT_SAVED)
    expect(a.strokes).not.toBe(DEFAULT_SAVED.strokes)
  })
  it('load keeps only valid strokes', () => {
    stub({ v: 1, strokes: [{}, { id: 'a', pts: [[1, 2], [3, 4]] }, { id: 'b', pts: [[1, 'x']] }] })
    expect(load().strokes).toEqual([{ id: 'a', pts: [[1, 2], [3, 4]] }])
  })
  it('simplify collapses collinear points', () => {
    const pts = Array.from({ length: 100 }, (_, i) => [i, i] as [number, number])
    expect(simplify(pts)).toHaveLength(2)
  })
  it('keeps 300 strokes, drops oldest', () => {
    let s = DEFAULT_SAVED
    for (let i = 0; i < 301; i++) s = addStroke(s, [[0, 0], [10, 10]], `s${i}`)
    expect(s.strokes).toHaveLength(300)
    expect(s.strokes[0].id).toBe('s1')
  })
  it('ignores 1-point stroke', () => {
    expect(addStroke(DEFAULT_SAVED, [[1, 1]], 'x').strokes).toHaveLength(0)
  })
  it('eraseAt respects radius', () => {
    const s = addStroke(DEFAULT_SAVED, [[0, 0], [100, 0]], 'a')
    expect(eraseAt(s, { x: 50, y: 5 }).strokes).toHaveLength(0)
    expect(eraseAt(s, { x: 50, y: 20 }).strokes).toHaveLength(1)
  })
  it('eraseAt returns the same object when nothing is hit', () => {
    const s = addStroke(DEFAULT_SAVED, [[0, 0], [100, 0]], 'a')
    expect(eraseAt(s, { x: 50, y: 90 })).toBe(s)
  })
  it('resetBench keeps name', () => {
    const s = resetBench({ ...moveItem(DEFAULT_SAVED, 'pen', 1, 1), name: 'Rafi' })
    expect(s.name).toBe('Rafi')
    expect(s.items.pen).toEqual(DEFAULT_SAVED.items.pen)
  })
})
