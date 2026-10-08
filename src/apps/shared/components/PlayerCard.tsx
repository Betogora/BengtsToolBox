import type { LucideIcon } from 'lucide-react'
import { Minus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { appTeams, isTeamId, type TeamId } from '@/apps/shared/teams'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type SharedPlayer = {
  id: string
  name: string
  position: number
  teamId: TeamId | null
}

type PlayerCardProps = {
  player: SharedPlayer
  buzzLabel?: string
  buzzRank?: number
  buzzTime?: string
  isHighlighted?: boolean
  isWinner?: boolean
  onDecrement?: () => void
  onIncrement?: () => void
  onIncrementLarge?: () => void
  onNameChange: (name: string) => void
  onRemove: () => void
  onTeamChange: (teamId: TeamId | null) => void
  score?: number
}

function createTeamDotIcon(dotClassName: string) {
  function TeamDotIcon({ className }: { className?: string }) {
    return (
      <span
        aria-hidden="true"
        className={cn(className, 'size-2 rounded-full', dotClassName)}
      />
    )
  }

  // SegmentedControl only passes className and aria-hidden to option icons.
  return TeamDotIcon as unknown as LucideIcon
}

const teamDotIcons = new Map(
  appTeams.map((team) => [team.id, createTeamDotIcon(team.dotClassName)]),
)

const counterButtonClassName =
  'h-full w-11 rounded-none shadow-none hover:bg-muted hover:text-foreground'

export function PlayerCard({
  player,
  buzzLabel,
  buzzRank,
  buzzTime,
  isHighlighted = false,
  isWinner = false,
  onDecrement,
  onIncrement,
  onIncrementLarge,
  onNameChange,
  onRemove,
  onTeamChange,
  score,
}: PlayerCardProps) {
  const { t } = useI18n()
  const [isEditingName, setIsEditingName] = useState(false)
  const saveName = (name: string) => {
    onNameChange(name)
    setIsEditingName(false)
  }

  return (
    <Card
      className={cn(
        'grid gap-4 p-[18px] transition-colors',
        isHighlighted && 'border-primary/60 bg-primary-soft',
        isWinner && 'border-accent bg-accent/10',
      )}
    >
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          {isEditingName ? (
            <Input
              key={player.name}
              aria-label={t('shared.playerCard.nameAria', {
                number: player.position,
              })}
              autoFocus
              defaultValue={player.name}
              onBlur={(event) => saveName(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }

                if (event.key === 'Escape') {
                  setIsEditingName(false)
                }
              }}
              className="h-10 text-[1.375rem] font-[650]"
            />
          ) : (
            <h2
              className="truncate text-[1.375rem] font-[650] leading-tight tracking-tight"
              title={player.name}
            >
              {player.name}
            </h2>
          )}
        </div>
        {!isEditingName && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t('shared.playerCard.editAria', { name: player.name })}
            onClick={() => setIsEditingName(true)}
          >
            <Pencil />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-destructive-soft hover:text-destructive"
          aria-label={t('shared.playerCard.removeAria', { name: player.name })}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>

      <SegmentedControl
        aria-label={t('shared.playerCard.teamAria', { name: player.name })}
        className="w-full"
        value={player.teamId ?? ''}
        options={appTeams.map((team) => ({
          value: team.id,
          label: t(team.buttonLabelKey),
          icon: teamDotIcons.get(team.id),
        }))}
        onValueChange={(value) => {
          const teamId = isTeamId(value) ? value : null
          // Clicking the active team clears the assignment, as before.
          onTeamChange(teamId === player.teamId ? null : teamId)
        }}
      />

      {typeof score === 'number' && onIncrement && onDecrement && (
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">
              {t('common.points')}
            </div>
            <div
              data-player-score
              className="text-[52px] font-[650] leading-none tracking-tight tabular-nums"
            >
              {score}
            </div>
          </div>
          <div className="flex h-10 shrink-0 divide-x overflow-hidden rounded-md border bg-card">
            <Button
              size="icon"
              variant="ghost"
              className={counterButtonClassName}
              aria-label={t('shared.playerCard.decrementAria', {
                name: player.name,
              })}
              disabled={score <= 0}
              onClick={onDecrement}
            >
              <Minus />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={counterButtonClassName}
              aria-label={t('shared.playerCard.incrementAria', {
                name: player.name,
              })}
              onClick={onIncrement}
            >
              <Plus />
            </Button>
            {onIncrementLarge && (
              <Button
                className="h-full rounded-none px-3.5 tabular-nums shadow-none"
                aria-label={t('shared.playerCard.incrementLargeAria', {
                  name: player.name,
                })}
                onClick={onIncrementLarge}
              >
                +5
              </Button>
            )}
          </div>
        </div>
      )}

      {buzzLabel && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
          <div>
            <div className="type-caption text-muted-foreground">
              {t('shared.playerCard.buzz')}
            </div>
            <div className="type-action mt-1 tabular-nums">
              {buzzTime ?? '-'}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {buzzRank && <Badge variant="secondary">#{buzzRank}</Badge>}
            <Badge variant={isWinner ? 'default' : 'outline'}>
              {buzzLabel}
            </Badge>
          </div>
        </div>
      )}
    </Card>
  )
}
