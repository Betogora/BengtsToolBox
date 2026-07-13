import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Coins,
  Layers3,
  RotateCcw,
  Trash2,
  Trophy,
} from 'lucide-react'

import {
  getSchlagDenRaabSummary,
  useSchlagDenRaabScoreboard,
} from '@/apps/schlag-den-raab/hooks/useSchlagDenRaabScoreboard'
import type {
  SchlagDenRaabArchivedDataset,
  SchlagDenRaabGame,
  SchlagDenRaabPlayer,
  SchlagDenRaabPlayerId,
} from '@/apps/schlag-den-raab/types'
import { AppPage } from '@/apps/shared/components/AppPage'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
import { DashboardIllustration } from '@/components/layout/DashboardIllustrations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type GameApp = {
  id: string
  title: string
  Icon: LucideIcon
  illustrationId: string
}

const games: GameApp[] = [
  {
    id: 'dummy-1',
    title: 'Dummy Game 1',
    Icon: Coins,
    illustrationId: 'coinflip',
  },
  {
    id: 'dummy-2',
    title: 'Dummy Game 2',
    Icon: Coins,
    illustrationId: 'coinflip',
  },
]

function GameTile({ game }: { game: GameApp }) {
  return (
    <div aria-disabled="true" className="group block rounded-lg">
      <Card className="relative h-48 overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/45 group-hover:shadow-[0_18px_46px_-34px_rgba(6,52,79,0.55)]">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[48%] overflow-hidden opacity-95 [mask-image:linear-gradient(to_left,black_0%,black_72%,transparent_100%)]"
          aria-hidden="true"
        >
          <DashboardIllustration appId={game.illustrationId} />
        </div>

        <CardHeader className="relative z-10 flex h-full max-w-[58%] flex-col justify-start gap-3 p-5 sm:p-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_16px_34px_-18px_rgba(13,142,144,0.9)] transition-colors group-hover:bg-secondary group-hover:text-primary">
            <game.Icon className="size-6" />
          </div>

          <CardTitle className="type-tile-title hyphens-auto break-words transition-colors group-hover:text-primary">
            {game.title}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}

function outcomeVariant(status: 'open' | 'tiebreak' | 'winner') {
  if (status === 'winner') {
    return 'default'
  }

  if (status === 'tiebreak') {
    return 'secondary'
  }

  return 'outline'
}

function formatDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString([], {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function PlayerScoreSummary({
  gameWins,
  isWinner,
  player,
  score,
}: {
  gameWins: number
  isWinner: boolean
  player: SchlagDenRaabPlayer
  score: number
}) {
  const { t } = useI18n()

  return (
    <div
      className={cn(
        'rounded-md border bg-background/75 p-3',
        isWinner && 'border-primary/45 bg-primary/10',
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="type-action truncate">{player.name}</div>
          <div className="type-caption text-muted-foreground">
            {t('raab.gamesWon', { count: gameWins })}
          </div>
        </div>
        <div className="type-metric-md">{score}</div>
      </div>
    </div>
  )
}

function ScoreButton({
  game,
  onSetWinner,
  player,
  scoreAfterGame,
}: {
  game: SchlagDenRaabGame
  onSetWinner: (gameId: string, winnerId: SchlagDenRaabPlayerId) => void
  player: SchlagDenRaabPlayer
  scoreAfterGame: number
}) {
  const { t } = useI18n()
  const isWinner = game.winnerId === player.id

  return (
    <button
      type="button"
      aria-label={
        isWinner
          ? t('raab.removeWinnerAria', {
              game: game.title,
              player: player.name,
            })
          : t('raab.registerWinnerAria', {
              game: game.title,
              player: player.name,
            })
      }
      aria-pressed={isWinner}
      className={cn('raab-score-button', isWinner && 'raab-score-button-winner')}
      onClick={() => onSetWinner(game.id, player.id)}
    >
      {isWinner ? (
        <span className="raab-score-pill">{scoreAfterGame}</span>
      ) : (
        <span className="sr-only">{t('raab.noScore')}</span>
      )}
    </button>
  )
}

function ScoreOverview() {
  const { t } = useI18n()
  const {
    archivedDatasets,
    deleteArchivedDataset,
    error,
    gameWins,
    outcome,
    players,
    resetEvening,
    rows,
    setWinner,
    totalScores,
    updateArchivedDatasetName,
    updateGameTitle,
    updatePlayerName,
    winnerId,
  } = useSchlagDenRaabScoreboard()

  return (
    <>
      <Card className="raab-score-card">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              {t('raab.eveningScore')}
            </CardTitle>
            <ConfirmButton
              title={t('raab.archive.restartTitle')}
              description={t('raab.archive.restartDescription')}
              confirmLabel={t('raab.archive.restartConfirm')}
              onConfirm={resetEvening}
              trigger={
                <Button size="sm" variant="outline">
                  <RotateCcw className="size-4" />
                  {t('common.reset')}
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && (
            <div className="rounded-md border border-destructive/60 bg-destructive/10 p-3 text-sm text-destructive">
              {t('common.firebaseError')}: {error.message}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.1fr]">
            {players.map((player) => (
              <PlayerScoreSummary
                key={player.id}
                gameWins={gameWins[player.id]}
                isWinner={winnerId === player.id}
                player={player}
                score={totalScores[player.id]}
              />
            ))}
            <div className="rounded-md border bg-background/75 p-3">
              <div className="type-caption text-muted-foreground">
                {t('raab.outcome')}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={outcomeVariant(outcome.status)}>
                  {outcome.label}
                </Badge>
              </div>
            </div>
          </div>

          <Table
            className="raab-score-table"
            containerClassName="raab-score-table-wrap"
          >
            <colgroup>
              <col className="hidden w-0 sm:table-column sm:w-14" />
              <col />
              <col className="w-16 sm:w-32" />
              <col className="w-16 sm:w-32" />
            </colgroup>
            <TableHeader>
              <TableHead className="hidden text-center sm:table-cell">#</TableHead>
              <TableHead>{t('raab.game')}</TableHead>
              {players.map((player) => (
                <TableHead
                  key={player.id}
                  className="raab-player-score-head text-center"
                >
                  <div className="raab-player-name-editor flex min-w-0 justify-center">
                    <InlineTextEdit
                      ariaLabel={`${player.name} Name`}
                      className="max-w-full truncate"
                      fallback={t('raab.playerFallback', {
                        number: player.position,
                      })}
                      inputClassName="h-8 text-center"
                      value={player.name}
                      onSave={(name) => updatePlayerName(player.id, name)}
                    />
                  </div>
                </TableHead>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.game.id}
                  className={cn(row.game.position === 16 && 'raab-tiebreak-row')}
                >
                  <TableCell className="type-action hidden text-center tabular-nums sm:table-cell">
                    {row.game.position}
                  </TableCell>
                  <TableCell className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="type-action shrink-0 tabular-nums sm:hidden">
                        {row.game.position}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <InlineTextEdit
                          ariaLabel={t('raab.gameNameAria', {
                            number: row.game.position,
                          })}
                          className="raab-game-title type-ui max-w-[18rem]"
                          fallback={t('raab.gameFallback', {
                            number: row.game.position,
                          })}
                          inputClassName="raab-game-title-input h-8"
                          value={row.game.title}
                          onSave={(title) => updateGameTitle(row.game.id, title)}
                        />
                      </div>
                    </div>
                  </TableCell>
                  {players.map((player) => (
                    <TableCell key={player.id} className="text-center">
                      <ScoreButton
                        game={row.game}
                        player={player}
                        scoreAfterGame={row.scoresAfterGame[player.id]}
                        onSetWinner={(gameId, selectedWinnerId) => {
                          void setWinner(gameId, selectedWinnerId)
                        }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ArchiveSection
        archivedDatasets={archivedDatasets}
        onDeleteArchivedDataset={deleteArchivedDataset}
        onRenameArchivedDataset={updateArchivedDatasetName}
      />
    </>
  )
}

function ArchiveSection({
  archivedDatasets,
  onDeleteArchivedDataset,
  onRenameArchivedDataset,
}: {
  archivedDatasets: SchlagDenRaabArchivedDataset[]
  onDeleteArchivedDataset: (datasetId: string) => void | Promise<void>
  onRenameArchivedDataset: (datasetId: string, name: string) => void | Promise<void>
}) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <button
          className="flex min-w-0 items-center gap-2 text-left"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? (
            <ChevronDown className="size-4 shrink-0" />
          ) : (
            <ChevronRight className="size-4 shrink-0" />
          )}
          <Archive className="size-5 shrink-0 text-primary" />
          <span className="type-action">{t('common.oldDatasets')}</span>
          <Badge variant="secondary">{archivedDatasets.length}</Badge>
        </button>
      </CardHeader>
      {isOpen && (
        <CardContent className="grid gap-3">
          {archivedDatasets.length === 0 ? (
            <div className="type-ui rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              {t('raab.archive.empty')}
            </div>
          ) : (
            archivedDatasets.map((dataset) => (
              <ArchiveDatasetCard
                key={dataset.id}
                dataset={dataset}
                onDelete={onDeleteArchivedDataset}
                onRename={onRenameArchivedDataset}
              />
            ))
          )}
        </CardContent>
      )}
    </Card>
  )
}

function ArchiveDatasetCard({
  dataset,
  onDelete,
  onRename,
}: {
  dataset: SchlagDenRaabArchivedDataset
  onDelete: (datasetId: string) => void | Promise<void>
  onRename: (datasetId: string, name: string) => void | Promise<void>
}) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const summary = getSchlagDenRaabSummary(dataset)
  const playedGames =
    dataset.games.filter((game) => game.winnerId).length +
    (dataset.tiebreak?.winnerId ? 1 : 0)

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? (
            <ChevronDown className="size-4 shrink-0" />
          ) : (
            <ChevronRight className="size-4 shrink-0" />
          )}
          <div className="min-w-0">
            <InlineTextEdit
              ariaLabel={t('progress.archiveName')}
              className="type-action"
              fallback={t('common.archivedDataset')}
              value={dataset.name}
              onSave={(value) => onRename(dataset.id, value)}
            />
            <div className="type-caption mt-1 text-muted-foreground">
              {formatDateTime(dataset.archivedAtClientIso)} -{' '}
              {t('raab.gameCount', { count: playedGames })}
            </div>
          </div>
        </button>
        <ConfirmButton
          title={t('common.dataset.delete')}
          description={t('raab.archive.deleteDescription')}
          onConfirm={() => onDelete(dataset.id)}
          trigger={
            <Button variant="delete" size="icon" aria-label={t('common.archive.delete')}>
              <Trash2 className="size-4" />
            </Button>
          }
        />
      </div>
      {isOpen && (
        <div className="grid gap-3 border-t p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.1fr]">
            {dataset.players.map((player) => (
              <PlayerScoreSummary
                key={player.id}
                gameWins={summary.gameWins[player.id]}
                isWinner={summary.winnerId === player.id}
                player={player}
                score={summary.totalScores[player.id]}
              />
            ))}
            <div className="rounded-md border bg-background/75 p-3">
              <div className="type-caption text-muted-foreground">
                {t('raab.outcome')}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={outcomeVariant(summary.outcome.status)}>
                  {summary.outcome.label}
                </Badge>
              </div>
            </div>
          </div>
          <ReadOnlyArchiveTable players={dataset.players} rows={summary.rows} />
        </div>
      )}
    </div>
  )
}

function ReadOnlyArchiveTable({
  players,
  rows,
}: {
  players: SchlagDenRaabPlayer[]
  rows: ReturnType<typeof getSchlagDenRaabSummary>['rows']
}) {
  const { t } = useI18n()

  return (
    <Table
      className="raab-score-table"
      containerClassName="raab-score-table-wrap"
    >
      <colgroup>
        <col className="hidden w-0 sm:table-column sm:w-14" />
        <col />
        <col className="w-16 sm:w-32" />
        <col className="w-16 sm:w-32" />
      </colgroup>
      <TableHeader>
        <TableHead className="hidden text-center sm:table-cell">#</TableHead>
        <TableHead>{t('raab.game')}</TableHead>
        {players.map((player) => (
          <TableHead
            key={player.id}
            className="raab-player-score-head text-center"
          >
            {player.name}
          </TableHead>
        ))}
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.game.id}
            className={cn(row.game.position === 16 && 'raab-tiebreak-row')}
          >
            <TableCell className="type-action hidden text-center tabular-nums sm:table-cell">
              {row.game.position}
            </TableCell>
            <TableCell className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="type-action shrink-0 tabular-nums sm:hidden">
                  {row.game.position}.
                </span>
                <span className="raab-game-title block min-w-0 max-w-[18rem] break-words sm:truncate">
                  {row.game.title}
                </span>
              </div>
            </TableCell>
            {players.map((player) => (
              <TableCell key={player.id} className="text-center">
                <div
                  className={cn(
                    'raab-score-button cursor-default',
                    row.game.winnerId === player.id && 'raab-score-button-winner',
                  )}
                >
                  {row.game.winnerId === player.id && (
                    <span className="raab-score-pill">
                      {row.scoresAfterGame[player.id]}
                    </span>
                  )}
                </div>
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function SchlagDenRaabPage() {
  const { t } = useI18n()

  return (
    <AppPage className="gap-7 lg:py-12" width="wide">
      <section className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
        <div className="max-w-3xl">
          <h1 className="type-dashboard-title text-foreground">
            Schlag den Raab
          </h1>
        </div>

        <Card className="h-[72px] w-fit justify-self-end border-primary/20 bg-primary text-primary-foreground shadow-[0_18px_46px_-30px_rgba(13,142,144,0.9)]">
          <CardHeader className="flex h-full flex-row items-center gap-4 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-foreground/18">
              <Layers3 className="size-5" />
            </div>
            <CardTitle className="whitespace-nowrap">
              {t('dashboard.appCount', { count: games.length })}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {games.map((game) => (
          <GameTile key={game.id} game={game} />
        ))}
      </section>

      <section className="grid gap-4">
        <ScoreOverview />
      </section>
    </AppPage>
  )
}
