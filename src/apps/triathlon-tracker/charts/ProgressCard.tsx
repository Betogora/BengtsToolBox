import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { memo, useState } from 'react'

import { disciplineColors } from '@/apps/triathlon-tracker/presentation'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { LegendDot } from './chartParts'
import type { ProgressChartPoint } from './chartTypes'
import {
  disciplineKey,
  gridProps,
  tickStyle,
  tooltipContentStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
} from './chartUtils'

const progressSeries = ['swim', 'bike', 'run', 'overall'] as const
type ProgressSeries = (typeof progressSeries)[number]

export const ProgressCard = memo(function ProgressCard({
  points,
}: {
  points: ProgressChartPoint[]
}) {
  const { formatNumber, formatDateTime, t } = useI18n()
  const [focus, setFocus] = useState<ProgressSeries | null>(null)
  const seriesLabel = (series: ProgressSeries) =>
    series === 'overall' ? t('triathlon.charts.overall') : t(disciplineKey(series))
  const seriesColor = (series: ProgressSeries) =>
    series === 'overall' ? 'var(--foreground)' : disciplineColors[series]
  const data = points.map((point) => ({
    ...point,
    timestamp: Date.parse(point.localDate + 'T12:00:00Z'),
  }))
  return (
    <div>
      <p className="type-caption mb-3 text-muted-foreground">
        {t('triathlon.charts.indexBasis')}
      </p>
      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label={t('triathlon.charts.progress')}>
        {progressSeries.map((series) => (
          <button
            key={series}
            type="button"
            aria-pressed={focus === series}
            className={cn(
              'type-caption flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition-opacity hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
              focus === series && 'bg-muted text-foreground',
              focus !== null && focus !== series && 'opacity-45',
            )}
            onClick={() => setFocus((current) => (current === series ? null : series))}
          >
            <LegendDot color={seriesColor(series)} />
            {seriesLabel(series)}
          </button>
        ))}
      </div>
      <div className="h-56 min-w-0 sm:h-64">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={data} margin={{ bottom: 4, left: 4, right: 12, top: 12 }}>
            <CartesianGrid {...gridProps} />
            <XAxis
              type="number"
              dataKey="timestamp"
              domain={['dataMin - 43200000', 'dataMax + 43200000']}
              tickCount={4}
              minTickGap={32}
              tickFormatter={(value) =>
                formatDateTime(new Date(Number(value)), {
                  day: '2-digit',
                  month: 'short',
                })
              }
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tick={tickStyle}
            />
            <YAxis
              domain={['auto', 'auto']}
              axisLine={false}
              tickLine={false}
              tick={tickStyle}
              width={44}
            />
            <ReferenceLine
              y={100}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
            />
            <Tooltip
              contentStyle={tooltipContentStyle}
              formatter={(value, name) => [
                formatNumber(Number(value), { maximumFractionDigits: 1 }),
                seriesLabel(name as ProgressSeries),
              ]}
              labelFormatter={(_, payload) =>
                payload[0]?.payload.localDate ?? ''
              }
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
            />
            {progressSeries
              .filter((series) => focus === null || focus === series)
              .map((series) => (
                <Line
                  key={series}
                  connectNulls={false}
                  dataKey={series}
                  name={series}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                  stroke={seriesColor(series)}
                  strokeDasharray={series === 'overall' ? '5 4' : undefined}
                  strokeWidth={2}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})
