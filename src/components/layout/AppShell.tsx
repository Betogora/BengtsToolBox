import { Home, Menu, Target, type LucideIcon } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { diagnosticsApp } from '@/apps/registry'
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
    href: diagnosticsApp.href,
    label: diagnosticsApp.title,
    Icon: diagnosticsApp.Icon,
  },
  {
    href: '/schlag-den-rabe',
    label: 'Schlag den Raab',
    Icon: Target,
  },
]

export function AppShell() {
  return (
    <div className="min-h-svh">
      <header className="app-shell-header sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center">
            <span>
              <span className="block whitespace-nowrap text-sm font-semibold leading-none">
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
                    'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                    isActive && 'bg-secondary text-secondary-foreground',
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
                <Button variant="outline" size="icon" aria-label="Navigation">
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
