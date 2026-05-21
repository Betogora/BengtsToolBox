import { ArrowRight, Blocks, Cloud, Layers3 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { apps } from '@/apps/registry'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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
            Dein modularer App-Hub fuer Mini-Apps, Spiele und Experimente.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Jede App ist isoliert, nutzt dieselbe UI-Sprache und kann ueber die
            Registry erweitert werden, ohne die bestehenden Bereiche anzufassen.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader className="p-4">
              <Layers3 className="mb-5 size-5" />
              <CardTitle className="text-3xl">2</CardTitle>
              <CardDescription className="text-primary-foreground/75">
                Apps geplant
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-4">
              <Blocks className="mb-5 size-5 text-primary" />
              <CardTitle className="text-3xl">1</CardTitle>
              <CardDescription>Registry fuer alle Kacheln</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {apps.map((app) => (
          <Card key={app.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: app.color }}
                >
                  <app.Icon className="size-5" />
                </div>
                <Badge variant={app.status === 'Live' ? 'default' : 'secondary'}>
                  {app.status}
                </Badge>
              </div>
              <CardTitle className="text-xl">{app.title}</CardTitle>
              <CardDescription className="min-h-12">
                {app.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full justify-between">
                <Link to={app.href}>
                  App oeffnen
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
