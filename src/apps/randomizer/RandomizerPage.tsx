import { Dice5, History, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { useRandomizer } from '@/apps/randomizer/hooks/useRandomizer'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export function RandomizerPage() {
  const { data, updateRange, roll, clearHistory, isLoading, error } =
    useRandomizer()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
          Random Number Generator
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Stelle eine Spanne ein, würfle online und behalte den letzten Zustand
          samt kurzem Verlauf über Firestore.
        </p>
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
              <Dice5 className="size-5 text-primary" />
              Generator
            </CardTitle>
            <CardDescription>
              {isLoading ? 'Synchronisiere...' : 'State-ID: default'}
            </CardDescription>
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

            <div className="rounded-lg bg-secondary p-6 text-center">
              <div className="text-sm text-muted-foreground">Letzter Wurf</div>
              <div className="mt-2 text-7xl font-semibold tabular-nums">
                {data.lastRoll ?? '-'}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                size="lg"
                onClick={() => {
                  roll()
                  toast.success('Neue Zufallszahl erzeugt.')
                }}
              >
                <Dice5 className="size-4" />
                Würfeln
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
            <CardDescription>
              Die letzten 12 Würfe werden im gemeinsamen State gespeichert.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.history.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Noch keine Würfe vorhanden.
              </div>
            ) : (
              <div className="grid gap-3">
                {data.history.map((rollResult, index) => (
                  <div key={rollResult.id}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium">
                          Wurf {data.history.length - index}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(rollResult.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-2xl font-semibold tabular-nums">
                        {rollResult.value}
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
    </div>
  )
}
