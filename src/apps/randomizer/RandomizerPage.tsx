import { useRef, useState } from 'react'
import { Dice5, History } from 'lucide-react'
import { toast } from 'sonner'

import { useRandomizer } from '@/apps/randomizer/hooks/useRandomizer'
import type { RollResult } from '@/apps/randomizer/types'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { AppPage } from '@/apps/shared/components/AppPage'
import { AppResetButton } from '@/apps/shared/components/AppResetButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { PresenterLauncher } from '@/apps/shared/components/Presenter'
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
import { syncErrorMessageKey } from '@/lib/firebase/syncError'

function RandomizerPresenter({
  history,
  lastRoll,
  max,
  min,
}: {
  history: RollResult[]
  lastRoll: number | null
  max: number
  min: number
}) {
  const { t } = useI18n()

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="grid min-h-[28rem] place-items-center rounded-lg border bg-secondary p-6 text-center shadow-sm">
        <div>
          <p className="type-label text-muted-foreground">
            {t('randomizer.lastRoll')}
          </p>
          <div className="type-metric-xl mt-4">
            {lastRoll ?? '-'}
          </div>
          <p className="type-action mt-5 tabular-nums">
            {t('randomizer.range', { max, min })}
          </p>
        </div>
      </section>

      <aside className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <History className="size-5 text-primary" />
          <h2 className="type-section-title">
            {t('common.latestResults')}
          </h2>
        </div>
        <div className="mt-5 grid gap-3">
          {history.length === 0 ? (
            <EmptyState>{t('randomizer.empty')}</EmptyState>
          ) : (
            history.map((rollResult, index) => (
              <div
                key={rollResult.id}
                className="flex items-center justify-between gap-4 rounded-md border bg-background p-4"
              >
                <div className="type-label">
                  {t('randomizer.resultNumber', {
                    number: history.length - index,
                  })}
                </div>
                <div className="type-metric-lg">
                  {rollResult.value}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  )
}

export function RandomizerPage() {
  const { t } = useI18n()
  const { data, updateRange, roll, clearHistory, error } = useRandomizer()
  const [isRolling, setIsRolling] = useState(false)
  const isRollLockedRef = useRef(false)
  const appTitle = t('app.randomizer.title')
  const visibleHistory = data.history.slice(0, 5)

  const handleRoll = () => {
    if (isRollLockedRef.current) {
      return
    }

    isRollLockedRef.current = true
    setIsRolling(true)
    void roll()
      .then((result) => {
        if (!result.ok) toast.error(t('randomizer.error.save'))
      })
      .finally(() => {
        isRollLockedRef.current = false
        setIsRolling(false)
      })
  }

  return (
    <AppPage>
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <AppPageTitle Icon={Dice5} title={appTitle} />
        <PresenterLauncher
          appTitle={appTitle}
          views={[
            {
              id: 'last-roll',
              label: t('randomizer.lastRoll'),
              Icon: Dice5,
              render: () => (
                <RandomizerPresenter
                  history={visibleHistory}
                  lastRoll={data.lastRoll}
                  max={data.max}
                  min={data.min}
                />
              ),
            },
          ]}
        />
      </section>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>{t('common.firebaseError')}</CardTitle>
            <CardDescription>{t(syncErrorMessageKey(error))}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Dice5 className="size-5 text-primary" />
              Generator
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <IftaInput
                  id="min-value"
                  label={t('randomizer.minimum')}
                  type="number"
                  value={data.min}
                  onChange={(event) =>
                    updateRange(Number(event.target.value), data.max)
                  }
                />
              </div>
              <div>
                <IftaInput
                  id="max-value"
                  label={t('randomizer.maximum')}
                  type="number"
                  value={data.max}
                  onChange={(event) =>
                    updateRange(data.min, Number(event.target.value))
                  }
                />
              </div>
            </div>

            <button
              type="button"
              aria-label={
                isRolling
                  ? t('randomizer.action.rolling')
                  : t('randomizer.action.roll')
              }
              className="flex min-h-40 w-full items-center justify-center rounded-lg bg-secondary p-6 text-center transition-colors hover:bg-secondary/80 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none"
              disabled={isRolling}
              onClick={handleRoll}
            >
              <div className="type-metric-xl">
                {data.lastRoll ?? '-'}
              </div>
            </button>

            <Button
              size="lg"
              className="w-full"
              disabled={isRolling}
              onClick={handleRoll}
            >
              <Dice5 />
              {isRolling
                ? t('randomizer.action.rolling')
                : t('randomizer.action.roll')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="size-5 text-primary" />
                {t('common.history')}
              </CardTitle>
              <AppResetButton
                disabled={isRolling}
                title={t('randomizer.resetTitle')}
                description={t('randomizer.resetDescription')}
                onConfirm={clearHistory}
              />
            </div>
          </CardHeader>
          <CardContent>
            {visibleHistory.length === 0 ? (
              <EmptyState className="p-8">
                {t('randomizer.empty')}
              </EmptyState>
            ) : (
              <div className="divide-y">
                {visibleHistory.map((rollResult, index) => (
                  <div
                    key={rollResult.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="type-metric-sm font-medium">
                      {t('randomizer.resultNumber', {
                        number: visibleHistory.length - index,
                      })}
                    </div>
                    <div className="type-metric-sm">
                      {rollResult.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </AppPage>
  )
}
