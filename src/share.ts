const FONTS = [
  ['Atma', 'Atma-Regular.woff2'],
  ['Galada', 'Galada-Regular.woff2'],
  ['Patrick Hand', 'PatrickHand-Regular.woff2'],
] as const

const dataUrl = (b: Blob) =>
  new Promise<string>((ok, bad) => {
    const r = new FileReader()
    r.onload = () => ok(r.result as string)
    r.onerror = () => bad(r.error)
    r.readAsDataURL(b)
  })

// An SVG drawn as an image can't reach the page's fonts or CSS variables, so both go inside it.
let fontCss: Promise<string> | undefined
const fontFaces = () =>
  (fontCss ??= Promise.all(
    FONTS.map(async ([family, file]) => {
      const res = await fetch(new URL(`fonts/${file}`, document.baseURI))
      if (!res.ok) throw new Error(`font ${file}: ${res.status}`)
      return `@font-face{font-family:'${family}';src:url(${await dataUrl(await res.blob())}) format('woff2')}`
    }),
  ).then((f) => f.join(''), (e) => { fontCss = undefined; throw e }))

type Sheet = { readonly cssRules: ArrayLike<{ selectorText?: string; style?: ArrayLike<string> }> }

/** Custom properties declared in `:root` rules. Computed-style enumeration would be shorter, but Safari doesn't list custom properties there. */
export function rootVarNames(sheets: ArrayLike<Sheet>): string[] {
  const names = new Set<string>()
  for (const sheet of Array.from(sheets)) {
    let rules
    try { rules = Array.from(sheet.cssRules) } catch { continue } // cross-origin sheet
    for (const r of rules)
      if (r.selectorText === ':root' && r.style) for (const p of Array.from(r.style)) if (p.startsWith('--')) names.add(p)
  }
  return [...names]
}

/** The token values as one rule for the cloned <svg>, so `fill="var(--paper)"` still resolves inside the image. */
export const varsRule = (names: string[], value: (name: string) => string): string =>
  `svg{${names.map((n) => `${n}:${value(n).trim()}`).join(';')}}`

/**
 * Clones a game SVG into a PNG. Only what is inside the SVG reaches the image: every <text> needs an explicit
 * fontFamily attribute (Atma, Galada or Patrick Hand), and CSS classes from styles.css don't apply; tokens via var() do.
 */
export async function svgToPng(svg: SVGSVGElement, scale = 2): Promise<Blob> {
  const { width, height } = svg.viewBox.baseVal
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width * scale))
  clone.setAttribute('height', String(height * scale))
  clone.removeAttribute('style')
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  const root = getComputedStyle(document.documentElement)
  style.textContent = (await fontFaces()) + varsRule(rootVarNames(document.styleSheets as unknown as ArrayLike<Sheet>), (n) => root.getPropertyValue(n))
  clone.prepend(style)

  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((ok, bad) => canvas.toBlob((b) => (b ? ok(b) : bad(new Error('toBlob failed'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const files = [new File([blob], filename, { type: blob.type })]
  // Desktop Chrome on Windows can share files too; there a download is what people expect (the brief), so phones only.
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, text })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // Anything else (no user activation, share target failed): fall back to a download.
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  return 'downloaded'
}
