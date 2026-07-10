import { afterEach, describe, expect, it, vi } from 'vitest'

import { parseQuestionCatalog } from '@/apps/next-question/questions'

import rawQuestionCatalog from './data/questions.ndjson?raw'

const validQuestion = {
  id: 'question-1',
  category: 'Kategorie',
  question: 'Wie lautet die Frage?',
  answer: 'So lautet die Antwort.',
}

async function importFreshLoader() {
  vi.resetModules()

  return import('@/apps/next-question/questions')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseQuestionCatalog', () => {
  it('behält die Reihenfolge bei, ignoriert Leerzeilen und reduziert Zusatzfelder', () => {
    const secondQuestion = {
      ...validQuestion,
      id: 'question-2',
      question: 'Und die zweite Frage?',
      source: { file: 'source.txt' },
    }
    const catalog = parseQuestionCatalog(
      `\n${JSON.stringify(validQuestion)}\r\n  \n${JSON.stringify(secondQuestion)}\n`,
    )

    expect(catalog).toEqual([
      validQuestion,
      {
        id: secondQuestion.id,
        category: secondQuestion.category,
        question: secondQuestion.question,
        answer: secondQuestion.answer,
      },
    ])
  })

  it('verwirft ungültiges JSON mit der betroffenen Zeilennummer', () => {
    expect(() =>
      parseQuestionCatalog(`\n${JSON.stringify(validQuestion)}\n\nkein-json`),
    ).toThrow('Ungültige Frage in Zeile 4')
  })

  it('verwirft einen Datensatz mit fehlendem Pflichtfeld', () => {
    const incompleteQuestion = {
      id: validQuestion.id,
      category: validQuestion.category,
      question: validQuestion.question,
    }

    expect(() =>
      parseQuestionCatalog(JSON.stringify(incompleteQuestion)),
    ).toThrow('Ungültige Frage in Zeile 1')
  })

  it('liest den realen Katalog vollständig und in unveränderter Reihenfolge', () => {
    const catalog = parseQuestionCatalog(rawQuestionCatalog)

    expect(catalog).toHaveLength(5_044)
    expect(catalog[0]?.id).toBe('gefragt-gejagt-2019-0001')
    expect(catalog.at(-1)?.id).toBe('gefragt-gejagt-2020-5044')
  })
})

describe('loadQuestionCatalog', () => {
  it('teilt parallele Aufrufe und verwendet den Browser-Cache', async () => {
    let resolveResponse: ((response: Response) => void) | undefined
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve
    })
    const fetchMock = vi.fn(() => responsePromise)
    vi.stubGlobal('fetch', fetchMock)
    const { loadQuestionCatalog } = await importFreshLoader()

    const firstLoad = loadQuestionCatalog()
    const secondLoad = loadQuestionCatalog()

    expect(firstLoad).toBe(secondLoad)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), {
      cache: 'force-cache',
    })

    resolveResponse?.(
      new Response(JSON.stringify(validQuestion), { status: 200 }),
    )

    await expect(firstLoad).resolves.toEqual([validQuestion])
  })

  it('meldet HTTP-Fehler', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response('', { status: 503 })),
      ),
    )
    const { loadQuestionCatalog } = await importFreshLoader()

    await expect(loadQuestionCatalog()).rejects.toThrow('HTTP 503')
  })

  it('kann nach einem fehlgeschlagenen Abruf erneut laden', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(validQuestion), { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const { loadQuestionCatalog } = await importFreshLoader()

    await expect(loadQuestionCatalog()).rejects.toThrow(
      'Fragenkatalog konnte nicht abgerufen werden.',
    )
    await expect(loadQuestionCatalog()).resolves.toEqual([validQuestion])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
