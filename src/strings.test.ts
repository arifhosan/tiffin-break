import { expect, it } from 'vitest'
import { bn } from './strings'

it('bn converts digits', () => {
  expect(bn(2014)).toBe('২০১৪')
  expect(bn(-3)).toBe('-৩')
  expect(bn(2.5)).toBe('২.৫')
})
