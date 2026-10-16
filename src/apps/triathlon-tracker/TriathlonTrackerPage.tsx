import './triathlon-tracker.css'

import {
  Activity,
  BarChart3,
  CalendarDays,
  NotebookPen,
  Plus,
  Trophy,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  ActualTrainingDialog,
  CurrentWeekSummary,
  LoadingState,
  PlannedTrainingDialog,
  SyncStatus,
  WeekCopyDialog,
} from './components'
import { getCurrentLocalDate, getWeekStartLocalDate } from './domain/dates'
import {
  intervalSegmentsFromScheme,
  plannedIntervalScheme,
} from './domain/intervals'
import { getCompletedPlannedTrainingIds } from './domain/planStatus'
import { useTriathlonTracker } from './hooks/useTriathlonTracker'
import type {
  ActualTrainingInput,
  PlannedTrainingInput,
} from './hooks/useTriathlonTracker'
import { PlanCalendar } from './PlanCalendar'
import { PersonalBestsPanel } from './PersonalBestsPanel'
import { TrackerSettingsPanel } from './TrackerSettingsPanel'
import { summarizeWeek } from './domain/weeklyStats'
import { TrainingJournal } from './TrainingJournal'
import { defaultPlanPaces, defaultTrainingContexts } from './types'
import type { PlanPaces } from './types'
import type { ActualTraining, PlannedTraining } from './types'
import { AppPage } from '@/apps/shared/components/AppPage'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { syncErrorMessageKey } from '@/lib/firebase/syncError'
import { useI18n } from '@/lib/i18n'

const loadTrainingStatistics = () => import('./TrainingStatistics')
const TrainingStatistics = lazy(loadTrainingStatistics)

// Statistics and its chart library load in two lazy steps; fetching both while
// the browser is idle removes that waterfall from the first tab visit.
function preloadStatistics() {
  void loadTrainingStatistics()
  void import('./TrainingCharts')
}

async function requireSuccessfulSync<T extends { ok: boolean; error: unknown }>(
  resultPromise: Promise<T>,
) {
  const result = await resultPromise
  if (!result.ok) throw result.error
  return result
}

/** A planned run such as "Intervalle 3×4 min" opens with its phase table. */
function plannedRunIntervals(training: PlannedTraining) {
  const scheme =
    training.discipline === 'run'
      ? plannedIntervalScheme(training.label, training.durationSeconds)
      : null
  return scheme
    ? intervalSegmentsFromScheme(scheme, () => `interval-${crypto.randomUUID()}`)
    : []
}

export function TriathlonTrackerPage() {
  const { t } = useI18n()
  const tracker = useTriathlonTracker()
  const planPaces: PlanPaces = {
    ...defaultPlanPaces,
    ...tracker.settings.planPaceSecondsPerKilometer,
  }
  const today = getCurrentLocalDate()
  const [activeTab, setActiveTab] = useState('calendar')
  // Once opened, statistics stay mounted so revisits skip all model fits.
  const [statisticsOpened, setStatisticsOpened] = useState(false)
  if (activeTab === 'statistics' && !statisticsOpened) setStatisticsOpened(true)
  useEffect(() => {
    // Load and pre-render statistics while idle, so the first visit is instant.
    const prepare = () => {
      preloadStatistics()
      setStatisticsOpened(true)
    }
    // Safari has no requestIdleCallback; a short delay serves the same purpose.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prepare, { timeout: 3_000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(prepare, 1_500)
    return () => clearTimeout(id)
  }, [])
  const [activeLocalDate, setActiveLocalDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState(today)
  const [plannedDialogOpen, setPlannedDialogOpen] = useState(false)
  const [actualDialogOpen, setActualDialogOpen] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [editingPlanned, setEditingPlanned] = useState<PlannedTraining | null>(
    null,
  )
  const [planTemplate, setPlanTemplate] = useState<
    PlannedTrainingInput | undefined
  >()
  const [editingActual, setEditingActual] = useState<ActualTraining | null>(
    null,
  )
  const [actualTemplate, setActualTemplate] =
    useState<Partial<ActualTrainingInput>>()
  const [actualReturnTab, setActualReturnTab] = useState('journal')
  const week = summarizeWeek(
    tracker.actualTrainings,
    getWeekStartLocalDate(today),
  )
  const completedPlanIds = useMemo(
    () =>
      getCompletedPlannedTrainingIds(
        tracker.plannedTrainings,
        tracker.actualTrainings,
      ),
    [tracker.actualTrainings, tracker.plannedTrainings],
  )

  const openPlan = (date: string, training: PlannedTraining | null = null) => {
    setSelectedDate(date)
    setEditingPlanned(training)
    setPlanTemplate(undefined)
    setPlannedDialogOpen(true)
  }
  const openActual = (training: ActualTraining | null = null) => {
    setSelectedDate(training?.localDate ?? today)
    setEditingActual(training)
    setActualTemplate(undefined)
    setActualReturnTab('journal')
    setActualDialogOpen(true)
  }
  const logPlanned = (training: PlannedTraining) => {
    openActual()
    setSelectedDate(training.localDate)
    setActualTemplate({
      localDate: training.localDate,
      startMinutes: training.startMinutes,
      discipline: training.discipline,
      isWalk: training.isWalk ?? false,
      inclinePercent: training.inclinePercent ?? null,
      durationSeconds: training.durationSeconds,
      distanceMeters: training.distanceMeters,
      intervals: plannedRunIntervals(training),
    })
    setActualReturnTab('calendar')
  }
  const deleteActual = async (id: string) => {
    await requireSuccessfulSync(tracker.deleteActualTraining(id))
    toast.success(t('triathlon.actual.deleted'))
  }

  return (
    <AppPage
      className="triathlon-tracker gap-4 py-5 sm:gap-5 sm:py-8"
      width="wide"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <AppPageTitle Icon={Activity} title={t('app.triathlonTracker.title')} />
        <div className="flex flex-wrap items-center gap-2">
          {tracker.isPending && <SyncStatus />}
          <Button
            variant="outline"
            aria-label={t('triathlon.calendar.plan')}
            onClick={() => openPlan(today)}
          >
            <CalendarDays aria-hidden="true" />
            <span className="hidden sm:inline">
              {t('triathlon.calendar.plan')}
            </span>
          </Button>
          <Button onClick={() => openActual()}>
            <Plus aria-hidden="true" />
            {t('triathlon.actual.add')}
          </Button>
        </div>
      </header>
      {tracker.error && (
        <p
          className="rounded-md border border-destructive p-3 text-destructive"
          role="alert"
        >
          {t(syncErrorMessageKey(tracker.error))}
        </p>
      )}
      {tracker.isLoading ? (
        <LoadingState />
      ) : (
        <>
          {tracker.actualTrainings.length > 0 && (
            <CurrentWeekSummary
              actualCount={week.totalTrainingCount}
              totalDurationSeconds={week.totalDurationSeconds}
              swimDistanceMeters={week.byDiscipline.swim.distanceMeters}
              swimDurationSeconds={week.byDiscipline.swim.durationSeconds}
              swimTrainingCount={week.byDiscipline.swim.trainingCount}
              bikeDistanceMeters={week.byDiscipline.bike.distanceMeters}
              bikeDurationSeconds={week.byDiscipline.bike.durationSeconds}
              bikeTrainingCount={week.byDiscipline.bike.trainingCount}
              runDistanceMeters={week.byDiscipline.run.distanceMeters}
              runDurationSeconds={week.byDiscipline.run.durationSeconds}
              runTrainingCount={week.byDiscipline.run.trainingCount}
            />
          )}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="relative min-w-0 gap-5"
          >
            <TabsList
              aria-label={t('app.triathlonTracker.title')}
              variant="icon-tabs"
              className="max-w-full w-full sm:w-fit"
            >
              <TabsTrigger
                value="calendar"
                icon={CalendarDays}
                label={t('triathlon.tabs.calendar')}
              />
              <TabsTrigger
                value="records"
                icon={Trophy}
                label={t('triathlon.tabs.records')}
              />
              <TabsTrigger
                value="statistics"
                icon={BarChart3}
                label={t('triathlon.tabs.statistics')}
              />
              <TabsTrigger
                value="journal"
                icon={NotebookPen}
                label={t('triathlon.tabs.journal')}
              />
            </TabsList>
            <TabsContent
              value="calendar"
              forceMount
              className="grid gap-4 data-[state=inactive]:hidden"
            >
              <PlanCalendar
                activeLocalDate={activeLocalDate}
                onDateChange={setActiveLocalDate}
                plannedTrainings={tracker.plannedTrainings}
                completedIds={completedPlanIds}
                today={today}
                onAdd={openPlan}
                onLog={logPlanned}
                onEdit={(training) => openPlan(training.localDate, training)}
                onCopy={(training) => {
                  openPlan(training.localDate)
                  setPlanTemplate(training)
                }}
                onCopyWeek={() => setCopyDialogOpen(true)}
                onMove={async (training, localDate) => {
                  try {
                    await requireSuccessfulSync(
                      tracker.updatePlannedTraining(training.id, { localDate }),
                    )
                    toast.success(t('triathlon.plan.saved'))
                  } catch {
                    toast.error(t('triathlon.form.saveFailed'))
                  }
                }}
              />
              <TrackerSettingsPanel
                weightKg={tracker.settings.weightKg}
                restingHeartRateBpm={tracker.settings.restingHeartRateBpm ?? null}
                planPaces={planPaces}
                onUpdateWeight={(weightKg) =>
                  requireSuccessfulSync(tracker.updateSettings({ weightKg }))
                }
                onUpdateRestingHeartRate={(restingHeartRateBpm) =>
                  requireSuccessfulSync(
                    tracker.updateSettings({ restingHeartRateBpm }),
                  )
                }
                onUpdatePlanPace={(variant, paceSeconds) =>
                  requireSuccessfulSync(
                    tracker.updateSettings({
                      planPaceSecondsPerKilometer: {
                        ...planPaces,
                        [variant]: paceSeconds,
                      },
                    }),
                  )
                }
              />
            </TabsContent>
            <TabsContent
              value="records"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <PersonalBestsPanel
                actualTrainings={tracker.actualTrainings}
                settings={tracker.settings}
                today={today}
                onEdit={(training) => {
                  openActual(training)
                  setActualReturnTab('records')
                }}
                onAdd={(template) => {
                  openActual()
                  setActualTemplate(template)
                  setActualReturnTab('records')
                }}
              />
            </TabsContent>
            {/* Inactive statistics keep their width (invisible, zero height),
                so charts need no full redraw when the tab is shown again. */}
            <TabsContent
              value="statistics"
              forceMount
              className="data-[state=inactive]:invisible data-[state=inactive]:absolute data-[state=inactive]:inset-x-0 data-[state=inactive]:top-0 data-[state=inactive]:h-0 data-[state=inactive]:overflow-hidden"
            >
              {statisticsOpened && (
                <Suspense fallback={<LoadingState />}>
                  <TrainingStatistics
                    actualTrainings={tracker.actualTrainings}
                    settings={tracker.settings}
                  />
                </Suspense>
              )}
            </TabsContent>
            <TabsContent
              value="journal"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <TrainingJournal
                actualTrainings={tracker.actualTrainings}
                onEdit={openActual}
                onDelete={deleteActual}
                onAdd={() => openActual()}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
      <PlannedTrainingDialog
        initialDate={selectedDate}
        open={plannedDialogOpen}
        planPaces={planPaces}
        training={editingPlanned}
        template={planTemplate}
        onOpenChange={setPlannedDialogOpen}
        onSave={async (value) => {
          await requireSuccessfulSync(
            editingPlanned
              ? tracker.updatePlannedTraining(editingPlanned.id, value)
              : tracker.addPlannedTraining(value),
          )
          toast.success(t('triathlon.plan.saved'))
        }}
        onDelete={async (id) => {
          await requireSuccessfulSync(tracker.deletePlannedTraining(id))
          toast.success(t('triathlon.plan.deleted'))
        }}
      />
      <ActualTrainingDialog
        defaultContexts={defaultTrainingContexts}
        weightKg={tracker.settings.weightKg}
        initialDate={selectedDate}
        open={actualDialogOpen}
        training={editingActual}
        template={actualTemplate}
        onOpenChange={setActualDialogOpen}
        onDelete={deleteActual}
        onSave={async (value) => {
          await requireSuccessfulSync(
            editingActual
              ? tracker.updateActualTraining(editingActual.id, value)
              : tracker.addActualTraining(value),
          )
          setActiveTab(actualReturnTab)
          toast.success(t('triathlon.actual.saved'))
        }}
      />
      <WeekCopyDialog
        currentWeekStart={getWeekStartLocalDate(activeLocalDate)}
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        onPreview={tracker.previewPlannedWeekCopy}
        onCopy={async (preview) => {
          await requireSuccessfulSync(tracker.copyPlannedWeek(preview))
          setActiveLocalDate(preview.targetWeekStartLocalDate)
          toast.success(
            t('triathlon.copyWeek.done', { count: preview.copies.length }),
          )
        }}
      />
    </AppPage>
  )
}
