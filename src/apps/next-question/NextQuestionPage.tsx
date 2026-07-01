import {
  ArrowLeft,
  CircleQuestionMark,
  Eye,
  EyeOff,
  Globe2,
  StepForward,
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
import { cn } from '@/lib/utils'

const MAX_DOT_COUNT = 12

function ProgressIndicator({
  currentIndex,
  currentPosition,
  questionCount,
}: {
  currentIndex: number
  currentPosition: number
  questionCount: number
}) {
  if (questionCount <= 0) {
    return null
  }

  if (questionCount <= MAX_DOT_COUNT) {
    return (
      <div
        aria-label={`Frage ${currentPosition} von ${questionCount}`}
        className="flex items-center justify-center gap-2"
      >
        {Array.from({ length: questionCount }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={cn(
              'size-2 rounded-full bg-muted-foreground/35 transition-colors',
              index === currentIndex && 'bg-primary',
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      aria-label={`Frage ${currentPosition} von ${questionCount}`}
      className="mx-auto grid w-full max-w-xs gap-2"
    >
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${(currentPosition / questionCount) * 100}%` }}
        />
      </div>
      <div className="type-caption text-center text-muted-foreground">
        {currentPosition} / {questionCount}
      </div>
    </div>
  )
}

export function NextQuestionPage() {
  const {
    currentIndex,
    currentPosition,
    currentQuestion,
    data,
    error,
    isLoading,
    previousQuestion,
    questionCount,
    triggerPrimaryAction,
  } = useNextQuestion()
  const isAnswerVisible = data.isAnswerVisible

  return (
    <AppPage>
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <AppPageTitle Icon={CircleQuestionMark} title="Nächste Frage" />
      </section>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Firebase-Fehler</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardContent className="grid gap-7 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <span className="type-label inline-flex min-w-0 items-center gap-2 rounded-md bg-secondary px-3 py-2 text-primary">
              <Globe2 className="size-4 shrink-0" />
              <span className="truncate">
                {currentQuestion?.category ?? 'Fragenliste'}
              </span>
            </span>

            <span className="type-action shrink-0 tabular-nums">
              {currentPosition}
              <span className="text-muted-foreground"> / {questionCount}</span>
            </span>
          </div>

          {currentQuestion ? (
            <section className="relative mx-auto w-full max-w-3xl px-2 pb-5 sm:px-7">
              <div
                aria-hidden="true"
                className="absolute inset-x-7 top-8 h-full rounded-lg border bg-card opacity-60 shadow-[0_14px_38px_-32px_rgba(6,52,79,0.55)] sm:inset-x-12"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-4 top-4 h-full rounded-lg border bg-card opacity-80 shadow-[0_14px_38px_-32px_rgba(6,52,79,0.55)] sm:inset-x-9"
              />

              <div className="relative min-h-[21rem] overflow-hidden rounded-lg border bg-card p-6 shadow-[0_20px_56px_-38px_rgba(6,52,79,0.72)] sm:p-8">
                <CircleQuestionMark
                  aria-hidden="true"
                  className="absolute right-8 top-20 size-28 text-secondary opacity-60 sm:size-36"
                />
                <div className="relative grid min-h-[17rem] content-between gap-7">
                  <div>
                    <p className="type-label text-muted-foreground">
                      Frage {currentPosition}
                    </p>
                    <h2 className="type-section-title mt-5 max-w-2xl break-words">
                      {currentQuestion.question}
                    </h2>
                  </div>

                  <div
                    aria-live="polite"
                    className={cn(
                      'min-h-16 rounded-md border border-dashed bg-background px-4 py-3',
                      isAnswerVisible
                        ? 'border-primary/40 bg-secondary/55'
                        : 'text-muted-foreground',
                    )}
                  >
                    {isAnswerVisible ? (
                      <div className="grid gap-1">
                        <p className="type-label text-primary">Antwort</p>
                        <p className="type-ui text-foreground">
                          {currentQuestion.answer}
                        </p>
                      </div>
                    ) : (
                      <div className="type-action flex min-h-9 items-center justify-center gap-2 text-center">
                        <EyeOff className="size-4" />
                        Antwort ist noch verborgen
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <EmptyState className="mx-auto w-full max-w-3xl p-8">
              Noch keine Fragen vorhanden.
            </EmptyState>
          )}

          <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
            <Button
              className="w-full md:w-auto"
              disabled={questionCount === 0}
              type="button"
              variant="outline"
              onClick={previousQuestion}
            >
              <ArrowLeft className="size-4" />
              Zurück
            </Button>

            <ProgressIndicator
              currentIndex={currentIndex}
              currentPosition={currentPosition}
              questionCount={questionCount}
            />

            <Button
              className="w-full md:w-auto md:min-w-52"
              disabled={questionCount === 0}
              type="button"
              onClick={triggerPrimaryAction}
            >
              {isAnswerVisible ? (
                <>
                  <StepForward className="size-4" />
                  Nächste Frage
                </>
              ) : (
                <>
                  <Eye className="size-4" />
                  Antwort anzeigen
                </>
              )}
            </Button>
          </div>

          {isLoading && (
            <p className="type-caption text-center text-muted-foreground">
              Synchronisiere...
            </p>
          )}
        </CardContent>
      </Card>
    </AppPage>
  )
}
