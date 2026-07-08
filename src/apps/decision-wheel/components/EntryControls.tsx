import { Trash2 } from 'lucide-react'

import type { DecisionWheelEntry } from '@/apps/decision-wheel/types'
import { getEntryDisplayText } from '@/apps/decision-wheel/utils'
import { Button } from '@/components/ui/button'
import { IftaInput } from '@/components/ui/ifta-field'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/lib/i18n'

type EntryControlMode = 'mobile' | 'table'

type UpdateEntry = (
  entryId: string,
  partialValue: Partial<Omit<DecisionWheelEntry, 'id'>>,
) => void

type EntryControlProps = {
  entry: DecisionWheelEntry
  index: number
  mode: EntryControlMode
  onUpdateEntry: UpdateEntry
}

type EntryWeightControlProps = {
  entry: DecisionWheelEntry
  index: number
  mode: EntryControlMode
  value: string
  onClearWeightDraft: (entryId: string) => void
  onWeightChange: (entryId: string, nextValue: string) => void
}

type RemoveEntryButtonProps = {
  entry: DecisionWheelEntry
  index: number
  mode: EntryControlMode
  onRemoveEntry: (entryId: string) => void
}

export function EntryTextControl({
  entry,
  index,
  mode,
  onUpdateEntry,
}: EntryControlProps) {
  const { t } = useI18n()

  if (mode === 'mobile') {
    return (
      <IftaInput
        id={`entry-text-${entry.id}`}
        label="Text"
        value={entry.text}
        onChange={(event) =>
          onUpdateEntry(entry.id, { text: event.currentTarget.value })
        }
      />
    )
  }

  return (
    <Input
      id={`entry-text-table-${entry.id}`}
      aria-label={t('decisionWheel.option.textAria', { number: index + 1 })}
      className="max-w-60"
      value={entry.text}
      onChange={(event) =>
        onUpdateEntry(entry.id, { text: event.currentTarget.value })
      }
    />
  )
}

export function EntryWeightControl({
  entry,
  index,
  mode,
  value,
  onClearWeightDraft,
  onWeightChange,
}: EntryWeightControlProps) {
  const { t } = useI18n()
  const entryLabel = getEntryDisplayText(entry, index, (number) =>
    t('decisionWheel.fallbackOption', { number }),
  )

  if (mode === 'mobile') {
    return (
      <IftaInput
        id={`entry-weight-${entry.id}`}
        label={t('decisionWheel.weight')}
        min={1}
        type="number"
        className="text-center tabular-nums"
        value={value}
        onBlur={() => onClearWeightDraft(entry.id)}
        onChange={(event) =>
          onWeightChange(entry.id, event.currentTarget.value)
        }
      />
    )
  }

  return (
    <Input
      id={`entry-weight-table-${entry.id}`}
      aria-label={t('decisionWheel.weightAria', { option: entryLabel })}
      min={1}
      type="number"
      className="w-16 text-center tabular-nums"
      value={value}
      onBlur={() => onClearWeightDraft(entry.id)}
      onChange={(event) =>
        onWeightChange(entry.id, event.currentTarget.value)
      }
    />
  )
}

export function EntryColorControl({
  entry,
  index,
  mode,
  onUpdateEntry,
}: EntryControlProps) {
  const { t } = useI18n()
  const entryLabel = getEntryDisplayText(entry, index, (number) =>
    t('decisionWheel.fallbackOption', { number }),
  )
  const input = (
    <Input
      id={mode === 'mobile' ? `entry-color-${entry.id}` : `entry-color-table-${entry.id}`}
      type="color"
      aria-label={t('decisionWheel.option.colorAria', { option: entryLabel })}
      className={
        mode === 'mobile'
          ? 'h-11 cursor-pointer rounded-md border p-1'
          : 'h-9 w-10 cursor-pointer rounded-md border p-1'
      }
      value={entry.color}
      onChange={(event) =>
        onUpdateEntry(entry.id, { color: event.currentTarget.value })
      }
    />
  )

  if (mode === 'mobile') {
    return (
      <div className="relative">
        <Input
          id={`entry-color-${entry.id}`}
          type="color"
          aria-label={t('decisionWheel.option.colorAria', { option: entryLabel })}
          className="h-11 cursor-pointer rounded-md border px-2 pb-1.5 pt-5"
          value={entry.color}
          onChange={(event) =>
            onUpdateEntry(entry.id, { color: event.currentTarget.value })
          }
        />
        <label
          className="type-field-label pointer-events-none absolute left-3 top-1.5 max-w-[calc(100%-1.5rem)] truncate text-muted-foreground"
          htmlFor={`entry-color-${entry.id}`}
        >
          {t('decisionWheel.color')}
        </label>
      </div>
    )
  }

  return input
}

export function RemoveEntryButton({
  entry,
  index,
  mode,
  onRemoveEntry,
}: RemoveEntryButtonProps) {
  const { t } = useI18n()
  const entryLabel = getEntryDisplayText(entry, index, (number) =>
    t('decisionWheel.fallbackOption', { number }),
  )

  return (
    <Button
      aria-label={t('decisionWheel.option.deleteAria', { option: entryLabel })}
      className={mode === 'mobile' ? 'w-11 px-0' : 'h-9 w-9 px-0'}
      size={mode === 'mobile' ? 'ifta' : 'icon'}
      variant="delete"
      onClick={() => onRemoveEntry(entry.id)}
    >
      <Trash2 className="size-4" />
    </Button>
  )
}
