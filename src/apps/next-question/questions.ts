import type { NextQuestion } from '@/apps/next-question/types'

import rawQuestions from './data/questions.ndjson?raw'

function parseQuestionLine(line: string, index: number): NextQuestion {
  const parsed = JSON.parse(line) as Partial<NextQuestion>

  if (!parsed.id || !parsed.category || !parsed.question || !parsed.answer) {
    throw new Error(`Ungültige Frage in Zeile ${index + 1}`)
  }

  return {
    id: parsed.id,
    category: parsed.category,
    question: parsed.question,
    answer: parsed.answer,
  }
}

export const nextQuestions: readonly NextQuestion[] = rawQuestions
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map(parseQuestionLine)
