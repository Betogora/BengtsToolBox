import { Minus, Plus, Trash2 } from 'lucide-react'

import { buzzerTeams } from '@/apps/live-buzzer/teams'
import type { BuzzerTeamId } from '@/apps/live-buzzer/types'
import type { CounterPlayer } from '@/apps/realtime-counter/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type PlayerCardProps = {
  player: CounterPlayer
  onDecrement: () => void
  onIncrement: () => void
  onNameChange: (name: string) => void
  onRemove: () => void
  onTeamChange: (teamId: BuzzerTeamId | null) => void
}

export function PlayerCard({
  player,
  onDecrement,
  onIncrement,
  onNameChange,
  onRemove,
  onTeamChange,
}: PlayerCardProps) {
  const team = buzzerTeams.find((entry) => entry.id === player.teamId)

  return (
    <Card className="overflow-hidden transition-colors">
      {team && <div className={cn('h-1 w-full', team.dotClassName)} />}
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Person {player.position}</CardTitle>
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
        <div className="grid gap-2">
          <Input
            key={player.name}
            aria-label={`Name fuer Person ${player.position}`}
            defaultValue={player.name}
            onBlur={(event) => onNameChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur()
              }
            }}
          />
          <Select
            value={player.teamId ?? 'none'}
            onValueChange={(value) =>
              onTeamChange(value === 'none' ? null : (value as BuzzerTeamId))
            }
          >
            <SelectTrigger aria-label={`Team fuer ${player.name}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Kein Team</SelectItem>
              {buzzerTeams.map((teamOption) => (
                <SelectItem key={teamOption.id} value={teamOption.id}>
                  {teamOption.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        <Badge className={team?.className} variant="outline">
          {team?.name ?? 'Kein Team'}
        </Badge>
      </CardContent>
    </Card>
  )
}
