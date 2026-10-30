import { Download, Printer, Trophy } from 'lucide-react';
import { RankPlacement } from '@/apps/swiss-tournaments/components/RankPlacement'
import {
  completedUnitLabelKey,
  formatPoints,
  statusLabelKeys,
  statusVariant,
  tournamentFormatLabelKey,
} from '@/apps/swiss-tournaments/components/tournamentUiPresentation'
import type { TournamentInspection } from '@/apps/swiss-tournaments/domain/tournamentDomain'
import { useSwissTournaments } from '@/apps/swiss-tournaments/hooks/useSwissTournaments';
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton';
import { EmptyState } from '@/apps/shared/components/EmptyState';
import type { Round, Tournament } from '@/apps/swiss-tournaments/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeleteButton } from '@/components/ui/DeleteButton'
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function formatSwissDateTime(
  value: string | undefined,
  formatter: ReturnType<typeof useI18n>['formatDateTime'],
) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return formatter(date)
}

type ArchivedTournamentSummary = {
  category: string
  completedRounds: number
  standings: TournamentInspection['standings']
  tournament: Tournament
}

export function ArchivedTournamentsList({
  entries,
  onDelete,
  onExportCsv,
  onPrint,
}: {
  entries: ArchivedTournamentSummary[]
  onDelete: (tournament: Tournament) => void | Promise<void>
  onExportCsv: (tournament: Tournament) => void
  onPrint: (tournament: Tournament) => void
}) {
  const { t, formatDateTime } = useI18n()
  const topPlayers = (entry: ArchivedTournamentSummary) =>
    entry.standings
      .slice(0, 3)
      .map((row) => `${row.rank}. ${row.playerName} (${formatPoints(row.points)})`)
      .join(', ') || '-'
  const actions = (tournament: Tournament) => (
    <div className="flex flex-nowrap items-center gap-1.5">
      <Button
        aria-label={t('swiss.printPdfAria', { name: tournament.name })}
        size="sm"
        variant="outline"
        onClick={() => onPrint(tournament)}
      >
        <Printer className="size-4" />
        PDF
      </Button>
      <Button
        aria-label={t('swiss.exportCsvAria', { name: tournament.name })}
        size="sm"
        variant="outline"
        onClick={() => onExportCsv(tournament)}
      >
        <Download className="size-4" />
        CSV
      </Button>
      <ConfirmButton
        mode="popover"
        title={t('swiss.archived.deleteTitle')}
        description={t('swiss.archived.deleteDescription', { name: tournament.name })}
        confirmLabel={t('common.delete')}
        onConfirm={() => onDelete(tournament)}
        trigger={
          <DeleteButton
            aria-label={t('swiss.playerRemoveAria', { name: tournament.name })}
            className="size-8"
          />
        }
      />
    </div>
  )

  if (entries.length === 0) {
    return (
      <EmptyState className="p-4 text-left">
        {t('swiss.archived.empty')}
      </EmptyState>
    )
  }

  return (
    <>
      <div className="grid gap-2 md:hidden">
        {entries.map((entry) => (
          <div
            key={entry.tournament.id}
            className="grid gap-3 rounded-md border bg-background p-3 text-sm"
          >
            <div className="min-w-0">
              <div className="type-action truncate">{entry.tournament.name}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge variant="secondary">
                  {entry.category}
                </Badge>
                <Badge variant="outline">
                  {entry.completedRounds}/{entry.tournament.numberOfRounds}{' '}
                  {t(completedUnitLabelKey(entry.tournament.format))}
                </Badge>
                <Badge variant="outline">
                  {t('swiss.playerCount', { count: entry.tournament.players.length })}
                </Badge>
              </div>
            </div>
            <div className="type-caption grid gap-1 text-muted-foreground">
              <span>{formatSwissDateTime(entry.tournament.archivedAtClientIso, formatDateTime)}</span>
              <span className="line-clamp-2">{t('swiss.topThree')}: {topPlayers(entry)}</span>
            </div>
            {actions(entry.tournament)}
          </div>
        ))}
      </div>

      <Table className="min-w-[58rem]" containerClassName="hidden md:block">
          <TableHeader>
              <TableHead>{t('swiss.tournamentName')}</TableHead>
              <TableHead>{t('swiss.archived')}</TableHead>
              <TableHead>{t('swiss.category')}</TableHead>
              <TableHead>{t('swiss.scope')}</TableHead>
              <TableHead>{t('swiss.topThree')}</TableHead>
              <TableHead>{t('common.actions')}</TableHead>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.tournament.id}>
                <TableCell className="type-label max-w-56">
                  <span className="block truncate">{entry.tournament.name}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatSwissDateTime(entry.tournament.archivedAtClientIso, formatDateTime)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {entry.category}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {t('swiss.playerCount', { count: entry.tournament.players.length })}, {entry.completedRounds}/
                  {entry.tournament.numberOfRounds} {t(completedUnitLabelKey(entry.tournament.format))}
                </TableCell>
                <TableCell className="max-w-72 text-muted-foreground">
                  <span className="line-clamp-2">{topPlayers(entry)}</span>
                </TableCell>
                <TableCell>{actions(entry.tournament)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
      </Table>
    </>
  )
}

export function SwissStandingsPresenter({
  round,
  roundLabel,
  standings,
  tournament,
}: {
  round: Round | null
  roundLabel: string | null
  standings: ReturnType<typeof useSwissTournaments>['standings']
  tournament: Tournament
}) {
  const { t } = useI18n()
  const isMarioKart = tournament.format === 'marioKart'
  const primaryPointsLabel = isMarioKart
    ? t('swiss.marioKartTournamentPoints')
    : t('swiss.standings.points')
  const winsLabel = isMarioKart ? t('swiss.marioKartWins') : t('swiss.table.wins')

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="type-label text-muted-foreground">
              {t(tournamentFormatLabelKey(tournament.format))}
            </p>
            <h2 className="type-section-title truncate">
              {tournament.name}
            </h2>
          </div>
          <Badge variant="outline">
            {round ? roundLabel : t('swiss.emptyRound')}
          </Badge>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          <h3 className="type-section-title">{t('swiss.ranking')}</h3>
        </div>
        {standings.length === 0 ? (
          <EmptyState>{t('swiss.emptyStandings')}</EmptyState>
        ) : (
          <Table className={cn('min-w-[44rem]', isMarioKart && 'min-w-[52rem]')}>
            <TableHeader>
              <TableHead>{t('swiss.rank')}</TableHead>
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>{primaryPointsLabel}</TableHead>
              {isMarioKart ? (
                <>
                  <TableHead>{winsLabel}</TableHead>
                  <TableHead>{t('swiss.marioKartAveragePlacement')}</TableHead>
                </>
              ) : (
                <>
                  <TableHead>{t('swiss.table.buchholz')}</TableHead>
                  <TableHead>{t('swiss.table.sb')}</TableHead>
                  <TableHead>{winsLabel}</TableHead>
                </>
              )}
              <TableHead>{t('common.status')}</TableHead>
            </TableHeader>
            <TableBody>
              {standings.map((row) => (
                <TableRow
                  key={row.playerId}
                  className={cn(
                    row.rank === 1 && 'bg-podium-1',
                    row.rank === 2 && 'bg-podium-2',
                    row.rank === 3 && 'bg-podium-3',
                  )}
                >
                  <TableCell className="tabular-nums">
                    <RankPlacement isMarioKart={isMarioKart} rank={row.rank} />
                  </TableCell>
                  <TableCell className="type-label">{row.playerName}</TableCell>
                  <TableCell className="tabular-nums">
                    <span className="type-action inline-flex min-w-12 items-center justify-center rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
                      {formatPoints(row.points)}
                    </span>
                  </TableCell>
                  {isMarioKart ? (
                    <>
                      <TableCell className="tabular-nums">{row.marioKartWins}</TableCell>
                      <TableCell className="tabular-nums">
                        {row.marioKartAveragePlacement === null
                          ? '-'
                          : formatPoints(row.marioKartAveragePlacement)}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="tabular-nums">
                        {formatPoints(row.buchholz)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatPoints(row.sonnebornBerger)}
                      </TableCell>
                      <TableCell className="tabular-nums">{row.wins}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>
                      {t(statusLabelKeys[row.status])}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
