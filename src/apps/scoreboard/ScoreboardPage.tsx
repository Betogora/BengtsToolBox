import {
  History,
  ListOrdered,
  Plus,
  Trophy,
  Undo2,
  UsersRound,
} from 'lucide-react'
import { toast } from 'sonner'

import type { ScoreboardEvent, ScoreboardPlayer } from '@/apps/scoreboard/types'
import { useScoreboard } from '@/apps/scoreboard/hooks/useScoreboard'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { AppPage } from '@/apps/shared/components/AppPage'
import { AppResetButton } from '@/apps/shared/components/AppResetButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { PlayerCard } from '@/apps/shared/components/PlayerCard'
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
import { Separator } from '@/components/ui/separator'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

function formatSignedNumber(value: number) {
  const sign = value > 0 ? '+' : ''

  return `${sign}${value}`
}

function formatEventTime(
  value: string,
  formatTime: ReturnType<typeof useI18n>['formatTime'],
) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return formatTime(date, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RecentEvents({ events }: { events: ScoreboardEvent[] }) {
  const { formatTime, t } = useI18n()

  if (events.length === 0) {
    return (
      <EmptyState className="p-4 text-left">
        {t('scoreboard.emptyHistory')}
      </EmptyState>
    )
  }

  return (
    <div className="grid gap-2">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex min-w-0 items-center justify-between gap-3 rounded-md border p-3"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: event.playerColor }}
            />
            <span className="type-label min-w-0 truncate">
              {event.playerName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={event.delta > 0 ? 'default' : 'outline'}>
              {formatSignedNumber(event.delta)}
            </Badge>
            <span className="type-caption w-12 text-right text-muted-foreground tabular-nums">
              {formatEventTime(event.createdAtClientIso, formatTime)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ScoreboardPresenter({
  leader,
  recentEvents,
  sortedPlayers,
  teamSummaries,
  totalScore,
  unassignedScore,
}: {
  leader: ScoreboardPlayer | null
  recentEvents: ScoreboardEvent[]
  sortedPlayers: ScoreboardPlayer[]
  teamSummaries: Array<{
    className: string
    dotClassName: string
    id: string
    memberCount: number
    name: string
    nameKey: TranslationKey
    score: number
  }>
  totalScore: number
  unassignedScore: number
}) {
  const { t } = useI18n()
  const lastEvent = recentEvents[0]
  const scoreboardTitle = t('app.scoreboard.title')

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="type-section-title truncate">
          {scoreboardTitle}
        </h2>

        <div className="mt-6 grid gap-3">
          {sortedPlayers.length === 0 ? (
            <EmptyState>{t('scoreboard.emptyPlayers')}</EmptyState>
          ) : (
            sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={cn(
                  'grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-4 rounded-md border bg-background p-4',
                  index === 0 && 'border-primary bg-secondary/65',
                )}
              >
                <div className="type-metric-sm">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <div className="type-section-title truncate">
                    {player.name}
                  </div>
                </div>
                <div className="type-metric-lg">
                  {player.score}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="type-label text-muted-foreground">
            {t('progress.leader')}
          </p>
          <div className="type-section-title mt-2 truncate">
            {leader?.name ?? '-'}
          </div>
          <div className="type-metric-xl mt-3">
            {leader?.score ?? 0}
          </div>
        </div>

        <div className="grid gap-3">
          {teamSummaries.map((team) => (
            <div
              key={team.id}
              className={cn('rounded-lg border p-4', team.className)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="type-action flex min-w-0 items-center gap-2">
                  <span className={cn('size-3 rounded-full', team.dotClassName)} />
                  <span className="truncate">{t(team.nameKey)}</span>
                </div>
                <div className="type-metric-md">
                  {team.score}
                </div>
              </div>
              <div className="type-ui mt-1 tabular-nums">
                {t('scoreboard.memberCount', { count: team.memberCount })}
              </div>
            </div>
          ))}
          {unassignedScore > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="type-action">{t('scoreboard.noTeam')}</div>
                <div className="type-metric-md">
                  {unassignedScore}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="type-label text-muted-foreground">
                {t('scoreboard.total')}
              </p>
              <div className="type-metric-md">
                {totalScore}
              </div>
            </div>
            {lastEvent && (
              <div className="min-w-0 text-right">
                <p className="type-label text-muted-foreground">
                  {t('scoreboard.lastChange')}
                </p>
                <div className="type-action truncate">
                  {lastEvent.playerName} {formatSignedNumber(lastEvent.delta)}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}

export function ScoreboardPage() {
  const { t } = useI18n()
  const {
    addPlayer,
    changeScore,
    error,
    isLoading,
    leader,
    players,
    recentEvents,
    removePlayer,
    resetScores,
    sortedPlayers,
    teamSummaries,
    totalScore,
    unassignedPlayers,
    unassignedScore,
    undoLastScoreChange,
    updatePlayerName,
    updatePlayerTeam,
  } = useScoreboard()
  const scoreboardTitle = t('app.scoreboard.title')

  const handleChangeScore = async (playerId: string, delta: number) => {
    const result = await changeScore(playerId, delta)

    if (result === 'saved') {
      toast.success(t('scoreboard.saved', { delta: formatSignedNumber(delta) }))
      return
    }

    if (result === 'blocked') {
      toast.error(t('scoreboard.error.scoreBelowZero'))
      return
    }

    toast.error(t('scoreboard.error.notFound'))
  }

  const handleUndo = async () => {
    const result = await undoLastScoreChange()

    if (result === 'undone') {
      toast.success(t('scoreboard.undoSuccess'))
      return
    }

    if (result === 'empty') {
      toast.error(t('scoreboard.error.noHistory'))
      return
    }

    toast.error(t('scoreboard.error.lastPlayerMissing'))
  }

  return (
    <AppPage width="wide">
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <AppPageTitle Icon={ListOrdered} title={scoreboardTitle} />
        </div>

        <div className="flex flex-wrap gap-2">
          <PresenterLauncher
            appTitle={scoreboardTitle}
            views={[
              {
                id: 'ranking',
                label: t('scoreboard.ranking'),
                Icon: Trophy,
                render: () => (
                  <ScoreboardPresenter
                    leader={leader}
                    recentEvents={recentEvents}
                    sortedPlayers={sortedPlayers}
                    teamSummaries={teamSummaries}
                    totalScore={totalScore}
                    unassignedScore={unassignedScore}
                  />
                ),
              },
            ]}
          />
          <Button
            variant="outline"
            disabled={recentEvents.length === 0}
            onClick={handleUndo}
          >
            <Undo2 className="size-4" />
            Undo
          </Button>
          <AppResetButton
            title={t('scoreboard.resetTitle')}
            description={t('scoreboard.resetDescription')}
            onConfirm={async () => {
              await resetScores()
              toast.success(t('scoreboard.resetSuccess'))
            }}
          />
        </div>
      </section>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>{t('common.firebaseError')}</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-5 text-primary" />
                {t('scoreboard.teamScores')}
              </CardTitle>
              {isLoading && (
                <CardDescription>{t('common.syncing')}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-lg bg-secondary p-4">
                <div className="type-ui text-muted-foreground">
                  {t('scoreboard.leaderWithName', {
                    name: leader ? leader.name : '-',
                  })}
                </div>
                <div className="type-metric-lg">
                  {leader?.score ?? 0}
                </div>
              </div>

              <div className="grid gap-3">
                {teamSummaries.map((team) => (
                  <div
                    key={team.id}
                    className={cn('rounded-lg border p-4', team.className)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="type-action flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            'size-3 shrink-0 rounded-full',
                            team.dotClassName,
                          )}
                        />
                        <span className="min-w-0 truncate">{t(team.nameKey)}</span>
                      </div>
                      <div className="type-metric-sm">
                        {team.score}
                      </div>
                    </div>
                    <div className="type-ui mt-1 tabular-nums">
                      {t('scoreboard.memberCount', { count: team.memberCount })}
                    </div>
                  </div>
                ))}

                {unassignedPlayers.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="type-action">{t('scoreboard.noTeam')}</div>
                      <div className="type-metric-sm">
                        {unassignedScore}
                      </div>
                    </div>
                    <div className="type-ui mt-1 text-muted-foreground tabular-nums">
                      {t('scoreboard.memberCount', {
                        count: unassignedPlayers.length,
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="type-ui rounded-lg border p-3">
                <div className="text-muted-foreground">{t('scoreboard.total')}</div>
                <div className="type-metric-sm">
                  {totalScore}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <History className="size-5 text-primary" />
                {t('common.history')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentEvents events={recentEvents} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="type-section-title flex items-center gap-2">
              <UsersRound className="size-5 text-primary" />
              {t('scoreboard.people')}
            </h2>
            <Button
              onClick={async () => {
                await addPlayer()
                toast.success(t('scoreboard.personAdded'))
              }}
            >
              <Plus className="size-4" />
              {t('scoreboard.person')}
            </Button>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                score={player.score}
                onDecrement={() => handleChangeScore(player.id, -1)}
                onIncrement={() => handleChangeScore(player.id, 1)}
                onIncrementLarge={() => handleChangeScore(player.id, 5)}
                onNameChange={(name) => updatePlayerName(player.id, name)}
                onRemove={async () => {
                  await removePlayer(player.id)
                  toast.success(t('scoreboard.personRemoved', { name: player.name }))
                }}
                onTeamChange={(teamId) => updatePlayerTeam(player.id, teamId)}
              />
            ))}
            {players.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex min-h-64 items-center justify-center p-6">
                  <Button
                    className="h-24 w-full flex-col gap-2"
                    variant="outline"
                    onClick={async () => {
                      await addPlayer()
                      toast.success(t('scoreboard.personAdded'))
                    }}
                  >
                    <Plus className="size-6" />
                    {t('scoreboard.addPerson')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </AppPage>
  )
}
