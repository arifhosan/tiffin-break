import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SAVED, load, recordBest, save } from './storage'

const stub = (o: Partial<Storage>) => vi.stubGlobal('localStorage', o)
afterEach(() => vi.unstubAllGlobals())

describe('storage', () => {
  it('getItem throws -> default', () => {
    stub({ getItem: () => { throw new Error('x') } })
    expect(load()).toEqual(DEFAULT_SAVED)
  })
  it('corrupt json -> default', () => {
    stub({ getItem: () => '{oops' })
    expect(load()).toEqual(DEFAULT_SAVED)
  })
  it('partial save merges with defaults', () => {
    stub({ getItem: () => '{"v":1,"name":"Rafi"}' })
    expect(load()).toEqual({ ...DEFAULT_SAVED, name: 'Rafi' })
  })
  it('wrong-typed fields fall back', () => {
    stub({ getItem: () => '{"v":1,"strokes":5,"muted":"yes"}' })
    expect(load()).toEqual(DEFAULT_SAVED)
  })
  it('save swallows setItem errors', () => {
    stub({ setItem: () => { throw new Error('full') } })
    expect(() => save(DEFAULT_SAVED)).not.toThrow()
  })
  it('recordBest keeps max', () => {
    const s = recordBest(recordBest(DEFAULT_SAVED, 'cricket', 10), 'cricket', 5)
    expect(s.best.cricket).toBe(10)
  })
})
