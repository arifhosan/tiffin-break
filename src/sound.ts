import { makeRng } from './rng'

export type SoundName = 'rustle' | 'thud' | 'scratch' | 'bell' | 'cheer' | 'groan' | 'rattle'

let ctx: AudioContext | undefined
let noiseBuf: AudioBuffer | undefined
let muted = false

export const setMuted = (m: boolean): void => {
  muted = m
}

const fade = (g: GainNode, t: number, peak: number, dur: number) => {
  g.gain.setValueAtTime(peak, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
}

function noise(c: AudioContext, out: AudioNode, t: number, dur: number, type: BiquadFilterType, f0: number, f1: number, peak: number) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    const r = makeRng(7)
    for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1
  }
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.setValueAtTime(f0, t)
  f.frequency.exponentialRampToValueAtTime(f1, t + dur)
  const g = c.createGain()
  fade(g, t, peak, dur)
  src.connect(f).connect(g).connect(out)
  src.start(t)
  src.stop(t + dur)
}

function tone(c: AudioContext, out: AudioNode, t: number, f0: number, f1: number, dur: number, peak: number) {
  const o = c.createOscillator()
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(f1, t + dur)
  const g = c.createGain()
  fade(g, t, peak, dur)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + dur)
}

/** Synthesised sound; the AudioContext is created lazily on the first call (a user gesture). */
export function play(name: SoundName, pan = 0): void {
  if (muted) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const c = ctx
    const t = c.currentTime
    const out = c.createStereoPanner()
    out.pan.value = Math.max(-1, Math.min(1, pan))
    out.connect(c.destination)
    switch (name) {
      case 'rustle': return noise(c, out, t, 0.06, 'bandpass', 2500, 1800, 0.5)
      case 'thud': return tone(c, out, t, 80, 45, 0.25, 0.8)
      case 'scratch': return noise(c, out, t, 0.12, 'highpass', 3500, 5000, 0.12)
      case 'bell':
        tone(c, out, t, 880, 880, 1.2, 0.25)
        return tone(c, out, t, 1320, 1320, 1.2, 0.15)
      case 'cheer': return noise(c, out, t, 1, 'bandpass', 700, 2200, 0.35)
      case 'groan': return noise(c, out, t, 0.8, 'bandpass', 700, 180, 0.35)
      case 'rattle':
        for (const dt of [0, 0.08, 0.17]) noise(c, out, t + dt, 0.03, 'bandpass', 4200, 3000, 0.6)
    }
  } catch {
    /* no Web Audio: the game stays silent */
  }
}
