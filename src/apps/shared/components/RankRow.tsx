import type { ComponentProps, ReactNode } from 'react'

import { getPodiumRankClass } from '@/apps/shared/podium'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type RankSize = 'compact' | 'default' | 'large'

// Ranglisten-Zeile für alle Apps: Podium-Plättchen, Farbpunkt und Name, Wert rechts;
// optional ein dünner Balken und eine Unterzeile. Zeilen trennt die Liste mit Haarlinien.
export function RankList({ className, ...props }: ComponentProps<'ol'>) {
  return <ol className={cn('grid divide-y', className)} {...props} />
}

export function RankRow({
  className,
  color,
  name,
  podium = true,
  rank,
  share,
  shareStart = 0,
  size = 'default',
  sub,
  value,
  ...props
}: Omit<ComponentProps<'li'>, 'children'> & {
  color?: string
  name: ReactNode
  /** false: Platz ohne Podium-Plättchen, z. B. ohne Punkte. */
  podium?: boolean
  rank: number
  /** Anteil 0..1 für den Balken; ohne Wert kein Balken. */
  share?: number
  /** Startpunkt 0..1 des Balkens, z. B. für negative Werte links einer Nulllinie. */
  shareStart?: number
  size?: RankSize
  sub?: ReactNode
  value: ReactNode
}) {
  const { t } = useI18n()

  return (
    <li
      className={cn(
        'grid items-center gap-x-3 first:pt-0 last:pb-0',
        size === 'large' ? 'grid-cols-[3rem_minmax(0,1fr)_auto] py-4' : 'grid-cols-[1.75rem_minmax(0,1fr)_auto]',
        size === 'default' && 'py-3',
        size === 'compact' && 'py-2',
        className,
      )}
      {...props}
    >
      <span
        aria-label={t('common.rank', { rank })}
        className={cn(
          getPodiumRankClass(podium ? rank : 0),
          size === 'large' ? 'type-section-title size-12' : size === 'compact' ? 'type-caption size-6' : 'type-label size-7 font-[650]',
        )}
      >
        {rank}
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {color && (
            <span
              aria-hidden="true"
              className={cn('shrink-0 rounded-full', size === 'large' ? 'size-3.5' : 'size-2')}
              style={{ backgroundColor: color }}
            />
          )}
          <span
            className={cn(
              'min-w-0 break-words [overflow-wrap:anywhere]',
              size === 'large' ? 'type-section-title' : size === 'compact' ? 'type-label' : 'type-action',
            )}
          >
            {name}
          </span>
        </div>
        {share !== undefined && (
          <span
            aria-hidden="true"
            className={cn('mt-1.5 block overflow-hidden rounded-full bg-muted', size === 'large' ? 'h-2' : 'h-1')}
          >
            <span
              className="block h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                marginLeft: `${Math.max(0, Math.min(1, shareStart)) * 100}%`,
                width: `${Math.max(0, Math.min(1, share)) * 100}%`,
                backgroundColor: color,
              }}
            />
          </span>
        )}
        {sub && <div className="type-caption mt-1 text-muted-foreground tabular-nums">{sub}</div>}
      </div>
      <span
        className={cn(
          'text-right tabular-nums',
          size === 'large' ? 'type-metric-lg' : size === 'compact' ? 'type-action' : 'type-metric-sm',
        )}
      >
        {value}
      </span>
    </li>
  )
}
