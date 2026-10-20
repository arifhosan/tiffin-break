import { forwardRef, type ReactNode } from 'react'

const RULE_GAP = 18

export const Page = forwardRef<SVGSVGElement, { width: number; height: number; children?: ReactNode }>(
  function Page({ width, height, children }, ref) {
    const ys = Array.from({ length: Math.floor(height / RULE_GAP) }, (_, i) => (i + 1) * RULE_GAP)
    return (
      <svg ref={ref} viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block', maxHeight: '100%' }}>
        <rect width={width} height={height} fill="var(--paper)" />
        {ys.map((y) => (
          <line key={y} x1={0} x2={width} y1={y} y2={y} stroke="var(--rule)" strokeWidth={1} />
        ))}
        <line x1={36} x2={36} y1={0} y2={height} stroke="var(--margin)" strokeWidth={1.5} />
        {children}
      </svg>
    )
  },
)
