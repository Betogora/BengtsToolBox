import {
  Archive,
  BarChart3,
  ChartNoAxesCombined,
  Plus,
  Trophy,
  UsersRound,
} from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { ArchiveDatasetCard } from '@/apps/progress-dashboard/ArchiveDatasetCard'
import { DashboardProgressChart } from '@/apps/progress-dashboard/DashboardProgressChart'
import { EventTable } from '@/apps/progress-dashboard/EventTable'
import { PlayerSetupList } from '@/apps/progress-dashboard/PlayerSetupList'
import { ProgressEntryDialog } from '@/apps/progress-dashboard/ProgressEntryDialog'
import { formatNumber } from '@/apps/progress-dashboard/format'
import { getPlayerStandings, rankPlayerScores } from '@/apps/progress-dashboard/logic'
import { getPodiumRankClass } from '@/apps/shared/podium'
import { useProgressDashboard } from '@/apps/progress-dashboard/hooks/useProgressDashboard'
import { useProgressTooltipText } from '@/apps/progress-dashboard/progressTooltipText'
import type {
  PlayerScore,
  ProgressDataset,
  ProgressDrinkIcon,
  ProgressPlayer,
} from '@/apps/progress-dashboard/types'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { AppPage } from '@/apps/shared/components/AppPage'
import { AppResetButton } from '@/apps/shared/components/AppResetButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { PresenterLauncher } from '@/apps/shared/components/Presenter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DisclosureIndicator } from '@/components/ui/disclosure'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { IftaInput } from '@/components/ui/ifta-field'
import { Tooltip } from '@/components/ui/tooltip'
import { useI18n } from '@/lib/i18n'
import { syncErrorMessageKey } from '@/lib/firebase/syncError'
import { cn } from '@/lib/utils'


function getPodiumRowClass(rank: number) {
  return cn(
    'grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md border bg-background p-3',
    rank === 1 && 'border-[#c9961a]/45 bg-podium-1',
    rank === 2 && 'border-[#aab0b8]/50 bg-podium-2',
    rank === 3 && 'border-[#b8794f]/45 bg-podium-3',
  )
}

function ProgressDashboardPresenter({
  activeDataset,
  leader,
  playerScores,
  players,
  totalEvents,
  totalScore,
  unitLabel,
}: {
  activeDataset: ProgressDataset
  leader: PlayerScore | undefined
  playerScores: PlayerScore[]
  players: ProgressPlayer[]
  totalEvents: number
  totalScore: number
  unitLabel: string
}) {
  const { t } = useI18n()
  const podiumLabels = ['Gold', 'Silber', 'Bronze'] as const
  const rankedPlayerScores = rankPlayerScores(playerScores)

  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="type-label text-muted-foreground">
              {activeDataset.name}
            </p>
            <h2 className="type-section-title truncate">
              {activeDataset.chartTitle}
            </h2>
          </div>
          <Badge variant="outline">
            {formatNumber(totalEvents)}
            {unitLabel ? ` ${unitLabel}` : ''}
          </Badge>
        </div>
        <DashboardProgressChart
          className="h-[320px] md:h-[440px]"
          dataset={activeDataset}
          players={players}
        />
      </section>

      <aside className="grid content-start gap-4">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="type-label text-muted-foreground">
            {t('progress.leader')}
          </p>
          <div className="type-section-title mt-2 truncate">
            {leader?.player.name ?? '-'}
          </div>
          <div className="type-metric-xl mt-3">
            {formatNumber(leader?.score ?? 0)}
          </div>
          <p className="type-ui mt-2 text-muted-foreground">
            {t('progress.ofTotal', { total: formatNumber(totalScore) })}
            {unitLabel ? ` ${unitLabel}` : ''}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            <h2 className="type-section-title">
              {t('progress.ranking')}
            </h2>
          </div>
          <div className="mt-5 grid gap-3">
            {playerScores.length === 0 ? (
              <EmptyState>{t('progress.emptyPlayers')}</EmptyState>
            ) : (
              rankedPlayerScores.map((playerScore) => {
                const { rank } = playerScore
                const podiumLabel = podiumLabels[rank - 1]

                return (
                  <div
                    key={playerScore.player.id}
                    className={getPodiumRowClass(rank)}
                  >
                    <div
                      aria-label={
                        podiumLabel
                          ? `${podiumLabel}: ${t('progress.rank', { rank })}`
                          : t('progress.rank', { rank })
                      }
                      className={cn(getPodiumRankClass(rank), 'type-action size-9')}
                      title={podiumLabel}
                    >
                      {rank}
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: playerScore.player.color }}
                      />
                      <span className="type-action truncate">
                        {playerScore.player.name}
                      </span>
                    </div>
                    <div className="type-metric-sm inline-flex min-w-16 items-center justify-center rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
                      {formatNumber(playerScore.score)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}


export function ProgressDashboardPage() {
  const { t } = useI18n()
  const {
    activeDataset,
    addEvent,
    addPlayer,
    archivedDatasets,
    deleteDataset,
    deleteEvent,
    error,
    isLoading,
    isPending,
    leader,
    playerScores,
    players,
    progressDrinkIcons,
    progressEventIcons,
    removePlayer,
    resetAndArchiveDataset,
    updateActiveDatasetMeta,
    updateArchivedDatasetName,
    updateEvent,
    updatePlayerColor,
    updatePlayerDefaultEventIcon,
    updatePlayerName,
  } = useProgressDashboard()
  const totalEvents = activeDataset.events.length
  const totalScore = playerScores.reduce((sum, entry) => sum + entry.score, 0)
  const unitLabel = activeDataset.unit.trim()
  const [isActiveDatasetOpen, setIsActiveDatasetOpen] = useState(false)
  // Der Pfeil dreht sofort; die teure Tabelle folgt unterbrechbar im Hintergrund.
  const isActiveDatasetContentOpen = useDeferredValue(isActiveDatasetOpen)
  const [isPlayerSetupOpen, setIsPlayerSetupOpen] = useState(false)
  // Der Schlüssel setzt den Dialog bei jedem Öffnen auf den Ausgangszustand zurück.
  const [entry, setEntry] = useState({ key: 0, open: false })
  const appTitle = t('app.progressDashboard.title')
  const rankedPlayerScores = rankPlayerScores(playerScores)
  // Sortiert alle Ereignisse; nur bei neuen Daten, nicht bei jedem Aufklappen neu berechnen.
  const standings = useMemo(
    () => getPlayerStandings(playerScores, activeDataset.events),
    [activeDataset.events, playerScores],
  )
  const tooltipText = useProgressTooltipText()
  // Ohne Punkte führt niemand.
  const shownLeader = leader && leader.score > 0 ? leader : undefined
  const leaderStanding = shownLeader && standings.get(shownLeader.player.id)

  const addDrink = async (
    player: ProgressPlayer,
    icon: ProgressDrinkIcon,
    amount: number,
  ) => {
    const didSave = await addEvent(player, icon, amount)

    if (!didSave) {
      toast.error(t('common.syncError'))
      return
    }

    toast.success(t('progress.savedDelta', { delta: `+${formatNumber(amount)}` }))
    // Das zuletzt gewählte Getränk wird beim nächsten Eintrag vorgeschlagen.
    if (icon !== player.defaultEventIcon) {
      void updatePlayerDefaultEventIcon(player.id, icon)
    }
  }

  const entryButton = (className?: string) => (
    <Button
      className={cn('h-11 w-full', className)}
      onClick={() => setEntry((current) => ({ key: current.key + 1, open: true }))}
    >
      <Plus />
      {t('progress.entry.open')}
    </Button>
  )

  return (
    <AppPage width="wide" className="pb-28 lg:pb-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <AppPageTitle Icon={ChartNoAxesCombined} title={appTitle} />
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Tooltip
            disabled={!leaderStanding}
            side="bottom"
            title={leaderStanding ? tooltipText.standing(leaderStanding) : ''}
            description={leaderStanding && tooltipText.lastEvent(leaderStanding)}
          >
            <div
              data-progress-leader
              className="type-action inline-flex h-9 min-w-0 items-center gap-2 rounded-md border bg-card px-3 shadow-xs"
            >
              <Trophy aria-hidden="true" className="size-4 shrink-0 text-primary" />
              {shownLeader ? (
                <>
                  <span className="sr-only">{t('progress.leader')}:</span>
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: shownLeader.player.color }}
                  />
                  <span className="min-w-0 max-w-40 truncate">{shownLeader.player.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatNumber(shownLeader.score)}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">{t('progress.leader')}: –</span>
              )}
            </div>
          </Tooltip>
          <PresenterLauncher
            appTitle={appTitle}
            views={[
              {
                id: 'overview',
                label: t('progress.chart.overview'),
                Icon: ChartNoAxesCombined,
                render: () => (
                  <ProgressDashboardPresenter
                    activeDataset={activeDataset}
                    leader={leader}
                    playerScores={playerScores}
                    players={players}
                    totalEvents={totalEvents}
                    totalScore={totalScore}
                    unitLabel={unitLabel}
                  />
                ),
              },
            ]}
          />
        </div>
      </section>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>{t('common.firebaseError')}</CardTitle>
            <CardDescription>{t(syncErrorMessageKey(error))}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
        {/* Auf schmalen Ansichten bleibt das Diagramm angeheftet, solange die Rangliste läuft. */}
        <div className="sticky top-[4.5rem] z-10 -mx-4 border-b bg-background px-4 pb-2 sm:-mx-6 sm:px-6 lg:top-[5.5rem] lg:mx-0 lg:border-0 lg:px-0 lg:pb-0">
          <DashboardProgressChart
            className="h-[250px] md:h-[400px] lg:h-[540px]"
            dataset={activeDataset}
            players={players}
          />
        </div>

        <section className="grid gap-3" aria-labelledby="progress-top-list-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="progress-top-list-title" className="type-section-title">
              {t('progress.ranking')}
            </h2>
            <span className="type-ui tabular-nums text-muted-foreground">
              {formatNumber(totalScore)}
              {unitLabel ? ` ${unitLabel}` : ''}
            </span>
          </div>
          <Card className="gap-0 py-0">
            {rankedPlayerScores.length === 0 ? (
              <EmptyState className="m-3">{t('progress.emptyPlayers')}</EmptyState>
            ) : (
              <ol aria-labelledby="progress-top-list-title" className="divide-y">
                {rankedPlayerScores.map(({ player, rank, score }) => {
                  const standing = standings.get(player.id)

                  return (
                    <Tooltip
                      key={player.id}
                      disabled={!standing}
                      side="left"
                      title={player.name}
                      description={
                        standing && (
                          <>
                            {tooltipText.standing(standing)}
                            <br />
                            {tooltipText.lastEvent(standing)}
                          </>
                        )
                      }
                    >
                      <li className="grid min-h-14 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-3">
                        <span className={cn(getPodiumRankClass(score > 0 ? rank : 0), 'type-action size-8')}>
                          {rank}
                        </span>
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: player.color }}
                          />
                          <span className="type-action truncate">{player.name}</span>
                        </span>
                        <span className="type-metric-sm tabular-nums">
                          {formatNumber(score)}
                        </span>
                      </li>
                    </Tooltip>
                  )
                })}
              </ol>
            )}
          </Card>
          {entryButton('hidden lg:inline-flex')}
          {(isLoading || isPending) && (
            <p className="type-ui text-muted-foreground">{t('common.syncing')}</p>
          )}
        </section>
      </div>

      <Card>
        <CardHeader>
          <button
            className="flex min-h-11 min-w-0 items-center gap-2 text-left"
            aria-expanded={isPlayerSetupOpen}
            onClick={() => setIsPlayerSetupOpen((current) => !current)}
          >
            <UsersRound className="size-5 text-primary" />
            <span className="type-action">{t('progress.players')}</span>
            <span className="type-caption text-muted-foreground">
              {t('common.playerCount', { count: players.length })}
            </span>
            <DisclosureIndicator isOpen={isPlayerSetupOpen} className="ml-auto" />
          </button>
        </CardHeader>
        {isPlayerSetupOpen && (
          <CardContent>
            <PlayerSetupList
              playerScores={playerScores}
              unitInput={
                <IftaInput
                  aria-label={t('progress.unitAria')}
                  label={t('progress.unitAria')}
                  value={activeDataset.unit}
                  onChange={(event) =>
                    updateActiveDatasetMeta('unit', event.currentTarget.value)
                  }
                />
              }
              onAdd={async () => {
                if (!(await addPlayer()).ok) return
                toast.success(t('progress.playerAdded'))
              }}
              onColorChange={(playerId, color) => updatePlayerColor(playerId, color)}
              onNameChange={(playerId, name) => updatePlayerName(playerId, name)}
              onRemove={async (playerId) => {
                if (!(await removePlayer(playerId)).ok) return
                toast.success(t('progress.playerRemoved'))
              }}
            />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
              aria-expanded={isActiveDatasetOpen}
              onClick={() => setIsActiveDatasetOpen((current) => !current)}
            >
              <BarChart3 className="size-5 text-primary" />
              <span className="type-action">{t('common.dataset')}</span>
              <span className="type-caption text-muted-foreground">
                {t('progress.eventCount', { count: formatNumber(totalEvents) })}
              </span>
              <DisclosureIndicator isOpen={isActiveDatasetOpen} className="ml-auto" />
            </button>
            <AppResetButton
              mode="dialog"
              title={t('progress.archive.restartTitle')}
              description={t('progress.archive.restartDescription')}
              onConfirm={async () => {
                if (!(await resetAndArchiveDataset()).ok) return
                toast.success(t('progress.archive.restartSuccess'))
              }}
            />
          </div>
        </CardHeader>
        {isActiveDatasetContentOpen && (
          <CardContent>
          <EventTable
            dataset={activeDataset}
            icons={progressEventIcons}
            onDeleteEvent={async (eventId) => {
              if (!(await deleteEvent(eventId)).ok) return
              toast.success(t('progress.eventDeleted'))
            }}
            onUpdateEvent={(eventId, partialValue) => updateEvent(eventId, partialValue)}
          />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex min-h-11 items-center gap-2">
            <Archive className="size-5 text-primary" />
            <span className="type-action">{t('common.oldDatasets')}</span>
          </h2>
        </CardHeader>
        <CardContent className="grid gap-3">
          {archivedDatasets.length === 0 ? (
            <EmptyState>
              {t('progress.oldDatasetsEmpty')}
            </EmptyState>
          ) : (
            archivedDatasets.map((dataset) => (
              <ArchiveDatasetCard
                key={dataset.id}
                dataset={dataset}
                onDelete={async (datasetId) => {
                  if (!(await deleteDataset(datasetId)).ok) return
                  toast.success(t('progress.datasetDeleted'))
                }}
                onRename={(datasetId, name) =>
                  updateArchivedDatasetName(datasetId, name)
                }
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Mobil und auf dem Tablet sitzt der zentrale Eintragen-Knopf am unteren Rand. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto max-w-xl">{entryButton()}</div>
      </div>

      <ProgressEntryDialog
        key={entry.key}
        drinkIcons={progressDrinkIcons}
        open={entry.open}
        players={players}
        onOpenChange={(open) => setEntry((current) => ({ ...current, open }))}
        onSave={(player, icon, amount) => void addDrink(player, icon, amount)}
      />
    </AppPage>
  )
}
