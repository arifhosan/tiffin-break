import { expect, it } from 'vitest'
import { initialOf } from './name'

it('initialOf', () => {
  expect(initialOf('rafi')).toBe('R')
  expect(initialOf('রাফি')).toBe('Y')
  expect(initialOf('')).toBe('Y')
  expect(initialOf('  9ab')).toBe('A')
})
