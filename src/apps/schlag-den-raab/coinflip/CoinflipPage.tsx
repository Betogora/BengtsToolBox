import { Coins, History, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import {
  getCoinflipLabel,
  useCoinflip,
} from '@/apps/schlag-den-raab/coinflip/hooks/useCoinflip'
import { AppPage } from '@/apps/shared/components/AppPage'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function CoinflipPage() {
  const { data, flip, clearHistory, isLoading, error } = useCoinflip()
  const lastLabel = data.lastFlip ? getCoinflipLabel(data.lastFlip.side) : '-'

  return (
    <AppPage>
      <section>
        <AppPageTitle Icon={Coins} title="Coinflip" />
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
              <div className="text-sm text-muted-foreground">Letzter Flip</div>
              <div className="mt-3 text-6xl font-semibold tracking-normal sm:text-7xl">
                {lastLabel}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                size="lg"
                onClick={async () => {
                  await flip()
                  toast.success('Münze geworfen.')
                }}
              >
                <Coins className="size-4" />
                Coinflip
              </Button>
              <Button variant="outline" size="lg" onClick={clearHistory}>
                <RotateCcw className="size-4" />
                Verlauf leeren
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5 text-primary" />
              Letzte Ergebnisse
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.history.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Noch keine Flips vorhanden.
              </div>
            ) : (
              <div className="grid gap-3">
                {data.history.map((flipResult, index) => (
                  <div key={flipResult.id}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium">
                          Flip {data.history.length - index}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(flipResult.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-2xl font-semibold">
                        {getCoinflipLabel(flipResult.side)}
                      </div>
                    </div>
                    {index < data.history.length - 1 && (
                      <Separator className="mt-3" />
                    )}
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
