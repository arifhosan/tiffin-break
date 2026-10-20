import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

function fakeAudio() {
  const made: string[] = []
  const pans: number[] = []
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} })
  const node = (kind: string) => {
    made.push(kind)
    const n = { gain: param(), frequency: param(), pan: param(), type: '', buffer: null, connect: (x: unknown) => x, start() {}, stop() {} }
    return n
  }
  let ctxs = 0
  class AC {
    currentTime = 0
    state = 'running'
    destination = {}
    sampleRate = 8000
    constructor() { ctxs++ }
    createGain = () => node('gain')
    createOscillator = () => node('osc')
    createBiquadFilter = () => node('filter')
    createBufferSource = () => node('noise')
    createBuffer = (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) })
    createStereoPanner = () => {
      const n = node('pan')
      Object.defineProperty(n.pan, 'value', { set: (v: number) => pans.push(v), get: () => 0 })
      return n
    }
  }
  vi.stubGlobal('AudioContext', AC)
  return { made, pans, ctxs: () => ctxs }
}

it('muted plays nothing and creates no context', async () => {
  vi.resetModules()
  const a = fakeAudio()
  const { play, setMuted } = await import('./sound')
  setMuted(true)
  play('bell')
  expect(a.ctxs()).toBe(0)
})

it('one lazy context, every sound builds nodes, pan clamped', async () => {
  vi.resetModules()
  const a = fakeAudio()
  const { play, setMuted } = await import('./sound')
  setMuted(false)
  for (const n of ['rustle', 'thud', 'scratch', 'bell', 'cheer', 'groan', 'rattle'] as const) play(n, 5)
  expect(a.ctxs()).toBe(1)
  expect(a.pans.every((p) => p === 1)).toBe(true)
  expect(a.made.filter((k) => k === 'osc')).toHaveLength(3) // thud + bell x2
  expect(a.made.filter((k) => k === 'noise')).toHaveLength(7) // rustle, scratch, cheer, groan, rattle x3
})
