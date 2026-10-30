import { Menu, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { colorSchemeOptions } from '@/components/layout/colorSchemeOptions'
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

export type NavigationItem = {
  href: string
  labelKey: TranslationKey
  Icon: LucideIcon
}

type NavigationMenuProps = {
  items: readonly NavigationItem[]
  // Carry over a click or focus the placeholder trigger received before this chunk arrived.
  openOnMount: boolean
  focusOnMount: boolean
}

// Loaded outside the startup bundle; the shell renders an identical trigger until it is ready.
export function NavigationMenu({ items, openOnMount, focusOnMount }: NavigationMenuProps) {
  const { t } = useI18n()
  const { colorScheme, setColorScheme } = useColorScheme()
  const triggerRef = useRef<HTMLButtonElement>(null)
  // Only the state at the moment of the swap matters; an opening menu moves focus itself.
  const [focusTrigger] = useState(focusOnMount && !openOnMount)

  useEffect(() => {
    if (focusTrigger) triggerRef.current?.focus()
  }, [focusTrigger])

  return (
    <DropdownMenu defaultOpen={openOnMount}>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="secondary" size="icon" aria-label={t('nav.menu')}>
          <Menu className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map(({ href, labelKey, Icon }) => (
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
  )
}
