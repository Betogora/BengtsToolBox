import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { toast } from 'sonner'

import {
  formatPace,
  formatSpeed,
  parsePace,
  parseSpeed,
} from './domain/units'
import { isValidPlanPace } from './domain/validation'
import type { PlanPaces, RunVariant } from './types'
import { IftaInput } from '@/components/ui/ifta-field'
import { useI18n } from '@/lib/i18n'

function WeightInput({
  weightKg,
  onSave,
}: {
  weightKg: number | null
  onSave: (weightKg: number | null) => Promise<unknown>
}) {
  const { t } = useI18n()
  const [value, setValue] = useState(weightKg?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    const next = value.trim() === '' ? null : Number(value.replace(',', '.'))
    if (next !== null && (!Number.isFinite(next) || next < 20 || next > 300)) {
      toast.error(t('triathlon.settings.invalidWeight'))
      return
    }
    if (next === weightKg) return
    setSaving(true)
    try {
      await onSave(next)
      toast.success(t('triathlon.settings.weightSaved'))
    } catch {
      toast.error(t('triathlon.form.saveFailed'))
    } finally {
      setSaving(false)
    }
  }
  return (
    <IftaInput
      label={t('triathlon.settings.weight')}
      className="max-w-56"
      inputMode="decimal"
      value={value}
      disabled={saving}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => void save()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}

function PlanPaceInput({
  variant,
  paceSeconds,
  onSave,
}: {
  variant: RunVariant
  paceSeconds: number
  onSave: (paceSeconds: number) => Promise<unknown>
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState({
    pace: formatPace(paceSeconds),
    speed: formatSpeed(paceSeconds),
  })
  const [saving, setSaving] = useState(false)
  const save = async () => {
    const next = parsePace(draft.pace)
    if (next === null || !isValidPlanPace(next)) {
      toast.error(t('triathlon.settings.invalidPlanPace'))
      setDraft({ pace: formatPace(paceSeconds), speed: formatSpeed(paceSeconds) })
      return
    }
    if (Math.round(next) === paceSeconds) return
    setSaving(true)
    try {
      await onSave(Math.round(next))
      toast.success(t('triathlon.settings.planPaceSaved'))
    } catch {
      toast.error(t('triathlon.form.saveFailed'))
    } finally {
      setSaving(false)
    }
  }
  const blurOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur()
  }
  return (
    <fieldset className="grid w-56 grid-cols-2 gap-2" data-plan-pace={variant}>
      <legend className="type-caption mb-1 font-semibold text-muted-foreground">
        {t(`triathlon.settings.planPace.${variant}`)}
      </legend>
      <IftaInput
        label={t('triathlon.settings.paceUnit')}
        aria-label={`${t(`triathlon.settings.planPace.${variant}`)} (min/km)`}
        inputMode="text"
        value={draft.pace}
        disabled={saving}
        onChange={(event) => {
          const pace = event.currentTarget.value
          const seconds = parsePace(pace)
          setDraft((current) => ({
            pace,
            speed: seconds === null ? current.speed : formatSpeed(seconds),
          }))
        }}
        onBlur={() => void save()}
        onKeyDown={blurOnEnter}
      />
      <IftaInput
        label={t('triathlon.settings.speedUnit')}
        aria-label={`${t(`triathlon.settings.planPace.${variant}`)} (km/h)`}
        inputMode="decimal"
        min="0"
        step="0.01"
        type="number"
        value={draft.speed}
        disabled={saving}
        onChange={(event) => {
          const speed = event.currentTarget.value
          const seconds = parseSpeed(speed)
          setDraft((current) => ({
            speed,
            pace: seconds === null ? current.pace : formatPace(seconds),
          }))
        }}
        onBlur={() => void save()}
        onKeyDown={blurOnEnter}
      />
    </fieldset>
  )
}

/** General inputs used by planning, power estimates and W/kg. */
export function TrackerSettingsPanel({
  weightKg,
  planPaces,
  onUpdatePlanPace,
  onUpdateWeight,
}: {
  weightKg: number | null
  planPaces: PlanPaces
  onUpdatePlanPace: (variant: RunVariant, paceSeconds: number) => Promise<unknown>
  onUpdateWeight: (weightKg: number | null) => Promise<unknown>
}) {
  return (
    <div
      className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-lg border bg-card p-3"
      data-tracker-settings
    >
      <WeightInput
        key={weightKg ?? 'none'}
        weightKg={weightKg}
        onSave={onUpdateWeight}
      />
      {(['walk', 'run'] as const).map((variant) => (
        <PlanPaceInput
          key={variant + '-' + planPaces[variant]}
          variant={variant}
          paceSeconds={planPaces[variant]}
          onSave={(paceSeconds) => onUpdatePlanPace(variant, paceSeconds)}
        />
      ))}
    </div>
  )
}
