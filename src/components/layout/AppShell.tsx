import {
  ArrowLeft,
  Home,
  Menu,
  Target,
  UsersRound,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { registeredApps } from '@/apps/registry'
import { Button } from '@/components/ui/button'
import { ColorSchemeToggle } from '@/components/layout/ColorSchemeToggle'
import { LanguageSelector } from '@/components/layout/LanguageSelector'
import type { NavigationItem } from '@/components/layout/NavigationMenu'
import { ShellHeaderSlotsContext } from '@/components/layout/shellHeaderSlots'
import { ShellTitle } from '@/components/layout/ShellTitle'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// Firebase stays out of the startup bundle but starts loading immediately, so sign-in does not wait for the first render.
const lobbyDeviceTrackerImport = import('@/lobbies/LobbyDeviceTracker')
const LazyLobbyDeviceTracker = lazy(() =>
  lobbyDeviceTrackerImport.then(({ LobbyDeviceTracker }) => ({
    default: LobbyDeviceTracker,
  })),
)

// The dropdown (Radix menu and positioning) stays out of the startup bundle and loads right away.
const navigationMenuImport = import('@/components/layout/NavigationMenu')
const LazyNavigationMenu = lazy(() =>
  navigationMenuImport.then(({ NavigationMenu }) => ({
    default: NavigationMenu,
  })),
)

const navigationItems: readonly NavigationItem[] = [
  {
    href: '/',
    labelKey: 'nav.dashboard',
    Icon: Home,
  },
  {
    href: '/schlag-den-raab',
    labelKey: 'nav.schlagDenRaab',
    Icon: Target,
  },
  {
    href: '/lobbies',
    labelKey: 'nav.lobbies',
    Icon: UsersRound,
  },
]

// Hubs zeigen die Marke; jede andere Seite trägt ihren Titel in einer schmalen TopBar.
const hubPathPattern = /^\/(schlag-den-raab|lobbies\/[^/]+)?\/?$/

const parentHubPath = (pathname: string) =>
  pathname.match(/^\/lobbies\/[^/]+(?=\/.)/)?.[0] ??
  (pathname.startsWith('/schlag-den-raab/')
    ? '/schlag-den-raab'
    : pathname.startsWith('/lobby-admin')
      ? '/lobbies'
      : '/')

// App einer Route, auch innerhalb einer Lobby; liefert der Leiste den Titel, solange die Seite lädt oder gesperrt ist.
const appForPath = (pathname: string) => {
  const path = pathname.replace(/^\/lobbies\/[^/]+/, '')
  return registeredApps.find((app) => path === `/${app.routePath}` || path.startsWith(`/${app.routePath}/`))
}

// Blendet die TopBar beim Herunterscrollen aus und beim Hochscrollen sofort wieder ein.
// Der Zustand gilt nur für die Seite, auf der gescrollt wurde: Nach einem Routenwechsel steht die Leiste wieder.
function useHiddenOnScrollDown(headerRef: RefObject<HTMLElement | null>, pathname: string) {
  const [hiddenOnPath, setHiddenOnPath] = useState<string | null>(null)

  useEffect(() => {
    // Auf den echten Scrollbereich begrenzt: Das Zurückfedern am Seitenende (iOS) zählt nicht als Hochscrollen.
    const scrollY = () =>
      Math.min(Math.max(window.scrollY, 0), document.documentElement.scrollHeight - window.innerHeight)
    let lastY = scrollY()
    const onScroll = () => {
      const y = scrollY()
      if (Math.abs(y - lastY) < 8) return
      // Mit Tastaturfokus in der Leiste bleibt sie stehen, sonst verlöre die Tastatur ihr Ziel.
      const hide = y > lastY && y > 96 && !headerRef.current?.matches(':has(:focus-visible)')
      setHiddenOnPath(hide ? pathname : null)
      lastY = y
    }
    // Wer per Shift+Tab rückwärts navigiert, bekommt die Leiste sofort zurück und erreicht sie so auch ohne
    // Hochscrollen. Vorwärts-Tab bleibt ohne Wirkung, damit die Leiste nicht über das nächste Ziel gleitet.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && event.shiftKey) setHiddenOnPath(null)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [headerRef, pathname])

  return hiddenOnPath === pathname
}

export function AppShell() {
  const { t } = useI18n()
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null)
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null)
  const headerRef = useRef<HTMLElement>(null)
  const [menuRequest, setMenuRequest] = useState({ open: false, focus: false })
  const location = useLocation()
  const isHidden = useHiddenOnScrollDown(headerRef, location.pathname)
  const usesDefaultLobby =
    location.pathname.startsWith('/apps/') || location.pathname.startsWith('/schlag-den-raab')
  const isCompact = !hubPathPattern.test(location.pathname)
  const fallbackApp = isCompact ? appForPath(location.pathname) : undefined
  const shellSlots = useMemo(
    () => (isCompact ? { title: titleSlot, actions: actionsSlot } : null),
    [isCompact, titleSlot, actionsSlot],
  )
  const shellOffset = isHidden ? '0px' : isCompact ? 'calc(3rem + 1px)' : '5rem'

  return (
    <div className="min-h-svh" style={{ '--shell-offset': shellOffset } as CSSProperties}>
      <Suspense fallback={null}>
        <LazyLobbyDeviceTracker lobbyId={usesDefaultLobby ? 'default' : undefined} />
      </Suspense>
      <header
        ref={headerRef}
        className={cn(
          'app-shell-header sticky top-0 z-40 px-2 transition-[translate,visibility] duration-200 motion-reduce:transition-none sm:px-4',
          isCompact ? 'border-b bg-card/95 backdrop-blur' : 'py-2',
          // Unsichtbar statt nur verschoben: außerhalb des Bildes weder fokussierbar noch überdeckend.
          isHidden && 'invisible -translate-y-full',
        )}
      >
        {/* Equal outer columns keep the navigation centred regardless of brand and control widths. */}
        <div
          className={cn(
            'mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
            isCompact
              ? 'h-12 px-1 sm:px-6'
              : 'h-16 rounded-lg border bg-card/95 px-2.5 shadow-[0_18px_50px_-36px_rgba(6,52,79,0.65)] backdrop-blur sm:px-6',
          )}
        >
          {isCompact ? (
            // Pfeil, Icon und Titel führen gemeinsam zurück zum Hub. Der Titel kommt per Portal aus der Seite;
            // in einem Link läge er in React außerhalb von dessen Klickbehandlung und löste einen vollen
            // Seitenaufruf aus. Deshalb spannt der Pfeil-Link seine Fläche über die ganze Gruppe.
            <div className="group relative flex min-w-0 max-w-full items-center gap-1 justify-self-start rounded-md text-foreground transition-colors hover:bg-secondary has-[[data-shell-title]]:pr-3 sm:-ml-2.5">
              <Link
                to={parentHubPath(location.pathname)}
                aria-label={t('common.back')}
                title={t('common.back')}
                className="grid size-10 shrink-0 place-items-center rounded-md text-muted-foreground outline-none transition-colors after:absolute after:inset-0 group-hover:text-primary"
              >
                <ArrowLeft aria-hidden="true" className="size-5" />
              </Link>
              <div ref={setTitleSlot} className="peer pointer-events-none min-w-0 empty:hidden" />
              {fallbackApp && (
                <ShellTitle
                  className="pointer-events-none hidden peer-empty:flex"
                  Icon={fallbackApp.Icon}
                  shortTitle={fallbackApp.shortTitleKey && t(fallbackApp.shortTitleKey)}
                  title={t(fallbackApp.titleKey)}
                />
              )}
            </div>
          ) : (
            <Link
              to="/"
              className="type-brand min-w-0 justify-self-start whitespace-nowrap rounded-md text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Bengts<span className="text-primary">Tool</span>Box
            </Link>
          )}

          <nav className="hidden items-center gap-1 lg:flex">
            {navigationItems.map(({ href, labelKey, Icon }) => (
              <NavLink
                key={href}
                to={href}
                className={({ isActive }) =>
                  cn(
                    'type-action inline-flex h-11 items-center gap-2 rounded-md px-4 text-foreground transition-colors hover:bg-secondary hover:text-primary',
                    isActive && 'bg-secondary text-primary',
                  )
                }
              >
                <Icon className="size-4" />
                {t(labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 justify-self-end sm:gap-2">
            {isCompact && <div ref={setActionsSlot} className="flex items-center gap-2 empty:hidden" />}
            {/* Unter sm stehen Sprache und Farbschema im Menü, damit Marke und Titel Platz haben. */}
            <div className="contents max-sm:hidden">
              <LanguageSelector />
              <ColorSchemeToggle />
            </div>

            <div className="lg:hidden">
              <Suspense
                fallback={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 text-foreground hover:bg-secondary hover:text-primary"
                    aria-label={t('nav.menu')}
                    aria-haspopup="menu"
                    aria-expanded={false}
                    data-state="closed"
                    // Same open gestures as the Radix trigger, recorded before the swap can split a click.
                    onPointerDown={(event) => {
                      if (event.button === 0 && !event.ctrlKey) setMenuRequest({ open: true, focus: true })
                    }}
                    onKeyDown={(event) => {
                      if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
                        event.preventDefault()
                        setMenuRequest({ open: true, focus: true })
                      }
                    }}
                    onFocus={() => setMenuRequest((request) => ({ ...request, focus: true }))}
                    onBlur={() => setMenuRequest((request) => ({ ...request, focus: false }))}
                  >
                    <Menu className="size-4" />
                  </Button>
                }
              >
                <LazyNavigationMenu
                  items={navigationItems}
                  openOnMount={menuRequest.open}
                  focusOnMount={menuRequest.focus}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </header>

      <main>
        <ShellHeaderSlotsContext.Provider value={shellSlots}>
          <Outlet />
        </ShellHeaderSlotsContext.Provider>
      </main>
    </div>
  )
}
