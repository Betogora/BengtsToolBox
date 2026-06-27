import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleDot,
  History,
  ListChecks,
  Plus,
  RotateCcw,
  Shuffle,
} from 'lucide-react'
import { toast } from 'sonner'

import { ConfettiOverlay } from '@/apps/decision-wheel/components/ConfettiOverlay'
import {
  EntryColorControl,
  EntrySuccessControl,
  EntryTextControl,
  EntryWeightControl,
  RemoveEntryButton,
} from '@/apps/decision-wheel/components/EntryControls'
import { ResultPanel } from '@/apps/decision-wheel/components/ResultPanel'
import { WheelGraphic } from '@/apps/decision-wheel/components/WheelGraphic'
import { useDecisionWheel } from '@/apps/decision-wheel/hooks/useDecisionWheel'
import type {
  DecisionWheelEntry,
  DecisionWheelResult,
} from '@/apps/decision-wheel/types'
import {
  getRenderableWheelEntries,
  parseWeightDraft,
} from '@/apps/decision-wheel/utils'
import {
  getSegments,
  normalizeRotation,
  spinFullRotationDegrees,
  spinSettleDelayMs,
} from '@/apps/decision-wheel/wheel'
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
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function DecisionWheelPresenter({
  entries,
  historyCount,
  lastResult,
  rotation,
}: {
  entries: DecisionWheelEntry[]
  historyCount: number
  lastResult: DecisionWheelResult | null
  rotation: number
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <WheelGraphic entries={entries} rotation={rotation} isSpinning={false} />
      </section>

      <aside className="grid content-start gap-4">
        <ResultPanel result={lastResult} />
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Optionen</p>
          <div className="mt-2 text-5xl font-semibold tabular-nums">
            {entries.length}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Drehungen
          </p>
          <div className="mt-2 text-5xl font-semibold tabular-nums">
            {historyCount}
          </div>
        </div>
      </aside>
    </div>
  )
}

export function DecisionWheelPage() {
  const {
    addEntry,
    clearHistory,
    data,
    error,
    commitSpinResult,
    prepareSpinResult,
    removeEntry,
    resetToExamples,
    updateEntry,
  } = useDecisionWheel()
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinEntries, setSpinEntries] = useState<DecisionWheelEntry[] | null>(null)
  const [weightDrafts, setWeightDrafts] = useState<Record<string, string>>({})
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const spinTimeoutRef = useRef<number | null>(null)
  const isSpinLockedRef = useRef(false)
  const wheelEntries = useMemo(
    () => getRenderableWheelEntries(data.entries, weightDrafts),
    [data.entries, weightDrafts],
  )
  const visibleEntries = spinEntries ?? wheelEntries
  const canSpin = wheelEntries.length > 0 && !isSpinning

  useEffect(
    () => () => {
      if (spinTimeoutRef.current) {
        window.clearTimeout(spinTimeoutRef.current)
      }
    },
    [],
  )

  const handleSpin = () => {
    if (isSpinLockedRef.current) {
      return
    }

    const entriesBeforeSpin = wheelEntries
    const result = prepareSpinResult(entriesBeforeSpin)

    if (!result) {
      toast.error('Lege zuerst mindestens eine Option an.')
      return
    }

    const selectedSegment = getSegments(entriesBeforeSpin).find(
      (segment) => segment.id === result.entryId,
    )

    if (!selectedSegment) {
      return
    }

    const selectedSegmentSize = selectedSegment.endAngle - selectedSegment.startAngle
    const targetAngle =
      selectedSegment.startAngle + Math.random() * selectedSegmentSize
    const currentRotation = normalizeRotation(rotation)
    const correction =
      (360 - normalizeRotation(currentRotation + targetAngle)) % 360

    isSpinLockedRef.current = true
    setSpinEntries(entriesBeforeSpin)
    setIsSpinning(true)
    setRotation(rotation + spinFullRotationDegrees + correction)
    spinTimeoutRef.current = window.setTimeout(() => {
      commitSpinResult(result)
        .then(() => {
          if (result.isSuccess) {
            setConfettiTrigger((currentTrigger) => currentTrigger + 1)
          }

          toast.success(`${result.text} wurde gezogen.`)
        })
        .catch(() => {
          toast.error('Das Ergebnis konnte nicht gespeichert werden.')
        })
        .finally(() => {
          spinTimeoutRef.current = null
          isSpinLockedRef.current = false
          setIsSpinning(false)
          setSpinEntries(null)
        })
    }, spinSettleDelayMs)
  }

  const clearWeightDraft = (entryId: string) =>
    setWeightDrafts((currentDrafts) => {
      if (!(entryId in currentDrafts)) {
        return currentDrafts
      }

      const nextDrafts = { ...currentDrafts }
      delete nextDrafts[entryId]

      return nextDrafts
    })

  const handleWeightChange = (entryId: string, nextValue: string) => {
    setWeightDrafts((currentDrafts) => ({
      ...currentDrafts,
      [entryId]: nextValue,
    }))

    const nextWeight = parseWeightDraft(nextValue)

    if (nextWeight !== null) {
      updateEntry(entryId, { weight: nextWeight })
    }
  }

  return (
    <AppPage>
      <ConfettiOverlay trigger={confettiTrigger} />

      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <AppPageTitle Icon={CircleDot} title="Glücksrad" />
        <PresenterLauncher
          appTitle="Glücksrad"
          views={[
            {
              id: 'wheel',
              label: 'Rad',
              Icon: CircleDot,
              render: () => (
                <DecisionWheelPresenter
                  entries={wheelEntries}
                  historyCount={data.history.length}
                  lastResult={data.lastResult}
                  rotation={rotation}
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

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDot className="size-5 text-primary" />
              Rad
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <WheelGraphic
              entries={visibleEntries}
              rotation={rotation}
              isSpinning={isSpinning}
            />

            <Button size="lg" disabled={!canSpin} onClick={handleSpin}>
              <Shuffle className="size-4" />
              {isSpinning ? 'Dreht...' : 'Drehen'}
            </Button>

            <ResultPanel result={data.lastResult} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="size-5 text-primary" />
                    Optionen
                  </CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={resetToExamples}>
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.entries.length === 0 ? (
                <EmptyState>
                  Keine Optionen vorhanden. Füge eine Option hinzu oder setze die
                  Liste zurück.
                </EmptyState>
              ) : (
                <>
                  <div className="grid gap-2 md:hidden">
                    {data.entries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="grid gap-2 rounded-md border bg-card p-2.5 text-sm"
                      >
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                          <span className="flex h-11 min-w-11 items-center justify-center rounded-md border bg-secondary px-2 text-sm font-semibold leading-none tabular-nums">
                            #{index + 1}
                          </span>
                          <EntryTextControl
                            entry={entry}
                            index={index}
                            mode="mobile"
                            onUpdateEntry={updateEntry}
                          />
                        </div>

                        <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem_2.75rem] items-end gap-2">
                          <EntryColorControl
                            entry={entry}
                            index={index}
                            mode="mobile"
                            onUpdateEntry={updateEntry}
                          />
                          <EntryWeightControl
                            entry={entry}
                            index={index}
                            mode="mobile"
                            value={weightDrafts[entry.id] ?? String(entry.weight)}
                            onClearWeightDraft={clearWeightDraft}
                            onWeightChange={handleWeightChange}
                          />
                          <EntrySuccessControl
                            entry={entry}
                            index={index}
                            mode="mobile"
                            onUpdateEntry={updateEntry}
                          />
                          <RemoveEntryButton
                            entry={entry}
                            index={index}
                            mode="mobile"
                            onRemoveEntry={removeEntry}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Table
                    className="w-full min-w-[32rem] table-fixed"
                    containerClassName="hidden md:block"
                  >
                    <TableHeader>
                      <TableHead className="w-10 px-2">#</TableHead>
                      <TableHead className="px-2">Text</TableHead>
                      <TableHead className="w-20 px-2">Gewicht</TableHead>
                      <TableHead className="w-14 px-2">Farbe</TableHead>
                      <TableHead className="w-20 px-2 text-center">Erfolg</TableHead>
                      <TableHead className="w-20 px-2 text-center">Aktion</TableHead>
                    </TableHeader>
                    <TableBody>
                      {data.entries.map((entry, index) => (
                        <TableRow key={entry.id}>
                          <TableCell className="px-2 tabular-nums">
                            {index + 1}
                          </TableCell>
                          <TableCell className="px-2">
                            <EntryTextControl
                              entry={entry}
                              index={index}
                              mode="table"
                              onUpdateEntry={updateEntry}
                            />
                          </TableCell>
                          <TableCell className="px-2 text-center">
                            <EntryWeightControl
                              entry={entry}
                              index={index}
                              mode="table"
                              value={weightDrafts[entry.id] ?? String(entry.weight)}
                              onClearWeightDraft={clearWeightDraft}
                              onWeightChange={handleWeightChange}
                            />
                          </TableCell>
                          <TableCell className="px-2">
                            <EntryColorControl
                              entry={entry}
                              index={index}
                              mode="table"
                              onUpdateEntry={updateEntry}
                            />
                          </TableCell>
                          <TableCell className="px-2">
                            <EntrySuccessControl
                              entry={entry}
                              index={index}
                              mode="table"
                              onUpdateEntry={updateEntry}
                            />
                          </TableCell>
                          <TableCell className="px-2 text-center">
                            <RemoveEntryButton
                              entry={entry}
                              index={index}
                              mode="table"
                              onRemoveEntry={removeEntry}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}

              <div className="rounded-md border border-dashed bg-background p-3">
                <Button
                  className="h-9 w-full"
                  variant="outline"
                  onClick={addEntry}
                >
                  <Plus className="size-4" />
                  Option hinzufügen
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="size-5 text-primary" />
                    Verlauf
                  </CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={clearHistory}>
                  <RotateCcw className="size-4" />
                  Leeren
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.history.length === 0 ? (
                <EmptyState>
                  Noch keine Drehungen vorhanden.
                </EmptyState>
              ) : (
                <div className="grid gap-3">
                  {data.history.map((result, index) => (
                    <div key={result.id}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{result.text}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(result.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <span
                          className="size-4 shrink-0 rounded-full border"
                          style={{ backgroundColor: result.color }}
                          aria-hidden="true"
                        />
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
        </div>
      </section>
    </AppPage>
  )
}
