import { Check, Combine, PenLine, Plus, Smartphone, Trash2, UserPlus, UsersRound, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
import { PersonOption } from '@/apps/shared/components/PersonOption'
import { getAliases, maxVotingNameLength } from '@/apps/voting/logic'
import type { VotingDuplicateHint, VotingPerson, VotingPersonSource } from '@/apps/voting/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { DeleteButton } from '@/components/ui/DeleteButton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IftaInput } from '@/components/ui/ifta-field'
import { Tooltip } from '@/components/ui/tooltip'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { getReadableTextColor } from '@/lib/theme'
import { cn } from '@/lib/utils'

const sourceIcons: Record<VotingPersonSource, typeof Smartphone> = {
  self: Smartphone,
  admin: UserPlus,
  'write-in': PenLine,
}

const sourceLabels: Record<VotingPersonSource, TranslationKey> = {
  self: 'voting.people.sourceSelf',
  admin: 'voting.people.sourceAdmin',
  'write-in': 'voting.people.sourceWriteIn',
}

export function VotingPeopleCard({
  allPeople,
  choiceByVoterId,
  duplicateHints,
  onAdd,
  onColorChange,
  onDelete,
  onDeleteAll,
  onDismissHint,
  onMerge,
  onRename,
  onUnmerge,
  people,
  peopleById,
  showChoices,
}: {
  allPeople: VotingPerson[]
  choiceByVoterId: ReadonlyMap<string, string>
  duplicateHints: VotingDuplicateHint[]
  onAdd: (name: string) => Promise<boolean>
  onColorChange: (personId: string, color: string) => void
  onDelete: (personId: string) => void
  onDeleteAll: () => Promise<unknown>
  onDismissHint: (hint: VotingDuplicateHint) => void
  onMerge: (targetId: string, sourceIds: string[]) => Promise<boolean>
  onRename: (personId: string, name: string) => void
  onUnmerge: (personId: string) => void
  people: VotingPerson[]
  peopleById: ReadonlyMap<string, VotingPerson>
  showChoices: boolean
}) {
  const { t } = useI18n()
  const [newName, setNewName] = useState('')
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [mergeIds, setMergeIds] = useState<string[] | null>(null)
  const votedCount = people.filter((person) => choiceByVoterId.has(person.id)).length

  const submitNewName = async (event: FormEvent) => {
    event.preventDefault()
    if (!newName.trim()) return
    if (await onAdd(newName)) setNewName('')
  }

  const toggleSelected = (personId: string) =>
    setSelectedIds((current) =>
      current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId],
    )

  const stopSelecting = () => {
    setIsSelecting(false)
    setSelectedIds([])
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="flex min-h-11 min-w-0 flex-1 items-center gap-2">
            <UsersRound aria-hidden="true" className="size-5 text-primary" />
            <span className="type-action">{t('voting.people.title')}</span>
            <span className="type-caption tabular-nums text-muted-foreground">
              {t('voting.people.voted', { voted: votedCount, total: people.length })}
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={isSelecting ? 'secondary' : 'outline'}
              size="sm"
              disabled={people.length < 2}
              aria-pressed={isSelecting}
              onClick={() => (isSelecting ? stopSelecting() : setIsSelecting(true))}
            >
              {isSelecting ? <X /> : <Combine />}
              {isSelecting ? t('voting.people.cancelMerge') : t('voting.people.merge')}
            </Button>
            <ConfirmButton
              mode="dialog"
              title={t('voting.people.deleteAllTitle')}
              description={t('voting.people.deleteAllDescription')}
              confirmLabel={t('voting.people.deleteAll')}
              onConfirm={onDeleteAll}
              trigger={
                <Button variant="outline" size="sm" disabled={allPeople.length === 0} className="hover:text-destructive">
                  <Trash2 />
                  {t('voting.people.deleteAll')}
                </Button>
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {duplicateHints.length > 0 && !isSelecting && (
          <ul className="grid gap-2" aria-label={t('voting.people.hints')}>
            {duplicateHints.map((hint) => {
              const keep = peopleById.get(hint.keepId)
              const merge = peopleById.get(hint.mergeId)
              if (!keep || !merge) return null
              return (
                <li
                  key={`${hint.keepId}-${hint.mergeId}`}
                  data-voting-hint
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-primary/25 bg-primary-soft/60 px-3 py-2"
                >
                  <Combine aria-hidden="true" className="size-4 shrink-0 text-primary" />
                  <span className="type-ui min-w-0 flex-1">
                    {t('voting.people.hint', { first: merge.name, second: keep.name })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Button size="sm" onClick={() => setMergeIds([hint.keepId, hint.mergeId])}>
                      {t('voting.people.mergeShort')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDismissHint(hint)}>
                      {t('voting.people.dismissHint')}
                    </Button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {people.length === 0 ? (
          <EmptyState icon={UsersRound}>{t('voting.people.empty')}</EmptyState>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {people.map((person) => {
              const aliases = getAliases(allPeople, person.id)
              const choice = peopleById.get(choiceByVoterId.get(person.id) ?? '')
              const hasVoted = choiceByVoterId.has(person.id)
              const isSelected = selectedIds.includes(person.id)
              const SourceIcon = sourceIcons[person.source]

              return (
                <li
                  key={person.id}
                  data-voting-person={person.name}
                  className={cn(
                    'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 rounded-md border p-2 pl-3 transition-colors',
                    isSelecting && 'cursor-pointer',
                  )}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${person.color} ${isSelected ? 18 : 8}%, var(--card))`,
                    borderColor: isSelected ? person.color : undefined,
                    boxShadow: isSelected ? `inset 0 0 0 1px ${person.color}` : undefined,
                  }}
                  onClick={isSelecting ? () => toggleSelected(person.id) : undefined}
                >
                  {isSelecting ? (
                    <span
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={person.name}
                      tabIndex={0}
                      className="grid size-9 place-items-center rounded-full border-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      style={{
                        backgroundColor: isSelected ? person.color : 'var(--card)',
                        borderColor: person.color,
                        color: getReadableTextColor(person.color),
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== ' ' && event.key !== 'Enter') return
                        event.preventDefault()
                        toggleSelected(person.id)
                      }}
                    >
                      {isSelected && <Check className="size-4" strokeWidth={3} />}
                    </span>
                  ) : (
                    <ColorPicker
                      ariaLabel={t('voting.people.colorAria', { name: person.name })}
                      value={person.color}
                      onValueCommit={(color) => onColorChange(person.id, color)}
                    />
                  )}
                  <div className="min-w-0">
                    {isSelecting ? (
                      <span className="type-action block truncate py-1">{person.name}</span>
                    ) : (
                      <InlineTextEdit
                        ariaLabel={t('voting.people.nameAria', { name: person.name })}
                        className="type-action py-1"
                        fallback={person.name}
                        inputClassName="type-action h-11"
                        value={person.name}
                        onSave={(value) => onRename(person.id, value)}
                      />
                    )}
                    <div className="type-caption flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                      <Tooltip title={t(sourceLabels[person.source])}>
                        <span className="inline-flex items-center">
                          <SourceIcon aria-label={t(sourceLabels[person.source])} className="size-3.5" />
                        </span>
                      </Tooltip>
                      {hasVoted ? (
                        <span className="inline-flex min-w-0 items-center gap-1 text-success" data-voting-voted>
                          <Check aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={3} />
                          {showChoices && choice ? (
                            <span className="min-w-0 truncate">
                              {t('voting.people.choice')}{' '}
                              <span className="font-semibold text-foreground">{choice.name}</span>
                            </span>
                          ) : (
                            t('voting.people.hasVoted')
                          )}
                        </span>
                      ) : (
                        <span>{t('voting.people.notVoted')}</span>
                      )}
                    </div>
                    {aliases.length > 0 && (
                      <ul className="mt-1.5 flex flex-wrap gap-1" aria-label={t('voting.people.aliases', { name: person.name })}>
                        {aliases.map((alias) => (
                          <li
                            key={alias.id}
                            className="type-caption inline-flex items-center gap-0.5 rounded-full border bg-card py-0.5 pr-0.5 pl-2 text-muted-foreground"
                          >
                            {alias.name}
                            {!isSelecting && (
                              <button
                                type="button"
                                aria-label={t('voting.people.unmerge', { name: alias.name })}
                                className="grid size-5 place-items-center rounded-full hover:bg-muted hover:text-foreground"
                                onClick={() => onUnmerge(alias.id)}
                              >
                                <X className="size-3" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {!isSelecting && (
                    <ConfirmButton
                      mode="popover"
                      title={t('voting.people.deleteTitle')}
                      description={t('voting.people.deleteDescription', { name: person.name })}
                      onConfirm={() => onDelete(person.id)}
                      trigger={
                        <DeleteButton
                          tone="quiet"
                          className="size-11 sm:size-9"
                          aria-label={t('shared.playerCard.removeAria', { name: person.name })}
                        />
                      }
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {isSelecting ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/50 px-3 py-2">
            <span className="type-ui text-muted-foreground">
              {selectedIds.length < 2
                ? t('voting.people.selectHint')
                : t('voting.people.selected', { count: selectedIds.length })}
            </span>
            <Button disabled={selectedIds.length < 2} onClick={() => setMergeIds(selectedIds)}>
              <Combine />
              {t('voting.people.mergeSelected', { count: selectedIds.length })}
            </Button>
          </div>
        ) : (
          <form className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:max-w-md" onSubmit={submitNewName}>
            <IftaInput
              label={t('voting.people.addLabel')}
              maxLength={maxVotingNameLength}
              value={newName}
              onChange={(event) => setNewName(event.currentTarget.value)}
            />
            <Button type="submit" size="ifta" variant="outline" className="h-12" disabled={!newName.trim()}>
              <Plus />
              {t('voting.people.add')}
            </Button>
          </form>
        )}
      </CardContent>

      {mergeIds && (
        <VotingMergeDialog
          people={mergeIds.map((id) => peopleById.get(id)).filter((person): person is VotingPerson => Boolean(person))}
          onOpenChange={(open) => !open && setMergeIds(null)}
          onConfirm={async (targetId) => {
            if (!(await onMerge(targetId, mergeIds))) return
            setMergeIds(null)
            stopSelecting()
          }}
        />
      )}
    </Card>
  )
}

function VotingMergeDialog({
  onConfirm,
  onOpenChange,
  people,
}: {
  onConfirm: (targetId: string) => void
  onOpenChange: (open: boolean) => void
  people: VotingPerson[]
}) {
  const { t } = useI18n()
  const defaultTargetId = useMemo(
    () => (people.find((person) => person.source === 'self') ?? people[0])?.id ?? null,
    [people],
  )
  const [targetId, setTargetId] = useState(defaultTargetId)
  const target = people.find((person) => person.id === targetId)

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-4 sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle>{t('voting.merge.title')}</DialogTitle>
          <DialogDescription>{t('voting.merge.description')}</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label={t('voting.merge.keep')} className="grid gap-2">
          {people.map((person) => (
            <PersonOption
              key={person.id}
              checked={person.id === targetId}
              color={person.color}
              name={person.name}
              trailing={person.id === targetId ? t('voting.merge.keeps') : undefined}
              onSelect={() => setTargetId(person.id)}
            />
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!target} onClick={() => target && onConfirm(target.id)}>
            <Combine />
            {target ? t('voting.merge.confirm', { name: target.name }) : t('voting.people.merge')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
