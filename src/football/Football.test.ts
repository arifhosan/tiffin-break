import { expect, it } from 'vitest'
import { aim, tally } from './Football'
import { MAX_LEN } from './rules'

it('slingshot: opposite the drag, 0-120 screen px -> 20-133 units, short drags cancel', () => {
  // scale = screen px per page unit; a drag of 60 units at scale 1 is 60 px -> halfway
  const a = aim({ x: -60, y: 0 }, 1)!
  expect(a.angle).toBeCloseTo(0)
  expect(a.length).toBeCloseTo(76.5)
  // dragging down sends the line up; at scale 0.5 a 240-unit drag is the full 120 px
  const b = aim({ x: 0, y: 240 }, 0.5)!
  expect(b.angle).toBeCloseTo(-Math.PI / 2)
  expect(b.length).toBeCloseTo(133)
  expect(aim({ x: 1000, y: 0 }, 1)!.length).toBe(MAX_LEN) // clamped at 120 px
  expect(aim({ x: 7, y: 0 }, 1)).toBeNull() // under 8 px: cancelled
  expect(aim({ x: 10, y: 0 }, 0.5)).toBeNull() // 5 px on a small screen
  expect(aim({ x: 8, y: 0 }, 1)!.length).toBeCloseTo(20 + 113 * (8 / 120))
})

it('tally: the line about to be drawn', () => {
  expect([0, 1, 2, 3, 4].map(tally)).toEqual(['১/৫', '২/৫', '৩/৫', '৪/৫', '৫/৫'])
})
