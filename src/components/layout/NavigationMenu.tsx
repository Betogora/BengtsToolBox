import { Languages, Menu, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import type { ShellMenuAction } from '@/components/layout/shellHeaderSlots'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TranslationKey } from '@/lib/i18n'
import { useColorScheme } from '@/lib/colorScheme'
import { useI18n } from '@/lib/i18n'

export type NavigationItem = {
  href: string
  labelKey: TranslationKey
  Icon: LucideIcon
}

type NavigationMenuProps = {
  // Einträge der aktuellen App-Seite, etwa der Presenter; nur unter sm, darüber stehen sie in der TopBar.
  actions: readonly ShellMenuAction[]
  items: readonly NavigationItem[]
  // Carry over a click or focus the placeholder trigger received before this chunk arrived.
  openOnMount: boolean
  focusOnMount: boolean
}

// Loaded outside the startup bundle; the shell renders an identical trigger until it is ready.
export function NavigationMenu({ actions, items, openOnMount, focusOnMount }: NavigationMenuProps) {
  const { language, setLanguage, t } = useI18n()
  const { colorScheme, setColorScheme } = useColorScheme()
  const otherLanguage = language === 'de' ? 'en' : 'de'
  const isDark = colorScheme === 'dark'
  const SchemeIcon = isDark ? Sun : Moon
  const triggerRef = useRef<HTMLButtonElement>(null)
  // Only the state at the moment of the swap matters; an opening menu moves focus itself.
  const [focusTrigger] = useState(focusOnMount && !openOnMount)

  useEffect(() => {
    if (focusTrigger) triggerRef.current?.focus()
  }, [focusTrigger])

  return (
    <DropdownMenu defaultOpen={openOnMount}>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="ghost" size="icon" className="size-10 text-foreground hover:bg-secondary hover:text-primary" aria-label={t('nav.menu')}>
          <Menu className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map(({ href, labelKey, Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link to={href}>
              <Icon className="size-4" />
              {t(labelKey)}
            </Link>
          </DropdownMenuItem>
        ))}
        {/* Unter sm stehen Seitenaktionen, Sprache und Farbschema hier statt in der TopBar. */}
        <div className="sm:hidden">
          {actions.length > 0 && <DropdownMenuSeparator />}
          {actions.map(({ disabled, Icon, id, label, onSelect }) => (
            // Erst nach dem Schließen des Menüs öffnen, sonst kollidiert der Fokus mit einem folgenden Dialog.
            <DropdownMenuItem
              key={id}
              disabled={disabled}
              onSelect={() => {
                const trigger = triggerRef.current
                window.setTimeout(() => onSelect(trigger))
              }}
            >
              <Icon />
              {label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setLanguage(otherLanguage)}>
            <Languages />
            {/* „Englisch“ bzw. „Deutsch“ ist in beiden Sprachen ein deutsches Wort. */}
            <span lang="de">{t('nav.menuLanguage')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setColorScheme(isDark ? 'light' : 'dark')}>
            <SchemeIcon />
            {t(isDark ? 'nav.menuLightMode' : 'nav.menuDarkMode')}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
