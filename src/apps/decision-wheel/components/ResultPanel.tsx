import { Trophy } from 'lucide-react'

import type { DecisionWheelResult } from '@/apps/decision-wheel/types'
import { getColorWithAlpha } from '@/apps/shared/utils'
import { useI18n } from '@/lib/i18n'

type ResultPanelProps = {
  result: DecisionWheelResult | null
}

export function ResultPanel({ result }: ResultPanelProps) {
  const { t } = useI18n()

  return (
    <div
      className="rounded-lg border bg-secondary p-4"
      style={
        result
          ? { backgroundColor: getColorWithAlpha(result.color, '80') }
          : undefined
      }
    >
      <div className="type-ui flex items-center gap-2 text-muted-foreground">
        <Trophy className="size-4" />
        {t('decisionWheel.result.winner')}
      </div>
      <div className="mt-2 flex min-h-10 items-center justify-between gap-3">
        <div className="type-section-title min-w-0 truncate">
          {result?.text ?? t('decisionWheel.result.notSpun')}
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
