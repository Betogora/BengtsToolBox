import { Dice5, History, RotateCcw } from 'lucide-react'

import { useRandomizer } from '@/apps/randomizer/hooks/useRandomizer'
import type { RollResult } from '@/apps/randomizer/types'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { AppPage } from '@/apps/shared/components/AppPage'
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
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="grid min-h-[28rem] place-items-center rounded-lg border bg-secondary p-6 text-center shadow-sm">
        <div>
          <p className="text-base font-medium text-muted-foreground">
            Letzter Wurf
          </p>
          <div className="mt-4 text-9xl font-semibold leading-none tabular-nums">
            {lastRoll ?? '-'}
          </div>
          <p className="mt-5 text-xl font-semibold tabular-nums">
            {min} bis {max}
          </p>
        </div>
      </section>

      <aside className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <History className="size-5 text-primary" />
          <h2 className="text-2xl font-semibold tracking-normal">
            Letzte Ergebnisse
          </h2>
        </div>
        <div className="mt-5 grid gap-3">
          {history.length === 0 ? (
            <EmptyState>Noch keine Wuerfe vorhanden.</EmptyState>
          ) : (
            history.map((rollResult, index) => (
              <div
                key={rollResult.id}
                className="flex items-center justify-between gap-4 rounded-md border bg-background p-4"
              >
                <div className="font-medium">
                  Wurf {history.length - index}
                </div>
                <div className="text-4xl font-semibold tabular-nums">
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
  const { data, updateRange, roll, clearHistory, error } = useRandomizer()
  const visibleHistory = data.history.slice(0, 10)

  return (
    <AppPage>
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <AppPageTitle Icon={Dice5} title="Random Number Generator" />
        <PresenterLauncher
          appTitle="Random Number Generator"
          views={[
            {
              id: 'last-roll',
              label: 'Letzter Wurf',
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
            <CardTitle>Firebase-Fehler</CardTitle>
            <CardDescription>{error.message}</CardDescription>
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
                  label="Minimum"
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
                  label="Maximum"
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
              aria-label="Würfeln"
              className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg bg-secondary p-6 text-center transition-colors hover:bg-secondary/80 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              onClick={roll}
            >
              <div className="text-7xl font-semibold tabular-nums">
                {data.lastRoll ?? '-'}
              </div>
              <div className="flex items-center justify-center gap-2 text-lg font-semibold leading-none tracking-normal">
                <Dice5 className="size-5 text-primary" />
                <span>Würfeln</span>
              </div>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <History className="size-5 text-primary" />
                Letzte Ergebnisse
              </CardTitle>
              <Button
                aria-label="Verlauf leeren"
                variant="outline"
                size="icon"
                className="size-10"
                onClick={clearHistory}
              >
                <RotateCcw className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {visibleHistory.length === 0 ? (
              <EmptyState className="p-8">
                Noch keine Würfe vorhanden.
              </EmptyState>
            ) : (
              <div className="divide-y">
                {visibleHistory.map((rollResult, index) => (
                  <div
                    key={rollResult.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="font-medium">
                      Wurf {visibleHistory.length - index}
                    </div>
                    <div className="text-2xl font-semibold tabular-nums">
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
