import {
  Archive,
  BarChart3,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { IftaInput } from '@/components/ui/ifta-field'
import { cn } from '@/lib/utils'

const podiumLabels = ['Gold', 'Silber', 'Bronze'] as const

function getPodiumRowClass(rank: number) {
  return cn(
    'grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md border bg-background p-3',
    rank === 1 && 'border-[#c9961a]/45 bg-[#f6e3a5]/65',
    rank === 2 && 'border-[#aab0b8]/50 bg-[#e6e8eb]/70',
    rank === 3 && 'border-[#b8794f]/45 bg-[#e8c0a0]/55',
  )
}

function getPodiumRankClass(rank: number) {
  return cn(
    'type-action inline-flex size-9 items-center justify-center rounded-md border bg-card tabular-nums',
    rank === 1 && 'border-[#c9961a]/50 bg-[#f6d36b]/70',
    rank === 2 && 'border-[#aab0b8]/60 bg-[#d8dde3]/80',
    rank === 3 && 'border-[#b8794f]/50 bg-[#d79a70]/65',
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
          <p className="type-label text-muted-foreground">Führung</p>
          <div className="type-section-title mt-2 truncate">
            {leader?.player.name ?? '-'}
          </div>
          <div className="type-metric-xl mt-3">
            {formatNumber(leader?.score ?? 0)}
          </div>
          <p className="type-ui mt-2 text-muted-foreground">
            von {formatNumber(totalScore)}
            {unitLabel ? ` ${unitLabel}` : ''}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            <h2 className="type-section-title">
              Topliste
            </h2>
          </div>
          <div className="mt-5 grid gap-3">
            {playerScores.length === 0 ? (
              <EmptyState>Keine Spieler vorhanden.</EmptyState>
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
                        podiumLabel ? `${podiumLabel}: Platz ${rank}` : `Platz ${rank}`
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
  const {
    activeDataset,
    addEvent,
    addPlayer,
    archivedDatasets,
    deleteDataset,
    deleteEvent,
    error,
    isLoading,
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

  return (
    <AppPage width="wide">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <AppPageTitle
            Icon={ChartNoAxesCombined}
            title="Fortschritts-Dashboard"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <PresenterLauncher
            appTitle="Fortschritts-Dashboard"
            views={[
              {
                id: 'overview',
                label: 'Überblick',
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
          <Badge variant="outline">{players.length} Spieler</Badge>
          <Badge variant="outline">
            {formatNumber(totalEvents)}
            {unitLabel ? ` ${unitLabel}` : ''}
          </Badge>
        </div>
      </section>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Firebase-Fehler</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card style={chartAccentStyle}>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 rounded-lg border bg-secondary/60 p-3 md:flex-row md:items-center md:justify-between">
            <div className="type-ui flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Trophy className="size-4 text-[var(--progress-accent)]" />
                Führung
              </div>
              <div className="type-action min-w-0 truncate">
                {leader ? leader.player.name : '-'}
              </div>
              <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                <span className="type-action tabular-nums">
                  {formatNumber(leader?.score ?? 0)}
                </span>
                <span>
                  von {formatNumber(totalScore)}
                  {unitLabel ? ` ${unitLabel}` : ''}
                </span>
              </div>
            </div>
            <div className="w-full md:w-64">
              <IftaInput
                aria-label="Einheit"
                label="Einheit"
                value={activeDataset.unit}
                onChange={(event) =>
                  updateActiveDatasetMeta('unit', event.currentTarget.value)
                }
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ProgressChart
            dataset={activeDataset}
            players={players}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="type-section-title flex items-center gap-2">
            <UsersRound className="size-5 text-primary" />
            Spieler
          </h2>
          {isLoading && (
            <p className="type-ui mt-1 text-muted-foreground">Synchronisiere...</p>
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
                toast.success(icon === 'schnaps' ? '+0,5 gespeichert.' : '+1 gespeichert.')
              } else {
                toast.error('Der Stand kann nicht unter 0 fallen.')
              }
            }}
            onColorChange={(playerId, color) => updatePlayerColor(playerId, color)}
            onDefaultIconChange={(playerId, icon) =>
              updatePlayerDefaultEventIcon(playerId, icon)
            }
            onNameChange={(playerId, name) => updatePlayerName(playerId, name)}
            onRemove={async (playerId) => {
              await removePlayer(playerId)
              toast.success('Spieler wurde entfernt.')
            }}
          />
        ))}
        <Card className="min-h-[13.25rem] border-dashed">
          <CardContent className="flex h-full items-center justify-center p-6">
            <Button
              className="h-24 w-full flex-col gap-2"
              variant="outline"
              onClick={async () => {
                await addPlayer()
                toast.success('Person hinzugefügt.')
              }}
            >
              <Plus className="size-6" />
              Spieler hinzufügen
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => setIsActiveDatasetOpen((current) => !current)}
            >
              {isActiveDatasetOpen ? (
                <ChevronDown className="size-4 shrink-0" />
              ) : (
                <ChevronRight className="size-4 shrink-0" />
              )}
              <BarChart3 className="size-5 text-primary" />
              <span className="type-action">Datensatz</span>
              <span className="type-caption text-muted-foreground">
                {formatNumber(totalEvents)} Ereignisse
              </span>
            </button>
            <AppResetButton
              title="Datensatz archivieren und neu starten?"
              description="Der aktuelle Datensatz wird als alter Datensatz gespeichert. Danach startet ein neuer leerer Datensatz."
              onConfirm={async () => {
                await resetAndArchiveDataset()
                toast.success('Datensatz archiviert und neu gestartet.')
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
              await deleteEvent(eventId)
              toast.success('Ereignis gelöscht.')
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
            Alte Datensätze
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {archivedDatasets.length === 0 ? (
            <EmptyState>
              Noch keine archivierten Datensätze.
            </EmptyState>
          ) : (
            archivedDatasets.map((dataset) => (
              <ArchiveDatasetCard
                key={dataset.id}
                dataset={dataset}
                onDelete={async (datasetId) => {
                  await deleteDataset(datasetId)
                  toast.success('Datensatz gelöscht.')
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
