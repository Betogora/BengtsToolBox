import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'

import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { Button } from '@/components/ui/button'

export function AppResetButton({
  children,
  description,
  disabled,
  onConfirm,
  title,
}: {
  children?: ReactNode
  description: string
  disabled?: boolean
  onConfirm: () => void | Promise<void>
  title: string
}) {
  return (
    <ConfirmButton
      title={title}
      description={description}
      confirmLabel="Reset"
      onConfirm={onConfirm}
      trigger={
        <Button disabled={disabled} variant="outline" size="sm">
          <RotateCcw className="size-4" />
          Reset
        </Button>
      }
    >
      {children}
    </ConfirmButton>
  )
}
