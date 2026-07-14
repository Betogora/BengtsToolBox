import {
  Bell,
  History,
  Lock,
  Trophy,
  Unlock,
  UsersRound,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import type {
  BuzzerPlayer,
  BuzzerSessionState,
  BuzzerTimestamp,
} from '@/apps/live-buzzer/types'
import { useLiveBuzzer } from '@/apps/live-buzzer/hooks/useLiveBuzzer'
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
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { syncErrorMessageKey } from '@/lib/firebase/syncError'
import { cn } from '@/lib/utils'

function timestampToDate(value: BuzzerTimestamp, fallbackIso?: string | null) {
  if (typeof value === 'string') {
    return new Date(value)
  }

  if (value && 'toDate' in value) {
    return value.toDate()
  }

  return fallbackIso ? new Date(fallbackIso) : null
}

function formatBuzzTime(
  value: BuzzerTimestamp,
  fallbackIso: string | null | undefined,
  formatTime: ReturnType<typeof useI18n>['formatTime'],
) {
  const date = timestampToDate(value, fallbackIso)

  if (!date || Number.isNaN(date.getTime())) {
    return '-'
  }

  return formatTime(date, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function displayPlayerName(player: { name: string }) {
  const name = player.name.trim()

  return name || 'Person'
}

function playBuzzSound() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext

  if (!AudioContextClass) {
    return
  }

  const context = new AudioContextClass()
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = 720
  gain.gain.setValueAtTime(0.001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.2)
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

function LiveBuzzerPresenter({
  buzzRanks,
  buzzedPlayers,
  roundNumber,
  sessionState,
  winner,
  winnerTeam,
}: {
  buzzRanks: Map<string, number>
  buzzedPlayers: BuzzerPlayer[]
  roundNumber: number
  sessionState: BuzzerSessionState
  winner: BuzzerPlayer | null
  winnerTeam:
    | { className: string; name: string; nameKey: TranslationKey }
    | null
    | undefined
}) {
  const { formatTime, t } = useI18n()

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-lg border bg-primary p-6 text-primary-foreground shadow-sm">
        <div className="type-section-title">
          {winner ? displayPlayerName(winner) : t('liveBuzzer.ready')}
        </div>
        <div className="type-metric-xl mt-8">
          {winnerTeam ? t(winnerTeam.nameKey) : '-'}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge className="bg-white text-primary">
            {t('common.round', { number: roundNumber })}
          </Badge>
          <Badge className="bg-white text-primary">
            {sessionState.isOpen ? 'Live' : t('liveBuzzer.status.locked')}
          </Badge>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          <h2 className="type-section-title">
            {t('liveBuzzer.buzzOrder')}
          </h2>
        </div>
        <div className="mt-5 grid gap-3">
          {buzzedPlayers.length === 0 ? (
            <EmptyState className="p-8">{t('liveBuzzer.emptyBuzz')}</EmptyState>
          ) : (
            buzzedPlayers
              .slice()
              .sort(
                (left, right) =>
                  (buzzRanks.get(left.id) ?? 99) -
                  (buzzRanks.get(right.id) ?? 99),
              )
              .map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between gap-4 rounded-md border bg-background p-4"
                >
                  <div className="min-w-0">
                    <div className="type-section-title truncate">
                      #{buzzRanks.get(player.id)} {displayPlayerName(player)}
                    </div>
                    <div className="type-ui mt-1 text-muted-foreground">
                      {formatBuzzTime(
                        player.buzzedAt,
                        player.buzzedAtClientIso,
                        formatTime,
                      )}
                    </div>
                  </div>
                  {winner?.id === player.id && (
                    <Badge className={winnerTeam?.className}>
                      <Trophy className="size-3.5" />
                      {t('liveBuzzer.status.winner')}
                    </Badge>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </section>
  )
}

export function LiveBuzzerPage() {
  const { formatDateTime, formatTime, t } = useI18n()
  const {
    buzz,
    buzzRanks,
    buzzerTeams,
    clearHistory,
    closeRound,
    error,
    isLoading,
    isPending,
    isRealtime,
    openRound,
    players,
    removePlayer,
    resetAndOpenRound,
    roundNumber,
    selectedPlayer,
    selectedPlayerId,
    sessionState,
    teamSummaries,
    updatePlayerName,
    updatePlayerTeam,
    winner,
    winnerTeam,
  } = useLiveBuzzer()
  const [isSoundEnabled, setIsSoundEnabled] = useState(false)
  const appTitle = t('app.liveBuzzer.title')

  const selectedHasBuzzed = Boolean(
    selectedPlayer?.buzzedAt ?? selectedPlayer?.buzzedAtClientIso,
  )
  const canBuzz =
    sessionState.isOpen && Boolean(selectedPlayer?.isActive) && !selectedHasBuzzed
  const buzzedPlayers = players.filter(
    (player) => player.buzzedAt || player.buzzedAtClientIso,
  )

  return (
    <AppPage>
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <AppPageTitle Icon={Bell} title={appTitle} />
        <div className="flex flex-wrap gap-2">
          <Badge variant={sessionState.isOpen ? 'default' : 'secondary'}>
            {t('liveBuzzer.roundStatus', {
              number: roundNumber,
              status: sessionState.isOpen
                ? t('liveBuzzer.status.released')
                : t('liveBuzzer.status.locked'),
            })}
          </Badge>
          <Badge variant="outline">
            {t('common.playerCount', { count: players.length })}
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

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="size-5 text-primary" />
                {t('liveBuzzer.card.mine')}
              </CardTitle>
              {(isLoading || isPending) && (
                <CardDescription>{t('common.syncing')}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {selectedPlayer ? (
                <PlayerCard
                  player={selectedPlayer}
                  isHighlighted
                  isWinner={winner?.id === selectedPlayer.id}
                  onNameChange={(name) => updatePlayerName(selectedPlayer.id, name)}
                  onRemove={async () => {
                    await removePlayer(selectedPlayer.id)
                    toast.success(t('liveBuzzer.playerRemoved'))
                  }}
                  onTeamChange={(teamId) =>
                    updatePlayerTeam(selectedPlayer.id, teamId)
                  }
                />
              ) : (
                <EmptyState className="p-8">
                  {t('liveBuzzer.card.creating')}
                </EmptyState>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Unlock className="size-5 text-primary" />
                {t('liveBuzzer.roundControl')}
              </CardTitle>
              {!isRealtime && (
                <CardDescription>
                  {t('liveBuzzer.localMode')}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    openRound()
                    toast.success(t('liveBuzzer.roundOpened'))
                  }}
                >
                  <Unlock className="size-4" />
                  {t('liveBuzzer.action.release')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    closeRound()
                    toast.success(t('liveBuzzer.roundClosed'))
                  }}
                >
                  <Lock className="size-4" />
                  {t('liveBuzzer.action.lock')}
                </Button>
              </div>
              <AppResetButton
                title={t('liveBuzzer.roundResetTitle')}
                description={t('liveBuzzer.roundResetDescription')}
                onConfirm={async () => {
                  await resetAndOpenRound()
                  toast.success(t('liveBuzzer.roundReset'))
                }}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5 text-primary" />
              Buzzer
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Button
              className={cn(
                'type-metric-xl h-48 rounded-lg shadow-sm sm:h-64',
                winner?.id === selectedPlayerId &&
                  'bg-accent text-accent-foreground hover:bg-accent/90',
              )}
              disabled={!canBuzz}
              onClick={async () => {
                const result = await buzz()

                if (
                  isSoundEnabled &&
                  result !== 'blocked' &&
                  result !== 'already-buzzed'
                ) {
                  playBuzzSound()
                }

                if (result === 'winner') {
                  toast.success(t('liveBuzzer.buzz.saved'))
                } else if (result === 'late') {
                  toast.success(t('liveBuzzer.buzz.lateSaved'))
                } else if (result === 'already-buzzed') {
                  toast.error(t('liveBuzzer.buzz.alreadyBuzzed'))
                } else if (result === 'sync-error') {
                  toast.error(t('common.syncError'))
                } else {
                  toast.error(t('liveBuzzer.buzz.locked'))
                }
              }}
            >
              <Bell className="size-20 sm:size-24" />
              {winner && winner.id !== selectedPlayerId
                ? t('liveBuzzer.action.lateBuzz')
                : t('liveBuzzer.action.buzz')}
            </Button>

            <div className="rounded-lg border p-4">
              <div className="type-ui text-muted-foreground">
                {t('liveBuzzer.result')}
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="type-card-title min-h-7">
                  {winner ? displayPlayerName(winner) : '-'}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={winnerTeam?.className} variant="outline">
                    {winnerTeam ? t(winnerTeam.nameKey) : t('common.noTeam')}
                  </Badge>
                  <span className="type-card-title tabular-nums">
                    {formatBuzzTime(
                      sessionState.lastBuzzedAt,
                      sessionState.lastBuzzedAtClientIso,
                      formatTime,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="size-5 text-primary" />
              {t('liveBuzzer.teams')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {teamSummaries.map((team) => (
              <div
                key={team.id}
                className={cn(
                  'rounded-lg border p-4',
                  team.className,
                  team.isWinner && 'ring-2 ring-accent',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="type-action flex items-center gap-2">
                    <span className={cn('size-3 rounded-full', team.dotClassName)} />
                    {t(team.nameKey)}
                  </div>
                  {team.isWinner && <Trophy className="size-4" />}
                </div>
                <div className="type-ui mt-2 tabular-nums">
                  {t('liveBuzzer.memberCount', { count: team.memberCount })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-5 text-primary" />
                {t('liveBuzzer.overview')}
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <PresenterLauncher
                  appTitle={appTitle}
                  className="h-8 px-3"
                  views={[
                    {
                      id: 'live',
                      label: t('liveBuzzer.presenter.liveView'),
                      Icon: Bell,
                      render: () => (
                        <LiveBuzzerPresenter
                          buzzRanks={buzzRanks}
                          buzzedPlayers={buzzedPlayers}
                          roundNumber={roundNumber}
                          sessionState={sessionState}
                          winner={winner}
                          winnerTeam={winnerTeam}
                        />
                      ),
                    },
                  ]}
                />
                <Button
                  variant="outline"
                  size="sm"
                  role="switch"
                  aria-checked={isSoundEnabled}
                  onClick={() => setIsSoundEnabled((current) => !current)}
                >
                  {isSoundEnabled ? (
                    <Volume2 className="size-4" />
                  ) : (
                    <VolumeX className="size-4" />
                  )}
                  {t('liveBuzzer.sound')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {players.map((player) => {
              const isWinner = winner?.id === player.id
              const rank = buzzRanks.get(player.id)
              const hasBuzzed = Boolean(player.buzzedAt || player.buzzedAtClientIso)

              return (
                <PlayerCard
                  key={player.id}
                  player={player}
                  buzzLabel={
                    isWinner
                      ? t('liveBuzzer.status.winner')
                      : hasBuzzed
                        ? t('liveBuzzer.status.buzzed')
                        : t('liveBuzzer.ready')
                  }
                  buzzRank={rank}
                  buzzTime={formatBuzzTime(
                    player.buzzedAt,
                    player.buzzedAtClientIso,
                    formatTime,
                  )}
                  isHighlighted={selectedPlayerId === player.id}
                  isWinner={isWinner}
                  onNameChange={(name) => updatePlayerName(player.id, name)}
                  onRemove={async () => {
                    await removePlayer(player.id)
                    toast.success(
                      t('scoreboard.personRemoved', {
                        name: displayPlayerName(player),
                      }),
                    )
                  }}
                  onTeamChange={(teamId) => updatePlayerTeam(player.id, teamId)}
                />
              )
            })}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="size-5 text-primary" />
              {t('liveBuzzer.history')}
            </CardTitle>
            <AppResetButton
              title={t('liveBuzzer.history.resetTitle')}
              description={t('liveBuzzer.history.resetDescription')}
              onConfirm={clearHistory}
            />
          </div>
        </CardHeader>
        <CardContent>
          {sessionState.history.length === 0 ? (
            <EmptyState>
              {t('liveBuzzer.emptyWinners')}
            </EmptyState>
          ) : (
            <div className="grid gap-3">
              {sessionState.history.map((entry) => {
                const team = buzzerTeams.find(
                  (candidate) => candidate.id === entry.winnerTeamId,
                )

                return (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="type-action">
                        {t('liveBuzzer.winnerLine', {
                          name: entry.winnerPlayerName,
                          round: entry.roundNumber,
                        })}
                      </div>
                      <div className="type-ui text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                      </div>
                    </div>
                    <Badge className={team?.className} variant="outline">
                      {team ? t(team.nameKey) : t('common.noTeam')}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </AppPage>
  )
}
