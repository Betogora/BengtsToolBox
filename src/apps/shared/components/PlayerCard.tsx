import { Minus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { appTeams, type TeamId } from '@/apps/shared/teams'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  onNameChange: (name: string) => void
  onRemove: () => void
  onTeamChange: (teamId: TeamId) => void
  score?: number
}

export function PlayerCard({
  player,
  buzzLabel,
  buzzRank,
  buzzTime,
  isHighlighted = false,
  isWinner = false,
  onDecrement,
  onIncrement,
  onNameChange,
  onRemove,
  onTeamChange,
  score,
}: PlayerCardProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const team = appTeams.find((entry) => entry.id === player.teamId)
  const saveName = (name: string) => {
    onNameChange(name)
    setIsEditingName(false)
  }

  return (
    <Card
      className={cn(
        'overflow-hidden transition-colors',
        isHighlighted && 'border-primary/60 bg-primary/5',
        isWinner && 'border-accent bg-accent/10',
      )}
    >
      {team && <div className={cn('h-1 w-full', team.dotClassName)} />}
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <Input
                key={player.name}
                aria-label={`Name fuer Person ${player.position}`}
                autoFocus
                className="h-12"
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
                style={{
                  fontSize: '1.875rem',
                  fontWeight: 600,
                  lineHeight: '2.25rem',
                }}
              />
            ) : (
              <h2 className="truncate py-1 text-3xl font-semibold tracking-normal">
                {player.name}
              </h2>
            )}
          </div>
          {!isEditingName && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${player.name} bearbeiten`}
              onClick={() => setIsEditingName(true)}
            >
              <Pencil className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${player.name} entfernen`}
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-2">
          {appTeams.map((teamOption) => {
            const isSelected = player.teamId === teamOption.id

            return (
              <Button
                key={teamOption.id}
                className={cn(
                  'justify-start gap-2',
                  isSelected && teamOption.className,
                )}
                variant={isSelected ? 'secondary' : 'outline'}
                onClick={() => onTeamChange(teamOption.id)}
              >
                <span
                  className={cn('size-3 rounded-full', teamOption.dotClassName)}
                />
                {teamOption.buttonLabel}
              </Button>
            )
          })}
        </div>

        {typeof score === 'number' && onIncrement && onDecrement && (
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-4xl font-semibold tabular-nums">
                {score}
              </div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                aria-label={`${player.name} verringern`}
                disabled={score <= 0}
                onClick={onDecrement}
              >
                <Minus className="size-4" />
              </Button>
              <Button
                size="icon"
                aria-label={`${player.name} erhoehen`}
                onClick={onIncrement}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {buzzLabel && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <div className="text-sm text-muted-foreground">Buzz</div>
              <div className="mt-1 font-semibold tabular-nums">
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
      </CardContent>
    </Card>
  )
}
