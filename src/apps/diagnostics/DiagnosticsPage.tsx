import {
  CheckCircle2,
  Cloud,
  Database,
  Play,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react'

import { useDiagnostics } from '@/apps/diagnostics/hooks/useDiagnostics'
import type { DiagnosticStatus } from '@/apps/diagnostics/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

const statusLabels: Record<DiagnosticStatus, string> = {
  error: 'Fehler',
  ok: 'OK',
  pending: 'Prüft',
  warn: 'Hinweis',
}

function getStatusClass(status: DiagnosticStatus) {
  if (status === 'ok') {
    return 'border-primary/20 bg-primary/10 text-primary'
  }

  if (status === 'error') {
    return 'border-destructive/30 bg-destructive/10 text-destructive'
  }

  if (status === 'warn') {
    return 'border-accent/30 bg-accent/15 text-accent-foreground'
  }

  return 'border-muted bg-muted text-muted-foreground'
}

function StatusIcon({ status }: { status: DiagnosticStatus }) {
  if (status === 'ok') {
    return <CheckCircle2 className="size-4" />
  }

  if (status === 'error' || status === 'warn') {
    return <TriangleAlert className="size-4" />
  }

  return <RefreshCw className="size-4" />
}

export function DiagnosticsPage() {
  const { authUid, checks, health, healthPath, isRunning, runChecks, status } =
    useDiagnostics()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <Badge variant={status === 'error' ? 'destructive' : 'default'} className="mb-4 gap-2">
            <Cloud className="size-3.5" />
            Plattform-Diagnose
          </Badge>
          <h1 className="text-4xl font-semibold tracking-normal text-foreground">
            Firebase- und Multi-Device-Checks
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Prüft Konfiguration, Anonymous Auth, Firestore-Lesen und Schreiben,
            Realtime-Snapshots und den lokalen Fallback der Toolbox.
          </p>
        </div>

        <Button onClick={() => void runChecks()} disabled={isRunning}>
          {isRunning ? <RefreshCw className="size-4" /> : <Play className="size-4" />}
          Checks starten
        </Button>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Database className="size-5 text-primary" />
              Shared State Test
            </CardTitle>
            <CardDescription>
              Öffne diese Seite in zwei Fenstern. Ein Klick auf Checks starten
              muss den Zähler und Zeitstempel in beiden Fenstern aktualisieren.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-secondary/45 p-4">
              <div className="text-sm text-muted-foreground">Firestore-Pfad</div>
              <div className="mt-1 break-all font-mono text-sm">{healthPath}</div>
            </div>
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4 border-b pb-3">
                <dt className="text-muted-foreground">Aktuelle UID</dt>
                <dd className="max-w-64 truncate font-mono">{authUid ?? 'Noch nicht angemeldet'}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <dt className="text-muted-foreground">Letzter Lauf</dt>
                <dd>{health?.checkedAt ?? 'Noch kein Firestore-Wert'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Write Count</dt>
                <dd className="text-lg font-semibold">{health?.writeCount ?? 0}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Checkliste</CardTitle>
            <CardDescription>
              Fehler hier zeigen meist auf fehlende GitHub-Secrets, nicht
              deployed Firestore Rules oder deaktivierte Anonymous Auth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {checks.map((check) => (
                <div
                  key={check.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border',
                      getStatusClass(check.status),
                    )}
                  >
                    <StatusIcon status={check.status} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{check.label}</div>
                      <Badge
                        variant={
                          check.status === 'error'
                            ? 'destructive'
                            : check.status === 'ok'
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {statusLabels[check.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {check.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
