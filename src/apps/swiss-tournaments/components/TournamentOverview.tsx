import { Download, Printer, Trash2, Trophy } from 'lucide-react';
import { useId } from 'react';
import { formatPoints } from '@/apps/swiss-tournaments/components/tournamentUiPresentation'
import type { TournamentInspection } from '@/apps/swiss-tournaments/domain/tournamentDomain'
import { useSwissTournaments } from '@/apps/swiss-tournaments/hooks/useSwissTournaments';
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton';
import { EmptyState } from '@/apps/shared/components/EmptyState';
import type { PlayerStatus, Round, Tournament } from '@/apps/swiss-tournaments/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const marioKartRankGradients: Record<number | 'default', readonly string[]> = {
  1: ['#fff7a8', '#ffd83f', '#b58c18', '#ffe877'],
  2: ['#ffffff', '#dff6f7', '#9fb3bb', '#f4ffff'],
  3: ['#ffe6ca', '#d99c62', '#a56936', '#f7cfaa'],
  default: ['#f4f7f8', '#9aa8ae', '#4d6870', '#c8d2d6'],
}

function ordinalSuffix(rank: number) {
  const remainder = rank % 100

  if (remainder >= 11 && remainder <= 13) {
    return 'th'
  }

  switch (rank % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

function RankPlacement({
  className,
  isMarioKart,
  rank,
}: {
  className?: string
  isMarioKart: boolean
  rank: number
}) {
  const gradientId = `mario-kart-rank-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const shadowId = `mario-kart-rank-shadow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  if (!isMarioKart || !Number.isInteger(rank) || rank < 1) {
    return <>{rank}</>
  }

  const rankText = String(rank)
  const rankDigitCount = rankText.length
  const gradientStops = marioKartRankGradients[rank] ?? marioKartRankGradients.default
  const isCompactRank = rankDigitCount <= 2
  const viewBoxWidth = rankDigitCount === 1 ? 86 : rankDigitCount === 2 ? 96 : 116
  const numberFontSize = isCompactRank ? (rankDigitCount === 1 ? 45 : 40) : 34
  const suffixFontSize = isCompactRank ? (rankDigitCount === 1 ? 17 : 14) : 12
  const letterSpacing = rankDigitCount === 1 ? -3 : -4

  return (
    <span
      aria-label={String(rank)}
      className={cn('inline-flex h-[30px] w-16 max-w-full items-center align-middle', className)}
    >
      <span className="sr-only">{rank}</span>
      <svg
        aria-hidden="true"
        className="block h-full w-full"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${viewBoxWidth} 46`}
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="8"
            x2={viewBoxWidth - 8}
            y1="2"
            y2="45"
            gradientUnits="userSpaceOnUse"
          >
            {gradientStops.map((color, index) => (
              <stop
                key={color}
                offset={index === 0 ? '0' : index === 1 ? '0.48' : index === 2 ? '0.72' : '1'}
                stopColor={color}
              />
            ))}
          </linearGradient>
          <filter id={shadowId} x="-20%" y="-30%" width="140%" height="160%">
            <feDropShadow
              dx="2"
              dy="2"
              floodColor="#1b2228"
              floodOpacity="0.58"
              stdDeviation="1.1"
            />
          </filter>
        </defs>
        <g filter={`url(#${shadowId})`} transform="translate(3 0) skewX(-8)">
          <text
            dominantBaseline="alphabetic"
            fill={`url(#${gradientId})`}
            fontFamily="Arial Black, Impact, sans-serif"
            fontWeight="900"
            paintOrder="stroke"
            stroke="#26313a"
            strokeLinejoin="round"
            strokeWidth={rankDigitCount === 1 ? 5 : 4.5}
            x={rankDigitCount === 1 ? 6 : 4}
            y={rankDigitCount === 1 ? 40 : 39}
          >
            <tspan
              fontSize={numberFontSize}
              letterSpacing={letterSpacing}
            >
              {rankText}
            </tspan>
            <tspan
              dx="3"
              dy="-1"
              fontSize={suffixFontSize}
              letterSpacing="-1"
              strokeWidth={rankDigitCount === 1 ? 3.5 : 3}
            >
              {ordinalSuffix(rank)}
            </tspan>
          </text>
        </g>
      </svg>
    </span>
  )
}

const statusLabelKeys: Record<PlayerStatus, TranslationKey> = {
  active: 'swiss.status.active',
  inactive: 'swiss.status.inactive',
  withdrawn: 'swiss.status.withdrawn',
}

function tournamentFormatLabelKey(format?: Tournament['format']): TranslationKey {
  if (format === 'roundRobin') {
    return 'swiss.format.roundRobin'
  }

  if (format === 'handAndBrain') {
    return 'swiss.format.handAndBrain'
  }

  if (format === 'marioKart') {
    return 'swiss.format.marioKart'
  }

  return 'swiss.format.swiss'
}

function completedUnitLabelKey(format?: Tournament['format']): TranslationKey {
  return format === 'marioKart' ? 'swiss.marioKartGames' : 'swiss.rounds'
}

function statusVariant(status: PlayerStatus) {
  if (status === 'active') {
    return 'default' as const
  }

  return status === 'inactive' ? ('secondary' as const) : ('outline' as const)
}

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
        title={t('swiss.archived.deleteTitle')}
        description={t('swiss.archived.deleteDescription', { name: tournament.name })}
        confirmLabel={t('common.delete')}
        onConfirm={() => onDelete(tournament)}
        trigger={
          <Button
            aria-label={t('swiss.playerRemoveAria', { name: tournament.name })}
            size="sm"
            variant="delete"
          >
            <Trash2 className="size-4" />
          </Button>
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
                    row.rank === 1 && 'bg-[#f6e3a5]/65',
                    row.rank === 2 && 'bg-[#e6e8eb]/70',
                    row.rank === 3 && 'bg-[#e8c0a0]/55',
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
