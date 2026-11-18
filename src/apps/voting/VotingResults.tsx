import { Trophy } from 'lucide-react'

import { RankList, RankRow } from '@/apps/shared/components/RankRow'
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
    <RankList aria-label={t('voting.result.ranking')}>
      {results.map((entry) => {
        const percent = ballotCount > 0 ? Math.round((entry.votes / ballotCount) * 100) : 0
        const voters = showVoters && entry.voterNames.length > 0 ? entry.voterNames : []

        return (
          <RankRow
            key={entry.personId}
            data-voting-result={entry.name}
            color={entry.color}
            name={entry.name}
            rank={entry.rank}
            share={entry.votes / maxVotes}
            size={size}
            value={entry.votes}
            sub={
              <>
                {percent} %
                {voters.length > 0 && (
                  <>
                    {' · '}
                    <span aria-label={t('voting.result.votersOf', { name: entry.name })}>
                      {voters.join(', ')}
                    </span>
                  </>
                )}
              </>
            }
          />
        )
      })}
    </RankList>
  )
}
