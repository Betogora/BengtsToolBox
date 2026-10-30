import { useDeferredValue, useMemo, useState } from 'react'

import type { ProgressDataset } from '@/apps/progress-dashboard/types'
import { formatNumber } from '@/apps/progress-dashboard/format'
import {
  getPlayerScores,
  getSortedEvents,
  rankPlayerScores,
} from '@/apps/progress-dashboard/logic'
import { getPodiumRankClass } from '@/apps/progress-dashboard/podium'
import { getArchivePlayers } from '@/apps/progress-dashboard/progressChartModel'
import { DashboardProgressChart } from '@/apps/progress-dashboard/DashboardProgressChart'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { DisclosureIndicator } from '@/components/ui/disclosure'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

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
  // Der Pfeil dreht sofort; Diagramm und Rangliste folgen unterbrechbar im Hintergrund.
  const isContentOpen = useDeferredValue(isOpen)
  const eventCount = dataset.events.length
  const toggle = () => setIsOpen((current) => !current)

  return (
    <div className="rounded-lg border">
      {/* Die ganze Kopfzeile klappt auf; Name und Löschen liegen als eigene Ziele darüber. */}
      <div className="relative flex items-center gap-1 py-2 pr-2 pl-3">
        <button
          type="button"
          className="absolute inset-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          aria-expanded={isOpen}
          aria-label={`${dataset.name || t('common.archivedDataset')} ${
            isOpen ? t('common.collapse') : t('common.expand')
          }`}
          onClick={toggle}
        />
        <div className="pointer-events-none relative min-w-0 flex-1">
          {/* Ein Klick auf den Namen klappt ebenfalls auf; nur Stift und Eingabefeld bearbeiten. */}
          <div
            className="pointer-events-auto w-fit max-w-full has-[input]:w-full"
            onClick={(event) => {
              if (!(event.target as Element).closest('button, input')) toggle()
            }}
          >
            <InlineTextEdit
              ariaLabel={t('progress.archiveName')}
              className="type-action"
              fallback={t('common.archivedDataset')}
              value={dataset.name}
              onSave={(value) => onRename(dataset.id, value)}
            />
          </div>
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
        <span className="pointer-events-none relative grid size-11 shrink-0 place-items-center sm:size-9">
          <DisclosureIndicator isOpen={isOpen} />
        </span>
        <div className="relative">
          <ConfirmButton
            mode="popover"
            title={t('common.dataset.delete')}
            description={t('common.dataset.deleteArchivedDescription')}
            onConfirm={() => onDelete(dataset.id)}
            trigger={
              <DeleteButton
                tone="quiet"
                className="size-11 sm:size-9"
                aria-label={t('common.archive.delete')}
              />
            }
          />
        </div>
      </div>
      {isContentOpen && <ArchiveDatasetDetails dataset={dataset} />}
    </div>
  )
}

function ArchiveDatasetDetails({ dataset }: { dataset: ProgressDataset }) {
  const { t } = useI18n()
  const archivePlayers = useMemo(
    () => getArchivePlayers(getSortedEvents(dataset.events)),
    [dataset.events],
  )
  const rankedScores = useMemo(
    () => rankPlayerScores(getPlayerScores(archivePlayers, dataset.events)),
    [archivePlayers, dataset.events],
  )

  if (dataset.events.length === 0) {
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
      <DashboardProgressChart
        className="h-[220px] md:h-[320px]"
        dataset={dataset}
        emptyMessage={t('progress.emptyArchivedUsableEvents')}
        players={archivePlayers}
      />
      <ol className="divide-y overflow-hidden rounded-md border bg-background">
        {rankedScores.map(({ player, score }, index) => (
          <li
            key={player.id}
            className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2"
          >
            <span className={cn(getPodiumRankClass(score > 0 ? index + 1 : 0), 'type-caption size-5')}>
              {index + 1}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: player.color }}
              />
              <span className="type-label min-w-0 truncate">{player.name}</span>
            </span>
            <span className="type-action tabular-nums">{formatNumber(score)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
