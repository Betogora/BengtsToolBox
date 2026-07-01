import { Layers3 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { dashboardApps, type HubApp } from '@/apps/registry'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardIllustration } from '@/components/layout/DashboardIllustrations'

type AppTileProps = {
  app: HubApp
}

function AppTile({ app }: AppTileProps) {
  const prefetchApp = () => {
    void app.loadPage()
  }

  return (
    <Link
      to={app.href}
      aria-label={`${app.title} öffnen`}
      className="group block rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      onFocus={prefetchApp}
      onMouseEnter={prefetchApp}
      onTouchStart={prefetchApp}
    >
      <Card className="relative h-48 overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/45 group-hover:shadow-[0_18px_46px_-34px_rgba(6,52,79,0.55)]">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[48%] overflow-hidden opacity-95 [mask-image:linear-gradient(to_left,black_0%,black_72%,transparent_100%)]"
          aria-hidden="true"
        >
          <DashboardIllustration appId={app.id} />
        </div>

        <CardHeader className="relative z-10 flex h-full max-w-[58%] flex-col justify-start gap-3 p-5 sm:p-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_16px_34px_-18px_rgba(13,142,144,0.9)] transition-colors group-hover:bg-secondary group-hover:text-primary">
            <app.Icon className="size-6" />
          </div>

          <CardTitle className="type-tile-title hyphens-auto break-words transition-colors group-hover:text-primary">
            {app.title}
          </CardTitle>
        </CardHeader>
      </Card>
    </Link>
  )
}

export function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 pb-6 pt-8 sm:px-6 lg:gap-8 lg:pb-8 lg:pt-12">
      <section className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-5 max-[28rem]:grid-cols-1">
        <div className="min-w-0">
          <h1 className="type-dashboard-title text-foreground">
            App-Hub
          </h1>
          <div className="mt-5 h-2 w-16 rounded-full bg-primary sm:w-20" />
        </div>

        <div className="flex shrink-0 items-center gap-3 justify-self-end max-[28rem]:justify-self-start">
          <Card className="grid h-[72px] w-[72px] place-items-center overflow-hidden bg-white p-2 shadow-[0_18px_46px_-30px_rgba(6,52,79,0.55)]">
            <img
              src="/qrcode.svg"
              alt="QR-Code zur App-Hub Homepage"
              className="size-full rounded-md"
            />
          </Card>

          <Card className="h-[72px] w-fit border-primary/20 bg-primary text-primary-foreground shadow-[0_18px_46px_-30px_rgba(13,142,144,0.9)]">
            <CardHeader className="flex h-full flex-row items-center gap-4 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-foreground/18">
                <Layers3 className="size-5" />
              </div>
              <CardTitle className="whitespace-nowrap">
                {dashboardApps.length} Apps
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboardApps.map((app) => (
          <AppTile key={app.id} app={app} />
        ))}
      </section>

    </div>
  )
}
