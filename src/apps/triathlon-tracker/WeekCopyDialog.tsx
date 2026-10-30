import { Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/DatePicker'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useI18n } from '@/lib/i18n'
import {
  addDaysToLocalDate,
  getWeekStartLocalDate,
  isValidLocalDate,
} from './domain/dates'
import type { PlannedWeekCopyPreview } from './hooks/useTriathlonTracker'

function isoDateAtNoon(localDate: string) {
  return new Date(`${localDate}T12:00:00`)
}

type WeekCopyDialogProps = {
  currentWeekStart: string
  open: boolean
  onCopy: (preview: PlannedWeekCopyPreview) => Promise<unknown> | unknown
  onOpenChange: (open: boolean) => void
  onPreview: (source: string, target: string) => PlannedWeekCopyPreview
}

export function WeekCopyDialog(props: WeekCopyDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && (
        <WeekCopyDialogContent key={props.currentWeekStart} {...props} />
      )}
    </Dialog>
  )
}

function WeekCopyDialogContent({
  currentWeekStart,
  onCopy,
  onOpenChange,
  onPreview,
}: Omit<WeekCopyDialogProps, 'open'>) {
  const { formatDateTime, t } = useI18n()
  const [source, setSource] = useState(currentWeekStart)
  const [target, setTarget] = useState(addDaysToLocalDate(currentWeekStart, 7))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = useMemo(
    () =>
      isValidLocalDate(source) && isValidLocalDate(target)
        ? onPreview(
            getWeekStartLocalDate(source),
            getWeekStartLocalDate(target),
          )
        : null,
    [onPreview, source, target],
  )

  return (
    <DialogContent className="triathlon-tracker">
      <DialogHeader>
        <DialogTitle>{t('triathlon.copyWeek.title')}</DialogTitle>
        <DialogDescription>
          {t('triathlon.copyWeek.description')}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <DatePicker
          required
          label={t('triathlon.copyWeek.source')}
          value={source}
          onValueChange={setSource}
        />
        <DatePicker
          required
          label={t('triathlon.copyWeek.target')}
          value={target}
          onValueChange={setTarget}
        />
      </div>
      {preview ? (
        <div className="grid gap-2 rounded-md border bg-secondary/35 p-3">
          <p className="type-action">
            {t('triathlon.copyWeek.previewCount', {
              count: preview.copies.length,
            })}
          </p>
          <p className="type-ui text-muted-foreground">
            {formatDateTime(isoDateAtNoon(preview.sourceWeekStartLocalDate), {
              dateStyle: 'medium',
            })}
            {' → '}
            {formatDateTime(isoDateAtNoon(preview.targetWeekStartLocalDate), {
              dateStyle: 'medium',
            })}
          </p>
          {preview.existingTargetTrainings.length > 0 && (
            <p className="type-ui text-amber-700 dark:text-amber-300">
              {t('triathlon.copyWeek.existingWarning', {
                count: preview.existingTargetTrainings.length,
              })}
            </p>
          )}
        </div>
      ) : (
        <p className="type-ui text-destructive" role="alert">
          {t('triathlon.copyWeek.invalidDate')}
        </p>
      )}
      {error && (
        <p className="type-ui text-destructive" role="alert">
          {error}
        </p>
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {t('common.cancel')}
          </Button>
        </DialogClose>
        <Button
          disabled={isSaving || !preview || preview.copies.length === 0}
          type="button"
          onClick={async () => {
            if (!preview) return
            setIsSaving(true)
            setError(null)
            try {
              await onCopy(preview)
              onOpenChange(false)
            } catch {
              setError(t('triathlon.form.saveFailed'))
            } finally {
              setIsSaving(false)
            }
          }}
        >
          <Copy aria-hidden="true" />
          {isSaving
            ? t('common.saving')
            : t('triathlon.copyWeek.confirm', {
                count: preview?.copies.length ?? 0,
              })}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
