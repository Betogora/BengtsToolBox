import { Plus } from 'lucide-react'

import type { CounterPlayer } from '@/apps/realtime-counter/types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

type PlayerCardProps = {
  player: CounterPlayer
  isActive: boolean
  onSelect: () => void
  onIncrement: () => void
}

export function PlayerCard({
  player,
  isActive,
  onSelect,
  onIncrement,
}: PlayerCardProps) {
  return (
    <Card className={cn('transition-colors', isActive && 'border-primary')}>
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{player.name}</CardTitle>
          <Button
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={onSelect}
          >
            {isActive ? 'Aktiv' : 'Wählen'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-4">
        <div>
          <div className="text-4xl font-semibold tabular-nums">
            {player.score}
          </div>
          <div className="text-xs text-muted-foreground">Score</div>
        </div>
        <Button
          size="icon"
          aria-label={`${player.name} erhöhen`}
          onClick={onIncrement}
        >
          <Plus className="size-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
