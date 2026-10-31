import { Trophy } from 'lucide-react';
import { Fragment, useState, type ComponentProps, type CSSProperties } from 'react';
import { RankPlacement } from '@/apps/swiss-tournaments/components/RankPlacement'
import { formatPoints, statusLabelKeys, statusVariant, tournamentWebsiteQrUrl } from '@/apps/swiss-tournaments/components/tournamentUiPresentation'
import { useSwissTournaments } from '@/apps/swiss-tournaments/hooks/useSwissTournaments';
import type { Tournament } from '@/apps/swiss-tournaments/types';
import { Badge } from '@/components/ui/badge';
import { DisclosureIndicator } from '@/components/ui/disclosure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { TournamentInspection } from '@/apps/swiss-tournaments/domain/tournamentDomain'

const tournamentWebsiteUrl = 'https://bengtstoolbox.web.app/apps/swiss-tournaments'

const tiebreakHintClassName =
  'cursor-help underline decoration-muted-foreground/60 decoration-dotted underline-offset-4 print:no-underline'

// Rundenkürzel wie „6W1“ ausgeschrieben: Runde und Ausgang oben, Gegner und Ergebnis darunter.
function RoundHistoryChip({
  children,
  outcome,
  title,
  ...props
}: ComponentProps<'span'> & { outcome?: string; title: string }) {
  const separator = title.indexOf(': ')
  const heading = separator < 0 ? title : title.slice(0, separator)

  return (
    <Tooltip
      title={outcome ? `${heading} · ${outcome}` : heading}
      description={separator < 0 ? undefined : title.slice(separator + 2)}
    >
      <span {...props}>
        {children}
        <span className="sr-only">{title}</span>
      </span>
    </Tooltip>
  )
}

export function StandingsTable({
  inspection,
  standings,
  tournament,
}: {
  inspection: TournamentInspection | null
  standings: ReturnType<typeof useSwissTournaments>['standings']
  tournament: Tournament
}) {
  const { language, t } = useI18n()
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)
  type StandingHistoryCell = (typeof standings)[number]['roundHistory'][number]
  type StandingTableRow = (typeof standings)[number]
  const podiumClass = (rank: number) =>
    rank === 1
      ? 'swiss-podium-first bg-podium-1'
      : rank === 2
        ? 'swiss-podium-second bg-podium-2'
        : rank === 3
          ? 'swiss-podium-third bg-podium-3'
          : ''
  const roundCellClass = (cell: StandingHistoryCell) =>
    cn(
      'type-caption swiss-round-cell inline-flex h-7 min-w-11 items-center justify-start rounded px-2 tabular-nums',
      cell.color === 'W' && 'border border-border bg-white text-[#111827]',
      cell.color === 'B' && 'bg-[var(--brand-primary)] text-white',
      cell.outcome === 'bye' && 'border border-dashed border-border bg-muted text-muted-foreground',
      cell.outcome === 'open' && 'border border-border bg-background text-muted-foreground',
    )
  const toggleExpandedPlayer = (playerId: string) => {
    setExpandedPlayerId((currentPlayerId) =>
      currentPlayerId === playerId ? null : playerId,
    )
  }
  const tournamentFormat = tournament.format
  const tournamentName = tournament.name
  const isMarioKart = tournamentFormat === 'marioKart'
  const visibleRoundHistory = (row: StandingTableRow) =>
    isMarioKart
      ? row.roundHistory.filter((cell) => cell.outcome !== 'open')
      : row.roundHistory
  const visibleEventHistory = (row: StandingTableRow) =>
    row.roundHistory.filter(
      (cell) => cell.event || (cell.outcome !== 'open' && cell.outcome !== 'bye'),
    )
  const roundColumnCount = Math.max(
    0,
    ...standings.map((row) => visibleRoundHistory(row).length),
  )
  const visibleRoundGridColumns = Math.min(Math.max(roundColumnCount, 1), 3)
  const roundCellLabelWidth = Math.max(
    4,
    ...standings.flatMap((row) =>
      visibleRoundHistory(row).map((cell) => cell.label.length),
    ),
  )
  const roundCellWidthRem = roundCellLabelWidth * 0.45 + 1.85
  const roundGridWidthRem =
    visibleRoundGridColumns * roundCellWidthRem +
    Math.max(0, visibleRoundGridColumns - 1) * 0.5
  const roundHistoryColumnWidthRem = roundGridWidthRem + 1.5
  const marioKartStandingsMinWidthRem = 47.5 + roundHistoryColumnWidthRem
  const marioKartEventTableMinWidthRem = 23 + roundHistoryColumnWidthRem
  const roundCellWidthStyle = {
    '--swiss-round-cell-width': `${roundCellWidthRem}rem`,
    '--swiss-round-grid-columns': visibleRoundGridColumns,
  } as CSSProperties
  const hardshipLabel =
    tournamentFormat === 'marioKart'
      ? t('swiss.marioKartGames')
      : tournamentFormat === 'handAndBrain'
      ? t('swiss.hardship.handAndBrain')
      : t('swiss.hardship.byes')
  const hardshipCount = (row: StandingTableRow) =>
    tournamentFormat === 'marioKart'
      ? row.marioKartPhysicalRaces
      : tournamentFormat === 'handAndBrain'
      ? row.receivedByes + row.receivedSingleGames
      : row.receivedByes
  const primaryPointsLabel = isMarioKart
    ? t('swiss.marioKartTournamentPoints')
    : t('swiss.standings.points')
  const mobilePrimaryPointsLabel = isMarioKart ? 'TP' : primaryPointsLabel
  const winsLabel = isMarioKart ? t('swiss.marioKartWins') : t('swiss.table.wins')
  // Mario Kart kennt kein Remis; dort steht der Ausgang schon im Kürzel.
  const outcomeLabel = (cell: StandingHistoryCell) =>
    isMarioKart || cell.outcome === 'open' || cell.outcome === 'bye'
      ? undefined
      : t(`swiss.outcome.${cell.outcome}`)
  const tiebreakHeader = (label: string, position: number, name: string, description: string) => (
    <Tooltip
      title={`${name} · ${t('swiss.table.tiebreak', { position })}`}
      description={description}
    >
      <span className={tiebreakHintClassName}>{label}</span>
    </Tooltip>
  )
  const winsCount = (row: StandingTableRow) =>
    isMarioKart ? row.marioKartWins : row.wins
  const eventStandings = isMarioKart
    ? (inspection?.beerStandings ?? []).map((beerRow) => ({
        ...standings.find((row) => row.playerId === beerRow.playerId)!,
        eventRank: beerRow.rank,
      }))
    : []
  const eventCellClass = (cell: StandingHistoryCell) =>
    cn(
      'type-caption swiss-round-cell inline-flex h-7 min-w-11 items-center justify-center rounded px-2 tabular-nums',
      cell.event
        ? 'border border-emerald-300 bg-emerald-100 text-emerald-950'
        : cell.outcome === 'open'
          ? 'border border-border bg-background text-muted-foreground'
          : 'border border-red-300 bg-red-100 text-red-950',
    )
  const eventCellLabel = (cell: StandingHistoryCell) =>
    cell.outcome === 'open' && !cell.event ? '-' : cell.label.split(' ')[0] || cell.label
  const eventCellStatusLabel = (cell: StandingHistoryCell) =>
    cell.event ? t('swiss.eventYes') : t('swiss.eventNo')
  const printPrimaryPointsLines = isMarioKart
    ? language === 'de'
      ? ['Turnier', 'punkte']
      : ['Tournament', 'points']
    : [primaryPointsLabel]
  const printAveragePlacementLines =
    language === 'de' ? ['Ø-', 'Platz'] : ['Avg.', 'place']
  const printRoundHistoryLines = isMarioKart
    ? language === 'de'
      ? ['Gespielte', 'Lobbys']
      : ['Played', 'lobbies']
    : [t('swiss.rounds')]
  const printEventHistoryLines =
    language === 'de' ? ['Lobby-', 'Biere'] : ['Lobby', 'beers']

  const printHeaderLabel = (label: string, lines: string[] = [label]) => (
    <>
      <span className="swiss-header-screen-label">{label}</span>
      <span aria-hidden="true" className="swiss-header-print-label">
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </span>
    </>
  )

  return (
    <Card className="swiss-standings-card">
      <CardHeader>
        <div className="swiss-export-title hidden">
          <h1>{tournamentName}</h1>
        </div>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          {t('swiss.ranking')}
        </CardTitle>
      </CardHeader>
      <CardContent style={roundCellWidthStyle}>
        <Table
          className="table-fixed"
          containerClassName="swiss-standings-mobile overflow-x-hidden md:hidden"
        >
            <colgroup>
              <col className="swiss-mobile-col-rank w-16" />
              <col />
              <col className="swiss-mobile-col-points w-20" />
              {!isMarioKart && (
                <>
                  <col className="swiss-mobile-col-buchholz w-20" />
                  <col className="swiss-mobile-sb w-20" />
                </>
              )}
            </colgroup>
            <TableHeader>
                <TableHead className="px-1.5 py-2">{t('swiss.rank')}</TableHead>
                <TableHead className="py-2 pl-4 pr-1.5">{t('common.name')}</TableHead>
                <TableHead className="px-1 py-2 text-center" title={primaryPointsLabel}>
                  {mobilePrimaryPointsLabel}
                </TableHead>
                {!isMarioKart && (
                  <>
                    <TableHead className="px-1 py-2 text-center">
                      <span className="swiss-mobile-buchholz-label">
                        {t('swiss.table.buchholz')}
                      </span>
                      <abbr
                        aria-label={t('swiss.table.buchholz')}
                        className="swiss-mobile-buch-label hidden no-underline"
                        title={t('swiss.table.buchholz')}
                      >
                        Buch
                      </abbr>
                    </TableHead>
                    <TableHead className="swiss-mobile-sb px-1 py-2 text-center">
                      {t('swiss.table.sb')}
                    </TableHead>
                  </>
                )}
            </TableHeader>
            <TableBody>
              {standings.map((row) => {
                const isExpanded = expandedPlayerId === row.playerId
                const detailsId = `swiss-standing-details-${row.playerId}`

                return (
                  <Fragment key={row.playerId}>
                    <TableRow
                      aria-controls={detailsId}
                      aria-expanded={isExpanded}
                      className={cn(
                        'cursor-pointer outline-none transition-colors hover:bg-primary/5 focus-visible:bg-primary/10',
                        podiumClass(row.rank),
                      )}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleExpandedPlayer(row.playerId)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          toggleExpandedPlayer(row.playerId)
                        }
                      }}
                    >
                      <TableCell className="px-0.5 py-1.5 text-center tabular-nums">
                        <RankPlacement
                          className="justify-center"
                          isMarioKart={isMarioKart}
                          rank={row.rank}
                        />
                      </TableCell>
                      <TableCell className="type-label min-w-0 py-2 pl-4 pr-1.5">
                        <span className="flex min-w-0 items-center justify-between gap-2">
                          <span className="min-w-0 truncate">{row.playerName}</span>
                          <DisclosureIndicator isOpen={isExpanded} />
                        </span>
                      </TableCell>
                      <TableCell className="px-1 py-2 text-center tabular-nums">
                        <span className="type-action inline-flex min-w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-primary">
                          {formatPoints(row.points)}
                        </span>
                      </TableCell>
                      {!isMarioKart && (
                        <>
                          <TableCell className="px-1 py-2 text-center tabular-nums">
                            {formatPoints(row.buchholz)}
                          </TableCell>
                          <TableCell className="swiss-mobile-sb px-1 py-2 text-center tabular-nums">
                            {formatPoints(row.sonnebornBerger)}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                    {isExpanded && (
                      <TableRow
                        id={detailsId}
                        className={cn('bg-background/70', podiumClass(row.rank))}
                      >
                        <TableCell className="px-2 pb-2 pt-0" colSpan={isMarioKart ? 3 : 5}>
                          <div className="grid gap-2 py-2">
                            <div className="swiss-round-grid">
                              {visibleRoundHistory(row).map((cell) => (
                                <RoundHistoryChip
                                  key={`${row.playerId}-${cell.roundNumber}`}
                                  className={roundCellClass(cell)}
                                  title={cell.title}
                                  outcome={outcomeLabel(cell)}
                                >
                                  {cell.label}
                                </RoundHistoryChip>
                              ))}
                            </div>
                            <div className="type-field-label flex flex-wrap items-center gap-2 text-muted-foreground">
                              <span>{winsLabel}: {winsCount(row)}</span>
                              {!isMarioKart && (
                                <span className="swiss-mobile-sb-detail hidden">
                                  {t('swiss.table.sb')}: {formatPoints(row.sonnebornBerger)}
                                </span>
                              )}
                              {isMarioKart && (
                                <>
                                  <span>{t('swiss.marioKartPhysicalRaces')}: {row.marioKartPhysicalRaces}</span>
                                  <span>{t('swiss.marioKartScoringRaces')}: {row.marioKartScoringRaces}</span>
                                  <span>{t('swiss.marioKartEvents')}: {row.marioKartEvents}</span>
                                  <span>
                                    {t('swiss.marioKartAveragePlacement')}:{' '}
                                    {row.marioKartAveragePlacement === null
                                      ? '-'
                                      : formatPoints(row.marioKartAveragePlacement)}
                                  </span>
                                </>
                              )}
                              <span>{hardshipLabel}: {hardshipCount(row)}</span>
                              <Badge
                                className="h-5 px-1.5"
                                variant={statusVariant(row.status)}
                              >
                                  {t(statusLabelKeys[row.status])}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
        </Table>

        <Table
          className={cn(
            'swiss-standings-table swiss-standings-main',
            isMarioKart && 'swiss-standings-mario-kart',
            isMarioKart ? 'table-fixed' : 'min-w-[68rem]',
          )}
          containerClassName="swiss-standings-table-wrap swiss-standings-desktop hidden md:block"
          style={
            isMarioKart
              ? { minWidth: `${marioKartStandingsMinWidthRem}rem` }
              : undefined
          }
        >
            {isMarioKart && (
              <colgroup>
                <col className="swiss-col-rank w-[6rem]" />
                <col className="swiss-col-name w-[10rem]" />
                <col className="swiss-col-metric w-[7rem]" />
                <col className="swiss-col-wins w-[5.5rem]" />
                <col className="swiss-col-average w-[6.5rem]" />
                <col className="swiss-col-history" />
                <col className="swiss-col-races w-[5.5rem]" />
                <col className="swiss-col-status w-[7rem]" />
              </colgroup>
            )}
            <TableHeader>
                <TableHead>{printHeaderLabel(t('swiss.rank'))}</TableHead>
                <TableHead>{printHeaderLabel(t('common.name'))}</TableHead>
                <TableHead>
                  {printHeaderLabel(primaryPointsLabel, printPrimaryPointsLines)}
                </TableHead>
                {isMarioKart ? (
                  <>
                    <TableHead>{printHeaderLabel(winsLabel)}</TableHead>
                    <TableHead>
                      {printHeaderLabel(
                        t('swiss.marioKartAveragePlacement'),
                        printAveragePlacementLines,
                      )}
                    </TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>
                      {tiebreakHeader(
                        t('swiss.table.buchholz'),
                        1,
                        t('swiss.table.buchholz'),
                        t('swiss.table.buchholzInfo'),
                      )}
                    </TableHead>
                    <TableHead>
                      {tiebreakHeader(
                        t('swiss.table.sb'),
                        2,
                        t('swiss.table.sbName'),
                        t('swiss.table.sbInfo'),
                      )}
                    </TableHead>
                    <TableHead>
                      {tiebreakHeader(winsLabel, 3, winsLabel, t('swiss.table.winsInfo'))}
                    </TableHead>
                  </>
                )}
                <TableHead className="swiss-rounds-heading">
                  {printHeaderLabel(
                    isMarioKart ? t('swiss.playedLobbies') : t('swiss.rounds'),
                    printRoundHistoryLines,
                  )}
                </TableHead>
                <TableHead
                  className={cn(!isMarioKart && 'swiss-export-hidden-column')}
                >
                  {printHeaderLabel(hardshipLabel)}
                </TableHead>
                <TableHead className="swiss-export-hidden-column">{t('common.status')}</TableHead>
            </TableHeader>
            <TableBody>
              {standings.map((row) => (
                <TableRow
                  key={row.playerId}
                  className={podiumClass(row.rank)}
                >
                  <TableCell className="tabular-nums">
                    <RankPlacement isMarioKart={isMarioKart} rank={row.rank} />
                  </TableCell>
                  <TableCell className="type-label min-w-0">
                    <span className="block truncate" title={row.playerName}>
                      {row.playerName}
                    </span>
                  </TableCell>
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
                      <TableCell className="tabular-nums">{formatPoints(row.buchholz)}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatPoints(row.sonnebornBerger)}
                      </TableCell>
                      <TableCell className="tabular-nums">{row.wins}</TableCell>
                    </>
                  )}
                  <TableCell className="swiss-round-table-cell">
                    <div className="swiss-round-grid">
                      {visibleRoundHistory(row).map((cell) => (
                        <RoundHistoryChip
                          key={`${row.playerId}-${cell.roundNumber}`}
                          className={roundCellClass(cell)}
                          title={cell.title}
                          outcome={outcomeLabel(cell)}
                        >
                          {cell.label}
                        </RoundHistoryChip>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'tabular-nums',
                      !isMarioKart && 'swiss-export-hidden-column',
                    )}
                  >
                    {hardshipCount(row)}
                  </TableCell>
                  <TableCell className="swiss-export-hidden-column">
                    <Badge variant={statusVariant(row.status)}>
                      {t(statusLabelKeys[row.status])}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </Table>
        {isMarioKart && (
          <div className="mt-6 grid gap-3">
            <h3 className="type-card-title flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              {t('swiss.marioKartEventRanking')}
            </h3>
            <Table
              className="swiss-standings-beer-mobile table-fixed"
              containerClassName="swiss-standings-mobile md:hidden"
            >
              <colgroup>
                <col className="w-16" />
                <col />
                <col className="w-20" />
              </colgroup>
              <TableHeader>
                <TableHead className="px-1.5 py-2">{t('swiss.rank')}</TableHead>
                <TableHead className="py-2 pl-4 pr-1.5">{t('common.name')}</TableHead>
                <TableHead className="px-1 py-2 text-center">
                  {t('swiss.marioKartEvents')}
                </TableHead>
              </TableHeader>
              <TableBody>
                {eventStandings.map((row) => (
                  <Fragment key={`event-mobile-${row.playerId}`}>
                    <TableRow className={podiumClass(row.eventRank)}>
                      <TableCell className="px-1.5 py-2 tabular-nums">
                        <RankPlacement
                          className="justify-center"
                          isMarioKart
                          rank={row.eventRank}
                        />
                      </TableCell>
                      <TableCell className="type-label min-w-0 py-2 pl-4 pr-1.5">
                        <span className="block min-w-0 truncate">{row.playerName}</span>
                      </TableCell>
                      <TableCell className="px-1 py-2 text-center tabular-nums">
                        <span className="type-action inline-flex min-w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-primary">
                          {row.marioKartEvents}
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow className={podiumClass(row.eventRank)}>
                      <TableCell className="px-2 pb-2 pt-0" colSpan={3}>
                        <div className="swiss-event-history-grid swiss-round-grid py-2">
                          {visibleEventHistory(row).map((cell) => (
                            <RoundHistoryChip
                              key={`${row.playerId}-event-${cell.roundNumber}`}
                              className={eventCellClass(cell)}
                              title={cell.title}
                              aria-label={`${eventCellLabel(cell)}: ${eventCellStatusLabel(cell)}`}
                            >
                              {eventCellLabel(cell)}
                            </RoundHistoryChip>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
            <Table
              className="swiss-standings-beer swiss-standings-table table-fixed"
              containerClassName="swiss-standings-table-wrap swiss-standings-desktop hidden md:block"
              style={{ minWidth: `${marioKartEventTableMinWidthRem}rem` }}
            >
              <colgroup>
                <col className="swiss-col-rank w-[6rem]" />
                <col className="swiss-col-name w-[10rem]" />
                <col className="swiss-col-metric w-[7rem]" />
                <col className="swiss-col-history" />
              </colgroup>
              <TableHeader>
                <TableHead>{printHeaderLabel(t('swiss.rank'))}</TableHead>
                <TableHead>{printHeaderLabel(t('common.name'))}</TableHead>
                <TableHead>{printHeaderLabel(t('swiss.marioKartEvents'))}</TableHead>
                <TableHead className="swiss-rounds-heading">
                  {printHeaderLabel(
                    t('swiss.marioKartEventHistory'),
                    printEventHistoryLines,
                  )}
                </TableHead>
              </TableHeader>
              <TableBody>
                {eventStandings.map((row) => (
                  <TableRow key={`event-${row.playerId}`} className={podiumClass(row.eventRank)}>
                    <TableCell className="tabular-nums">
                      <RankPlacement isMarioKart rank={row.eventRank} />
                    </TableCell>
                    <TableCell className="type-label min-w-0">
                      <span className="block truncate" title={row.playerName}>
                        {row.playerName}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      <span className="type-action inline-flex min-w-12 items-center justify-center rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
                        {row.marioKartEvents}
                      </span>
                    </TableCell>
                    <TableCell className="swiss-round-table-cell">
                      <div className="swiss-round-grid">
                        {visibleEventHistory(row).map((cell) => (
                          <RoundHistoryChip
                            key={`${row.playerId}-event-${cell.roundNumber}`}
                            className={eventCellClass(cell)}
                            title={cell.title}
                            aria-label={`${eventCellLabel(cell)}: ${eventCellStatusLabel(cell)}`}
                          >
                            {eventCellLabel(cell)}
                          </RoundHistoryChip>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="swiss-export-qr hidden" aria-hidden="true">
          <img
            src={tournamentWebsiteQrUrl}
            title={tournamentWebsiteUrl}
            alt=""
          />
        </div>
      </CardContent>
    </Card>
  )
}
