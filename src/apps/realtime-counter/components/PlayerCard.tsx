import { Minus, Pencil, Plus, Trash2 } from 'lucide-react'

import type { BuzzerTeamId } from '@/apps/live-buzzer/types'
import type { CounterPlayer } from '@/apps/realtime-counter/types'
import { counterTeams } from '@/apps/realtime-counter/teams'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PlayerCardProps = {
  player: CounterPlayer
  onDecrement: () => void
  onIncrement: () => void
  onNameChange: (name: string) => void
  onRemove: () => void
  onTeamChange: (teamId: BuzzerTeamId) => void
}

export function PlayerCard({
  player,
  onDecrement,
  onIncrement,
  onNameChange,
  onRemove,
  onTeamChange,
}: PlayerCardProps) {
  const team = counterTeams.find((entry) => entry.id === player.teamId)

  return (
    <Card className="overflow-hidden transition-colors">
      {team && <div className={cn('h-1 w-full', team.dotClassName)} />}
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Input
              key={player.name}
              aria-label={`Name fuer Person ${player.position}`}
              className="h-12 pr-10 text-2xl font-semibold shadow-none md:text-2xl"
              defaultValue={player.name}
              onBlur={(event) => onNameChange(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
              }}
            />
            <Pencil className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
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
          {counterTeams.map((teamOption) => {
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

        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-4xl font-semibold tabular-nums">
              {player.score}
            </div>
            <div className="text-xs text-muted-foreground">Score</div>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label={`${player.name} verringern`}
              disabled={player.score <= 0}
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
      </CardContent>
    </Card>
  )
}
