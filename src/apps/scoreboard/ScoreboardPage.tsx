import {
  Archive,
  ChevronDown,
  ChevronRight,
  History,
  ListOrdered,
  RotateCcw,
  Trophy,
  Undo2,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  AddCard,
  ArchiveCard,
  HistoryList,
  ModeToggle,
  RankingBars,
  RosterPlayerCard,
  ScoreTargetCard,
} from '@/apps/scoreboard/components'
import { useScoreboard } from '@/apps/scoreboard/hooks/useScoreboard'
import type { ScoreboardStanding, ScoreTargetType } from '@/apps/scoreboard/types'
import { AppPage } from '@/apps/shared/components/AppPage'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
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
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

function ScoreboardPresenter({ standings }: { standings: ScoreboardStanding[] }) {
  const { formatNumber, t } = useI18n()

  if (standings.length >= 3) {
    return (
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="type-section-title flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          {t('scoreboard.currentStand')}
        </h2>
        <div className="mt-5">
          <RankingBars standings={standings} />
        </div>
      </section>
    )
  }

  return (
    <div className="grid flex-1 gap-5 md:grid-cols-2">
      {standings.map((standing) => (
        <section
          key={standing.target.id}
          className="flex min-h-64 flex-col justify-between rounded-lg border bg-card p-6 shadow-sm"
          style={{ borderTopColor: standing.target.color, borderTopWidth: '0.35rem' }}
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="type-page-title min-w-0 truncate">{standing.target.name}</h2>
            <Badge variant="outline">#{standing.rank}</Badge>
          </div>
          <div className="type-metric-xl text-center tabular-nums">
            {formatNumber(standing.score)}
          </div>
          <div className="type-label text-center text-muted-foreground">
            {t('scoreboard.points')}
          </div>
        </section>
      ))}
    </div>
  )
}

export function ScoreboardPage() {
  const { formatNumber, t } = useI18n()
  const scoreboard = useScoreboard()
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const appTitle = t('app.scoreboard.title')
  const scoresByTargetId = useMemo(
    () => new Map(scoreboard.standings.map((standing) => [standing.target.id, standing.score])),
    [scoreboard.standings],
  )
  const playerScoresById = useMemo(
    () =>
      new Map(
        scoreboard.playerStandings.map((standing) => [standing.target.id, standing.score]),
      ),
    [scoreboard.playerStandings],
  )

  const handleRemovePlayer = async (playerId: string) => {
    const result = await scoreboard.removePlayer(playerId)

    if (result === 'minimum') {
      toast.error(t('scoreboard.error.minimumPlayers'))
    } else if (result === 'scored') {
      toast.error(t('scoreboard.error.targetHasBookings'))
    } else {
      toast.success(t('scoreboard.playerRemoved'))
    }
  }

  const handleRemoveTeam = async (teamId: string) => {
    const result = await scoreboard.removeTeam(teamId)

    if (result === 'minimum') {
      toast.error(t('scoreboard.error.minimumTeams'))
    } else if (result === 'scored') {
      toast.error(t('scoreboard.error.targetHasBookings'))
    } else {
      toast.success(t('scoreboard.teamRemoved'))
    }
  }

  const handleScore = async (
    targetType: ScoreTargetType,
    targetId: string,
    delta: number,
  ) => {
    const didSave = await scoreboard.addScore(targetType, targetId, delta)

    if (didSave) {
      toast.success(
        t('scoreboard.scoreSaved', {
          delta: `${delta > 0 ? '+' : ''}${formatNumber(delta)}`,
        }),
      )
    } else {
      toast.error(t('scoreboard.error.invalidDelta'))
    }
  }

  return (
    <AppPage width="wide">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <AppPageTitle Icon={ListOrdered} title={appTitle} />
        <PresenterLauncher
          appTitle={appTitle}
          views={[
            {
              id: 'stand',
              label: t('scoreboard.currentStand'),
              Icon: Trophy,
              render: () => <ScoreboardPresenter standings={scoreboard.standings} />,
            },
          ]}
        />
      </section>

      {scoreboard.error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>{t('common.syncError')}</CardTitle>
            <CardDescription>{scoreboard.error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <div className="type-caption text-muted-foreground">
              {t('scoreboard.activeScoring')}
            </div>
            <InlineTextEdit
              ariaLabel={t('scoreboard.scoringNameAria')}
              className="type-section-title py-1"
              fallback={t('scoreboard.scoringFallback')}
              inputClassName="type-section-title h-11"
              value={scoreboard.activeScoring.name}
              onSave={(name) => scoreboard.updateScoringName(scoreboard.activeScoring.id, name)}
            />
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            {scoreboard.isLoading && <Badge variant="outline">{t('common.syncing')}</Badge>}
            <ModeToggle
              disabled={scoreboard.activeEvents.length > 0}
              mode={scoreboard.activeScoring.mode}
              onChange={async (mode) => {
                const didChange = await scoreboard.changeMode(mode)
                if (!didChange) toast.error(t('scoreboard.error.modeLocked'))
              }}
            />
          </div>
        </CardContent>
      </Card>

      {scoreboard.targets.length >= 3 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              {t('scoreboard.currentStand')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RankingBars standings={scoreboard.standings} />
          </CardContent>
        </Card>
      )}

      {scoreboard.activeScoring.mode === 'teams' && (
        <section className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="type-section-title flex items-center gap-2">
              <UsersRound className="size-5 text-primary" />
              {t('scoreboard.players')}
            </h2>
            <Badge variant="outline">{scoreboard.players.length}</Badge>
          </div>
          <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {scoreboard.rosterPlayers.map((player) => (
              <RosterPlayerCard
                key={player.id}
                player={player}
                teams={scoreboard.teams}
                score={playerScoresById.get(player.id) ?? 0}
                onScore={(delta) => handleScore('player', player.id, delta)}
                onNameChange={(name) => scoreboard.updatePlayer(player.id, { name })}
                onTeamChange={(teamId) => scoreboard.updatePlayer(player.id, { teamId })}
                onRemove={() => handleRemovePlayer(player.id)}
              />
            ))}
            <AddCard
              label={t('scoreboard.addPlayer')}
              onClick={async () => {
                await scoreboard.addPlayer()
                toast.success(t('scoreboard.playerAdded'))
              }}
            />
          </div>
        </section>
      )}

      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="type-section-title flex items-center gap-2">
            <UsersRound className="size-5 text-primary" />
            {scoreboard.activeScoring.mode === 'teams'
              ? t('scoreboard.teams')
              : t('scoreboard.players')}
          </h2>
          <Badge variant="outline">{scoreboard.targets.length}</Badge>
        </div>
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {scoreboard.targets.map((target) => {
            const memberNames = target.memberIds
              .map((memberId) => scoreboard.players.find((player) => player.id === memberId)?.name)
              .filter((name): name is string => Boolean(name))

            return (
              <ScoreTargetCard
                key={target.id}
                target={target}
                score={scoresByTargetId.get(target.id) ?? 0}
                memberNames={memberNames}
                onScore={(delta) => handleScore(target.type, target.id, delta)}
                onNameChange={(name) =>
                  target.type === 'team'
                    ? scoreboard.updateTeam(target.id, { name })
                    : scoreboard.updatePlayer(target.id, { name })
                }
                onColorChange={(color) =>
                  target.type === 'team'
                    ? scoreboard.updateTeam(target.id, { color })
                    : scoreboard.updatePlayer(target.id, { color })
                }
                onRemove={() =>
                  target.type === 'team'
                    ? handleRemoveTeam(target.id)
                    : handleRemovePlayer(target.id)
                }
              />
            )
          })}
          <AddCard
            label={
              scoreboard.activeScoring.mode === 'teams'
                ? t('scoreboard.addTeam')
                : t('scoreboard.addPlayer')
            }
            onClick={async () => {
              if (scoreboard.activeScoring.mode === 'teams') {
                await scoreboard.addTeam()
                toast.success(t('scoreboard.teamAdded'))
              } else {
                await scoreboard.addPlayer()
                toast.success(t('scoreboard.playerAdded'))
              }
            }}
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              aria-expanded={isHistoryOpen}
              onClick={() => setIsHistoryOpen((current) => !current)}
            >
              {isHistoryOpen ? (
                <ChevronDown className="size-4 shrink-0" />
              ) : (
                <ChevronRight className="size-4 shrink-0" />
              )}
              <History className="size-5 shrink-0 text-primary" />
              <span className="type-action">{t('common.history')}</span>
              <Badge variant="secondary">{scoreboard.activeEvents.length}</Badge>
            </button>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={scoreboard.activeEvents.length === 0}
                onClick={async () => {
                  const didUndo = await scoreboard.undoLastScore()
                  if (didUndo) toast.success(t('scoreboard.undoSuccess'))
                }}
              >
                <Undo2 className="size-4" />
                {t('scoreboard.undo')}
              </Button>
              <ConfirmButton
                title={t('scoreboard.archiveRestartTitle')}
                description={t('scoreboard.archiveRestartDescription')}
                confirmLabel={t('scoreboard.archiveRestartConfirm')}
                onConfirm={async () => {
                  const didArchive = await scoreboard.archiveAndRestart()
                  if (didArchive) {
                    setIsHistoryOpen(false)
                    toast.success(t('scoreboard.archiveRestartSuccess'))
                  }
                }}
                trigger={
                  <Button disabled={scoreboard.activeEvents.length === 0}>
                    <RotateCcw className="size-4" />
                    {t('scoreboard.archiveRestart')}
                  </Button>
                }
              />
            </div>
          </div>
        </CardHeader>
        {isHistoryOpen && (
          <CardContent>
            <HistoryList history={scoreboard.history} />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left"
            aria-expanded={isArchiveOpen}
            onClick={() => setIsArchiveOpen((current) => !current)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Archive className="size-5 shrink-0 text-primary" />
              <span className="type-action">{t('scoreboard.oldScorings')}</span>
              <Badge variant="secondary">{scoreboard.archiveViews.length}</Badge>
            </span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform',
                isArchiveOpen && 'rotate-180',
              )}
            />
          </button>
        </CardHeader>
        {isArchiveOpen && (
          <CardContent className="grid gap-3">
            {scoreboard.archiveViews.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
                {t('scoreboard.emptyArchive')}
              </div>
            ) : (
              scoreboard.archiveViews.map((archive) => (
                <ArchiveCard
                  key={archive.scoring.id}
                  archive={archive}
                  onRename={(name) => scoreboard.updateScoringName(archive.scoring.id, name)}
                  onDelete={async () => {
                    await scoreboard.deleteArchivedScoring(archive.scoring.id)
                    toast.success(t('scoreboard.archiveDeleted'))
                  }}
                />
              ))
            )}
          </CardContent>
        )}
      </Card>
    </AppPage>
  )
}
