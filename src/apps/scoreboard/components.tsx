import {
  ChevronDown,
  ChevronRight,
  CornerDownLeft,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import type { useScoreboard } from '@/apps/scoreboard/hooks/useScoreboard'
import type {
  ScoreboardHistoryEntry,
  ScoreboardPlayer,
  ScoreboardStanding,
  ScoreboardTarget,
  ScoreboardTeam,
} from '@/apps/scoreboard/types'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
import { getColorWithAlpha } from '@/apps/shared/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function RankingBars({ standings }: { standings: ScoreboardStanding[] }) {
  const { formatNumber } = useI18n()
  const minScore = Math.min(0, ...standings.map((standing) => standing.score))
  const maxScore = Math.max(0, ...standings.map((standing) => standing.score))
  const range = Math.max(1, maxScore - minScore)
  const zeroPosition = ((0 - minScore) / range) * 100

  return (
    <div className="grid gap-2">
      {standings.map((standing) => {
        const scorePosition = ((standing.score - minScore) / range) * 100
        const barStart = Math.min(zeroPosition, scorePosition)
        const barWidth = Math.max(standing.score === 0 ? 0 : 1.25, Math.abs(scorePosition - zeroPosition))

        return (
          <div
            key={`${standing.target.type}-${standing.target.id}`}
            className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md border bg-background p-3"
          >
            <span className="type-caption text-muted-foreground tabular-nums">
              {standing.rank}
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: standing.target.color }}
                />
                <span className="type-label truncate">{standing.target.name}</span>
              </div>
              <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 w-px bg-border"
                  style={{ left: `${zeroPosition}%` }}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    backgroundColor: standing.target.color,
                    left: `${barStart}%`,
                    width: `${barWidth}%`,
                  }}
                />
              </div>
            </div>
            <span className="type-metric-sm tabular-nums">
              {formatNumber(standing.score)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function ScoreTargetCard({
  memberNames,
  onColorChange,
  onNameChange,
  onRemove,
  onScore,
  score,
  target,
}: {
  memberNames: string[]
  onColorChange: (color: string) => void | Promise<void>
  onNameChange: (name: string) => void | Promise<void>
  onRemove: () => void | Promise<void>
  onScore: (delta: number) => void | Promise<void>
  score: number
  target: ScoreboardTarget
}) {
  const { formatNumber, t } = useI18n()
  const [customDelta, setCustomDelta] = useState('')

  const handleCustomScore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const delta = Number(customDelta)

    if (!Number.isInteger(delta) || delta === 0) return

    await onScore(delta)
    setCustomDelta('')
  }

  return (
    <Card style={{ backgroundColor: getColorWithAlpha(target.color, '80') }}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <InlineTextEdit
              ariaLabel={t('scoreboard.nameAria', { name: target.name })}
              className="type-section-title py-1"
              fallback={
                target.type === 'team'
                  ? t('scoreboard.teamFallback', { position: target.position })
                  : t('scoreboard.playerFallback', { position: target.position })
              }
              inputClassName="type-section-title h-11"
              value={target.name}
              onSave={onNameChange}
            />
          </div>
          <Input
            type="color"
            aria-label={t('scoreboard.colorAria', { name: target.name })}
            className="size-11 shrink-0 cursor-pointer rounded-md border p-1 sm:size-9"
            value={target.color}
            onChange={(event) => void onColorChange(event.currentTarget.value)}
          />
          <ConfirmButton
            title={t('scoreboard.removeTitle')}
            description={t('scoreboard.removeDescription', { name: target.name })}
            onConfirm={onRemove}
            trigger={
              <Button
                variant="delete"
                size="icon"
                className="size-11 sm:size-9"
                aria-label={t('scoreboard.removeAria', { name: target.name })}
              >
                <Trash2 className="size-4" />
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 pt-0">
        {target.type === 'team' && (
          <div className="flex min-h-6 flex-wrap items-center gap-1.5">
            {memberNames.length === 0 ? (
              <span className="type-caption text-muted-foreground">
                {t('scoreboard.noMembers')}
              </span>
            ) : (
              memberNames.map((name, index) => (
                <Badge key={`${name}-${index}`} variant="outline" className="bg-background/70">
                  {name}
                </Badge>
              ))
            )}
          </div>
        )}

        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="type-metric-lg tabular-nums">{formatNumber(score)}</div>
            <div className="type-caption text-muted-foreground">
              {t('scoreboard.points')}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="size-11 px-0 sm:size-9"
              aria-label={t('scoreboard.decrementAria', { name: target.name })}
              onClick={() => void onScore(-1)}
            >
              <Minus className="size-4" />
              <span className="sr-only">-1</span>
            </Button>
            <Button
              className="size-11 px-0 sm:size-9"
              aria-label={t('scoreboard.incrementAria', { name: target.name })}
              onClick={() => void onScore(1)}
            >
              <Plus className="size-4" />
              <span className="sr-only">+1</span>
            </Button>
          </div>
        </div>

        <form className="grid grid-cols-[minmax(0,1fr)_auto] gap-2" onSubmit={handleCustomScore}>
          <Input
            type="number"
            inputMode="numeric"
            step="1"
            aria-label={t('scoreboard.customDeltaAria', { name: target.name })}
            placeholder={t('scoreboard.customDeltaPlaceholder')}
            value={customDelta}
            onChange={(event) => setCustomDelta(event.currentTarget.value)}
          />
          <Button
            type="submit"
            variant="outline"
            className="size-11 px-0 sm:size-9"
            disabled={!Number.isInteger(Number(customDelta)) || Number(customDelta) === 0}
            aria-label={t('scoreboard.bookDeltaAria', { name: target.name })}
          >
            <CornerDownLeft className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function RosterPlayerCard({
  onColorChange,
  onNameChange,
  onRemove,
  onTeamChange,
  player,
  teams,
}: {
  onColorChange: (color: string) => void | Promise<void>
  onNameChange: (name: string) => void | Promise<void>
  onRemove: () => void | Promise<void>
  onTeamChange: (teamId: string | null) => void | Promise<void>
  player: ScoreboardPlayer
  teams: ScoreboardTeam[]
}) {
  const { t } = useI18n()

  return (
    <Card style={{ backgroundColor: getColorWithAlpha(player.color, '80') }}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <InlineTextEdit
              ariaLabel={t('scoreboard.nameAria', { name: player.name })}
              className="type-section-title py-1"
              fallback={t('scoreboard.playerFallback', { position: player.position })}
              inputClassName="type-section-title h-11"
              value={player.name}
              onSave={onNameChange}
            />
          </div>
          <ConfirmButton
            title={t('scoreboard.removeTitle')}
            description={t('scoreboard.removeDescription', { name: player.name })}
            onConfirm={onRemove}
            trigger={
              <Button
                variant="delete"
                size="icon"
                className="size-11 sm:size-9"
                aria-label={t('scoreboard.removeAria', { name: player.name })}
              >
                <Trash2 className="size-4" />
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-4 pt-0">
        <Input
          type="color"
          aria-label={t('scoreboard.colorAria', { name: player.name })}
          className="size-11 shrink-0 cursor-pointer rounded-md border p-1"
          value={player.color}
          onChange={(event) => void onColorChange(event.currentTarget.value)}
        />
        <Select
          value={player.teamId ?? 'unassigned'}
          onValueChange={(value) => void onTeamChange(value === 'unassigned' ? null : value)}
        >
          <SelectTrigger label={t('scoreboard.teamAssignment')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">{t('scoreboard.unassigned')}</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  )
}

export function HistoryList({ history }: { history: ScoreboardHistoryEntry[] }) {
  const { formatDateTime, formatNumber, t } = useI18n()

  if (history.length === 0) {
    return <EmptyState className="p-4">{t('scoreboard.emptyHistory')}</EmptyState>
  }

  return (
    <div className="grid gap-2">
      {history.map(({ event, resultingScore }) => (
        <div
          key={event.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border bg-background p-3"
        >
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: event.targetColor }}
              />
              <span className="type-label truncate">{event.targetName}</span>
              <Badge variant={event.delta > 0 ? 'default' : 'outline'}>
                {event.delta > 0 ? '+' : ''}
                {formatNumber(event.delta)}
              </Badge>
            </div>
            <div className="type-caption mt-1 text-muted-foreground">
              {formatDateTime(new Date(event.createdAtClientIso))}
            </div>
          </div>
          <div className="text-right">
            <div className="type-metric-sm tabular-nums">{formatNumber(resultingScore)}</div>
            <div className="type-caption text-muted-foreground">{t('scoreboard.points')}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ArchiveCard({
  archive,
  onDelete,
  onRename,
}: {
  archive: ReturnType<typeof useScoreboard>['archiveViews'][number]
  onDelete: () => void | Promise<void>
  onRename: (name: string) => void | Promise<void>
}) {
  const { formatDateTime, t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const roster = useMemo(
    () =>
      archive.scoring.playerSnapshot.map((player) => ({
        ...player,
        teamName:
          archive.scoring.teamSnapshot.find((team) => team.id === player.teamId)?.name ??
          t('scoreboard.unassigned'),
      })),
    [archive.scoring.playerSnapshot, archive.scoring.teamSnapshot, t],
  )

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-md text-primary transition-colors hover:bg-muted sm:size-9"
            aria-expanded={isOpen}
            aria-label={isOpen ? t('common.collapse') : t('common.expand')}
            onClick={() => setIsOpen((current) => !current)}
          >
            {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <InlineTextEdit
              ariaLabel={t('scoreboard.scoringNameAria')}
              className="type-action"
              fallback={t('scoreboard.scoringFallback')}
              value={archive.scoring.name}
              onSave={onRename}
            />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="type-caption text-muted-foreground">
                {formatDateTime(
                  new Date(
                    archive.scoring.archivedAtClientIso ?? archive.scoring.createdAtClientIso,
                  ),
                )}
              </span>
              <Badge variant="outline">
                {archive.scoring.mode === 'teams'
                  ? t('scoreboard.modeTeams')
                  : t('scoreboard.modeIndividual')}
              </Badge>
              <Badge variant="secondary">
                {t('scoreboard.bookingCount', { count: archive.events.length })}
              </Badge>
            </div>
          </div>
        </div>
        <ConfirmButton
          title={t('scoreboard.archiveDeleteTitle')}
          description={t('scoreboard.archiveDeleteDescription')}
          onConfirm={onDelete}
          trigger={
            <Button variant="delete" size="icon" aria-label={t('common.archive.delete')}>
              <Trash2 className="size-4" />
            </Button>
          }
        />
      </div>

      {isOpen && (
        <div className="grid gap-4 border-t p-3 sm:p-4">
          <RankingBars standings={archive.standings} />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {roster.map((player) => (
              <div key={player.id} className="rounded-md border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: player.color }} />
                  <span className="type-label min-w-0 truncate">{player.name}</span>
                </div>
                {archive.scoring.mode === 'teams' && (
                  <div className="type-caption mt-1 text-muted-foreground">{player.teamName}</div>
                )}
              </div>
            ))}
          </div>
          <HistoryList history={archive.history} />
        </div>
      )}
    </div>
  )
}

export function AddCard({
  label,
  onClick,
}: {
  label: string
  onClick: () => void | Promise<void>
}) {
  return (
    <Card className="min-h-[13.25rem] border-dashed">
      <CardContent className="flex h-full items-center justify-center p-6">
        <Button className="h-24 w-full flex-col gap-2" variant="outline" onClick={() => void onClick()}>
          <Plus className="size-6" />
          {label}
        </Button>
      </CardContent>
    </Card>
  )
}

export function ModeToggle({
  disabled,
  mode,
  onChange,
}: {
  disabled: boolean
  mode: 'individual' | 'teams'
  onChange: (mode: 'individual' | 'teams') => void | Promise<void>
}) {
  const { t } = useI18n()

  return (
    <div
      className="grid grid-cols-2 rounded-lg bg-muted p-[3px]"
      aria-label={t('scoreboard.modeAria')}
    >
      {(['individual', 'teams'] as const).map((value) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          className={cn(
            'h-8 rounded-md px-3 shadow-none',
            mode === value && 'bg-background text-foreground shadow-sm hover:bg-background',
          )}
          disabled={disabled}
          aria-pressed={mode === value}
          onClick={() => void onChange(value)}
        >
          {value === 'individual' ? t('scoreboard.modeIndividual') : t('scoreboard.modeTeams')}
        </Button>
      ))}
    </div>
  )
}
