import { Layers3 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { apps, type HubApp } from '@/apps/registry'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const diagnosticAppId = 'diagnostics'
const hubApps = apps.filter((app) => app.id !== diagnosticAppId)

type AppTileProps = {
  app: HubApp
}

function PreviewBar({
  className,
  height = 'h-2',
}: {
  className?: string
  height?: string
}) {
  return <div className={cn('rounded-full bg-current', height, className)} />
}

function AppPreview({ appId }: { appId: string }) {
  switch (appId) {
    case 'scoreboard':
      return (
        <div className="grid h-full grid-cols-2 gap-2 p-4 text-[#063852]">
          <div className="rounded-md border border-current/20 bg-white/85 p-2 shadow-sm">
            <PreviewBar className="w-11" />
            <div className="mt-4 text-4xl font-semibold leading-none">12</div>
            <PreviewBar className="mt-4 w-16 opacity-35" height="h-1.5" />
          </div>
          <div className="rounded-md border border-current/20 bg-[#f4f0a8]/90 p-2 shadow-sm">
            <PreviewBar className="w-10" />
            <div className="mt-4 text-4xl font-semibold leading-none">09</div>
            <PreviewBar className="mt-4 w-14 opacity-35" height="h-1.5" />
          </div>
        </div>
      )
    case 'live-buzzer':
      return (
        <div className="grid h-full place-items-center p-4 text-[#063852]">
          <div className="grid size-28 place-items-center rounded-full border-[10px] border-current/15 bg-white shadow-sm">
            <div className="size-14 rounded-full bg-current shadow-[0_0_0_14px_rgba(244,240,168,0.9)]" />
          </div>
        </div>
      )
    case 'progress-dashboard':
      return (
        <div className="flex h-full items-end gap-2 p-4 text-[#063852]">
          <PreviewBar className="w-6 opacity-45" height="h-10" />
          <PreviewBar className="w-6 opacity-60" height="h-16" />
          <PreviewBar className="w-6 opacity-75" height="h-12" />
          <PreviewBar className="w-6" height="h-24" />
          <div className="mb-20 size-3 rounded-full bg-[#f0810f]" />
        </div>
      )
    case 'randomizer':
      return (
        <div className="grid h-full grid-cols-2 gap-2 p-4 text-[#063852]">
          {[3, 8, 1, 6].map((value) => (
            <div
              key={value}
              className="grid place-items-center rounded-md border border-current/20 bg-white/85 text-2xl font-semibold shadow-sm"
            >
              {value}
            </div>
          ))}
        </div>
      )
    case 'decision-wheel':
      return (
        <div className="grid h-full place-items-center p-3 text-[#063852]">
          <div className="relative size-32 overflow-hidden rounded-full border-4 border-white shadow-sm">
            <div className="absolute inset-0 bg-[conic-gradient(#063852_0_25%,#f4f0a8_0_50%,#f0810f_0_75%,#ffffff_0_100%)]" />
            <div className="absolute inset-10 rounded-full bg-white/90" />
            <div className="absolute left-1/2 top-0 h-1/2 w-1 -translate-x-1/2 bg-current" />
          </div>
        </div>
      )
    case 'territory-map':
      return (
        <div className="h-full p-4 text-[#063852]">
          <div className="relative h-full overflow-hidden rounded-md bg-[#e9ecdc] shadow-sm">
            <div className="absolute left-5 top-5 h-12 w-16 rounded-[45%] bg-current/25" />
            <div className="absolute right-6 top-7 h-16 w-20 rounded-[50%] bg-current/35" />
            <div className="absolute bottom-4 left-12 h-14 w-24 rounded-[45%] bg-[#f0810f]/45" />
            <div className="absolute bottom-8 right-10 h-10 w-14 rounded-[45%] bg-current/25" />
          </div>
        </div>
      )
    default:
      return (
        <div className="flex h-full flex-col justify-center gap-3 p-4 text-[#063852]">
          <PreviewBar className="w-24" />
          <PreviewBar className="w-32 opacity-50" />
          <PreviewBar className="w-20 opacity-35" />
        </div>
      )
  }
}

function AppTile({ app }: AppTileProps) {
  const prefetchApp = () => {
    void app.loadPage()
  }

  return (
    <Link
      to={app.href}
      aria-label={`${app.title} oeffnen`}
      className="group block rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      onFocus={prefetchApp}
      onMouseEnter={prefetchApp}
      onTouchStart={prefetchApp}
    >
      <Card className="relative h-40 overflow-hidden transition-colors group-hover:border-primary/55 group-hover:bg-card/95">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[36%] overflow-hidden opacity-55 [mask-image:linear-gradient(to_left,black_0%,black_35%,transparent_100%)]"
          aria-hidden="true"
        >
          <AppPreview appId={app.id} />
        </div>

        <CardHeader className="relative z-10 flex h-full max-w-[64%] flex-col justify-start gap-3 p-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_14px_30px_-18px_var(--primary)] transition-colors group-hover:bg-secondary group-hover:text-secondary-foreground">
            <app.Icon className="size-6" />
          </div>

          <CardTitle className="text-2xl leading-tight transition-colors group-hover:text-primary sm:text-[1.65rem]">
            {app.title}
          </CardTitle>
        </CardHeader>
      </Card>
    </Link>
  )
}

export function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-8 sm:px-6 lg:py-12">
      <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            App-Hub
          </h1>
        </div>

        <div className="flex items-center gap-4 justify-self-start lg:justify-self-end">
          <Card className="grid h-[72px] w-[72px] place-items-center overflow-hidden bg-white p-2 shadow-md">
            <img
              src="/qrcode.svg"
              alt="QR-Code zur App-Hub Homepage"
              className="size-full rounded-md"
            />
          </Card>

          <Card className="h-[72px] w-fit bg-primary text-primary-foreground">
            <CardHeader className="flex h-full flex-row items-center gap-4 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-foreground/15">
                <Layers3 className="size-5" />
              </div>
              <CardTitle className="text-xl">{hubApps.length} Apps</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {hubApps.map((app) => (
          <AppTile key={app.id} app={app} />
        ))}
      </section>
    </div>
  )
}
