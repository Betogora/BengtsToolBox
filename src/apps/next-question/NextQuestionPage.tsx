import { type ChangeEvent, useEffect, useState } from 'react'
import {
  ArrowLeft,
  CircleQuestionMark,
  Eye,
  EyeOff,
  Globe2,
  LoaderCircle,
  RefreshCw,
  StepForward,
  TriangleAlert,
} from 'lucide-react'

import { useNextQuestion } from '@/apps/next-question/hooks/useNextQuestion'
import { AppPage } from '@/apps/shared/components/AppPage'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { IftaInput } from '@/components/ui/ifta-field'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const CARD_NUMBER_INPUT_ID = 'next-question-card-number'

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLInputElement && target.id !== CARD_NUMBER_INPUT_ID)
  )
}

export function NextQuestionPage() {
  const { t } = useI18n()
  const {
    catalogError,
    currentPosition,
    currentQuestion,
    data,
    error,
    isCatalogLoading,
    isLoading,
    jumpToQuestion,
    previousQuestion,
    questionCount,
    retryCatalog,
    triggerPrimaryAction,
  } = useNextQuestion()
  const isAnswerVisible = data.isAnswerVisible
  const [cardNumberDraft, setCardNumberDraft] = useState<string | null>(null)
  const cardNumberInput =
    cardNumberDraft ?? (questionCount === 0 ? '' : String(currentPosition))

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        questionCount === 0 ||
        isEditableElement(event.target)
      ) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setCardNumberDraft(null)
        void previousQuestion()
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setCardNumberDraft(null)
        void triggerPrimaryAction()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [previousQuestion, questionCount, triggerPrimaryAction])

  const handleCardNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.currentTarget.value

    setCardNumberDraft(nextValue)

    const nextPosition = Number(nextValue)

    if (Number.isFinite(nextPosition)) {
      void jumpToQuestion(nextPosition)
    }
  }

  return (
    <AppPage>
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <AppPageTitle Icon={StepForward} title={t('app.nextQuestion.title')} />
      </section>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>{t('common.firebaseError')}</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card aria-busy={isCatalogLoading} className="overflow-hidden">
        {isCatalogLoading ? (
          <CardHeader
            aria-live="polite"
            className="min-h-[24rem] place-content-center justify-items-center gap-3 text-center"
            role="status"
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-8 animate-spin text-primary"
            />
            <CardTitle>{t('nextQuestion.loadingTitle')}</CardTitle>
            <CardDescription>
              {t('nextQuestion.loadingDescription')}
            </CardDescription>
          </CardHeader>
        ) : catalogError ? (
          <CardHeader
            className="min-h-[24rem] place-content-center justify-items-center gap-3 text-center"
            role="alert"
          >
            <TriangleAlert
              aria-hidden="true"
              className="size-8 text-destructive"
            />
            <CardTitle>{t('nextQuestion.loadErrorTitle')}</CardTitle>
            <CardDescription>
              {t('nextQuestion.loadErrorDescription')}
            </CardDescription>
            <p className="type-caption max-w-xl text-muted-foreground">
              {catalogError.message}
            </p>
            <Button className="mt-2" type="button" onClick={retryCatalog}>
              <RefreshCw aria-hidden="true" className="size-4" />
              {t('nextQuestion.retry')}
            </Button>
          </CardHeader>
        ) : (
          <CardContent className="grid gap-7 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <span className="type-label inline-flex min-w-0 items-center gap-2 rounded-md bg-secondary px-3 py-2 text-primary">
              <Globe2 className="size-4 shrink-0" />
              <span className="truncate">
                {currentQuestion?.category ?? t('nextQuestion.categoryFallback')}
              </span>
            </span>

            <div className="flex w-full items-start gap-2 sm:w-auto">
              <div className="min-w-0 flex-1 sm:w-36 sm:flex-none">
                <IftaInput
                  id={CARD_NUMBER_INPUT_ID}
                  className="pb-2 pt-[1.125rem] leading-5 tabular-nums"
                  disabled={questionCount === 0}
                  inputMode="numeric"
                  label={t('nextQuestion.cardNumber')}
                  max={questionCount || undefined}
                  min={1}
                  pattern="[0-9]*"
                  step={1}
                  type="number"
                  value={cardNumberInput}
                  onBlur={() => setCardNumberDraft(null)}
                  onChange={handleCardNumberChange}
                  onFocus={(event) => {
                    setCardNumberDraft(event.currentTarget.value)
                    event.currentTarget.select()
                  }}
                />
              </div>
              <span className="type-control flex h-11 shrink-0 items-end pb-2 leading-5 tabular-nums text-muted-foreground">
                / {questionCount}
              </span>
            </div>
          </div>

          {currentQuestion ? (
            <section className="relative mx-auto w-full max-w-3xl px-2 pb-5 sm:px-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-7 top-8 h-full rounded-lg border bg-card opacity-60 shadow-[0_14px_38px_-32px_rgba(6,52,79,0.55)] sm:inset-x-12"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-4 top-4 h-full rounded-lg border bg-card opacity-80 shadow-[0_14px_38px_-32px_rgba(6,52,79,0.55)] sm:inset-x-9"
              />

              <div className="relative min-h-[21rem] overflow-hidden rounded-lg border bg-card p-6 shadow-[0_20px_56px_-38px_rgba(6,52,79,0.72)] sm:p-8">
                <CircleQuestionMark
                  aria-hidden="true"
                  className="pointer-events-none absolute right-6 top-24 size-28 text-secondary opacity-40 sm:right-8 sm:top-20 sm:size-36 sm:opacity-60"
                />
                <div className="relative grid min-h-[17rem] content-between gap-8">
                  <div>
                    <h2 className="type-page-title max-w-2xl break-words sm:pr-32">
                      {currentQuestion.question}
                    </h2>
                  </div>

                  <div
                    aria-live="polite"
                    className={cn(
                      'min-h-24 rounded-md border border-dashed bg-background px-5 py-4 sm:px-6 sm:py-5',
                      isAnswerVisible
                        ? 'border-primary/40 bg-secondary/55'
                        : 'text-muted-foreground',
                    )}
                  >
                    {isAnswerVisible ? (
                      <div className="grid gap-2">
                        <p className="type-label text-primary">
                          {t('nextQuestion.answer')}
                        </p>
                        <p className="type-card-title text-foreground sm:text-xl sm:leading-8">
                          {currentQuestion.answer}
                        </p>
                      </div>
                    ) : (
                      <div className="type-card-title flex min-h-12 items-center justify-center gap-2 text-center">
                        <EyeOff className="size-4" />
                        {t('nextQuestion.answerHidden')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <EmptyState className="mx-auto w-full max-w-3xl p-8">
              {t('nextQuestion.empty')}
            </EmptyState>
          )}

          <div className="relative z-20 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              className="w-full sm:w-auto"
              disabled={questionCount === 0}
              type="button"
              variant="outline"
              onClick={previousQuestion}
            >
              <ArrowLeft className="size-4" />
              {t('nextQuestion.previous')}
            </Button>

            <Button
              className="w-full sm:w-auto sm:min-w-52"
              disabled={questionCount === 0}
              type="button"
              onClick={triggerPrimaryAction}
            >
              {isAnswerVisible ? (
                <>
                  <StepForward className="size-4" />
                  {t('nextQuestion.next')}
                </>
              ) : (
                <>
                  <Eye className="size-4" />
                  {t('nextQuestion.showAnswer')}
                </>
              )}
            </Button>
          </div>

          {isLoading && (
            <p className="type-caption text-center text-muted-foreground">
              {t('common.syncing')}
            </p>
          )}
          </CardContent>
        )}
      </Card>
    </AppPage>
  )
}
