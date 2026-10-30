import {
  Home,
  Menu,
  Target,
  UsersRound,
} from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ColorSchemeSelector } from '@/components/layout/ColorSchemeSelector'
import { LanguageSelector } from '@/components/layout/LanguageSelector'
import type { NavigationItem } from '@/components/layout/NavigationMenu'
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

export function AppShell() {
  const { t } = useI18n()
  const [menuRequest, setMenuRequest] = useState({ open: false, focus: false })
  const location = useLocation()
  const usesDefaultLobby =
    location.pathname.startsWith('/apps/') || location.pathname === '/schlag-den-raab'

  return (
    <div className="min-h-svh">
      <Suspense fallback={null}>
        <LazyLobbyDeviceTracker lobbyId={usesDefaultLobby ? 'default' : undefined} />
      </Suspense>
      <header className="app-shell-header sticky top-0 z-40 px-2 py-2 sm:px-4">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-1.5 rounded-lg border bg-card/95 px-2.5 shadow-[0_18px_50px_-36px_rgba(6,52,79,0.65)] backdrop-blur sm:gap-3 sm:px-6">
          <Link
            to="/"
            className="type-brand min-w-0 whitespace-nowrap rounded-md text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Bengts<span className="text-primary">Tool</span>Box
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Below 360px the header cannot fit both sliders next to the brand; the menu takes over. */}
            <ColorSchemeSelector className="max-[359px]:hidden" />
            <LanguageSelector />

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

            <div className="lg:hidden">
              <Suspense
                fallback={
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
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
        <Outlet />
      </main>
    </div>
  )
}
