import { eveningApps } from '@/apps/registry'
import { AppTileGrid } from '@/components/layout/DashboardPage'
import { useI18n } from '@/lib/i18n'

/** Zweiter App-Hub hinter der PIN: Apps für den Abend zu zweit oder in kleiner Runde. */
export function EveningHubPage() {
  const { t } = useI18n()

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 pb-6 pt-4 sm:px-6 lg:gap-8 lg:pb-8 lg:pt-6">
      <h1 className="type-dashboard-title min-w-0 text-foreground">
        <span className="title-highlight">{t('nav.schlagDenRaab')}</span>
      </h1>
      <AppTileGrid apps={eveningApps} sizeOf={() => 'wide'} />
    </div>
  )
}
