import { Trophy } from 'lucide-react'

import type { DecisionWheelResult } from '@/apps/decision-wheel/types'
import { getColorWithAlpha } from '@/apps/decision-wheel/utils'

type ResultPanelProps = {
  result: DecisionWheelResult | null
}

export function ResultPanel({ result }: ResultPanelProps) {
  return (
    <div
      className="rounded-lg border bg-secondary p-4"
      style={
        result
          ? { backgroundColor: getColorWithAlpha(result.color, '80') }
          : undefined
      }
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Trophy className="size-4" />
        Gewinner
      </div>
      <div className="mt-2 flex min-h-10 items-center justify-between gap-3">
        <div className="min-w-0 truncate text-2xl font-semibold">
          {result?.text ?? 'Noch nicht gedreht'}
        </div>
        {result && (
          <span
            className="size-5 shrink-0 rounded-full border"
            style={{ backgroundColor: result.color }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}
