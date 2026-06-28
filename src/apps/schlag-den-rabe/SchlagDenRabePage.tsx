import { Target } from 'lucide-react'

import { AppPage } from '@/apps/shared/components/AppPage'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SchlagDenRabePage() {
  return (
    <AppPage className="gap-7 lg:py-12">
      <section className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
        <div className="max-w-3xl">
          <AppPageTitle Icon={Target} title="Schlag den Raab" />
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Geschuetzter Bereich fuer besondere Spielmodule.
          </p>
        </div>

        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex-row items-center gap-4 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-foreground/15">
              <Target className="size-5" />
            </div>
            <div>
              <CardTitle className="text-xl">0 Spiele</CardTitle>
              <CardDescription className="text-primary-foreground/75">
                Wettbewerbe und Mini-Games
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </section>

      <EmptyState className="p-8">
        Aktuell liegen alle verfuegbaren Tools auf der Hauptseite.
      </EmptyState>
    </AppPage>
  )
}
