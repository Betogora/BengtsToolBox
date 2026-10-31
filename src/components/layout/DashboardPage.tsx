import { UsersRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { dashboardApps, type HubApp } from '@/apps/registry'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/tooltip'
import { QrCodeButton } from '@/components/ui/QrCodeButton'
import { DashboardIllustration } from '@/components/layout/DashboardIllustrations'
import { useI18n } from '@/lib/i18n'
import { dateTimeFormat } from '@/lib/i18n/formatters'
import { cn } from '@/lib/utils'
import { defaultLobby, type Lobby } from '@/lobbies/types'

type TileSize = 'large' | 'wide' | 'small'

// Display order and size of the wide-screen tiles; complex multi-view apps get
// more room. Unlisted apps follow as small tiles in registry order.
const bentoLayout: Record<string, TileSize> = {
  'swiss-tournaments': 'large',
  'territory-map': 'large',
  'decision-wheel': 'small',
  coinflip: 'small',
  'progress-dashboard': 'wide',
  scoreboard: 'wide',
  'live-buzzer': 'small',
  voting: 'small',
  'triathlon-tracker': 'wide',
  randomizer: 'small',
  'next-question': 'small',
}

const tileSizeOf = (app: HubApp): TileSize => bentoLayout[app.id] ?? 'small'

const bentoOrder = Object.keys(bentoLayout)
const bentoRank = (app: HubApp) => {
  const index = bentoOrder.indexOf(app.id)
  return index === -1 ? bentoOrder.length : index
}

const bentoApps = [...dashboardApps].sort((a, b) => bentoRank(a) - bentoRank(b))

type AppTileProps = {
  app: HubApp
  href: string
}

function AppLink({
  app,
  href,
  className,
  children,
}: AppTileProps & { className?: string; children: ReactNode }) {
  const { t } = useI18n()
  const prefetchApp = () => {
    void app.loadPage()
  }

  return (
    <Link
      to={href}
      aria-label={t('common.openApp', { app: t(app.titleKey) })}
      className={cn(
        'group block rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className,
      )}
      onFocus={prefetchApp}
      onMouseEnter={prefetchApp}
      onTouchStart={prefetchApp}
    >
      {children}
    </Link>
  )
}

// Only the hover properties animate; the background must switch together with the
// title glow when the color scheme changes.
const tileCardClass =
  'relative h-full overflow-hidden transition-[translate,border-color,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/45 group-hover:shadow-[0_18px_46px_-34px_rgba(6,52,79,0.55)]'

// A glyph-tight card-colored glow keeps the title readable over illustrations
// without masking a whole area of the motif.
const titleHaloClass =
  'relative w-fit [text-shadow:0_0_1px_var(--card),0_0_3px_var(--card),0_0_6px_var(--card),0_0_10px_var(--card)]'

function TileIcon({ app, className }: { app: HubApp; className?: string }) {
  return (
    <div
      className={cn(
        'relative z-10 flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground',
        className,
      )}
    >
      <app.Icon className="size-[50%]" />
    </div>
  )
}

const bentoIllustrationClass: Record<TileSize, string> = {
  large: 'bottom-[5%] right-[3%] h-[68%] w-[72%]',
  wide: 'inset-y-[7%] left-[44%] w-[42%]',
  small: 'bottom-[4%] right-[3%] h-[80%] w-[74%]',
}

function BentoTile({ app, href }: AppTileProps) {
  const { t } = useI18n()
  const size = tileSizeOf(app)

  return (
    <AppLink
      app={app}
      href={href}
      className={cn(
        size === 'large' && 'col-span-2 row-span-2',
        size === 'wide' && 'col-span-2',
      )}
    >
      <Card className={tileCardClass}>
        <div
          className={cn(
            'pointer-events-none absolute opacity-95',
            bentoIllustrationClass[size],
          )}
          aria-hidden="true"
        >
          <DashboardIllustration appId={app.id} framed />
        </div>

        <CardHeader
          className={cn(
            'relative z-10 flex h-full flex-col gap-3 p-5',
            size === 'small' ? 'justify-between' : 'justify-start',
          )}
        >
          <TileIcon app={app} className={size === 'small' ? 'size-10' : undefined} />
          <CardTitle
            className={cn(
              titleHaloClass,
              'hyphens-manual break-words text-balance transition-colors group-hover:text-primary',
              size === 'large'
                ? 'type-tile-title max-w-[55%] lg:text-[1.625rem] lg:leading-tight'
                : 'type-tile-title max-w-[70%]',
            )}
          >
            {t(app.titleKey)}
          </CardTitle>
        </CardHeader>
      </Card>
    </AppLink>
  )
}

function CompactTile({ app, href }: AppTileProps) {
  const { t } = useI18n()

  return (
    <AppLink app={app} href={href}>
      <Card className={cn(tileCardClass, 'flex flex-col')}>
        <div className="pointer-events-none relative mx-2 mt-2 aspect-[4/3] overflow-hidden rounded-md bg-[linear-gradient(160deg,var(--primary-soft),var(--secondary))]">
          <div className="absolute inset-[10%]" aria-hidden="true">
            <DashboardIllustration appId={app.id} framed />
          </div>
          <TileIcon
            app={app}
            className="absolute left-2 top-2 size-8 bg-card"
          />
        </div>
        <div className="flex min-h-14 flex-1 items-center px-3 py-3">
          <CardTitle className="type-card-title min-w-0 hyphens-manual break-words text-balance transition-colors group-hover:text-primary">
            {t(app.titleKey)}
          </CardTitle>
        </div>
      </Card>
    </AppLink>
  )
}

export function DashboardPage({ lobby }: { lobby?: Lobby }) {
  const { locale, t } = useI18n()
  const activeLobby = lobby ?? defaultLobby
  // Der Tooltip nennt, was die Karte nicht zeigt: bei eigenen Lobbys Beitrittscode und Alter.
  const isDefaultLobby = activeLobby.kind === 'default'
  const lobbyDetail = isDefaultLobby
    ? undefined
    : t('lobby.tooltipDetail', {
        code: activeLobby.code,
        date: dateTimeFormat(locale, { dateStyle: 'medium' }).format(
          new Date(activeLobby.createdAtClientIso),
        ),
      })
  const hrefOf = (app: HubApp) =>
    lobby ? `/lobbies/${lobby.id}${app.href}` : app.href

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 pb-6 pt-4 sm:px-6 lg:gap-8 lg:pb-8 lg:pt-6">
      <section className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-5 max-[28rem]:grid-cols-1">
        <h1 className="type-dashboard-title min-w-0 text-foreground">
          <span className="title-highlight">{t('dashboard.title')}</span>
        </h1>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 justify-self-end max-[28rem]:justify-start max-[28rem]:justify-self-start">
          <Card className="h-[72px] w-fit max-w-60 border-primary/20 shadow-[0_18px_46px_-30px_rgba(6,52,79,0.55)]">
            <CardHeader className="flex h-full flex-row items-center gap-4 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                <UsersRound className="size-5" />
              </div>
              <Tooltip
                side="bottom"
                title={isDefaultLobby ? t('lobby.defaultDescription') : activeLobby.name}
                description={lobbyDetail}
              >
                <CardTitle className="truncate whitespace-nowrap">
                  {activeLobby.name}
                </CardTitle>
              </Tooltip>
            </CardHeader>
          </Card>

          <QrCodeButton
            label={t('dashboard.qrAlt')}
            openLabel={t('dashboard.qrOpen')}
            value={`${window.location.origin}${lobby ? `/lobbies/${lobby.id}` : '/'}`}
          />
        </div>
      </section>

      {/* Phones get uniform picture tiles; wider screens weight tiles by app complexity. */}
      <section className="grid grid-cols-2 gap-3 sm:hidden">
        {dashboardApps.map((app) => (
          <CompactTile key={app.id} app={app} href={hrefOf(app)} />
        ))}
      </section>

      <section className="hidden grid-flow-dense auto-rows-[10rem] grid-cols-2 gap-4 sm:grid lg:auto-rows-[11rem] lg:grid-cols-4">
        {bentoApps.map((app) => (
          <BentoTile key={app.id} app={app} href={hrefOf(app)} />
        ))}
      </section>
    </div>
  )
}
