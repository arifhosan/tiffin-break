import type { Side } from '../geom'
import { bn, strings } from '../strings'
import { WICKETS, type BallOutcome, type CricketMatch, type Innings } from './match'

const ATMA = "'Atma', sans-serif"
const NAME = "'Patrick Hand', 'Atma', sans-serif"
const X0 = 50 // just right of the red margin
const COLS = 9 // marks per written row
const COL_W = 34
const s = strings.cricket

const mark = (o: BallOutcome) =>
  o.kind === 'runs' ? bn(o.runs) : o.kind === 'out' ? s.mark.out : s.mark[o.what]

export const oversText = (legal: number) => `${bn(Math.floor(legal / 6))}.${bn(legal % 6)}`

// A side's name as written in the ledger: the player's name (Latin script, in Patrick Hand) or the Bengali fallback.
function Who({ side, name }: { side: Side; name: string }) {
  return side === 'you' && name ? <tspan fontFamily={NAME}>{name}</tspan> : <tspan>{side === 'you' ? s.you : s.cpu}</tspan>
}

// One innings: header line with the total, then the balls in rows of overs (an over with extras wraps).
function InningsBlock({ inn, i, y, gap, name, tgt }: { inn: Innings; i: number; y: number; gap: number; name: string; tgt: number | null }) {
  const rows: { over: number | null; marks: BallOutcome[] }[] = []
  let legal = 0
  let last = -1
  for (const b of inn.balls) {
    const over = Math.floor(legal / 6)
    const row = rows[rows.length - 1]
    if (over !== last || row.marks.length === COLS) rows.push({ over: over !== last ? over : null, marks: [] })
    rows[rows.length - 1].marks.push(b.outcome)
    last = over
    if (b.outcome.kind !== 'extra') legal++
  }
  return (
    <g fontFamily={ATMA} fill="var(--ink)">
      <text x={X0} y={y} fontSize={19} fontFamily={ATMA}>
        {s.innings[i]}: <Who side={inn.batting} name={name} />
      </text>
      <text x={388} y={y} fontSize={19} fontFamily={ATMA} textAnchor="end">
        {bn(inn.runs)}/{bn(inn.wickets)} ({oversText(inn.legalBalls)})
      </text>
      {tgt !== null && (
        <text x={388} y={y + 18} fontSize={14} fontFamily={ATMA} textAnchor="end">{s.target} {bn(tgt)}</text>
      )}
      {rows.map((r, k) => (
        <g key={k}>
          {r.over !== null && (
            <text x={X0} y={y + gap * (k + 1)} fontSize={14} fontFamily={ATMA} fill="var(--ink-off)">
              {s.overs} {bn(r.over + 1)}
            </text>
          )}
          {r.marks.map((o, j) => (
            <text key={j} x={X0 + 78 + j * COL_W} y={y + gap * (k + 1)} textAnchor="middle" fontFamily={ATMA}
              fontSize={o.kind === 'out' ? 14 : o.kind === 'extra' ? 13 : 19}
              fill={o.kind === 'out' ? 'var(--stamp)' : 'var(--ink)'}>
              {mark(o)}
            </text>
          ))}
        </g>
      ))}
    </g>
  )
}

/** The left page: a handwritten ball-by-ball ledger. Baselines sit on the 18-unit rules. */
export function Scorecard({ m, overs, name, result }: { m: CricketMatch | null; overs: number; name: string; result: string }) {
  const gap = overs === 5 ? 18 : 36
  const block = 54 + gap * (overs + 1)
  return (
    <g>
      <text x={X0} y={50} fontSize={34} fontFamily="'Galada', 'Atma', sans-serif" fill="var(--ink)">{strings.game.cricket}</text>
      <text x={X0} y={86} fontSize={18} fontFamily={ATMA} fill="var(--ink)">
        <Who side="you" name={name} /> {s.vs} {s.cpu} · {bn(overs)} {s.overs}, {bn(WICKETS[overs as 1 | 2 | 5])} {s.wickets}
      </text>
      {m?.innings.map((inn, i) => (
        <InningsBlock key={i} inn={inn} i={i} y={140 + i * block} gap={gap} name={name} tgt={i === 1 ? m.innings[0].runs + 1 : null} />
      ))}
      {result && (
        <text x={X0} y={518} fontSize={26} fontFamily="'Galada', 'Atma', sans-serif" fill="var(--stamp)">{result}</text>
      )}
    </g>
  )
}
