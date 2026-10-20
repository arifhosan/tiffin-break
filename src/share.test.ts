import { afterEach, expect, it, vi } from 'vitest'
import { rootVarNames, shareOrDownload, varsRule } from './share'

afterEach(() => vi.unstubAllGlobals())

const png = new Blob(['x'], { type: 'image/png' })
const env = (coarse: boolean, share?: () => Promise<void>) => {
  const a = { href: '', download: '', click: vi.fn() }
  vi.stubGlobal('matchMedia', () => ({ matches: coarse }))
  vi.stubGlobal('navigator', share ? { canShare: () => true, share } : {})
  vi.stubGlobal('document', { createElement: () => a })
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL() {} })
  return a
}

it('shares on a touch device', async () => {
  const share = vi.fn(async () => {})
  env(true, share)
  expect(await shareOrDownload(png, 'tiffin-break-dotbox.png', 't')).toBe('shared')
  expect(share).toHaveBeenCalledOnce()
})

it('a cancelled share sheet does nothing', async () => {
  const a = env(true, async () => { throw new DOMException('no', 'AbortError') })
  expect(await shareOrDownload(png, 'f.png', 't')).toBe('cancelled')
  expect(a.click).not.toHaveBeenCalled()
})

it('downloads on desktop, or when share fails', async () => {
  let a = env(false, async () => {})
  expect(await shareOrDownload(png, 'tiffin-break-cricket.png', 't')).toBe('downloaded')
  expect(a.download).toBe('tiffin-break-cricket.png')
  expect(a.click).toHaveBeenCalledOnce()
  a = env(true, async () => { throw new DOMException('no', 'NotAllowedError') })
  expect(await shareOrDownload(png, 'f.png', 't')).toBe('downloaded')
  a = env(true)
  expect(await shareOrDownload(png, 'f.png', 't')).toBe('downloaded')
})

it('turns the :root tokens into one rule for the exported svg', () => {
  const sheets = [
    { cssRules: [{ selectorText: ':root', style: ['--ink', '--paper', 'color'] }, { selectorText: 'body', style: ['--nope'] }] },
    { get cssRules(): never { throw new DOMException('cross-origin', 'SecurityError') } },
    { cssRules: [{ selectorText: ':root', style: ['--ink', '--rule'] }, {}] },
  ]
  const names = rootVarNames(sheets)
  expect(names).toEqual(['--ink', '--paper', '--rule'])
  const vals: Record<string, string> = { '--ink': ' #1d3fa0', '--paper': '#fdfcf6', '--rule': '#b9d2ec ' }
  expect(varsRule(names, (n) => vals[n])).toBe('svg{--ink:#1d3fa0;--paper:#fdfcf6;--rule:#b9d2ec}')
})
