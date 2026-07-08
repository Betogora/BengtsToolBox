import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleDot,
  History,
  ListChecks,
  Plus,
  Shuffle,
} from 'lucide-react'
import { toast } from 'sonner'

import { ConfettiOverlay } from '@/apps/decision-wheel/components/ConfettiOverlay'
import {
  EntryColorControl,
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
  getEntryDisplayText,
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
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n } from '@/lib/i18n'

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
  const { t } = useI18n()

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <WheelGraphic
          entries={entries}
          highlightedEntryId={lastResult?.entryId}
          rotation={rotation}
          isSpinning={false}
        />
      </section>

      <aside className="grid content-start gap-4">
        <ResultPanel result={lastResult} />
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="type-label text-muted-foreground">
            {t('decisionWheel.options')}
          </p>
          <div className="type-metric-lg mt-2">
            {entries.length}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="type-label text-muted-foreground">
            {t('decisionWheel.spins')}
          </p>
          <div className="type-metric-lg mt-2">
            {historyCount}
          </div>
        </div>
      </aside>
    </div>
  )
}

export function DecisionWheelPage() {
  const { formatDateTime, t } = useI18n()
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
  const [confetti, setConfetti] = useState<{
    color: string | null
    trigger: number
  }>({ color: null, trigger: 0 })
  const spinTimeoutRef = useRef<number | null>(null)
  const isSpinLockedRef = useRef(false)
  const wheelEntries = useMemo(
    () => getRenderableWheelEntries(data.entries, weightDrafts),
    [data.entries, weightDrafts],
  )
  const visibleEntries = spinEntries ?? wheelEntries
  const canSpin = wheelEntries.length > 0 && !isSpinning
  const appTitle = t('app.decisionWheel.title')

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
    const result = prepareSpinResult(entriesBeforeSpin, (entry, index) =>
      getEntryDisplayText(entry, index, (number) =>
        t('decisionWheel.fallbackOption', { number }),
      ),
    )

    if (!result) {
      toast.error(t('decisionWheel.error.noOptions'))
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
          setConfetti((currentConfetti) => ({
            color: result.color,
            trigger: currentConfetti.trigger + 1,
          }))
        })
        .catch(() => {
          toast.error(t('decisionWheel.error.saveResult'))
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
      <ConfettiOverlay color={confetti.color} trigger={confetti.trigger} />

      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <AppPageTitle Icon={CircleDot} title={appTitle} />
        <PresenterLauncher
          appTitle={appTitle}
          views={[
            {
              id: 'wheel',
              label: t('decisionWheel.wheel.title'),
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
            <CardTitle>{t('common.firebaseError')}</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDot className="size-5 text-primary" />
              {t('decisionWheel.wheel.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <WheelGraphic
              entries={visibleEntries}
              highlightedEntryId={!isSpinning ? data.lastResult?.entryId : null}
              rotation={rotation}
              isSpinning={isSpinning}
            />

            <Button size="lg" disabled={!canSpin} onClick={handleSpin}>
              <Shuffle className="size-4" />
              {isSpinning
                ? t('decisionWheel.wheel.spinning')
                : t('decisionWheel.wheel.spin')}
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
                    {t('decisionWheel.options')}
                  </CardTitle>
                </div>
                <AppResetButton
                  title={t('decisionWheel.options.resetTitle')}
                  description={t('decisionWheel.options.resetDescription')}
                  onConfirm={resetToExamples}
                />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.entries.length === 0 ? (
                <EmptyState>
                  {t('decisionWheel.emptyOptions')}
                </EmptyState>
              ) : (
                <>
                  <div className="grid gap-2 md:hidden">
                    {data.entries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="type-ui grid gap-2 rounded-md border bg-card p-2.5"
                      >
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                          <span className="type-action flex h-11 w-11 items-center justify-center rounded-md border bg-secondary px-2 tabular-nums">
                            #{index + 1}
                          </span>
                          <EntryTextControl
                            entry={entry}
                            index={index}
                            mode="mobile"
                            onUpdateEntry={updateEntry}
                          />
                        </div>

                        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2">
                          <span className="h-11 w-11" aria-hidden="true" />
                          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-end gap-2">
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
                            <RemoveEntryButton
                              entry={entry}
                              index={index}
                              mode="mobile"
                              onRemoveEntry={removeEntry}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Table
                    className="w-full min-w-[28rem] table-fixed"
                    containerClassName="hidden md:block"
                  >
                    <TableHeader>
                      <TableHead className="w-10 px-2">#</TableHead>
                      <TableHead className="px-2">Text</TableHead>
                      <TableHead className="w-20 px-2">
                        {t('decisionWheel.weight')}
                      </TableHead>
                      <TableHead className="w-14 px-2">
                        {t('decisionWheel.color')}
                      </TableHead>
                      <TableHead className="w-20 px-2 text-center">
                        {t('decisionWheel.action')}
                      </TableHead>
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
                  {t('decisionWheel.addOption')}
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
                    {t('common.history')}
                  </CardTitle>
                </div>
                <AppResetButton
                  title={t('decisionWheel.history.resetTitle')}
                  description={t('decisionWheel.history.resetDescription')}
                  onConfirm={clearHistory}
                />
              </div>
            </CardHeader>
            <CardContent>
              {data.history.length === 0 ? (
                <EmptyState>
                  {t('decisionWheel.emptyHistory')}
                </EmptyState>
              ) : (
                <div className="grid gap-3">
                  {data.history.map((result, index) => (
                    <div key={result.id}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="type-label truncate">{result.text}</div>
                          <div className="type-caption text-muted-foreground">
                            {formatDateTime(result.createdAt)}
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
