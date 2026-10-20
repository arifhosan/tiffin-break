import { useEffect, useState } from 'react'

const Q = '(prefers-reduced-motion: reduce)'

export function useReducedMotion(): boolean {
  const [r, setR] = useState(() => window.matchMedia(Q).matches)
  useEffect(() => {
    const m = window.matchMedia(Q)
    const on = () => setR(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return r
}
