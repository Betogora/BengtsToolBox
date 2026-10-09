import {
  Archive,
  BarChart3,
  ChartNoAxesCombined,
  Plus,
  Trophy,
  UsersRound,
} from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { toast } from 'sonner'

import {
  ArchiveDatasetCard,
  EventTable,
  PlayerCard,
  ProgressChart,
} from '@/apps/progress-dashboard/components'
import { formatNumber } from '@/apps/progress-dashboard/format'
import { useProgressDashboard } from '@/apps/progress-dashboard/hooks/useProgressDashboard'
import type {
  PlayerScore,
  ProgressDataset,
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

function getPodiumRankClass(rank: number) {
  return cn(
    'type-action inline-flex size-9 items-center justify-center rounded-md border bg-card tabular-nums',
    rank === 1 && 'border-[#c9961a]/50 bg-podium-1-strong',
    rank === 2 && 'border-[#aab0b8]/60 bg-podium-2-strong',
    rank === 3 && 'border-[#b8794f]/50 bg-podium-3-strong',
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
  const rankedPlayerScores = [...playerScores].sort(
    (left, right) =>
      right.score - left.score ||
      left.player.position - right.player.position,
  )

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
        <ProgressChart dataset={activeDataset} players={players} />
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
              {t('progress.topList')}
            </h2>
          </div>
          <div className="mt-5 grid gap-3">
            {playerScores.length === 0 ? (
              <EmptyState>{t('progress.emptyPlayers')}</EmptyState>
            ) : (
              rankedPlayerScores.map((playerScore, index) => {
                const rank = index + 1
                const podiumLabel = podiumLabels[index]

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
                      className={getPodiumRankClass(rank)}
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
  const chartAccentStyle = {
    '--progress-accent': leader?.player.color ?? 'var(--primary)',
  } as CSSProperties
  const appTitle = t('app.progressDashboard.title')

  return (
    <AppPage width="wide">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <AppPageTitle
            Icon={ChartNoAxesCombined}
            title={appTitle}
          />
        </div>
        <div className="flex flex-wrap gap-2">
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
          <Badge variant="outline">
            {t('common.playerCount', { count: players.length })}
          </Badge>
          <Badge variant="outline">
            {formatNumber(totalEvents)}
            {unitLabel ? ` ${unitLabel}` : ''}
          </Badge>
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

      <Card
        style={chartAccentStyle}
      >
        <CardHeader className="min-w-0 gap-3 min-[900px]:grid min-[900px]:grid-cols-3 min-[900px]:items-center">
          <div
            className="grid min-w-0 gap-2 rounded-md border p-3"
            style={{ backgroundColor: 'color-mix(in srgb, var(--progress-accent) 12%, var(--card))' }}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy className="size-4 text-[var(--progress-accent)]" />
              {t('progress.leader')}
            </div>
            <div className="type-action min-w-0 break-words">
              {leader ? leader.player.name : '-'}
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="type-metric-lg tabular-nums">
                {formatNumber(leader?.score ?? 0)}
              </span>
              {unitLabel && <span className="type-ui break-all text-muted-foreground">{unitLabel}</span>}
            </div>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <div className="type-caption text-muted-foreground">{t('progress.totalScore')}</div>
            <div className="type-action tabular-nums">
              {formatNumber(totalScore)}{unitLabel ? ` ${unitLabel}` : ''}
            </div>
          </div>
          <IftaInput
            aria-label={t('progress.unitAria')}
            label={t('progress.unitAria')}
            value={activeDataset.unit}
            onChange={(event) =>
              updateActiveDatasetMeta('unit', event.currentTarget.value)
            }
          />
        </CardHeader>
        <CardContent className="min-w-0 px-3 pb-4 sm:px-6 sm:pb-6">
          <ProgressChart
            dataset={activeDataset}
            mode="dashboard"
            players={players}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="type-section-title flex items-center gap-2">
            <UsersRound className="size-5 text-primary" />
            {t('progress.players')}
          </h2>
          {(isLoading || isPending) && (
            <p className="type-ui mt-1 text-muted-foreground">
              {t('common.syncing')}
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {playerScores.map((playerScore) => (
          <PlayerCard
            key={playerScore.player.id}
            drinkIcons={progressDrinkIcons}
            playerScore={playerScore}
            unit={activeDataset.unit}
            onAddEvent={async (player, icon) => {
              const didSave = await addEvent(player, icon)

              if (didSave) {
                toast.success(
                  t('progress.savedDelta', {
                    delta: icon === 'schnaps' ? '+0,5' : '+1',
                  }),
                )
              } else {
                toast.error(t('common.syncError'))
              }
            }}
            onColorChange={(playerId, color) => updatePlayerColor(playerId, color)}
            onDefaultIconChange={(playerId, icon) =>
              updatePlayerDefaultEventIcon(playerId, icon)
            }
            onNameChange={(playerId, name) => updatePlayerName(playerId, name)}
            onRemove={async (playerId) => {
              if (!(await removePlayer(playerId)).ok) return
              toast.success(t('progress.playerRemoved'))
            }}
          />
        ))}
        <Card className="min-h-[13.25rem] border-dashed">
          <CardContent className="flex h-full items-center justify-center p-6">
            <Button
              className="h-24 w-full flex-col gap-2"
              variant="outline"
              onClick={async () => {
                if (!(await addPlayer()).ok) return
                toast.success(t('progress.playerAdded'))
              }}
            >
              <Plus className="size-6" />
              {t('progress.addPlayer')}
            </Button>
          </CardContent>
        </Card>
      </section>

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
        {isActiveDatasetOpen && (
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
          <CardTitle className="flex items-center gap-2">
            <Archive className="size-5 text-primary" />
            {t('common.oldDatasets')}
          </CardTitle>
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
    </AppPage>
  )
}
