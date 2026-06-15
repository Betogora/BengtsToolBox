import { Dice5, History, RotateCcw } from 'lucide-react'

import { useRandomizer } from '@/apps/randomizer/hooks/useRandomizer'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RandomizerPage() {
  const { data, updateRange, roll, clearHistory, error } = useRandomizer()
  const visibleHistory = data.history.slice(0, 10)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <section>
        <AppPageTitle Icon={Dice5} title="Random Number Generator" />
      </section>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Firebase-Fehler</CardTitle>
            <p className="text-sm text-destructive">{error.message}</p>
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
              <div className="grid gap-2">
                <Label htmlFor="min-value">Minimum</Label>
                <Input
                  id="min-value"
                  type="number"
                  value={data.min}
                  onChange={(event) =>
                    updateRange(Number(event.target.value), data.max)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max-value">Maximum</Label>
                <Input
                  id="max-value"
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
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Noch keine Würfe vorhanden.
              </div>
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
    </div>
  )
}
