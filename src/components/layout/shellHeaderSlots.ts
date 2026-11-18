import { createContext, useContext } from 'react'

// Ziele in der TopBar, in die eine App-Seite Titel und Aktionen legt. Ohne Shell (Katalog, Presenter) gibt es keine.
export type ShellHeaderSlots = {
  title: HTMLElement | null
  actions: HTMLElement | null
}

export const ShellHeaderSlotsContext = createContext<ShellHeaderSlots | null>(null)

export const useShellHeaderSlots = () => useContext(ShellHeaderSlotsContext)
