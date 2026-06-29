import {
  BriefcaseBusiness,
  Home,
  Menu,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type NavigationItem = {
  href: string
  label: string
  Icon: LucideIcon
}

const navigationItems: readonly NavigationItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    Icon: Home,
  },
  {
    href: '/schlag-den-raab',
    label: 'Schlag den Raab',
    Icon: Target,
  },
]

export function AppShell() {
  return (
    <div className="min-h-svh">
      <header className="app-shell-header sticky top-0 z-40 px-3 py-2 sm:px-4">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-lg border bg-card/95 px-4 shadow-[0_18px_50px_-36px_rgba(6,52,79,0.65)] backdrop-blur sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[0_14px_30px_-18px_rgba(13,142,144,0.9)]">
              <BriefcaseBusiness className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="type-brand block whitespace-nowrap text-foreground">
                BengtsToolBox
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navigationItems.map(({ href, label, Icon }) => (
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
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" aria-label="Navigation">
                  <Menu className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {navigationItems.map(({ href, label, Icon }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link to={href} className="gap-2">
                      <Icon className="size-4" />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  )
}
