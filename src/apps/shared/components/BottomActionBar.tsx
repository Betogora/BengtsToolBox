import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

// Mobil sitzt die eine Primäraktion einer Ansicht unten angeheftet.
// Die Seite braucht darunter genug Abstand (z. B. pb-28), damit nichts verdeckt wird.
export function BottomActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-slot="bottom-action-bar"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur',
        className,
      )}
    >
      <div className="mx-auto max-w-xl">{children}</div>
    </div>
  )
}
