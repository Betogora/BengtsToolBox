import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Coins,
  Dice5,
  Gamepad2,
  RotateCcw,
  Target,
  Trash2,
  Trophy,
} from 'lucide-react'
import { Link } from 'react-router-dom'

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
import { cn } from '@/lib/utils'

type GameApp = {
  id: string
  title: string
  href?: string
  Icon: LucideIcon
  status: 'live' | 'preview'
}

const games: GameApp[] = [
  {
    id: 'coinflip',
    title: 'Coinflip',
    href: '/schlag-den-raab/coinflip',
    Icon: Coins,
    status: 'live',
  },
  {
    id: 'dummy-1',
    title: 'Dummy Game 1',
    Icon: Dice5,
    status: 'preview',
  },
  {
    id: 'dummy-2',
    title: 'Dummy Game 2',
    Icon: Gamepad2,
    status: 'preview',
  },
]

function GameTile({ game }: { game: GameApp }) {
  const tile = (
    <Card
      className={cn(
        'relative h-full overflow-hidden transition-colors',
        game.href
          ? 'group-hover:border-primary group-hover:bg-card/95'
          : 'border-dashed bg-card/70 text-muted-foreground',
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-2',
          game.href ? 'bg-primary' : 'bg-muted',
        )}
      />
      <CardHeader className="grid min-h-36 gap-6 p-6 pt-7">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-lg shadow-[0_14px_30px_-18px_var(--primary)] transition-colors',
              game.href
                ? 'bg-primary text-primary-foreground group-hover:bg-secondary group-hover:text-secondary-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <game.Icon className="size-6" />
          </div>
          {game.status === 'preview' && (
            <Badge variant="outline" className="bg-background/70">
              Vorschau
            </Badge>
          )}
        </div>

        <CardTitle
          className={cn(
            'text-2xl leading-tight transition-colors sm:text-3xl',
            game.href && 'group-hover:text-primary',
          )}
        >
          {game.title}
        </CardTitle>
      </CardHeader>
    </Card>
  )

  if (!game.href) {
    return (
      <div aria-disabled="true" className="block rounded-lg">
        {tile}
      </div>
    )
  }

  return (
    <Link
      to={game.href}
      aria-label={`${game.title} oeffnen`}
      className="group block rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {tile}
    </Link>
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
  return (
    <div
      className={cn(
        'rounded-md border bg-background/75 p-3',
        isWinner && 'border-primary/45 bg-primary/10',
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{player.name}</div>
          <div className="text-xs text-muted-foreground">
            {gameWins} gewonnene Spiele
          </div>
        </div>
        <div className="text-3xl font-semibold tabular-nums">{score}</div>
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
  const isWinner = game.winnerId === player.id

  return (
    <button
      type="button"
      aria-label={
        isWinner
          ? `${player.name} als Gewinner von ${game.title} entfernen`
          : `${player.name} gewinnt ${game.title} eintragen`
      }
      aria-pressed={isWinner}
      className={cn('raab-score-button', isWinner && 'raab-score-button-winner')}
      onClick={() => onSetWinner(game.id, player.id)}
    >
      {isWinner ? (
        <span className="raab-score-pill">{scoreAfterGame}</span>
      ) : (
        <span className="sr-only">Kein Punktestand</span>
      )}
    </button>
  )
}

function ScoreOverview() {
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
              Abendstand
            </CardTitle>
            <ConfirmButton
              title="Abend archivieren und neu starten?"
              description="Der aktuelle Abend wird als alter Datensatz gespeichert. Danach startet ein neuer leerer Abend mit denselben Spielern."
              confirmLabel="Neu starten"
              onConfirm={resetEvening}
              trigger={
                <Button size="sm" variant="outline">
                  <RotateCcw className="size-4" />
                  Zurücksetzen
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && (
            <div className="rounded-md border border-destructive/60 bg-destructive/10 p-3 text-sm text-destructive">
              Firebase-Fehler: {error.message}
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
              <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                Ausgang
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
              <col className="w-14" />
              <col />
              <col className="w-32" />
              <col className="w-32" />
            </colgroup>
            <TableHeader>
              <TableHead className="text-center">#</TableHead>
              <TableHead>Spiel</TableHead>
              {players.map((player) => (
                <TableHead key={player.id} className="text-center">
                  <div className="flex justify-center">
                    <InlineTextEdit
                      ariaLabel={`${player.name} Name`}
                      fallback={`Spieler ${player.position}`}
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
                  <TableCell className="text-center font-semibold tabular-nums">
                    {row.game.position}
                  </TableCell>
                  <TableCell className="min-w-0">
                    <InlineTextEdit
                      ariaLabel={`Name von Spiel ${row.game.position}`}
                      className="max-w-[18rem] font-medium"
                      fallback={`Spiel ${row.game.position}`}
                      inputClassName="h-8"
                      value={row.game.title}
                      onSave={(title) => updateGameTitle(row.game.id, title)}
                    />
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
          <span className="font-semibold">Alte Datensätze</span>
          <Badge variant="secondary">{archivedDatasets.length}</Badge>
        </button>
      </CardHeader>
      {isOpen && (
        <CardContent className="grid gap-3">
          {archivedDatasets.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Noch keine archivierten Datensätze.
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
              ariaLabel="Archivname"
              className="font-semibold"
              fallback="Archivierter Datensatz"
              value={dataset.name}
              onSave={(value) => onRename(dataset.id, value)}
            />
            <div className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(dataset.archivedAtClientIso)} - {playedGames}{' '}
              Spiele
            </div>
          </div>
        </button>
        <ConfirmButton
          title="Datensatz löschen?"
          description="Der archivierte Abend wird dauerhaft entfernt."
          onConfirm={() => onDelete(dataset.id)}
          trigger={
            <Button variant="delete" size="icon" aria-label="Archiv löschen">
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
              <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                Ausgang
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
  return (
    <Table
      className="raab-score-table"
      containerClassName="raab-score-table-wrap"
    >
      <colgroup>
        <col className="w-14" />
        <col />
        <col className="w-32" />
        <col className="w-32" />
      </colgroup>
      <TableHeader>
        <TableHead className="text-center">#</TableHead>
        <TableHead>Spiel</TableHead>
        {players.map((player) => (
          <TableHead key={player.id} className="text-center">
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
            <TableCell className="text-center font-semibold tabular-nums">
              {row.game.position}
            </TableCell>
            <TableCell className="min-w-0 font-medium">
              <span className="block max-w-[18rem] truncate">
                {row.game.title}
              </span>
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
  const activeGameCount = games.filter((game) => game.status === 'live').length
  const previewGameCount = games.length - activeGameCount

  return (
    <AppPage className="gap-7 lg:py-12" width="wide">
      <section className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            Schlag den Raab
          </h1>
        </div>

        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex-row items-center gap-4 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-foreground/15">
              <Target className="size-5" />
            </div>
            <CardTitle className="text-xl">
              {activeGameCount} aktiv / {previewGameCount} Vorschau
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
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
