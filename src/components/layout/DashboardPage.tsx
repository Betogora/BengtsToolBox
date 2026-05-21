import { Cloud, Layers3, MousePointerClick } from 'lucide-react'
import { Link } from 'react-router-dom'

import { apps, type HubApp } from '@/apps/registry'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardDescription,
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
      <Card className="h-full overflow-hidden transition-colors group-hover:border-primary/45 group-hover:bg-secondary/35">
        <CardHeader className="gap-5 p-6">
          <div className="flex items-center gap-5">
            <div
              className="flex size-16 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: app.color }}
            >
              <app.Icon className="size-8" />
            </div>
            <CardTitle className="text-2xl transition-colors group-hover:text-primary sm:text-3xl">
              {app.title}
            </CardTitle>
          </div>

          <Badge variant={app.status === 'Live' ? 'default' : 'secondary'}>
            {app.status}
          </Badge>
        </CardHeader>
      </Card>
    </Link>
  )
}

export function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-4 gap-2">
            <Cloud className="size-3.5" />
            Firebase-ready SPA
          </Badge>
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            App-Hub
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Deine Mini-Apps, Spiele und Experimente an einem Ort.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader className="p-4">
              <Layers3 className="mb-5 size-5" />
              <CardTitle className="text-3xl">{hubApps.length}</CardTitle>
              <CardDescription className="text-primary-foreground/75">
                Apps verfügbar
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-4">
              <MousePointerClick className="mb-5 size-5 text-accent" />
              <CardTitle className="text-3xl">1</CardTitle>
              <CardDescription>Klick pro Kachel</CardDescription>
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
