import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SAVED, load } from '../storage'
import { addStroke, eraseAt, moveItem, resetBench, simplify } from './model'

afterEach(() => vi.unstubAllGlobals())
const stub = (json: unknown) => vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(json) })

describe('bench model', () => {
  it('moveItem clamps and does not mutate', () => {
    const before = structuredClone(DEFAULT_SAVED)
    const s = moveItem(DEFAULT_SAVED, 'pen', 900, -20)
    expect(s.items.pen).toMatchObject({ x: 600, y: 0 })
    expect(DEFAULT_SAVED).toEqual(before)
  })
  it('load clamps out-of-range items', () => {
    stub({ v: 1, items: { tiffin: { x: 5000, y: 5000, rot: 0 } } })
    expect(load().items.tiffin).toMatchObject({ x: 600, y: 800 })
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
  it('resetBench keeps name', () => {
    const s = resetBench({ ...moveItem(DEFAULT_SAVED, 'pen', 1, 1), name: 'Rafi' })
    expect(s.name).toBe('Rafi')
    expect(s.items.pen).toEqual(DEFAULT_SAVED.items.pen)
  })
})
