import {
  Home,
  Menu,
  Target,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ColorSchemeSelector } from '@/components/layout/ColorSchemeSelector'
import { colorSchemeOptions } from '@/components/layout/colorSchemeOptions'
import { LanguageSelector } from '@/components/layout/LanguageSelector'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ColorScheme } from '@/lib/colorScheme'
import { useColorScheme } from '@/lib/colorScheme'
import type { TranslationKey } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useTrackLobbyDevice } from '@/lobbies/useTrackLobbyDevice'

type NavigationItem = {
  href: string
  labelKey: TranslationKey
  Icon: LucideIcon
}

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
  const { colorScheme, setColorScheme } = useColorScheme()
  const location = useLocation()
  const usesDefaultLobby =
    location.pathname.startsWith('/apps/') || location.pathname === '/schlag-den-raab'

  useTrackLobbyDevice(usesDefaultLobby ? 'default' : undefined)

  return (
    <div className="min-h-svh">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" aria-label={t('nav.menu')}>
                    <Menu className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {navigationItems.map(({ href, labelKey, Icon }) => (
                    <DropdownMenuItem key={href} asChild>
                      <Link to={href} className="gap-2">
                        <Icon className="size-4" />
                        {t(labelKey)}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="min-[360px]:hidden" />
                  <DropdownMenuRadioGroup
                    aria-label={t('colorScheme.selectorLabel')}
                    className="min-[360px]:hidden"
                    value={colorScheme}
                    onValueChange={(value) => setColorScheme(value as ColorScheme)}
                  >
                    {colorSchemeOptions.map(({ Icon, labelKey, value }) => (
                      <DropdownMenuRadioItem key={value} value={value} className="gap-2">
                        <Icon className="size-4" />
                        {t(labelKey)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
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
