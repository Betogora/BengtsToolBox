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
import { cn } from '@/lib/utils'

const diagnosticAppId = 'diagnostics'
const hubApps = apps.filter((app) => app.id !== diagnosticAppId)
const diagnosticApp = apps.find((app) => app.id === diagnosticAppId)

type AppTileProps = {
  app: HubApp
  isDiagnostic?: boolean
}

function AppTile({ app, isDiagnostic = false }: AppTileProps) {
  return (
    <Link
      to={app.href}
      aria-label={`${app.title} öffnen`}
      className={cn(
        'group block rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        isDiagnostic && 'sm:col-span-2',
      )}
    >
      <Card
        className={cn(
          'h-full overflow-hidden transition-colors',
          isDiagnostic
            ? 'border-primary/25 bg-primary/5 group-hover:bg-primary/10'
            : 'group-hover:border-primary/45 group-hover:bg-secondary/35',
        )}
      >
        <CardHeader
          className={cn(
            'gap-5 p-6',
            isDiagnostic && 'sm:flex-row sm:items-center sm:justify-between',
          )}
        >
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

          {!isDiagnostic && (
            <Badge variant={app.status === 'Live' ? 'default' : 'secondary'}>
              {app.status}
            </Badge>
          )}
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
              <CardTitle className="text-3xl">{apps.length}</CardTitle>
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
        {diagnosticApp && (
          <AppTile app={diagnosticApp} isDiagnostic />
        )}
      </section>
    </div>
  )
}
