import { useState, type FormEvent, type ReactNode } from 'react'
import { LockKeyhole, Target } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { IftaInput } from '@/components/ui/ifta-field'
import { useI18n } from '@/lib/i18n'

const unlockKey = 'bengts-toolbox:schlag-den-raab:unlocked'
const password = '5340'

function isUnlocked() {
  try {
    return window.sessionStorage.getItem(unlockKey) === 'true'
  } catch {
    return false
  }
}

function unlockSession() {
  window.sessionStorage.setItem(unlockKey, 'true')
}

export function SchlagDenRaabGate({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [isAllowed, setIsAllowed] = useState(isUnlocked)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (inputValue === password) {
      unlockSession()
      setIsAllowed(true)
      setError('')
      return
    }

    setError(t('raab.passwordError'))
  }

  if (isAllowed) {
    return <>{children}</>
  }

  return (
    <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-6xl items-center px-4 py-8 sm:px-6">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Target className="size-6" />
          </div>
          <CardTitle className="type-section-title">Schlag den Raab</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div>
              <IftaInput
                id="schlag-den-raab-password"
                label={t('raab.password')}
                autoComplete="current-password"
                autoFocus
                type="password"
                value={inputValue}
                onChange={(event) => {
                  setInputValue(event.currentTarget.value)
                  setError('')
                }}
              />
              {error && (
                <p className="type-label text-destructive">{error}</p>
              )}
            </div>
            <Button type="submit">
              <LockKeyhole className="size-4" />
              {t('raab.unlock')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
