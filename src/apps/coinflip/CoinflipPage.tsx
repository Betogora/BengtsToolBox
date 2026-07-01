import { Coins, History } from 'lucide-react'

import {
  getCoinflipLabel,
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

function CoinflipPresenter({
  history,
  lastFlip,
}: {
  history: CoinflipResult[]
  lastFlip: CoinflipResult | null
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="grid min-h-[28rem] place-items-center rounded-lg border bg-secondary p-6 text-center shadow-sm">
        <div>
          <p className="type-label text-muted-foreground">
            Letzter Flip
          </p>
          <div className="type-metric-xl mt-4">
            {lastFlip ? getCoinflipLabel(lastFlip.side) : '-'}
          </div>
        </div>
      </section>

      <aside className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <History className="size-5 text-primary" />
          <h2 className="type-section-title">
            Letzte Ergebnisse
          </h2>
        </div>
        <div className="mt-5 grid gap-3">
          {history.length === 0 ? (
            <EmptyState>Noch keine Flips vorhanden.</EmptyState>
          ) : (
            history.map((flipResult, index) => (
              <div
                key={flipResult.id}
                className="flex items-center justify-between gap-4 rounded-md border bg-background p-4"
              >
                <div className="type-label">
                  Flip {history.length - index}
                </div>
                <div className="type-metric-md">
                  {getCoinflipLabel(flipResult.side)}
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
  const { data, flip, clearHistory, isLoading, error } = useCoinflip()
  const lastLabel = data.lastFlip ? getCoinflipLabel(data.lastFlip.side) : '-'
  const visibleHistory = data.history.slice(0, 5)

  return (
    <AppPage>
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <AppPageTitle Icon={Coins} title="Coinflip" />
        <PresenterLauncher
          appTitle="Coinflip"
          views={[
            {
              id: 'last-flip',
              label: 'Letzter Flip',
              Icon: Coins,
              render: () => (
                <CoinflipPresenter
                  history={visibleHistory}
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
            <CardTitle>Firebase-Fehler</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-5 text-primary" />
              Münze
            </CardTitle>
            {isLoading && <CardDescription>Synchronisiere...</CardDescription>}
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="rounded-lg bg-secondary p-6 text-center">
              <div className="type-ui text-muted-foreground">Letzter Flip</div>
              <div className="type-metric-xl mt-3">
                {lastLabel}
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={async () => {
                await flip()
              }}
            >
              <Coins className="size-4" />
              Coinflip
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="size-5 text-primary" />
                Verlauf
              </CardTitle>
              <AppResetButton
                title="Verlauf zurücksetzen?"
                description="Alle bisherigen Münzwürfe und der letzte Flip werden gelöscht."
                onConfirm={clearHistory}
              />
            </div>
          </CardHeader>
          <CardContent>
            {visibleHistory.length === 0 ? (
              <EmptyState className="p-8">
                Noch keine Flips vorhanden.
              </EmptyState>
            ) : (
              <div className="grid gap-3">
                {data.history.map((flipResult, index) => (
                  <div key={flipResult.id}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="type-label">
                          Flip {data.history.length - index}
                        </div>
                        <div className="type-caption text-muted-foreground">
                          {new Date(flipResult.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="type-metric-sm">
                        {getCoinflipLabel(flipResult.side)}
                      </div>
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
