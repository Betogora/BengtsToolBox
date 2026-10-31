import { ArrowRight, Plus, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { PersonOption } from '@/apps/shared/components/PersonOption'
import type { VotingCandidateChoice } from '@/apps/voting/hooks/useVoting'
import {
  findPersonIdByName,
  maxVotingNameLength,
  normalizeVotingName,
  sanitizeVotingName,
} from '@/apps/voting/logic'
import type { VotingPerson } from '@/apps/voting/types'
import { Button } from '@/components/ui/button'
import { ColorPicker } from '@/components/ui/ColorPicker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IftaInput } from '@/components/ui/ifta-field'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type EntryStep = 'identity' | 'vote'

const selectedStyle = (color: string) => ({
  backgroundColor: `color-mix(in srgb, ${color} 12%, var(--card))`,
  borderColor: color,
  boxShadow: `inset 0 0 0 1px ${color}`,
})

// Zweistufige Eintragung: erst die eigene Person, dann die Stimme.
export function VotingEntryDialog({
  allPeople,
  currentChoiceId,
  initialStep,
  me,
  onOpenChange,
  onRegister,
  onVote,
  open,
  people,
  roundTitle,
  suggestedColor,
}: {
  allPeople: VotingPerson[]
  currentChoiceId: string | null
  initialStep: EntryStep
  me: VotingPerson | null
  onOpenChange: (open: boolean) => void
  onRegister: (name: string, color: string) => Promise<boolean>
  onVote: (choice: VotingCandidateChoice) => Promise<boolean>
  open: boolean
  people: VotingPerson[]
  roundTitle: string
  suggestedColor: string
}) {
  const { t } = useI18n()
  const [step, setStep] = useState<EntryStep>(initialStep)
  const [startedWithIdentity] = useState(initialStep === 'identity')
  const [name, setName] = useState('')
  const [color, setColor] = useState(suggestedColor)
  const [query, setQuery] = useState('')
  const [choice, setChoice] = useState<VotingCandidateChoice | null>(
    currentChoiceId ? { personId: currentChoiceId } : null,
  )
  const [isSaving, setIsSaving] = useState(false)

  const trimmedName = sanitizeVotingName(name)
  const matchedPerson = useMemo(() => {
    const id = trimmedName ? findPersonIdByName(allPeople, trimmedName) : null
    return id ? allPeople.find((person) => person.id === id) ?? null : null
  }, [allPeople, trimmedName])

  const normalizedQuery = normalizeVotingName(query)
  const filteredPeople = normalizedQuery
    ? people.filter((person) => normalizeVotingName(person.name).includes(normalizedQuery))
    : people
  const queryMatchId = normalizedQuery ? findPersonIdByName(allPeople, query) : null
  const writeInName = normalizedQuery && !queryMatchId ? sanitizeVotingName(query) : ''
  const chosenPerson =
    choice && 'personId' in choice ? people.find((person) => person.id === choice.personId) ?? null : null
  const chosenName = chosenPerson?.name ?? (choice && 'name' in choice ? choice.name : '')

  const submitIdentity = async (event: FormEvent) => {
    event.preventDefault()
    if (!trimmedName || isSaving) return
    setIsSaving(true)
    const didSave = await onRegister(trimmedName, color)
    setIsSaving(false)
    if (didSave) setStep('vote')
  }

  const submitVote = async () => {
    if (!choice || isSaving) return
    setIsSaving(true)
    const didSave = await onVote(choice)
    setIsSaving(false)
    if (didSave) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92svh,46rem)] flex-col gap-5 overflow-hidden p-4 sm:max-w-lg sm:p-6">
        <DialogHeader className="gap-2">
          {startedWithIdentity && (
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-1 w-8 rounded-full bg-primary" />
              <span className={cn('h-1 w-8 rounded-full', step === 'vote' ? 'bg-primary' : 'bg-muted')} />
            </div>
          )}
          <DialogTitle className="break-words">
            {step === 'identity' ? t('voting.entry.identityTitle') : roundTitle}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {step === 'identity' ? t('voting.entry.identityDescription') : t('voting.entry.voteDescription')}
          </DialogDescription>
        </DialogHeader>

        {step === 'identity' ? (
          <form className="grid gap-5" onSubmit={submitIdentity}>
            <div className="grid gap-2">
              {/* Farbe und Name in einer Zeile: Das Farbrad bietet alle Farben, die Vorschläge den schnellen Griff. */}
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                <ColorPicker
                  align="start"
                  ariaLabel={t('voting.entry.color')}
                  className="size-12 rounded-md p-1"
                  value={color}
                  onValueCommit={setColor}
                />
                <IftaInput
                  autoComplete="nickname"
                  autoFocus
                  enterKeyHint="next"
                  label={t('voting.entry.name')}
                  maxLength={maxVotingNameLength}
                  value={name}
                  onChange={(event) => setName(event.currentTarget.value)}
                />
              </div>
              {matchedPerson && (
                <p className="type-caption text-muted-foreground" role="status">
                  {matchedPerson.source === 'self'
                    ? t('voting.entry.nameTaken', { name: matchedPerson.name })
                    : t('voting.entry.nameKnown', { name: matchedPerson.name })}
                </p>
              )}
            </div>

            <Button type="submit" className="h-11 w-full" disabled={!trimmedName || isSaving}>
              {matchedPerson ? t('voting.entry.continueAs', { name: matchedPerson.name }) : t('voting.entry.continue')}
              <ArrowRight />
            </Button>
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="relative">
              <IftaInput
                autoComplete="off"
                enterKeyHint="search"
                label={t('voting.entry.search')}
                maxLength={maxVotingNameLength}
                className="pr-10"
                value={query}
                onChange={(event) => {
                  const nextQuery = event.currentTarget.value
                  setQuery(nextQuery)
                  const matchId = findPersonIdByName(allPeople, nextQuery)
                  if (matchId) setChoice({ personId: matchId })
                  else if (choice && 'name' in choice) setChoice(null)
                }}
              />
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle-foreground" />
            </div>

            <div
              role="radiogroup"
              aria-label={t('voting.entry.candidates')}
              className="-mx-1 grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto px-1 py-1"
            >
              {filteredPeople.map((person) => (
                <PersonOption
                  key={person.id}
                  checked={chosenPerson?.id === person.id}
                  color={person.color}
                  name={person.name}
                  trailing={person.id === me?.id ? t('voting.entry.you') : undefined}
                  onSelect={() => setChoice({ personId: person.id })}
                />
              ))}
              {writeInName && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={choice !== null && 'name' in choice}
                  className={cn(
                    'type-action col-span-2 flex min-h-12 min-w-0 items-center gap-2 rounded-md border border-dashed bg-card px-3 text-left transition-colors',
                    !(choice && 'name' in choice) && 'hover:bg-muted',
                  )}
                  style={choice && 'name' in choice ? selectedStyle('var(--primary)') : undefined}
                  onClick={() => setChoice({ name: writeInName })}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                    <Plus className="size-3.5" strokeWidth={3} />
                  </span>
                  <span className="min-w-0 truncate">{t('voting.entry.addName', { name: writeInName })}</span>
                </button>
              )}
              {filteredPeople.length === 0 && !writeInName && (
                <p className="type-ui col-span-2 rounded-md border border-dashed p-5 text-center text-muted-foreground">
                  {t('voting.entry.noPeople')}
                </p>
              )}
            </div>

            <Button className="h-11 w-full shrink-0" disabled={!choice || isSaving} onClick={() => void submitVote()}>
              {choice ? (
                <>
                  {chosenPerson ? (
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full ring-2 ring-primary-foreground/80"
                      style={{ backgroundColor: chosenPerson.color }}
                    />
                  ) : (
                    <Plus aria-hidden="true" />
                  )}
                  <span className="min-w-0 truncate">{t('voting.entry.submit', { name: chosenName })}</span>
                </>
              ) : (
                t('voting.entry.choose')
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
