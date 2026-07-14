import { ArrowRight, Brain, CirclePlus, Gamepad2, GitBranch, Plus, Swords, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useSwissTournaments } from '@/apps/swiss-tournaments/hooks/useSwissTournaments';
import { getNextDefaultTournamentName } from '@/apps/swiss-tournaments/historicalNames';
import type { ByeScore, InitialPlayerStatus, SeedingMode, Tournament, TournamentFormat } from '@/apps/swiss-tournaments/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { IftaInput, IftaSelectTrigger } from '@/components/ui/ifta-field';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { byeScoreOptions, plannedUnitLabelKey, statusLabelKeys, statusVariant, tournamentFormatLabelKey } from '@/apps/swiss-tournaments/components/tournamentUiPresentation';

function roundRobinRoundsForPlayerCount(playerCount: number, cycles: number) {
  if (playerCount <= 1) {
    return 1
  }

  return (playerCount % 2 === 0 ? playerCount - 1 : playerCount) * cycles
}

function swissRoundsForPlayerCount(playerCount: number) {
  return Math.min(Math.max(1, playerCount - 1), 10)
}

function defaultRoundsForFormat(
  format: TournamentFormat,
  playerCount: number,
  roundRobinCycles: number,
) {
  if (format === 'roundRobin') {
    return roundRobinRoundsForPlayerCount(playerCount, roundRobinCycles)
  }

  if (format === 'handAndBrain') {
    return 5
  }

  if (format === 'marioKart') {
    return 5
  }

  return swissRoundsForPlayerCount(playerCount)
}

function normalizeRoundCountInput(value: string) {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue)) {
    return 1
  }

  return Math.max(1, Math.floor(parsedValue) || 1)
}

function TournamentFormatPicker({
  format,
  onFormatChange,
}: {
  format: TournamentFormat
  onFormatChange: (format: TournamentFormat) => void
}) {
  const { t } = useI18n()
  const optionClass = (isActive: boolean, isDisabled = false) =>
    cn(
      'flex h-9 min-w-0 items-center gap-1.5 rounded-md border px-2.5 text-left transition-colors',
      isActive
        ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary ring-offset-1 ring-offset-background'
        : 'border-border bg-background text-muted-foreground',
      isDisabled && 'cursor-not-allowed opacity-55',
    )

  return (
    <div className="grid gap-2">
      <Label>{t('swiss.format.label')}</Label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button
          aria-pressed={format === 'swiss'}
          className={optionClass(format === 'swiss')}
          type="button"
          onClick={() => onFormatChange('swiss')}
        >
          <Swords className="size-4 shrink-0" />
          <span className="min-w-0">
            <span className="type-action block whitespace-nowrap">
              {t(tournamentFormatLabelKey('swiss'))}
            </span>
          </span>
        </button>
        <button
          aria-pressed={format === 'roundRobin'}
          className={optionClass(format === 'roundRobin')}
          type="button"
          onClick={() => onFormatChange('roundRobin')}
        >
          <GitBranch className="size-4 shrink-0" />
          <span className="min-w-0">
            <span className="type-action block whitespace-nowrap">
              {t(tournamentFormatLabelKey('roundRobin'))}
            </span>
          </span>
        </button>
        <button
          aria-pressed={format === 'handAndBrain'}
          className={optionClass(format === 'handAndBrain')}
          type="button"
          onClick={() => onFormatChange('handAndBrain')}
        >
          <Brain className="size-4 shrink-0" />
          <span className="min-w-0">
            <span className="type-action block whitespace-nowrap">
              {t(tournamentFormatLabelKey('handAndBrain'))}
            </span>
          </span>
        </button>
        <button
          aria-pressed={format === 'marioKart'}
          className={optionClass(format === 'marioKart')}
          type="button"
          onClick={() => onFormatChange('marioKart')}
        >
          <Gamepad2 className="size-4 shrink-0" />
          <span className="min-w-0">
            <span className="type-action block whitespace-nowrap">
              {t(tournamentFormatLabelKey('marioKart'))}
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}

type DraftPlayer = {
  id: string
  name: string
  rating: string
  status: InitialPlayerStatus
}

function defaultDraftPlayers(): DraftPlayer[] {
  return [
    { id: 'draft-1', name: 'Niklas', rating: '1922', status: 'active' },
    { id: 'draft-2', name: 'Bengt', rating: '1818', status: 'active' },
    { id: 'draft-3', name: 'Thomas', rating: '1697', status: 'active' },
    { id: 'draft-4', name: 'Liam', rating: '1674', status: 'active' },
    { id: 'draft-5', name: 'Ralph', rating: '1614', status: 'active' },
    { id: 'draft-6', name: 'Uwe', rating: '1524', status: 'active' },
    { id: 'draft-7', name: 'Quinn', rating: '1494', status: 'active' },
    { id: 'draft-8', name: 'Matthias', rating: '1485', status: 'active' },
    { id: 'draft-9', name: 'Armin', rating: '1434', status: 'active' },
    { id: 'draft-10', name: 'Nikita', rating: '1311', status: 'active' },
  ]
}

function tournamentPlayersToDraftPlayers(tournament?: Tournament | null): DraftPlayer[] {
  if (!tournament?.players.length) {
    return defaultDraftPlayers()
  }

  return [...tournament.players]
    .sort((left, right) => left.initialSeed - right.initialSeed)
    .map((player, index) => ({
      id: `draft-${player.id}-${index}`,
      name: player.name,
      rating: player.rating === undefined ? '' : String(player.rating),
      status: 'active',
    }))
}

function defaultTournamentName(
  format: TournamentFormat,
  t: ReturnType<typeof useI18n>['t'],
  formatDateTime: ReturnType<typeof useI18n>['formatDateTime'],
  tournaments: Tournament[],
) {
  const date = new Date()
  const baseName = t('swiss.defaultTournamentName', {
    date: formatDateTime(date, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    format: t(tournamentFormatLabelKey(format)),
  })

  return getNextDefaultTournamentName(tournaments, format, baseName, date)
}

function isDefaultTournamentName(
  value: string,
  t: ReturnType<typeof useI18n>['t'],
  formatDateTime: ReturnType<typeof useI18n>['formatDateTime'],
  tournaments: Tournament[],
) {
  return (
    value === defaultTournamentName('swiss', t, formatDateTime, tournaments) ||
    value === defaultTournamentName('roundRobin', t, formatDateTime, tournaments) ||
    value === defaultTournamentName('handAndBrain', t, formatDateTime, tournaments) ||
    value === defaultTournamentName('marioKart', t, formatDateTime, tournaments)
  )
}

function TournamentCreator({
  initialTournament,
  onCreated,
  onCreate,
  tournaments,
}: {
  initialTournament?: Tournament | null
  onCreated?: () => void
  onCreate: ReturnType<typeof useSwissTournaments>['createNewTournament']
  tournaments: Tournament[]
}) {
  const { language, t, formatDateTime } = useI18n()
  const [name, setName] = useState(() =>
    defaultTournamentName('swiss', t, formatDateTime, tournaments),
  )
  const [roundsInput, setRoundsInput] = useState(() =>
    String(
      swissRoundsForPlayerCount(
        tournamentPlayersToDraftPlayers(initialTournament).filter(
          (player) => player.name.trim().length > 0 && player.status === 'active',
        ).length,
      ),
    ),
  )
  const [roundsManuallyEdited, setRoundsManuallyEdited] = useState(false)
  const [format, setFormat] = useState<TournamentFormat>('swiss')
  const roundRobinCycles = 1
  const [players, setPlayers] = useState<DraftPlayer[]>(() =>
    tournamentPlayersToDraftPlayers(initialTournament),
  )
  const [newDraftPlayerName, setNewDraftPlayerName] = useState('')
  const [newDraftPlayerRating, setNewDraftPlayerRating] = useState('')
  const [initialSeedingMode, setInitialSeedingMode] =
    useState<SeedingMode>('rating')
  const [byeScore, setByeScore] = useState<ByeScore>(1)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const cleanPlayerCount = players.filter(
    (player) => player.name.trim().length > 0 && player.status === 'active',
  ).length
  const automaticRoundCount = defaultRoundsForFormat(
    format,
    cleanPlayerCount,
    roundRobinCycles,
  )
  const normalizedManualRoundCount = normalizeRoundCountInput(roundsInput)
  const effectiveNumberOfRounds =
    format === 'roundRobin' || !roundsManuallyEdited
      ? automaticRoundCount
      : normalizedManualRoundCount
  const roundInputValue =
    format === 'roundRobin' || !roundsManuallyEdited
      ? String(automaticRoundCount)
      : roundsInput
  const handleFormatChange = (nextFormat: TournamentFormat) => {
    setName((currentName) =>
      isDefaultTournamentName(currentName, t, formatDateTime, tournaments)
        ? defaultTournamentName(nextFormat, t, formatDateTime, tournaments)
        : currentName,
    )
    setByeScore(nextFormat === 'marioKart' ? 0.5 : 1)
    setFormat(nextFormat)
  }
  const handleAddDraftPlayer = () => {
    const draftName = newDraftPlayerName.trim()

    if (!draftName) {
      return
    }

    setPlayers((currentPlayers) => [
      ...currentPlayers,
      {
        id: `draft-${Date.now()}-${currentPlayers.length}-${Math.random()
          .toString(36)
          .slice(2)}`,
        name: draftName,
        rating: newDraftPlayerRating.trim(),
        status: 'active',
      },
    ])
    setNewDraftPlayerName('')
    setNewDraftPlayerRating('')
  }

  return (
    <Card>
      <CardContent className="grid gap-2 p-6 md:gap-4">
        <TournamentFormatPicker
          format={format}
          onFormatChange={handleFormatChange}
        />

        <div className="grid gap-2 md:grid-cols-2 md:gap-3">
          <IftaInput
            id="swiss-name"
            label={t('swiss.tournamentName')}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <IftaInput
            id="swiss-rounds"
            label={t(plannedUnitLabelKey(format))}
            min={1}
            readOnly={format === 'roundRobin'}
            type="number"
            value={roundInputValue}
            onBlur={() => {
              if (roundsManuallyEdited) {
                setRoundsInput(String(normalizedManualRoundCount))
              }
            }}
            onChange={(event) => {
              setRoundsManuallyEdited(true)
              setRoundsInput(event.currentTarget.value)
            }}
          />
        </div>

        <div className="grid gap-2 border-b pb-2 md:grid-cols-2 md:gap-3 md:pb-4">
          <div>
            <Select
              value={initialSeedingMode}
              disabled={format === 'roundRobin'}
              onValueChange={(value) =>
                setInitialSeedingMode(value as SeedingMode)
              }
            >
              <IftaSelectTrigger label={t('swiss.sorting')}>
                <SelectValue />
              </IftaSelectTrigger>
              <SelectContent>
                <SelectItem value="rating">{t('swiss.sorting.rating')}</SelectItem>
                <SelectItem value="random">{t('swiss.sorting.random')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {format !== 'marioKart' && (
          <div>
            <Select
              value={String(byeScore)}
              onValueChange={(value) => setByeScore(Number(value) as ByeScore)}
            >
              <IftaSelectTrigger label={t('swiss.pointsPerBye')}>
                <SelectValue />
              </IftaSelectTrigger>
              <SelectContent>
                {byeScoreOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {language === 'en' ? option.labelEn : option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}
        </div>

        <div className="grid gap-2 md:gap-3">
          <div className="flex items-center">
            <Label>{t('swiss.players')}</Label>
          </div>

          <div className="grid gap-2 md:gap-3">
            <form
              className="border-t border-dashed bg-background px-2.5 py-2 sm:px-3"
              onSubmit={(event) => {
                event.preventDefault()
                handleAddDraftPlayer()
              }}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2 md:grid-cols-[1fr_10rem_auto] md:gap-3">
                <IftaInput
                  aria-label={t('swiss.newPlayerNameAria')}
                  label={t('common.name')}
                  placeholder={t('swiss.newPlayer')}
                  value={newDraftPlayerName}
                  onChange={(event) =>
                    setNewDraftPlayerName(event.currentTarget.value)
                  }
                />
                <IftaInput
                  aria-label={t('swiss.newPlayerRatingAria')}
                  label={t('common.rating')}
                  placeholder="DWZ"
                  type="number"
                  value={newDraftPlayerRating}
                  onChange={(event) =>
                    setNewDraftPlayerRating(event.currentTarget.value)
                  }
                />
                <Button
                  className="col-span-2 h-9 w-full md:col-span-1 md:h-11 md:w-auto"
                  size="ifta"
                  type="submit"
                  variant="outline"
                  disabled={newDraftPlayerName.trim().length === 0}
                >
                  <CirclePlus className="size-4" />
                  <span className="sm:sr-only md:not-sr-only">{t('swiss.addPlayer')}</span>
                </Button>
              </div>
            </form>

            <div className="grid gap-2 md:hidden">
              <div className="type-field-label grid grid-cols-[minmax(0,1fr)_7rem] gap-2 px-2 text-muted-foreground">
                <span>{t('common.name')}</span>
                <span>{t('common.rating')}</span>
              </div>
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="grid gap-3 rounded-md border bg-card p-2.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="type-caption flex h-6 min-w-7 items-center justify-center rounded-md border bg-secondary px-2 tabular-nums">
                      #{index + 1}
                    </span>
                    <Badge className="h-6" variant={statusVariant(player.status)}>
                      {t(statusLabelKeys[player.status])}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                    <Input
                      id={`swiss-create-mobile-name-${player.id}`}
                      aria-label={t('swiss.playerNameByIndexAria', {
                        number: index + 1,
                      })}
                      value={player.name}
                      onChange={(event) =>
                        setPlayers((currentPlayers) =>
                          currentPlayers.map((entry) =>
                            entry.id === player.id
                              ? { ...entry, name: event.currentTarget.value }
                              : entry,
                          ),
                        )
                      }
                    />
                    <Input
                      id={`swiss-create-mobile-rating-${player.id}`}
                      aria-label={
                        player.name
                          ? t('swiss.playerRatingAria', { name: player.name })
                          : t('swiss.playerRatingByIndexAria', { number: index + 1 })
                      }
                      type="number"
                      value={player.rating}
                      onChange={(event) =>
                        setPlayers((currentPlayers) =>
                          currentPlayers.map((entry) =>
                            entry.id === player.id
                              ? { ...entry, rating: event.currentTarget.value }
                              : entry,
                          ),
                        )
                      }
                    />
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
                    <Select
                      value={player.status}
                      onValueChange={(value) =>
                        setPlayers((currentPlayers) =>
                          currentPlayers.map((entry) =>
                            entry.id === player.id
                              ? {
                                  ...entry,
                                  status: value as InitialPlayerStatus,
                                }
                              : entry,
                          ),
                        )
                      }
                    >
                      <IftaSelectTrigger
                        aria-label={
                          player.name
                            ? t('swiss.playerStatusAria', { name: player.name })
                            : t('swiss.playerStatusByIndexAria', { number: index + 1 })
                        }
                        label={t('common.status')}
                      >
                        <SelectValue />
                      </IftaSelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t('swiss.status.active')}</SelectItem>
                        <SelectItem value="inactive">{t('swiss.status.inactive')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      aria-label={t('swiss.playerRemoveAria', {
                        name: player.name || t('common.player'),
                      })}
                      className="h-11 w-9 px-0"
                      size="ifta"
                      type="button"
                      variant="delete"
                      onClick={() =>
                        setPlayers((currentPlayers) =>
                          currentPlayers.filter((entry) => entry.id !== player.id),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Table className="min-w-[46rem]" containerClassName="hidden md:block">
              <TableHeader>
                <TableHead>#</TableHead>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.rating')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.action')}</TableHead>
              </TableHeader>
              <TableBody>
                {players.map((player, index) => (
                  <TableRow key={player.id}>
                    <TableCell className="tabular-nums">{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        id={`swiss-create-name-${player.id}`}
                        aria-label={t('swiss.playerNameByIndexAria', {
                          number: index + 1,
                        })}
                        value={player.name}
                        onChange={(event) =>
                          setPlayers((currentPlayers) =>
                            currentPlayers.map((entry) =>
                              entry.id === player.id
                                ? { ...entry, name: event.currentTarget.value }
                                : entry,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        id={`swiss-create-rating-${player.id}`}
                        aria-label={
                          player.name
                            ? t('swiss.playerRatingAria', { name: player.name })
                            : t('swiss.playerRatingByIndexAria', { number: index + 1 })
                        }
                        className="w-28"
                        type="number"
                        value={player.rating}
                        onChange={(event) =>
                          setPlayers((currentPlayers) =>
                            currentPlayers.map((entry) =>
                              entry.id === player.id
                                ? { ...entry, rating: event.currentTarget.value }
                                : entry,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(player.status)}>
                        {t(statusLabelKeys[player.status])}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={player.status}
                          onValueChange={(value) =>
                            setPlayers((currentPlayers) =>
                              currentPlayers.map((entry) =>
                                entry.id === player.id
                                  ? {
                                      ...entry,
                                      status: value as InitialPlayerStatus,
                                    }
                                  : entry,
                              ),
                            )
                          }
                        >
                          <SelectTrigger
                            aria-label={
                              player.name
                                ? t('swiss.playerStatusAria', { name: player.name })
                                : t('swiss.playerStatusByIndexAria', {
                                    number: index + 1,
                                  })
                            }
                            className="w-40"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">{t('swiss.status.active')}</SelectItem>
                            <SelectItem value="inactive">{t('swiss.status.inactive')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          aria-label={t('swiss.playerRemoveAria', {
                            name: player.name || t('common.player'),
                          })}
                          className="h-9"
                          size="sm"
                          variant="delete"
                          onClick={() =>
                            setPlayers((currentPlayers) =>
                              currentPlayers.filter(
                                (entry) => entry.id !== player.id,
                              ),
                            )
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {createError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {createError}
          </div>
        )}

        <Button
          disabled={
            isCreating || players.every((player) => player.name.trim().length === 0)
          }
          onClick={async () => {
            setCreateError(null)
            setIsCreating(true)

            try {
              const created = await onCreate({
                name,
                format,
                numberOfRounds: effectiveNumberOfRounds,
                players: players.map((player) => ({
                  name: player.name,
                  rating: player.rating ? Number(player.rating) : undefined,
                  status: player.status,
                })),
                initialSeedingMode,
                byeScore,
                roundRobinCycles,
              })
              if (!created) {
                setCreateError(t('common.syncError'))
                toast.error(t('swiss.createToastError'))
                return
              }
              toast.success(t('swiss.createSuccess'))
              onCreated?.()
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : t('swiss.createFallbackError')

              setCreateError(message)
              toast.error(t('swiss.createToastError'))
            } finally {
              setIsCreating(false)
            }
          }}
        >
          <ArrowRight className="size-4" />
          {isCreating ? t('swiss.startingTournament') : t('swiss.startTournament')}
        </Button>
      </CardContent>
    </Card>
  )
}

export function NewTournamentDialog({
  initialTournament,
  onCreate,
  tournaments,
  trigger,
}: {
  initialTournament?: Tournament | null
  onCreate: ReturnType<typeof useSwissTournaments>['createNewTournament']
  tournaments: Tournament[]
  trigger?: ReactNode
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            {t('swiss.newTournament')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:max-w-5xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CirclePlus className="size-5 text-primary" />
            {t('swiss.createDialogTitle')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('swiss.settingsDialogDescription')}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <TournamentCreator
            initialTournament={initialTournament}
            onCreate={onCreate}
            onCreated={() => setOpen(false)}
            tournaments={tournaments}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
