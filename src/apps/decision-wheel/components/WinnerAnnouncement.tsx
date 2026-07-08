import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Trophy, X } from 'lucide-react'

import type { DecisionWheelResult } from '@/apps/decision-wheel/types'
import { useI18n } from '@/lib/i18n'
import { getReadableTextColor } from '@/lib/theme'

const winnerAnnouncementAutoCloseMs = 10_000

type WinnerAnnouncementProps = {
  result: DecisionWheelResult | null
  open: boolean
  onClose: () => void
}

export function WinnerAnnouncement({ result, open, onClose }: WinnerAnnouncementProps) {
  const { t } = useI18n()

  useEffect(() => {
    if (!open || !result) {
      return undefined
    }

    const timeoutId = window.setTimeout(onClose, winnerAnnouncementAutoCloseMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [onClose, open, result])

  if (!open || !result || typeof document === 'undefined') {
    return null
  }

  const textColor = getReadableTextColor(result.color)

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/20 px-4 py-6">
      <section
        className="relative grid max-h-[calc(100svh-3rem)] min-h-56 w-full max-w-6xl content-center rounded-lg border p-6 pr-14 shadow-[0_32px_100px_-40px_rgba(6,34,48,0.85)] sm:min-h-64 sm:p-10 sm:pr-20"
        style={{ backgroundColor: result.color, color: textColor }}
      >
        <button
          aria-label={t('common.close')}
          className="absolute right-4 top-4 inline-flex size-8 appearance-none items-center justify-center border-0 bg-transparent p-0 text-current opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          type="button"
          onClick={onClose}
        >
          <X className="size-5" />
        </button>

        <div aria-atomic="true" aria-live="polite" className="min-w-0" role="status">
          <div className="type-ui flex items-center gap-2 opacity-75">
            <Trophy className="size-5" />
            {t('decisionWheel.result.winner')}
          </div>
          <div className="mt-4 flex min-w-0 flex-wrap items-center gap-4">
            <div className="type-metric-lg min-w-0 max-w-full break-words">{result.text}</div>
            <span
              className="size-7 shrink-0 rounded-full border-2 border-current"
              style={{ backgroundColor: result.color }}
              aria-hidden="true"
            />
          </div>
        </div>
      </section>
    </div>,
    document.body,
  )
}
