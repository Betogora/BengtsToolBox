import './triathlon-tracker.css'

import {
  Activity,
  BarChart3,
  CalendarDays,
  NotebookPen,
  Plus,
  Trophy,
} from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
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
import { useTriathlonTracker } from './hooks/useTriathlonTracker'
import type {
  ActualTrainingInput,
  PlannedTrainingInput,
} from './hooks/useTriathlonTracker'
import { PlanCalendar } from './PlanCalendar'
import { PersonalBestsPanel } from './PersonalBestsPanel'
import { summarizeWeek } from './domain/weeklyStats'
import { TrainingJournal } from './TrainingJournal'
import { defaultTrainingContexts } from './types'
import type { ActualTraining, PlannedTraining } from './types'
import { AppPage } from '@/apps/shared/components/AppPage'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { syncErrorMessageKey } from '@/lib/firebase/syncError'
import { useI18n } from '@/lib/i18n'

const TrainingStatistics = lazy(() => import('./TrainingStatistics'))

async function requireSuccessfulSync<T extends { ok: boolean; error: unknown }>(
  resultPromise: Promise<T>,
) {
  const result = await resultPromise
  if (!result.ok) throw result.error
  return result
}

export function TriathlonTrackerPage() {
  const { t } = useI18n()
  const tracker = useTriathlonTracker()
  const today = getCurrentLocalDate()
  const [activeTab, setActiveTab] = useState('records')
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
            className="min-w-0 gap-5"
          >
            <TabsList
              aria-label={t('app.triathlonTracker.title')}
              variant="icon-tabs"
              className="max-w-full w-full sm:w-fit"
            >
              <TabsTrigger
                value="records"
                icon={Trophy}
                label={t('triathlon.tabs.records')}
              />
              <TabsTrigger
                value="calendar"
                icon={CalendarDays}
                label={t('triathlon.tabs.calendar')}
              />
              <TabsTrigger
                value="journal"
                icon={NotebookPen}
                label={t('triathlon.tabs.journal')}
              />
              <TabsTrigger
                value="statistics"
                icon={BarChart3}
                label={t('triathlon.tabs.statistics')}
              />
            </TabsList>
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
                onUpdateWeight={(weightKg) =>
                  requireSuccessfulSync(tracker.updateSettings({ weightKg }))
                }
              />
            </TabsContent>
            <TabsContent
              value="calendar"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <PlanCalendar
                activeLocalDate={activeLocalDate}
                onDateChange={setActiveLocalDate}
                plannedTrainings={tracker.plannedTrainings}
                today={today}
                onAdd={openPlan}
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
            <TabsContent value="statistics">
              <Suspense fallback={<LoadingState />}>
                <TrainingStatistics
                  actualTrainings={tracker.actualTrainings}
                  settings={tracker.settings}
                />
              </Suspense>
            </TabsContent>
          </Tabs>
        </>
      )}
      <PlannedTrainingDialog
        initialDate={selectedDate}
        open={plannedDialogOpen}
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
