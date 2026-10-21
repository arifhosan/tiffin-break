import { useEffect, useState } from 'react'

/** A media query's live match, e.g. '(orientation: portrait)'. */
export function useMedia(q: string): boolean {
  const [r, setR] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setR(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [q])
  return r
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')

/** Portrait screen: games with a `tall` slot lay out upright instead of turning (same query as the CSS). */
export const usePortrait = () => useMedia('(orientation: portrait)')
