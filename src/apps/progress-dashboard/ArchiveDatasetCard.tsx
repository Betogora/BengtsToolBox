import { Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { ProgressDataset } from '@/apps/progress-dashboard/types'
import { formatNumber } from '@/apps/progress-dashboard/format'
import { getSortedEvents } from '@/apps/progress-dashboard/logic'
import {
  getArchivePlayers,
  getArchivePlayerSummaries,
} from '@/apps/progress-dashboard/progressChartModel'
import { ProgressChart } from '@/apps/progress-dashboard/ProgressChart'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DisclosureIndicator } from '@/components/ui/disclosure'
import { useI18n } from '@/lib/i18n'

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString(locale)
}

function formatDateRange(
  startValue: string | null | undefined,
  endValue: string | null | undefined,
  locale: string,
) {
  if (!startValue && !endValue) {
    return '-'
  }

  if (!startValue || startValue === endValue) {
    return formatDateTime(endValue ?? startValue, locale)
  }

  if (!endValue) {
    return formatDateTime(startValue, locale)
  }

  return `${formatDateTime(startValue, locale)} - ${formatDateTime(endValue, locale)}`
}

export function ArchiveDatasetCard({
  dataset,
  onDelete,
  onRename,
}: {
  dataset: ProgressDataset
  onDelete: (datasetId: string) => void
  onRename: (datasetId: string, name: string) => void
}) {
  const { t, locale } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const eventCount = dataset.events.length

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-1 py-2 pr-2 pl-3">
        <div className="min-w-0 flex-1">
          <InlineTextEdit
            ariaLabel={t('progress.archiveName')}
            className="type-action"
            fallback={t('common.archivedDataset')}
            value={dataset.name}
            onSave={(value) => onRename(dataset.id, value)}
          />
          <div className="type-caption flex flex-wrap gap-x-1.5 text-muted-foreground">
            <span className="whitespace-nowrap">
              {formatDateTime(dataset.archivedAtClientIso, locale)}
            </span>
            <span className="whitespace-nowrap">
              <span aria-hidden="true">· </span>
              {t('progress.eventCount', { count: formatNumber(eventCount) })}
            </span>
          </div>
        </div>
        <button
          className="grid size-11 shrink-0 place-items-center rounded-md text-primary transition-colors hover:bg-muted sm:size-9"
          aria-expanded={isOpen}
          aria-label={`${dataset.name || t('common.archivedDataset')} ${
            isOpen ? t('common.collapse') : t('common.expand')
          }`}
          onClick={() => setIsOpen((current) => !current)}
        >
          <DisclosureIndicator isOpen={isOpen} />
        </button>
        <ConfirmButton
          mode="popover"
          title={t('common.dataset.delete')}
          description={t('common.dataset.deleteArchivedDescription')}
          onConfirm={() => onDelete(dataset.id)}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="size-11 text-muted-foreground hover:text-destructive sm:size-9"
              aria-label={t('common.archive.delete')}
            >
              <Trash2 className="size-4" />
            </Button>
          }
        />
      </div>
      {isOpen && <ArchiveDatasetDetails dataset={dataset} />}
    </div>
  )
}

function ArchiveDatasetDetails({ dataset }: { dataset: ProgressDataset }) {
  const { t, locale } = useI18n()
  const events = useMemo(() => getSortedEvents(dataset.events), [dataset.events])
  const archivePlayers = useMemo(() => getArchivePlayers(events), [events])
  const playerSummaries = useMemo(
    () => getArchivePlayerSummaries(events, archivePlayers),
    [archivePlayers, events],
  )
  const firstEventAt = events[0]?.createdAtClientIso ?? null
  const lastEventAt = events.at(-1)?.createdAtClientIso ?? null
  const totalScore = playerSummaries.reduce(
    (sum, summary) => sum + summary.score,
    0,
  )
  const unitLabel = dataset.unit.trim()

  if (events.length === 0) {
    return (
      <div className="border-t p-3 sm:p-4">
        <EmptyState className="p-4">
          {t('progress.emptyArchivedDataset')}
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="grid gap-3 border-t p-3 sm:p-4">
      <ProgressChart
        dataset={dataset}
        emptyMessage={t('progress.emptyArchivedUsableEvents')}
        mobileDefaultView="verlauf"
        players={archivePlayers}
      />

      <div className="grid gap-2 rounded-md border bg-background p-3 sm:grid-cols-3">
        <div className="min-w-0">
          <div className="type-caption text-muted-foreground">
            {t('progress.timeRange')}
          </div>
          <div className="type-label mt-1 truncate">
            {formatDateRange(firstEventAt, lastEventAt, locale)}
          </div>
        </div>
        <div>
          <div className="type-caption text-muted-foreground">
            {t('progress.events')}
          </div>
          <div className="type-label mt-1 tabular-nums">
            {formatNumber(events.length)}
          </div>
        </div>
        <div>
          <div className="type-caption text-muted-foreground">
            {t('progress.totalScore')}
          </div>
          <div className="type-label mt-1 tabular-nums">
            {formatNumber(totalScore)}
            {unitLabel ? ` ${unitLabel}` : ''}
          </div>
        </div>
      </div>

      {playerSummaries.length === 0 ? (
        <EmptyState className="p-4">
          {t('progress.emptyArchivedPlayers')}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-md border bg-background">
          {playerSummaries.map((summary, index) => (
            <div
              key={summary.player.id}
              className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b px-3 py-2 last:border-b-0"
            >
              <span className="type-caption text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: summary.player.color }}
                  />
                  <span className="type-label min-w-0 truncate">
                    {summary.player.name}
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {formatNumber(summary.eventCount)}
                  </Badge>
                </div>
                <div className="type-caption mt-0.5 truncate text-muted-foreground">
                  {formatDateRange(summary.firstEventAt, summary.lastEventAt, locale)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="type-action tabular-nums">
                  {formatNumber(summary.score)}
                </div>
                {unitLabel && (
                  <div className="type-caption max-w-24 truncate text-muted-foreground">
                    {unitLabel}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
