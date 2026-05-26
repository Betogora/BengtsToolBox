import { useState, type FormEvent, type ReactNode } from 'react'
import { LockKeyhole, Target } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const unlockKey = 'bengts-toolbox:schlag-den-rabe:unlocked'
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

export function SchlagDenRabeGate({ children }: { children: ReactNode }) {
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

    setError('Das Passwort ist nicht korrekt.')
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
          <CardTitle className="text-2xl">Schlag den Raab</CardTitle>
          <CardDescription>
            Dieser Bereich ist mit einem einfachen Passwort geschützt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="schlag-den-rabe-password">Passwort</Label>
              <Input
                id="schlag-den-rabe-password"
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
                <p className="text-sm font-medium text-destructive">{error}</p>
              )}
            </div>
            <Button type="submit">
              <LockKeyhole className="size-4" />
              Freischalten
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
