import {
  Activity,
  BarChart3,
  CalendarDays,
  NotebookPen,
  Plus,
} from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { toast } from 'sonner'

import {
  ActualTrainingDialog,
  LoadingState,
  PlannedTrainingDialog,
  SyncStatus,
  WeekCopyDialog,
} from './components'
import { getCurrentLocalDate, getWeekStartLocalDate } from './domain/dates'
import { useTriathlonTracker } from './hooks/useTriathlonTracker'
import type { PlannedTrainingInput } from './hooks/useTriathlonTracker'
import { PlanCalendar } from './PlanCalendar'
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
  const [activeTab, setActiveTab] = useState('calendar')
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

  const openPlan = (date: string, training: PlannedTraining | null = null) => {
    setSelectedDate(date)
    setEditingPlanned(training)
    setPlanTemplate(undefined)
    setPlannedDialogOpen(true)
  }
  const openActual = (training: ActualTraining | null = null) => {
    setSelectedDate(training?.localDate ?? today)
    setEditingActual(training)
    setActualDialogOpen(true)
  }
  const deleteActual = async (id: string) => {
    await requireSuccessfulSync(tracker.deleteActualTraining(id))
    toast.success(t('triathlon.actual.deleted'))
  }

  return (
    <AppPage className="gap-4 py-5 sm:gap-5 sm:py-8" width="wide">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <AppPageTitle Icon={Activity} title={t('app.triathlonTracker.title')} />
        <div className="flex flex-wrap items-center gap-2">
          {tracker.isPending && <SyncStatus />}
          <Button
            variant={activeTab === 'calendar' ? 'outline' : 'default'}
            onClick={() => openActual()}
          >
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
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="min-w-0 gap-5"
        >
          <TabsList
            aria-label={t('app.triathlonTracker.title')}
            className="grid h-auto w-full grid-cols-3 p-1"
          >
            <TabsTrigger value="calendar" className="min-w-0 gap-2 px-1 py-2.5">
              <CalendarDays
                aria-hidden="true"
                className="hidden size-4 sm:block"
              />
              {t('triathlon.tabs.calendar')}
            </TabsTrigger>
            <TabsTrigger value="journal" className="min-w-0 gap-2 px-1 py-2.5">
              <NotebookPen
                aria-hidden="true"
                className="hidden size-4 sm:block"
              />
              {t('triathlon.tabs.journal')}
            </TabsTrigger>
            <TabsTrigger
              value="statistics"
              className="min-w-0 gap-2 px-1 py-2.5"
            >
              <BarChart3
                aria-hidden="true"
                className="hidden size-4 sm:block"
              />
              {t('triathlon.tabs.statistics')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="calendar" forceMount className="data-[state=inactive]:hidden">
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
          <TabsContent value="journal" forceMount className="data-[state=inactive]:hidden">
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
                onUpdateWeight={(weightKg) =>
                  requireSuccessfulSync(tracker.updateSettings({ weightKg }))
                }
              />
            </Suspense>
          </TabsContent>
        </Tabs>
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
        onOpenChange={setActualDialogOpen}
        onDelete={deleteActual}
        onSave={async (value) => {
          await requireSuccessfulSync(
            editingActual
              ? tracker.updateActualTraining(editingActual.id, value)
              : tracker.addActualTraining(value),
          )
          setActiveTab('journal')
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
