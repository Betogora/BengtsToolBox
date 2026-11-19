import type { LucideIcon } from 'lucide-react'
import { createContext, useContext } from 'react'

// Eintrag, den eine App-Seite unter sm ins Navigationsmenü legt (etwa den Presenter).
export type ShellMenuAction = {
  id: string
  label: string
  Icon: LucideIcon
  disabled?: boolean
  // Erhält den Menü-Button, zu dem der Fokus danach zurückkehren soll.
  onSelect: (returnFocusTo: HTMLElement | null) => void
}

// Ziele in der TopBar, in die eine App-Seite Titel, Aktionen und Menüeinträge legt.
// Ohne Shell (Katalog, Presenter) gibt es keine.
export type ShellHeaderSlots = {
  title: HTMLElement | null
  actions: HTMLElement | null
  // Meldet einen Menüeintrag an oder aktualisiert ihn; die Rückgabe meldet ihn wieder ab.
  registerMenuAction: (action: ShellMenuAction) => () => void
}

export const ShellHeaderSlotsContext = createContext<ShellHeaderSlots | null>(null)

export const useShellHeaderSlots = () => useContext(ShellHeaderSlotsContext)
