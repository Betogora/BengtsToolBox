import { Trophy } from 'lucide-react'
import { useState } from 'react'

import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
import { getLeaders } from '@/apps/voting/logic'
import type { VotingRound } from '@/apps/voting/types'
import { VotingResultList } from '@/apps/voting/VotingResults'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { DisclosureIndicator } from '@/components/ui/disclosure'
import { useI18n } from '@/lib/i18n'
import { dateTimeFormat } from '@/lib/i18n/formatters'

export function VotingArchiveCard({
  isAdmin,
  onDelete,
  onRename,
  round,
}: {
  isAdmin: boolean
  onDelete: (roundId: string) => void
  onRename: (roundId: string, title: string) => void
  round: VotingRound
}) {
  const { locale, t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const leaders = getLeaders(round.results)
  const toggle = () => setIsOpen((current) => !current)
  const archivedAt = round.archivedAtClientIso ? new Date(round.archivedAtClientIso) : null

  return (
    <div className="rounded-lg border" data-voting-archive={round.title}>
      {/* Die ganze Kopfzeile klappt auf; Name und Löschen liegen als eigene Ziele darüber. */}
      <div className="relative flex items-center gap-1 py-2 pr-2 pl-3">
        <button
          type="button"
          className="absolute inset-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          aria-expanded={isOpen}
          aria-label={`${round.title} ${isOpen ? t('common.collapse') : t('common.expand')}`}
          onClick={toggle}
        />
        <div className="pointer-events-none relative min-w-0 flex-1">
          {isAdmin ? (
            <div
              className="pointer-events-auto w-fit max-w-full has-[input]:w-full"
              onClick={(event) => {
                if (!(event.target as Element).closest('button, input')) toggle()
              }}
            >
              <InlineTextEdit
                ariaLabel={t('voting.archive.nameAria')}
                className="type-action"
                fallback={round.title}
                value={round.title}
                onSave={(value) => onRename(round.id, value)}
              />
            </div>
          ) : (
            <span className="type-action block truncate">{round.title}</span>
          )}
          <div className="type-caption flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
            {archivedAt && !Number.isNaN(archivedAt.getTime()) && (
              <span className="whitespace-nowrap">
                {dateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(archivedAt)}
              </span>
            )}
            <span className="whitespace-nowrap">
              <span aria-hidden="true">· </span>
              {t('voting.ballotCount', { count: round.ballotCount })}
            </span>
            {leaders.length > 0 && (
              <span className="inline-flex min-w-0 items-center gap-1 font-semibold text-foreground">
                <span aria-hidden="true" className="font-normal text-muted-foreground">· </span>
                <Trophy aria-hidden="true" className="size-3.5 text-[#b08414]" />
                <span className="truncate">{leaders.map((entry) => entry.name).join(' & ')}</span>
              </span>
            )}
          </div>
        </div>
        <span className="pointer-events-none relative grid size-11 shrink-0 place-items-center sm:size-9">
          <DisclosureIndicator isOpen={isOpen} />
        </span>
        {isAdmin && (
          <div className="relative">
            <ConfirmButton
              mode="popover"
              title={t('voting.archive.deleteTitle')}
              description={t('voting.archive.deleteDescription')}
              onConfirm={() => onDelete(round.id)}
              trigger={
                <DeleteButton tone="quiet" className="size-11 sm:size-9" aria-label={t('common.archive.delete')} />
              }
            />
          </div>
        )}
      </div>
      {isOpen && (
        <div className="border-t p-3 sm:p-4">
          {round.results.length === 0 ? (
            <EmptyState className="p-4">{t('voting.archive.empty')}</EmptyState>
          ) : (
            <VotingResultList
              ballotCount={round.ballotCount}
              results={round.results}
              showVoters={isAdmin || round.votersVisible}
              size="compact"
            />
          )}
        </div>
      )}
    </div>
  )
}
