import { Hand, RotateCcw, Sparkles } from 'lucide-react'

import { hyphenate } from '@/apps/codenames/components/hyphenate'
import { BADGE, TEAM_LABEL_KEY } from '@/apps/codenames/components/teamStyle'
import type { PublicView } from '@/apps/codenames/logic/view'
import type { HintStatus } from '@/apps/codenames/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'

export function ClueBar({
  view,
  hint,
  busy,
  onPass,
  onRequestHint,
}: {
  view: PublicView
  hint: HintStatus
  busy: boolean
  onPass: () => void
  onRequestHint: () => void
}) {
  const { t } = useI18n()
  const team = view.turn
  const teamLabel = t(TEAM_LABEL_KEY[team])

  if (view.phase === 'hinweis') {
    return (
      <Card className="flex min-h-[5.5rem] flex-wrap items-center gap-3 p-4 sm:px-5" aria-live="polite">
        <Badge className={BADGE[team]}>{teamLabel}</Badge>
        {hint.status === 'loading' ? (
          <p className="type-card-title min-w-0 flex-1 animate-pulse text-muted-foreground">
            {t('codenames.hintLoading', { team: teamLabel })}
          </p>
        ) : hint.status === 'error' ? (
          <>
            <p className="type-ui min-w-0 flex-1 text-destructive">
              {t('codenames.hintFailed', { team: teamLabel })}
              {hint.message ? `: ${hint.message}` : `: ${t('codenames.error.proxy')}`}
            </p>
            <Button variant="outline" onClick={onRequestHint} disabled={busy}>
              <RotateCcw />
              {t('codenames.retry')}
            </Button>
          </>
        ) : (
          <>
            <p className="type-ui min-w-0 flex-1 text-muted-foreground">{t('codenames.hintWaiting', { team: teamLabel })}</p>
            <Button onClick={onRequestHint} disabled={busy}>
              <Sparkles />
              {t('codenames.hintRequest')}
            </Button>
          </>
        )}
      </Card>
    )
  }

  if (view.phase !== 'raten' || !view.clue) return null
  const clue = view.clue
  const tries = t(clue.guessesLeft === 1 ? 'codenames.triesLeftOne' : 'codenames.triesLeft', { count: clue.guessesLeft })

  return (
    <Card className="flex min-h-[5.5rem] flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:px-5" aria-live="polite">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <Badge className={BADGE[team]}>{teamLabel}</Badge>
        <div className="flex min-w-0 items-baseline gap-3">
          <span lang="de" className="codename-word type-metric-md min-w-0 max-sm:text-[1.5rem] max-sm:leading-[1.9rem]" data-testid="codenames-clue-word">
            {hyphenate(clue.word)}
          </span>
          <span className="type-metric-md shrink-0 tabular-nums text-muted-foreground max-sm:text-[1.5rem] max-sm:leading-[1.9rem]" data-testid="codenames-clue-number">
            {clue.number}
          </span>
        </div>
        <span className="type-ui basis-full text-muted-foreground sm:basis-auto">{tries}</span>
      </div>
      <Button
        variant="outline"
        onClick={onPass}
        disabled={busy || clue.guessesMade === 0}
        title={clue.guessesMade === 0 ? t('codenames.passBlocked') : undefined}
      >
        <Hand />
        {t('codenames.pass')}
      </Button>
    </Card>
  )
}
