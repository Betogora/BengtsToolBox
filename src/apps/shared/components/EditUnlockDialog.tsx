import { useState, type FormEvent } from 'react'
import { LockKeyholeOpen } from 'lucide-react'

import type { EditUnlock } from '@/apps/shared/useEditUnlock'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IftaInput } from '@/components/ui/ifta-field'
import { useI18n } from '@/lib/i18n'

const errorId = 'edit-unlock-error'

/** Fragt die Bearbeitungs-PIN ab, sobald eine geschützte Änderung darauf wartet. */
export function EditUnlockDialog({ editUnlock }: { editUnlock: EditUnlock }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const reset = () => {
    setValue('')
    setError(false)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    // Der Dialog kann innerhalb eines anderen Formulars liegen.
    event.stopPropagation()
    if (!editUnlock.submit(value)) {
      setError(true)
      return
    }
    reset()
  }

  return (
    <Dialog
      open={editUnlock.isPrompting}
      onOpenChange={(open) => {
        if (open) return
        reset()
        editUnlock.cancel()
      }}
    >
      <DialogContent className="gap-5 p-4 sm:max-w-sm sm:p-6">
        <DialogHeader>
          <DialogTitle>{t('editUnlock.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('editUnlock.description')}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-1.5">
            <IftaInput
              autoComplete="off"
              autoFocus
              aria-invalid={error}
              aria-describedby={error ? errorId : undefined}
              inputMode="numeric"
              label={t('editUnlock.pin')}
              type="password"
              value={value}
              onChange={(event) => {
                setValue(event.currentTarget.value)
                setError(false)
              }}
            />
            {error && (
              <p id={errorId} className="type-label text-destructive">
                {t('editUnlock.error')}
              </p>
            )}
          </div>
          <Button type="submit" className="h-11">
            <LockKeyholeOpen />
            {t('raab.unlock')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
