import { useEffect, useRef, useState } from 'react'
import { Coins, History } from 'lucide-react'
import { toast } from 'sonner'

import {
  coinFlipSettleDelayMs,
  getCoinFaceRotation,
  getCoinFlipRotationDegrees,
  normalizeCoinRotation,
} from '@/apps/coinflip/coin'
import { CoinGraphic } from '@/apps/coinflip/components/CoinGraphic'
import {
  getCoinflipLabelKey,
  useCoinflip,
} from '@/apps/coinflip/hooks/useCoinflip'
import type { CoinflipResult } from '@/apps/coinflip/types'
import { AppPage } from '@/apps/shared/components/AppPage'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
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
import { useI18n } from '@/lib/i18n'

function CoinflipPresenter({
  history,
  lastFlip,
}: {
  history: CoinflipResult[]
  lastFlip: CoinflipResult | null
}) {
  const { t } = useI18n()
  const presenterSide = lastFlip?.side ?? null
  const presenterRotation = getCoinFaceRotation(presenterSide ?? 'heads')

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="grid min-h-[28rem] place-items-center rounded-lg border bg-secondary p-6 text-center shadow-sm">
        <div className="grid gap-5">
          <CoinGraphic
            className="max-w-[20rem]"
            side={presenterSide}
            rotation={presenterRotation}
            isFlipping={false}
          />
          <p className="type-label text-muted-foreground">
            {t('coinflip.lastFlip')}
          </p>
          <div className="type-metric-xl mt-4">
            {lastFlip ? t(getCoinflipLabelKey(lastFlip.side)) : '-'}
          </div>
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
            <EmptyState>{t('coinflip.empty')}</EmptyState>
          ) : (
            history.map((flipResult, index) => (
              <div
                key={flipResult.id}
                className="flex items-center justify-between gap-4 rounded-md border bg-background p-4"
              >
                <div className="type-label">
                  {t('coinflip.resultNumber', { number: history.length - index })}
                </div>
                <div className="type-metric-md">
                  {t(getCoinflipLabelKey(flipResult.side))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  )
}

export function CoinflipPage() {
  const { t } = useI18n()
  const {
    clearHistory,
    commitFlipResult,
    data,
    error,
    isLoading,
    prepareFlipResult,
  } = useCoinflip()
  const [coinRotation, setCoinRotation] = useState(() =>
    getCoinFaceRotation('heads'),
  )
  const [isFlipping, setIsFlipping] = useState(false)
  const flipTimeoutRef = useRef<number | null>(null)
  const isFlipLockedRef = useRef(false)
  const appTitle = t('app.coinflip.title')
  const lastLabel = data.lastFlip ? t(getCoinflipLabelKey(data.lastFlip.side)) : '-'
  const presenterHistory = data.history.slice(0, 5)
  const visibleHistory = data.history.slice(0, 8)
  const settledRotation = getCoinFaceRotation(data.lastFlip?.side ?? 'heads')
  const displayRotation = isFlipping ? coinRotation : settledRotation

  useEffect(
    () => () => {
      if (flipTimeoutRef.current) {
        window.clearTimeout(flipTimeoutRef.current)
      }
    },
    [],
  )

  const handleFlip = () => {
    if (isFlipLockedRef.current) {
      return
    }

    const result = prepareFlipResult()
    const targetRotation = getCoinFaceRotation(result.side)
    const correction =
      (targetRotation - normalizeCoinRotation(displayRotation) + 360) % 360

    isFlipLockedRef.current = true
    setIsFlipping(true)
    setCoinRotation(
      displayRotation + getCoinFlipRotationDegrees() + correction,
    )
    flipTimeoutRef.current = window.setTimeout(() => {
      commitFlipResult(result)
        .catch(() => {
          toast.error(t('coinflip.error.save'))
        })
        .finally(() => {
          flipTimeoutRef.current = null
          isFlipLockedRef.current = false
          setIsFlipping(false)
        })
    }, coinFlipSettleDelayMs)
  }

  return (
    <AppPage>
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <AppPageTitle Icon={Coins} title={appTitle} />
        <PresenterLauncher
          appTitle={appTitle}
          views={[
            {
              id: 'last-flip',
              label: t('coinflip.lastFlip'),
              Icon: Coins,
              render: () => (
                <CoinflipPresenter
                  history={presenterHistory}
                  lastFlip={data.lastFlip}
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
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-5 text-primary" />
              {t('coinflip.section.coin')}
            </CardTitle>
            {isLoading && <CardDescription>{t('common.syncing')}</CardDescription>}
          </CardHeader>
          <CardContent className="grid gap-5">
            <button
              type="button"
              aria-label={
                isFlipping
                  ? t('coinflip.action.flipping')
                  : t('coinflip.action.flip')
              }
              className="grid w-full gap-4 rounded-lg bg-secondary p-5 text-center transition-colors hover:bg-secondary/80 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none"
              disabled={isFlipping}
              onClick={handleFlip}
            >
              <CoinGraphic
                side={data.lastFlip?.side ?? null}
                rotation={displayRotation}
                isFlipping={isFlipping}
              />
              <div className="type-metric-lg">
                {isFlipping ? '...' : lastLabel}
              </div>
            </button>

            <Button
              size="lg"
              className="w-full"
              disabled={isFlipping}
              onClick={handleFlip}
            >
              <Coins className="size-4" />
              {isFlipping ? t('coinflip.action.flipping') : t('coinflip.action.flip')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="size-5 text-primary" />
                {t('common.history')}
              </CardTitle>
              <AppResetButton
                disabled={isFlipping}
                title={t('coinflip.resetTitle')}
                description={t('coinflip.resetDescription')}
                onConfirm={clearHistory}
              />
            </div>
          </CardHeader>
          <CardContent>
            {visibleHistory.length === 0 ? (
              <EmptyState className="p-8">
                {t('coinflip.empty')}
              </EmptyState>
            ) : (
              <div className="divide-y">
                {visibleHistory.map((flipResult, index) => (
                  <div
                    key={flipResult.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="type-metric-sm font-medium">
                      {t('coinflip.resultNumber', {
                        number: data.history.length - index,
                      })}
                    </div>
                    <div className="type-metric-sm">
                      {t(getCoinflipLabelKey(flipResult.side))}
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
