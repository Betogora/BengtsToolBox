import { DOT, TEAM_LABEL_KEY } from '@/apps/codenames/components/teamStyle'
import { TEAMS } from '@/apps/codenames/logic/types'
import type { PublicView } from '@/apps/codenames/logic/view'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function TeamCards({ view }: { view: PublicView }) {
  const { t } = useI18n()

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-1">
      {TEAMS.map((team) => {
        const active = view.phase !== 'ende' && view.turn === team
        const winner = view.winner === team
        const { remaining, total } = view.score[team]
        return (
          <Card
            key={team}
            data-team={team}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'grid gap-1 p-3 transition-colors sm:p-[18px]',
              active && 'border-primary/60 bg-primary-soft',
              winner && 'border-success',
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', DOT[team])} />
              <span className="type-card-title min-w-0 truncate">{t(TEAM_LABEL_KEY[team])}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="type-metric-sm tabular-nums sm:text-[2rem] sm:leading-[2.3rem]">{remaining}</span>
              <span className="type-ui text-muted-foreground">{t('codenames.remainingOf', { total })}</span>
              {active && <Badge className="ml-auto self-center max-sm:hidden">{t('codenames.onTurn')}</Badge>}
              {winner && <Badge className="ml-auto self-center">{t('codenames.winner')}</Badge>}
            </div>
            {view.start === team && <span className="type-caption text-muted-foreground">{t('codenames.startTeam')}</span>}
          </Card>
        )
      })}
    </div>
  )
}
