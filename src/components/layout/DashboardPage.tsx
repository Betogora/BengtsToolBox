import { ArrowRight, Layers3 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { apps, type HubApp } from '@/apps/registry'
import {
  Card,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const diagnosticAppId = 'diagnostics'
const hubApps = apps.filter((app) => app.id !== diagnosticAppId)

type AppTileProps = {
  app: HubApp
}

function AppTile({ app }: AppTileProps) {
  return (
    <Link
      to={app.href}
      aria-label={`${app.title} öffnen`}
      className="group block rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Card className="relative h-full overflow-hidden transition-colors group-hover:border-primary group-hover:bg-card/95">
        <div className="absolute inset-x-0 top-0 h-2 bg-primary" />
        <CardHeader className="grid min-h-36 gap-6 p-6 pt-7">
          <div className="flex items-start justify-between gap-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_14px_30px_-18px_var(--primary)]">
              <app.Icon className="size-6" />
            </div>
            <div
              className="flex size-9 shrink-0 translate-x-1 items-center justify-center rounded-md bg-secondary text-secondary-foreground transition-all group-hover:translate-x-0 group-hover:bg-primary group-hover:text-primary-foreground"
              aria-hidden="true"
            >
              <ArrowRight className="size-4" />
            </div>
          </div>

          <div>
            <CardTitle className="text-2xl leading-tight transition-colors group-hover:text-primary sm:text-3xl">
              {app.title}
            </CardTitle>
          </div>
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
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Wähle ein Tool und leg direkt los.
          </p>
        </div>

        <Card className="w-fit justify-self-start bg-primary text-primary-foreground lg:justify-self-end">
          <CardHeader className="flex-row items-center gap-4 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-foreground/15">
              <Layers3 className="size-5" />
            </div>
            <CardTitle className="text-xl">{hubApps.length} Apps</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {hubApps.map((app) => (
          <AppTile key={app.id} app={app} />
        ))}
      </section>
    </div>
  )
}
