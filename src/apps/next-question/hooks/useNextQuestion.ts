import { useMemo } from 'react'

import { nextQuestions } from '@/apps/next-question/questions'
import type { NextQuestionState } from '@/apps/next-question/types'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'

const initialNextQuestionState: NextQuestionState = {
  currentIndex: 0,
  isAnswerVisible: false,
}

function normalizeQuestionIndex(index: number, questionCount: number) {
  if (questionCount <= 0) {
    return 0
  }

  const safeIndex = Number.isFinite(index) ? Math.trunc(index) : 0

  return ((safeIndex % questionCount) + questionCount) % questionCount
}

function clampQuestionPosition(position: number, questionCount: number) {
  if (questionCount <= 0) {
    return 0
  }

  const safePosition = Number.isFinite(position) ? Math.trunc(position) : 1

  return Math.min(Math.max(safePosition, 1), questionCount)
}

export function useNextQuestion(stateId = 'default') {
  const session = useAnonymousSession()
  const statePath = useMemo(
    () => firebasePaths.nextQuestionState(stateId),
    [stateId],
  )
  const store = useFirestoreDoc<NextQuestionState>(
    statePath,
    initialNextQuestionState,
  )
  const questionCount = nextQuestions.length
  const currentIndex = normalizeQuestionIndex(
    store.data.currentIndex,
    questionCount,
  )
  const currentQuestion = nextQuestions[currentIndex] ?? null

  const showAnswer = () =>
    store.merge({
      isAnswerVisible: true,
      updatedBy: session.userId,
    })

  const nextQuestion = () => {
    if (questionCount === 0) {
      return Promise.resolve()
    }

    return store.merge({
      currentIndex: normalizeQuestionIndex(currentIndex + 1, questionCount),
      isAnswerVisible: false,
      updatedBy: session.userId,
    })
  }

  const previousQuestion = () => {
    if (questionCount === 0) {
      return Promise.resolve()
    }

    return store.merge({
      currentIndex: normalizeQuestionIndex(currentIndex - 1, questionCount),
      isAnswerVisible: false,
      updatedBy: session.userId,
    })
  }

  const jumpToQuestion = (position: number) => {
    if (questionCount === 0) {
      return Promise.resolve()
    }

    return store.merge({
      currentIndex: clampQuestionPosition(position, questionCount) - 1,
      isAnswerVisible: false,
      updatedBy: session.userId,
    })
  }

  const triggerPrimaryAction = () =>
    store.data.isAnswerVisible ? nextQuestion() : showAnswer()

  return {
    ...store,
    currentIndex,
    currentPosition: questionCount === 0 ? 0 : currentIndex + 1,
    currentQuestion,
    jumpToQuestion,
    nextQuestion,
    previousQuestion,
    questionCount,
    questions: nextQuestions,
    showAnswer,
    triggerPrimaryAction,
  }
}
