import type { LucideIcon } from 'lucide-react'
import { Monitor, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type PresenterViewDefinition = {
  id: string
  label: string
  description?: string
  Icon: LucideIcon
  render: () => ReactNode
}

type PresenterLauncherProps = {
  appTitle: string
  buttonLabel?: string
  className?: string
  disabled?: boolean
  views: PresenterViewDefinition[]
}

function requestPresenterFullscreen() {
  if (!document.fullscreenEnabled || document.fullscreenElement) {
    return
  }

  void document.documentElement.requestFullscreen().catch(() => {
    // The overlay remains usable when the browser blocks fullscreen.
  })
}

export function PresenterLauncher({
  appTitle,
  buttonLabel = 'Presenter',
  className,
  disabled,
  views,
}: PresenterLauncherProps) {
  const launcherRef = useRef<HTMLButtonElement>(null)
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [isChooserOpen, setIsChooserOpen] = useState(false)
  const activeView = useMemo(
    () => views.find((view) => view.id === activeViewId) ?? null,
    [activeViewId, views],
  )
  const hasViews = views.length > 0
  const isDisabled = disabled || !hasViews

  const restoreFocus = useCallback(() => {
    window.requestAnimationFrame(() => {
      launcherRef.current?.focus()
    })
  }, [])

  const startView = (viewId: string) => {
    requestPresenterFullscreen()
    setActiveViewId(viewId)
    setIsChooserOpen(false)
  }

  const stopPresenter = useCallback(() => {
    setActiveViewId(null)

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined)
    }

    restoreFocus()
  }, [restoreFocus])

  useEffect(() => {
    if (!activeView) {
      return undefined
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setActiveViewId(null)
        restoreFocus()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [activeView, restoreFocus])

  const handleLaunch = () => {
    if (isDisabled) {
      return
    }

    if (views.length === 1) {
      startView(views[0].id)
      return
    }

    setIsChooserOpen(true)
  }

  return (
    <>
      <Button
        ref={launcherRef}
        className={className}
        disabled={isDisabled}
        type="button"
        variant="outline"
        onClick={handleLaunch}
      >
        <Monitor className="size-4" />
        {buttonLabel}
      </Button>

      <Dialog open={isChooserOpen} onOpenChange={setIsChooserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Presenter-Ansicht waehlen</DialogTitle>
            <DialogDescription>
              Waehle, welche Ausgabe im Fullscreen angezeigt wird.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {views.map((view) => {
              const Icon = view.Icon

              return (
                <Button
                  key={view.id}
                  className="h-auto justify-start whitespace-normal p-3 text-left"
                  type="button"
                  variant="outline"
                  onClick={() => startView(view.id)}
                >
                  <Icon className="size-5 shrink-0 text-primary" />
                  <span className="grid min-w-0 gap-1">
                    <span className="font-semibold leading-tight">
                      {view.label}
                    </span>
                    {view.description && (
                      <span className="text-xs font-normal leading-snug text-muted-foreground">
                        {view.description}
                      </span>
                    )}
                  </span>
                </Button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {activeView && (
        <PresenterStage
          appTitle={appTitle}
          view={activeView}
          onExit={stopPresenter}
        />
      )}
    </>
  )
}

function PresenterStage({
  appTitle,
  onExit,
  view,
}: {
  appTitle: string
  onExit: () => void
  view: PresenterViewDefinition
}) {
  const exitButtonRef = useRef<HTMLButtonElement>(null)
  const ViewIcon = view.Icon

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    exitButtonRef.current?.focus({ preventScroll: true })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) {
        event.preventDefault()
        onExit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onExit])

  return (
    <div
      aria-label={`${appTitle} Presenter`}
      aria-modal="true"
      className="fixed inset-0 z-[100] overflow-auto bg-background text-foreground"
      role="dialog"
    >
      <div className="flex min-h-svh flex-col">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ViewIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-muted-foreground">
                {appTitle}
              </div>
              <h1 className="truncate text-xl font-semibold leading-tight tracking-normal">
                {view.label}
              </h1>
            </div>
          </div>
          <Button
            ref={exitButtonRef}
            aria-label="Presenter beenden"
            className="shrink-0"
            type="button"
            variant="outline"
            onClick={onExit}
          >
            <X className="size-4" />
            Beenden
          </Button>
        </header>
        <main
          className={cn(
            'mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8',
          )}
        >
          {view.render()}
        </main>
      </div>
    </div>
  )
}
