import { Home, Menu, Stethoscope, Target } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

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
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                  isActive && 'bg-secondary text-secondary-foreground',
                )
              }
            >
              <Home className="size-4" />
              Dashboard
            </NavLink>
            <NavLink
              to="/apps/diagnostics"
              className={({ isActive }) =>
                cn(
                  'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                  isActive && 'bg-secondary text-secondary-foreground',
                )
              }
            >
              <Stethoscope className="size-4" />
              Diagnose
            </NavLink>
            <NavLink
              to="/schlag-den-raab"
              className={({ isActive }) =>
                cn(
                  'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                  isActive && 'bg-secondary text-secondary-foreground',
                )
              }
            >
              <Target className="size-4" />
              Schlag den Raab
            </NavLink>
          </nav>

          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Navigation">
                  <Menu className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/" className="gap-2">
                    <Home className="size-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/apps/diagnostics" className="gap-2">
                    <Stethoscope className="size-4" />
                    Diagnose
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/schlag-den-raab" className="gap-2">
                    <Target className="size-4" />
                    Schlag den Raab
                  </Link>
                </DropdownMenuItem>
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
