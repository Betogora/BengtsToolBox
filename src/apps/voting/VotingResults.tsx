import { Trophy } from 'lucide-react'

import { getPodiumRankClass } from '@/apps/shared/podium'
import { getLeaders } from '@/apps/voting/logic'
import type { VotingResultEntry } from '@/apps/voting/types'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function VotingWinnerBanner({
  ballotCount,
  results,
  size = 'default',
}: {
  ballotCount: number
  results: VotingResultEntry[]
  size?: 'default' | 'large'
}) {
  const { t } = useI18n()
  const leaders = getLeaders(results)
  const leader = leaders[0]

  if (!leader) return null

  const isTie = leaders.length > 1
  const percent = ballotCount > 0 ? Math.round((leader.votes / ballotCount) * 100) : 0

  return (
    <div
      data-voting-winner
      className={cn(
        'relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 overflow-hidden rounded-lg border border-[#c9961a]/45 bg-podium-1',
        size === 'large' ? 'p-6 sm:p-8' : 'p-4',
      )}
    >
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-full bg-podium-1-strong text-[#7a5a06] shadow-sm dark:text-[#f2c94c]',
          size === 'large' ? 'size-20' : 'size-12',
        )}
      >
        <Trophy aria-hidden="true" className={size === 'large' ? 'size-10' : 'size-6'} />
      </span>
      <div className="min-w-0">
        <p className="type-label text-muted-foreground">
          {isTie ? t('voting.result.tie') : t('voting.result.winner')}
        </p>
        <p
          className={cn(
            'min-w-0 break-words',
            size === 'large' ? 'type-page-title sm:text-5xl' : 'type-section-title',
          )}
        >
          {leaders.map((entry) => entry.name).join(' & ')}
        </p>
        <p className="type-ui mt-1 tabular-nums text-muted-foreground">
          {t('voting.result.winnerVotes', { votes: leader.votes, total: ballotCount, percent })}
        </p>
      </div>
    </div>
  )
}

export function VotingResultList({
  ballotCount,
  results,
  showVoters,
  size = 'default',
}: {
  ballotCount: number
  results: VotingResultEntry[]
  showVoters: boolean
  size?: 'compact' | 'default' | 'large'
}) {
  const { t } = useI18n()
  const maxVotes = Math.max(1, ...results.map((entry) => entry.votes))

  return (
    <ol className={cn('grid', size === 'compact' ? 'gap-1.5' : 'gap-2.5')} aria-label={t('voting.result.ranking')}>
      {results.map((entry) => {
        const percent = ballotCount > 0 ? Math.round((entry.votes / ballotCount) * 100) : 0

        return (
          <li
            key={entry.personId}
            data-voting-result={entry.name}
            className={cn(
              'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-md border bg-card',
              size === 'compact' ? 'px-2.5 py-2' : size === 'large' ? 'p-4' : 'px-3 py-2.5',
            )}
          >
            <span
              aria-label={t('voting.result.rank', { rank: entry.rank })}
              className={cn(
                getPodiumRankClass(entry.rank),
                size === 'compact' ? 'type-caption size-6' : size === 'large' ? 'type-section-title size-12' : 'type-action size-8',
              )}
            >
              {entry.rank}
            </span>
            <div className="grid min-w-0 gap-1.5">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn('shrink-0 rounded-full', size === 'large' ? 'size-4' : 'size-2.5')}
                  style={{ backgroundColor: entry.color }}
                />
                <span
                  className={cn(
                    'min-w-0 truncate',
                    size === 'large' ? 'type-section-title' : size === 'compact' ? 'type-label' : 'type-action',
                  )}
                >
                  {entry.name}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn('block overflow-hidden rounded-full bg-muted', size === 'large' ? 'h-3' : 'h-1.5')}
              >
                <span
                  className="block h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${(entry.votes / maxVotes) * 100}%`, backgroundColor: entry.color }}
                />
              </span>
            </div>
            <span className="text-right">
              <span className={cn('block tabular-nums', size === 'large' ? 'type-metric-xl' : 'type-metric-sm')}>
                {entry.votes}
              </span>
              <span className="type-caption block tabular-nums text-muted-foreground">{percent} %</span>
            </span>
            {showVoters && entry.voterNames.length > 0 && (
              <ul className="col-start-2 col-end-4 flex flex-wrap gap-1" aria-label={t('voting.result.votersOf', { name: entry.name })}>
                {entry.voterNames.map((name) => (
                  <li key={name} className="type-caption rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ol>
  )
}
