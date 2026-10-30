import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { parseQuestionCatalog } from '@/apps/next-question/questions'

import { slimQuestionCatalog } from './questionCatalogPlugin.mjs'

describe('slimQuestionCatalog', () => {
  it('liefert für den realen Katalog exakt dieselben Fragen wie die Quelldatei', () => {
    const rawCatalog = readFileSync(
      new URL('../src/apps/next-question/data/questions.ndjson', import.meta.url),
      'utf8',
    )

    expect(parseQuestionCatalog(slimQuestionCatalog(rawCatalog))).toEqual(
      parseQuestionCatalog(rawCatalog),
    )
  })
})
