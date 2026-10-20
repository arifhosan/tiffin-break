import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ITEM_ART } from './items'

it('the khata label carries the name; every item draws something', () => {
  const html = renderToStaticMarkup(<svg>{ITEM_ART.notebook({ name: 'Rafi' })}</svg>)
  expect(html).toContain('Rafi')
  expect(html).toContain('নাম')
  for (const draw of Object.values(ITEM_ART)) expect(renderToStaticMarkup(<svg>{draw({ name: '' })}</svg>).length).toBeGreaterThan(40)
  const books = renderToStaticMarkup(<svg>{ITEM_ART.bookBangla({ name: '' })}{ITEM_ART.bookMath({ name: '' })}{ITEM_ART.bookEnglish({ name: '' })}</svg>)
  for (const t of ['বাংলা', 'গণিত', 'English']) expect(books).toContain(t)
})
