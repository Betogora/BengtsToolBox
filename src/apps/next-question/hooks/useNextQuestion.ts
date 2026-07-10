import { useCallback, useEffect, useMemo, useState } from 'react'

import { loadQuestionCatalog } from '@/apps/next-question/questions'
import type {
  NextQuestion,
  NextQuestionState,
} from '@/apps/next-question/types'
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
  const [questions, setQuestions] = useState<readonly NextQuestion[]>([])
  const [isCatalogLoading, setIsCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<Error | null>(null)
  const [catalogLoadAttempt, setCatalogLoadAttempt] = useState(0)
  const statePath = useMemo(
    () => firebasePaths.nextQuestionState(stateId),
    [stateId],
  )
  const store = useFirestoreDoc<NextQuestionState>(
    statePath,
    initialNextQuestionState,
  )
  const questionCount = questions.length
  const currentIndex = normalizeQuestionIndex(
    store.data.currentIndex,
    questionCount,
  )
  const currentQuestion = questions[currentIndex] ?? null

  useEffect(() => {
    let isActive = true

    void loadQuestionCatalog().then(
      (loadedQuestions) => {
        if (!isActive) {
          return
        }

        setQuestions(loadedQuestions)
        setIsCatalogLoading(false)
      },
      (loadError: unknown) => {
        if (!isActive) {
          return
        }

        setCatalogError(
          loadError instanceof Error
            ? loadError
            : new Error('Fragenkatalog konnte nicht geladen werden.'),
        )
        setIsCatalogLoading(false)
      },
    )

    return () => {
      isActive = false
    }
  }, [catalogLoadAttempt])

  const retryCatalog = useCallback(() => {
    setIsCatalogLoading(true)
    setCatalogError(null)
    setCatalogLoadAttempt((attempt) => attempt + 1)
  }, [])

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
    catalogError,
    currentIndex,
    currentPosition: questionCount === 0 ? 0 : currentIndex + 1,
    currentQuestion,
    isCatalogLoading,
    jumpToQuestion,
    nextQuestion,
    previousQuestion,
    questionCount,
    retryCatalog,
    showAnswer,
    triggerPrimaryAction,
  }
}
