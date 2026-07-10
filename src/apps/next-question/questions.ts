import type { NextQuestion } from '@/apps/next-question/types'

import questionCatalogUrl from './data/questions.ndjson?url'

let questionCatalogPromise: Promise<readonly NextQuestion[]> | null = null

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function parseQuestionLine(line: string, index: number): NextQuestion {
  let parsed: unknown

  try {
    parsed = JSON.parse(line)
  } catch (cause) {
    throw new Error(`Ungültige Frage in Zeile ${index + 1}`, { cause })
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('id' in parsed) ||
    !isNonEmptyString(parsed.id) ||
    !('category' in parsed) ||
    !isNonEmptyString(parsed.category) ||
    !('question' in parsed) ||
    !isNonEmptyString(parsed.question) ||
    !('answer' in parsed) ||
    !isNonEmptyString(parsed.answer)
  ) {
    throw new Error(`Ungültige Frage in Zeile ${index + 1}`)
  }

  return {
    id: parsed.id,
    category: parsed.category,
    question: parsed.question,
    answer: parsed.answer,
  }
}

export function parseQuestionCatalog(rawCatalog: string) {
  return rawCatalog
    .split(/\r?\n/)
    .map((line, index) => ({ index, line: line.trim() }))
    .filter(({ line }) => line.length > 0)
    .map(({ index, line }) => parseQuestionLine(line, index))
}

async function fetchQuestionCatalog() {
  let response: Response

  try {
    response = await fetch(questionCatalogUrl, { cache: 'force-cache' })
  } catch (cause) {
    throw new Error('Fragenkatalog konnte nicht abgerufen werden.', { cause })
  }

  if (!response.ok) {
    throw new Error(
      `Fragenkatalog konnte nicht geladen werden (HTTP ${response.status}).`,
    )
  }

  return parseQuestionCatalog(await response.text())
}

export function loadQuestionCatalog() {
  if (!questionCatalogPromise) {
    questionCatalogPromise = fetchQuestionCatalog().catch((error: unknown) => {
      questionCatalogPromise = null

      throw error instanceof Error
        ? error
        : new Error('Fragenkatalog konnte nicht geladen werden.')
    })
  }

  return questionCatalogPromise
}
