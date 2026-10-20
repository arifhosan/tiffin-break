import type { ReactElement, ReactNode } from 'react'
import type { ItemId } from '../storage'
import { strings } from '../strings'

// Every item is drawn top-down, centred on (0,0), in bench units. Our own drawings: no brands, no NCTB art.
type Art = (p: { name: string }) => ReactElement

const LATIN = "'Patrick Hand', 'Atma', sans-serif"
const BN = "'Atma', 'Patrick Hand', sans-serif"

/** Shared gradients; render once inside the bench <defs>. */
export const ItemDefs = () => (
  <>
    <linearGradient id="tb-steel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="var(--steel-hi)" />
      <stop offset="0.45" stopColor="var(--steel)" />
      <stop offset="0.55" stopColor="var(--steel-hi)" />
      <stop offset="1" stopColor="var(--steel-lo)" />
    </linearGradient>
    <radialGradient id="tb-steel-round" cx="0.38" cy="0.35" r="0.7">
      <stop offset="0" stopColor="var(--steel-hi)" />
      <stop offset="0.6" stopColor="var(--steel)" />
      <stop offset="1" stopColor="var(--steel-lo)" />
    </radialGradient>
  </>
)

export const Notebook: Art = ({ name }) => (
  <g>
    <rect x={-101} y={-136} width={210} height={278} rx={3} fill="var(--book-pages)" />
    <rect x={-105} y={-140} width={210} height={280} rx={3} fill="var(--kraft)" stroke="var(--kraft-dark)" />
    <rect x={-105} y={-140} width={16} height={280} fill="var(--kraft-dark)" opacity={0.5} />
    <line x1={-97} x2={-97} y1={-128} y2={128} stroke="var(--label)" strokeWidth={1.6} strokeDasharray="7 11" opacity={0.85} />
    {[-96, -61, -12, 34, 77, 112].map((y, i) => (
      <path key={y} d={`M${-70 + i * 9},${y} q20,-3 ${44 - i * 4},2`} stroke="var(--kraft-dark)" strokeWidth={0.8} fill="none" opacity={0.5} />
    ))}
    <rect x={-78} y={-118} width={168} height={236} fill="none" stroke="var(--kraft-dark)" strokeWidth={1.4} />
    <rect x={-60} y={-34} width={136} height={96} rx={6} fill="var(--label)" stroke="var(--ink)" strokeWidth={1.2} />
    <rect x={-55} y={-29} width={126} height={86} rx={4} fill="none" stroke="var(--ink)" strokeWidth={0.6} />
    {[strings.cover.name, strings.cover.class, strings.cover.roll].map((t, i) => (
      <g key={t}>
        <text x={-48} y={-7 + i * 26} fontSize={12} fontFamily={BN} fill="var(--ink-black)">{t}:</text>
        <line x1={-12} x2={64} y1={-4 + i * 26} y2={-4 + i * 26} stroke="var(--ink-black)" strokeWidth={0.8} strokeDasharray="1.5 2.5" />
      </g>
    ))}
    {name && (
      <text x={-10} y={-8} fontSize={17} fontFamily={LATIN} fill="var(--ink)" transform="rotate(-2)"
        {...(name.length > 9 ? { textLength: 74, lengthAdjust: 'spacingAndGlyphs' } : {})}>
        {name}
      </text>
    )}
  </g>
)

function Book({ title, tone, latin, children }: { title: string; tone: string; latin?: boolean; children: ReactNode }) {
  return (
    <g>
      <rect x={-71} y={-98} width={150} height={204} rx={2} fill="var(--book-pages)" />
      <rect x={-75} y={-102} width={150} height={204} rx={2} fill={tone} />
      <rect x={-75} y={-102} width={11} height={204} fill="var(--shade)" />
      <rect x={-57} y={-91} width={122} height={182} fill="none" stroke="var(--book-panel)" strokeWidth={2} />
      <text x={4} y={-56} textAnchor="middle" fontSize={latin ? 30 : 32} fontFamily={latin ? LATIN : BN} fill="var(--book-panel)">{title}</text>
      <rect x={-47} y={-42} width={102} height={92} fill="var(--book-panel)" />
      {children}
      <text x={4} y={76} textAnchor="middle" fontSize={13} fontFamily={BN} fill="var(--book-panel)">{strings.art.grade}</text>
    </g>
  )
}

// Village river scene.
export const BookBangla: Art = () => (
  <Book title={strings.art.bookBangla} tone="var(--book-bangla)">
    <circle cx={32} cy={-22} r={9} fill="var(--sun)" />
    <path d="M-47,10 q25,-12 50,-4 t52,-6 V50 H-47Z" fill="var(--book-bangla)" opacity={0.75} />
    <path d="M-47,28 q26,-6 51,0 t51,-2 V42 q-25,4 -51,0 t-51,2Z" fill="var(--river)" />
    <path d="M-10,30 h26 l-5,6 h-16Z" fill="var(--ink-black)" />
    <path d="M3,30 V12 l11,15Z" fill="var(--book-panel)" stroke="var(--ink-black)" strokeWidth={0.8} />
  </Book>
)

// Shapes and a ruler.
export const BookMath: Art = () => (
  <Book title={strings.art.bookMath} tone="var(--book-math)">
    <g fill="none" stroke="var(--book-math)" strokeWidth={2.2}>
      <path d="M-36,36 L-10,-30 L16,36Z" />
      <circle cx={34} cy={-12} r={14} />
      <rect x={20} y={14} width={26} height={26} />
    </g>
    <path d="M-40,44 H48" stroke="var(--ink-black)" strokeWidth={1} />
    {Array.from({ length: 12 }, (_, i) => (
      <line key={i} x1={-40 + i * 8} x2={-40 + i * 8} y1={44} y2={i % 2 ? 41 : 39} stroke="var(--ink-black)" strokeWidth={0.8} />
    ))}
  </Book>
)

// A globe.
export const BookEnglish: Art = () => (
  <Book title={strings.art.bookEnglish} tone="var(--book-english)" latin>
    <g fill="none" stroke="var(--book-english)" strokeWidth={1.8}>
      <circle cx={4} cy={4} r={34} />
      <ellipse cx={4} cy={4} rx={14} ry={34} />
      <path d="M-30,4 H38 M-25,-14 H33 M-25,22 H33 M4,-30 V38" />
    </g>
    <path d="M-12,-14 q8,-10 18,-4 q4,10 -6,14 q-10,4 -12,-10Z M14,10 q10,-2 12,8 q-6,10 -14,2Z" fill="var(--book-bangla)" opacity={0.7} />
  </Book>
)

// Ballpoint: blue cap with clip, see-through barrel with a refill.
export const Pen: Art = () => (
  <g>
    <rect x={-18} y={-88} width={36} height={176} fill="transparent" /> {/* finger-sized hit area */}
    <rect x={-6} y={-40} width={12} height={106} rx={4} fill="var(--pen-barrel)" stroke="var(--plastic-edge)" strokeWidth={0.8} />
    <line x1={0} x2={0} y1={-36} y2={64} stroke="var(--ink)" strokeWidth={2.4} />
    {[46, 51, 56, 61].map((y) => <line key={y} x1={-6} x2={6} y1={y} y2={y} stroke="var(--plastic-edge)" strokeWidth={0.8} />)}
    <path d="M-6,66 L-1.6,82 H1.6 L6,66Z" fill="var(--pen-barrel)" stroke="var(--plastic-edge)" strokeWidth={0.8} />
    <circle cx={0} cy={83} r={1.4} fill="var(--steel-lo)" />
    <g className="cap">
      <rect x={-7} y={-84} width={14} height={48} rx={6} fill="var(--ink)" />
      <rect x={4} y={-80} width={4} height={38} rx={2} fill="var(--ink-dark)" />
    </g>
  </g>
)

// Yellow hexagonal pencil, sharpened, with a ferrule and rubber.
export const Pencil: Art = () => (
  <g>
    <rect x={-18} y={-90} width={36} height={168} fill="transparent" /> {/* finger-sized hit area */}
    <rect x={-6} y={-60} width={12} height={112} fill="var(--pencil)" />
    <rect x={-2} y={-60} width={4} height={112} fill="var(--pencil-light)" />
    <rect x={3.5} y={-60} width={2.5} height={112} fill="var(--pencil-dark)" />
    <path d="M-6,52 L0,74 L6,52Z" fill="var(--pencil-wood)" />
    <path d="M-2,66.5 L0,74 L2,66.5Z" fill="var(--graphite)" />
    <rect x={-6.5} y={-73} width={13} height={14} fill="var(--steel)" stroke="var(--steel-lo)" strokeWidth={0.6} />
    <path d="M-6.5,-69 H6.5 M-6.5,-63 H6.5" stroke="var(--steel-lo)" strokeWidth={0.8} />
    <rect x={-6} y={-86} width={12} height={14} rx={3} fill="var(--rubber)" />
  </g>
)

// Plain rubber eraser in a paper sleeve, one corner worn.
export const Eraser: Art = () => (
  <g>
    <rect x={-40} y={-28} width={80} height={56} fill="transparent" /> {/* finger-sized hit area */}
    <path d="M-24,-17 H28 a5,5 0 0 1 5,5 V12 a5,5 0 0 1 -5,5 H-28 a5,5 0 0 1 -5,-5 V-8 Q-31,-17 -24,-17Z" fill="var(--eraser)" stroke="var(--plastic-edge)" strokeWidth={0.6} />
    <rect x={-10} y={-18} width={32} height={36} fill="var(--eraser-sleeve)" />
    <path d="M-10,-6 H22 M-10,6 H22" stroke="var(--label)" strokeWidth={1.4} opacity={0.8} />
  </g>
)

// Metal geometry box lid with a painted protractor and ruler.
export const Geometry: Art = () => (
  <g>
    <rect x={-95} y={-48} width={190} height={96} rx={8} fill="url(#tb-steel)" stroke="var(--steel-lo)" />
    <rect x={-88} y={-41} width={176} height={82} rx={5} fill="none" stroke="var(--steel-hi)" strokeWidth={1.5} />
    <rect x={-60} y={-52} width={18} height={6} rx={2} fill="var(--steel-lo)" />
    <rect x={42} y={-52} width={18} height={6} rx={2} fill="var(--steel-lo)" />
    <g stroke="var(--ink)" fill="none" strokeWidth={1.6}>
      <path d="M-74,26 a32,32 0 0 1 64,0Z" />
      <path d="M-58,26 a16,16 0 0 1 32,0" />
      <rect x={4} y={-22} width={74} height={16} />
    </g>
    {Array.from({ length: 9 }, (_, i) => (
      <line key={i} x1={8 + i * 8.5} x2={8 + i * 8.5} y1={-22} y2={i % 2 ? -17 : -14} stroke="var(--ink)" strokeWidth={1} />
    ))}
    {[-60, -30, 0, 30, 60].map((a) => (
      <line key={a} x1={-42} y1={26} x2={-42 + 32 * Math.sin((a * Math.PI) / 180)} y2={26 - 32 * Math.cos((a * Math.PI) / 180)} stroke="var(--ink)" strokeWidth={0.6} />
    ))}
  </g>
)

// Round steel tiffin carrier from above: lid rings, wire handle, side clips.
export const Tiffin: Art = () => (
  <g>
    <rect x={-74} y={-10} width={14} height={20} rx={3} fill="var(--steel-lo)" />
    <rect x={60} y={-10} width={14} height={20} rx={3} fill="var(--steel-lo)" />
    <circle r={64} fill="url(#tb-steel-round)" stroke="var(--steel-lo)" />
    <circle r={56} fill="none" stroke="var(--steel-hi)" strokeWidth={2} />
    <circle r={42} fill="none" stroke="var(--steel-lo)" strokeWidth={1} opacity={0.6} />
    <path d="M-36,-40 a54,54 0 0 1 40,-14" stroke="var(--steel-hi)" strokeWidth={4} fill="none" strokeLinecap="round" />
    <path d="M-68,0 C-40,-10 40,-10 68,0" stroke="var(--steel-lo)" strokeWidth={6} fill="none" strokeLinecap="round" />
    <path d="M-66,-2 C-40,-11 40,-11 66,-2" stroke="var(--steel-hi)" strokeWidth={1.5} fill="none" />
    <circle cx={0} cy={-7.5} r={6} fill="var(--steel)" stroke="var(--steel-lo)" />
  </g>
)

export const ITEM_ART: Record<ItemId, Art> = {
  notebook: Notebook,
  bookBangla: BookBangla,
  bookMath: BookMath,
  bookEnglish: BookEnglish,
  pen: Pen,
  pencil: Pencil,
  eraser: Eraser,
  geometry: Geometry,
  tiffin: Tiffin,
}
