import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'

import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

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
  const { t } = useI18n()

  return (
    <ConfirmButton
      title={title}
      description={description}
      confirmLabel={t('common.reset')}
      onConfirm={onConfirm}
      trigger={
        <Button disabled={disabled} variant="outline" size="sm">
          <RotateCcw className="size-4" />
          {t('common.reset')}
        </Button>
      }
    >
      {children}
    </ConfirmButton>
  )
}
