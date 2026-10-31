import { formatNumber } from '@/apps/progress-dashboard/format'
import { progressEventIcons } from '@/apps/progress-dashboard/hooks/useProgressDashboard'
import type { PlayerStanding } from '@/apps/progress-dashboard/logic'
import type { ProgressEvent } from '@/apps/progress-dashboard/types'
import { useI18n } from '@/lib/i18n'
import { dateTimeFormat } from '@/lib/i18n/formatters'

const drinkLabels = new Map(progressEventIcons.map((icon) => [icon.id, icon.label]))

// Kurze Tooltip-Texte: was eine Person zuletzt eingetragen hat und wie weit sie vom Nachbarplatz entfernt ist.
export function useProgressTooltipText() {
  const { locale, t } = useI18n()

  const time = (event: ProgressEvent) => {
    const date = new Date(event.createdAtClientIso)
    const isToday = date.toDateString() === new Date().toDateString()
    return dateTimeFormat(locale, {
      ...(isToday ? {} : { weekday: 'short' }),
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const event = (entry: ProgressEvent) => {
    const delta = `${entry.valueDelta < 0 ? '−' : '+'}${formatNumber(Math.abs(entry.valueDelta))}`
    const drink = entry.icon === 'plus' || entry.icon === 'minus' ? '' : ` ${drinkLabels.get(entry.icon)}`
    return `${delta}${drink} · ${time(entry)}`
  }

  const standing = ({ rank, rival }: PlayerStanding) => {
    if (!rival) return t('progress.rank', { rank })
    const values = { gap: formatNumber(rival.gap), name: rival.name }
    if (rival.gap === 0) return t('progress.tooltip.tied', values)
    return t(rank === 1 ? 'progress.tooltip.ahead' : 'progress.tooltip.behind', values)
  }

  const lastEvent = ({ lastEvent: entry }: PlayerStanding) =>
    entry ? t('progress.tooltip.last', { event: event(entry) }) : t('progress.tooltip.noEvents')

  return { event, lastEvent, standing, total: (total: number) => t('progress.tooltip.total', { total: formatNumber(total) }) }
}
