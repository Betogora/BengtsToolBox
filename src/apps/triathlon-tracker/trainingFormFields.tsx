import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { IftaInput, IftaSelectTrigger } from '@/components/ui/ifta-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'
import type { RunIntensity, TrainingDiscipline } from './types'
import { runIntensities } from './types'
import { maximumInclinePercent } from './domain/incline'

export function InclineInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useI18n()
  return (
    <IftaInput
      inputMode="decimal"
      label={t('triathlon.form.incline')}
      max={maximumInclinePercent}
      min="0"
      step="0.5"
      type="number"
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  )
}

function getDisciplineLabel(
  discipline: TrainingDiscipline,
  t: ReturnType<typeof useI18n>['t'],
) {
  return t(`triathlon.discipline.${discipline}`)
}

export function DisciplineSelect({
  value,
  onValueChange,
}: {
  value: TrainingDiscipline
  onValueChange: (value: TrainingDiscipline) => void
}) {
  const { t } = useI18n()
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next as TrainingDiscipline)}
    >
      <IftaSelectTrigger
        className="min-w-0 gap-1 [&_[data-slot=select-value]]:truncate"
        label={t('triathlon.form.discipline')}
      >
        <SelectValue />
      </IftaSelectTrigger>
      <SelectContent className="triathlon-tracker">
        {(['swim', 'bike', 'run', 'strength'] as const).map((discipline) => (
          <SelectItem key={discipline} value={discipline}>
            {getDisciplineLabel(discipline, t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function RunVariantControl({
  isWalk,
  onIsWalkChange,
}: {
  isWalk: boolean
  onIsWalkChange: (isWalk: boolean) => void
}) {
  const { t } = useI18n()
  return (
    <SegmentedControl
      aria-label={t('triathlon.form.variant')}
      className="col-span-2 w-full sm:col-span-full"
      data-run-variant
      value={isWalk ? 'walk' : 'run'}
      onValueChange={(value) => onIsWalkChange(value === 'walk')}
      options={[
        { value: 'run', label: t('triathlon.variant.run') },
        { value: 'walk', label: t('triathlon.variant.walk') },
      ]}
    />
  )
}

export function RunIntensityControl({
  intensity,
  onIntensityChange,
}: {
  intensity: RunIntensity
  onIntensityChange: (intensity: RunIntensity) => void
}) {
  const { t } = useI18n()
  return (
    <SegmentedControl
      aria-label={t('triathlon.intensity.label')}
      className="col-span-2 w-full sm:col-span-full"
      data-run-intensity
      value={intensity}
      onValueChange={(value) => onIntensityChange(value as RunIntensity)}
      options={runIntensities.map((value) => ({
        value,
        label: t(`triathlon.intensity.${value}`),
      }))}
    />
  )
}
