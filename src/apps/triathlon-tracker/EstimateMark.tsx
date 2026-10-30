import { useI18n } from '@/lib/i18n'

/** Marks modelled values: * = estimate, ** = beyond measured distances. */
export function EstimateMark({ extrapolated = false }: { extrapolated?: boolean }) {
  const { t } = useI18n()
  const meaning = t(
    extrapolated ? 'triathlon.records.extrapolation' : 'triathlon.charts.estimated',
  )
  return (
    <>
      {/* The tooltip replaces the former legend below the records. */}
      <span aria-hidden="true" className="tri-estimate-mark" title={meaning}>
        {extrapolated ? '**' : '*'}
      </span>
      <span className="sr-only"> ({meaning})</span>
    </>
  )
}
