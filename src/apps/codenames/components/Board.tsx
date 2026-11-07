import { hyphenate } from '@/apps/codenames/components/hyphenate'
import { COLOR_LABEL_KEY, SOFT, SOLID } from '@/apps/codenames/components/teamStyle'
import type { PublicView } from '@/apps/codenames/logic/view'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function Board({
  view,
  locked,
  onReveal,
}: {
  view: PublicView
  locked: boolean
  onReveal: (index: number) => void
}) {
  const { t } = useI18n()
  const ended = view.phase === 'ende'

  return (
    <div lang="de" className="grid grid-cols-5 gap-1.5 sm:gap-2.5" role="group" aria-label={t('codenames.board')}>
      {view.cards.map((card, index) => {
        const color = card.color
        const clickable = !locked && !card.revealed && view.phase === 'raten'
        const state = card.revealed && color
          ? t('codenames.card.revealed', { color: t(COLOR_LABEL_KEY[color]) })
          : ended && color
            ? t('codenames.card.unrevealed', { color: t(COLOR_LABEL_KEY[color]) })
            : t('codenames.card.hidden')
        return (
          <button
            key={card.word}
            type="button"
            data-card={index}
            data-color={color ?? undefined}
            aria-label={`${card.word}, ${state}`}
            aria-disabled={!clickable}
            onClick={() => clickable && onReveal(index)}
            className={cn(
              'relative flex min-h-[3.75rem] min-w-0 items-center justify-center rounded-md border px-1 py-2 text-center shadow-xs transition-[background-color,color,transform] outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[5.5rem] sm:rounded-lg sm:px-2',
              card.revealed && color ? SOLID[color] : ended && color ? SOFT[color] : 'bg-card text-card-foreground',
              clickable ? 'cursor-pointer hover:bg-muted active:translate-y-px' : 'cursor-default',
            )}
          >
            <span
              className={cn(
                'codename-word min-w-0 font-[650] leading-tight tracking-tight',
                card.word.length > 9 ? 'text-[0.625rem]' : 'text-[0.6875rem]',
                'sm:text-sm lg:text-[1.25rem]',
              )}
            >
              {hyphenate(card.word)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
