import { useId } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { holdToConfirmTiming, useHoldToConfirm } from '@/apps/shared/components/useHoldToConfirm'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const isFailedResult = (result: unknown) =>
  result === false || (typeof result === 'object' && result !== null && 'ok' in result && result.ok === false)

export function AppResetButton({
  description,
  disabled,
  mode = 'hold',
  onConfirm,
  title,
}: {
  description: string
  disabled?: boolean
  mode?: 'hold' | 'dialog'
  onConfirm: () => void | Promise<unknown>
  title: string
}) {
  const { t } = useI18n()

  if (mode === 'dialog') {
    return (
      <ConfirmButton
        mode="dialog"
        title={title}
        description={description}
        confirmLabel={t('common.reset')}
        onConfirm={onConfirm}
        trigger={
          <Button disabled={disabled} variant="outline" size="sm">
            <RotateCcw className="size-4" />
            {t('common.reset')}
          </Button>
        }
      />
    )
  }

  return <HoldResetButton description={description} disabled={disabled} onConfirm={onConfirm} title={title} />
}

function HoldResetButton({
  description,
  disabled,
  onConfirm,
  title,
}: {
  description: string
  disabled?: boolean
  onConfirm: () => void | Promise<unknown>
  title: string
}) {
  const { t } = useI18n()
  const descriptionId = useId()
  const { phase, handlers } = useHoldToConfirm(async () => {
    if (isFailedResult(await onConfirm())) return false
    toast.success(t('common.resetDone'))
    return true
  })
  const isArmed = phase === 'holding' || phase === 'hint'
  const isDone = phase === 'done'

  return (
    <>
      <Button
        {...handlers}
        aria-describedby={descriptionId}
        data-phase={phase}
        disabled={disabled}
        size="sm"
        title={description}
        type="button"
        variant="outline"
        className={cn(
          'relative isolate touch-manipulation overflow-hidden select-none [-webkit-touch-callout:none]',
          isArmed && 'border-destructive/50 bg-card text-destructive hover:bg-card hover:text-destructive',
          isDone && 'border-success/40 bg-success-soft text-success hover:bg-success-soft hover:text-success',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-0 -z-10 origin-left bg-destructive-soft transition-transform duration-150 ease-out motion-reduce:transition-none',
            phase === 'holding' || phase === 'confirming' ? 'scale-x-100' : 'scale-x-0',
          )}
          style={phase === 'holding' ? { transitionDuration: `${holdToConfirmTiming.holdMs}ms`, transitionTimingFunction: 'linear' } : undefined}
        >
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-destructive/70" />
        </span>
        {isDone ? <Check className="size-4" /> : <RotateCcw className="size-4" />}
        {isDone ? t('common.resetDone') : isArmed ? t('common.resetHold') : t('common.reset')}
      </Button>
      <span id={descriptionId} className="sr-only">
        {`${title} ${description} ${t('common.resetHold')}`}
      </span>
    </>
  )
}
