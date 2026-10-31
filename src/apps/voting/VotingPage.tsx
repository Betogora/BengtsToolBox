import {
  Archive,
  ArrowRight,
  Drama,
  Eye,
  EyeOff,
  Flag,
  LockKeyhole,
  LockKeyholeOpen,
  RotateCcw,
  Undo2,
  UserRoundPen,
  Vote,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'

import { isAdminPassword, isAdminUnlocked, setAdminUnlocked } from '@/apps/shared/adminUnlock'
import { AppPage } from '@/apps/shared/components/AppPage'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
import { PersonChip } from '@/apps/shared/components/PersonChip'
import { PresenterLauncher } from '@/apps/shared/components/Presenter'
import { useVoting, type VotingCandidateChoice } from '@/apps/voting/hooks/useVoting'
import { pickNextColor } from '@/apps/voting/logic'
import type { VotingPerson, VotingRound, VotingTally } from '@/apps/voting/types'
import { VotingArchiveCard } from '@/apps/voting/VotingArchiveCard'
import { VotingEntryDialog } from '@/apps/voting/VotingEntryDialog'
import { VotingPeopleCard } from '@/apps/voting/VotingPeopleCard'
import { VotingResultList, VotingWinnerBanner } from '@/apps/voting/VotingResults'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IftaInput } from '@/components/ui/ifta-field'
import { QrCode } from '@/components/ui/QrCode'
import { QrCodeButton } from '@/components/ui/QrCodeButton'
import { Tooltip } from '@/components/ui/tooltip'
import { useI18n } from '@/lib/i18n'
import { syncErrorMessageKey } from '@/lib/firebase/syncError'
import { cn } from '@/lib/utils'

const unlockKey = 'bengts-toolbox:voting:unlocked'

function VoterChips({ people, tally }: { people: VotingPerson[]; tally: VotingTally }) {
  const { t } = useI18n()
  const voters = people.filter((person) => tally.choiceByVoterId.has(person.id))

  if (voters.length === 0) return null

  return (
    <div className="grid min-w-0 grid-cols-1 gap-2">
      <p className="type-label text-muted-foreground">{t('voting.votersSoFar')}</p>
      <ul className="flex flex-wrap gap-1.5" aria-label={t('voting.votersSoFar')}>
        {voters.map((person) => (
          <li key={person.id} className="min-w-0 max-w-full">
            <PersonChip color={person.color} name={person.name} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function VotingPresenter({
  people,
  qrValue,
  round,
  tally,
}: {
  people: VotingPerson[]
  qrValue: string
  round: VotingRound
  tally: VotingTally
}) {
  const { t } = useI18n()

  if (round.status === 'closed') {
    return (
      <div className="mx-auto grid w-full max-w-4xl gap-5">
        <h2 className="type-section-title text-center text-muted-foreground">{round.title}</h2>
        <VotingWinnerBanner ballotCount={tally.ballotCount} results={tally.results} size="large" />
        <VotingResultList
          ballotCount={tally.ballotCount}
          results={tally.results}
          showVoters={round.votersVisible}
          size="large"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-8 md:min-h-[70svh] md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] md:gap-12">
      <div className="mx-auto w-full max-w-[min(26rem,52vh)] rounded-2xl border bg-white p-4 shadow-[0_24px_60px_-36px_rgba(6,52,79,0.6)]">
        <QrCode label={t('voting.qrAlt')} value={qrValue} className="w-full" />
      </div>
      <div className="grid min-w-0 content-center gap-5 text-center md:text-left">
        <p className="type-label text-primary">{t('voting.presenter.scan')}</p>
        <h2 className="type-page-title break-words sm:text-6xl">{round.title}</h2>
        <p className="flex items-baseline justify-center gap-3 md:justify-start">
          <span className="type-metric-xl tabular-nums text-primary">{tally.ballotCount}</span>
          <span className="type-section-title text-muted-foreground">{t('voting.presenter.cast')}</span>
        </p>
        <VoterChips people={people} tally={tally} />
      </div>
    </div>
  )
}

function AdminLockButton({ isAdmin, onChange }: { isAdmin: boolean; onChange: (isAdmin: boolean) => void }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!isAdminPassword(value)) {
      setError(true)
      return
    }
    onChange(true)
    setOpen(false)
    setValue('')
    toast.success(t('voting.admin.unlocked'))
  }

  return (
    <>
      <Tooltip side="bottom" title={isAdmin ? t('voting.admin.lock') : t('voting.admin.unlock')}>
        <Button
          size="icon"
          variant={isAdmin ? 'secondary' : 'outline'}
          aria-label={isAdmin ? t('voting.admin.lock') : t('voting.admin.unlock')}
          aria-pressed={isAdmin}
          className={cn(isAdmin && 'text-primary')}
          onClick={() => (isAdmin ? onChange(false) : setOpen(true))}
        >
          {isAdmin ? <LockKeyholeOpen /> : <LockKeyhole />}
        </Button>
      </Tooltip>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          setError(false)
          setValue('')
        }}
      >
        <DialogContent className="gap-5 p-4 sm:max-w-sm sm:p-6">
          <DialogHeader>
            <DialogTitle>{t('voting.admin.title')}</DialogTitle>
            <DialogDescription className="sr-only">{t('voting.admin.description')}</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-1.5">
              <IftaInput
                autoComplete="current-password"
                autoFocus
                aria-invalid={error}
                aria-describedby={error ? 'voting-password-error' : undefined}
                inputMode="numeric"
                label={t('raab.password')}
                type="password"
                value={value}
                onChange={(event) => {
                  setValue(event.currentTarget.value)
                  setError(false)
                }}
              />
              {error && (
                <p id="voting-password-error" className="type-label text-destructive">
                  {t('raab.passwordError')}
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
    </>
  )
}

export function VotingPage() {
  const { t } = useI18n()
  const location = useLocation()
  const voting = useVoting()
  const {
    activeRound,
    allPeople,
    archivedRounds,
    error,
    isLoading,
    isRealtime,
    me,
    myChoice,
    people,
    peopleById,
    tally,
  } = voting
  const [isAdmin, setIsAdmin] = useState(() => isAdminUnlocked(unlockKey))
  const [isPeeking, setIsPeeking] = useState(false)
  // Der Schlüssel setzt den Dialog bei jedem Öffnen auf den Ausgangszustand zurück.
  const [entry, setEntry] = useState({ key: 0, open: false, step: 'identity' as 'identity' | 'vote' })
  const autoOpened = useRef(false)
  const appTitle = t('app.voting.title')
  const qrValue = `${window.location.origin}${location.pathname}`
  const isOpen = activeRound.status === 'open'
  const showAdminResults = isAdmin && isPeeking

  const openEntry = (step: 'identity' | 'vote') =>
    setEntry((current) => ({ key: current.key + 1, open: true, step }))

  // Neue Geräte landen direkt in der Eintragung, solange die Abstimmung läuft.
  useEffect(() => {
    if (autoOpened.current || isLoading || isAdmin || !isOpen || me) return
    autoOpened.current = true
    openEntry('identity')
  }, [isAdmin, isLoading, isOpen, me])

  const changeAdmin = (nextIsAdmin: boolean) => {
    setAdminUnlocked(unlockKey, nextIsAdmin)
    setIsAdmin(nextIsAdmin)
    if (!nextIsAdmin) setIsPeeking(false)
  }

  const register = async (name: string, color: string) => {
    const result = await voting.register(name, color)
    if (!result.ok) toast.error(t('common.syncError'))
    return result.ok && result.value !== null
  }

  const castVote = async (choice: VotingCandidateChoice) => {
    const result = await voting.castVote(choice)
    if (!result.ok || !result.value) {
      toast.error(result.ok ? t('voting.closedError') : t('common.syncError'))
      return false
    }
    const name = 'name' in choice ? choice.name : peopleById.get(result.value)?.name ?? ''
    toast.success(t('voting.saved', { name }))
    return true
  }

  const runAdminAction = async (action: () => Promise<{ ok: boolean }>, success?: string) => {
    const result = await action()
    if (!result.ok) {
      toast.error(t('common.syncError'))
      return false
    }
    if (success) toast.success(success)
    return true
  }

  const primaryAction = (() => {
    if (!isOpen) return null
    if (!me) {
      return (
        <Button className="h-12 w-full sm:w-auto sm:min-w-56" disabled={isLoading} onClick={() => openEntry('identity')}>
          <Vote />
          {t('voting.join')}
        </Button>
      )
    }
    return (
      <Button
        className="h-12 w-full sm:w-auto sm:min-w-56"
        variant={myChoice ? 'outline' : 'default'}
        onClick={() => openEntry('vote')}
      >
        {myChoice ? <UserRoundPen /> : <Vote />}
        {myChoice ? t('voting.changeVote') : t('voting.vote')}
        {!myChoice && <ArrowRight />}
      </Button>
    )
  })()

  return (
    <AppPage width="wide">
      <section className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3">
        <AppPageTitle Icon={Drama}>
          <h1 className="type-page-title min-w-0 break-words max-[359px]:text-[1.75rem]">{appTitle}</h1>
        </AppPageTitle>
        <div className="flex items-center gap-2 justify-self-end">
          <div className="hidden items-center gap-2 sm:flex">
            {!isRealtime && <Badge variant="outline">{t('liveBuzzer.localOnly')}</Badge>}
            <PresenterLauncher
              appTitle={appTitle}
              views={[
                {
                  id: 'live',
                  label: t('voting.presenter.live'),
                  Icon: Vote,
                  render: () => (
                    <VotingPresenter people={people} qrValue={qrValue} round={activeRound} tally={tally} />
                  ),
                },
              ]}
            />
          </div>
          <div className="hidden sm:block">
            <AdminLockButton isAdmin={isAdmin} onChange={changeAdmin} />
          </div>
          <QrCodeButton
            className="size-14 p-1.5 sm:size-[72px] sm:p-2"
            label={t('voting.qrAlt')}
            openLabel={t('dashboard.qrOpen')}
            value={qrValue}
          />
        </div>
      </section>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>{t('common.firebaseError')}</CardTitle>
            <CardDescription>{t(syncErrorMessageKey(error))}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-6">
        <Card className="min-w-0" data-voting-round>
          <CardContent className="grid grid-cols-1 gap-6 p-5 sm:p-7">
            <div className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
              {isOpen ? (
                <Badge dot>{t('voting.status.open')}</Badge>
              ) : (
                <Badge variant="secondary">{t('voting.status.closed')}</Badge>
              )}
              <span className="type-caption tabular-nums text-muted-foreground" data-voting-ballots>
                {t('voting.ballotCount', { count: tally.ballotCount })}
              </span>
              {me && (
                <span className="type-caption flex min-w-0 items-center gap-1.5 text-muted-foreground" data-voting-me>
                  <span aria-hidden="true" className="hidden sm:inline">·</span>
                  {t('voting.youAre')}
                  <PersonChip color={me.color} name={me.name} />
                </span>
              )}
              </div>
              {/* Auf dem Handy bleibt neben Titel und QR-Code kein Platz für das Schloss. */}
              <div className="shrink-0 sm:hidden">
                <AdminLockButton isAdmin={isAdmin} onChange={changeAdmin} />
              </div>
            </div>

            <div className="grid gap-1">
              <p className="type-label text-muted-foreground">{t('voting.question')}</p>
              {isAdmin ? (
                <InlineTextEdit
                  ariaLabel={t('voting.titleAria')}
                  className="type-page-title"
                  fallback={activeRound.title}
                  inputClassName="type-section-title h-12"
                  value={activeRound.title}
                  onSave={(value) => voting.updateRoundTitle(value)}
                />
              ) : (
                <h2 className="type-page-title break-words">{activeRound.title}</h2>
              )}
            </div>

            <div className="grid gap-4 rounded-lg border bg-background/70 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="grid min-w-0 gap-1.5">
                {me ? (
                  <>
                    <span className="type-caption text-muted-foreground">
                      {myChoice ? t('voting.yourVote') : t('voting.youAre')}
                    </span>
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      {myChoice ? (
                        <PersonChip color={myChoice.color} name={myChoice.name} />
                      ) : (
                        <PersonChip color={me.color} name={me.name} />
                      )}
                    </span>
                  </>
                ) : (
                  <span className="type-ui text-muted-foreground">
                    {isOpen ? t('voting.notJoined') : t('voting.closedNotice')}
                  </span>
                )}
                {me && !isOpen && !myChoice && (
                  <span className="type-caption text-muted-foreground">{t('voting.closedNotice')}</span>
                )}
              </div>
              {primaryAction}
            </div>

            {me && (
              <button
                type="button"
                className="type-caption -mt-3 w-fit text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => {
                  voting.forgetIdentity()
                  if (isOpen) openEntry('identity')
                }}
              >
                {t('voting.switchPerson', { name: me.name })}
              </button>
            )}

            {isAdmin && (
              <div className="grid gap-2 border-t pt-5 sm:flex sm:flex-wrap sm:items-center" data-voting-admin>
                {isOpen ? (
                  <Button
                    onClick={() => void runAdminAction(voting.closeRound, t('voting.admin.closed'))}
                  >
                    <Flag />
                    {t('voting.admin.close')}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => void runAdminAction(voting.reopenRound)}>
                    <Undo2 />
                    {t('voting.admin.reopen')}
                  </Button>
                )}
                {isOpen ? (
                  <Button variant="outline" aria-pressed={isPeeking} onClick={() => setIsPeeking((current) => !current)}>
                    {isPeeking ? <EyeOff /> : <Eye />}
                    {isPeeking ? t('voting.admin.hideInterim') : t('voting.admin.showInterim')}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    aria-pressed={activeRound.votersVisible}
                    onClick={() => void runAdminAction(() => voting.setVotersVisible(!activeRound.votersVisible))}
                  >
                    {activeRound.votersVisible ? <EyeOff /> : <Eye />}
                    {activeRound.votersVisible ? t('voting.admin.hideVoters') : t('voting.admin.showVoters')}
                  </Button>
                )}
                <ConfirmButton
                  mode="dialog"
                  title={t('voting.admin.newRoundTitle')}
                  description={t('voting.admin.newRoundDescription')}
                  confirmLabel={t('voting.admin.newRound')}
                  onConfirm={() => runAdminAction(voting.startNewRound, t('voting.admin.newRoundSuccess'))}
                  trigger={
                    <Button variant="outline" className="sm:ml-auto">
                      <RotateCcw />
                      {t('voting.admin.newRound')}
                    </Button>
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 gap-4" data-voting-results>
          <CardHeader>
            <h2 className="type-section-title">
              {isOpen ? (showAdminResults ? t('voting.result.interim') : t('voting.result.pending')) : t('voting.result.title')}
            </h2>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            {!isOpen || showAdminResults ? (
              tally.results.length === 0 ? (
                <EmptyState>{t('voting.result.empty')}</EmptyState>
              ) : (
                <>
                  {!isOpen && <VotingWinnerBanner ballotCount={tally.ballotCount} results={tally.results} />}
                  <VotingResultList
                    ballotCount={tally.ballotCount}
                    results={tally.results}
                    showVoters={isAdmin || activeRound.votersVisible}
                  />
                </>
              )
            ) : (
              <>
                <EmptyState icon={EyeOff}>{t('voting.result.hidden')}</EmptyState>
                <VoterChips people={people} tally={tally} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <VotingPeopleCard
          allPeople={allPeople}
          choiceByVoterId={tally.choiceByVoterId}
          duplicateHints={voting.duplicateHints}
          people={people}
          peopleById={peopleById}
          showChoices={isPeeking || !isOpen}
          onAdd={(name) => runAdminAction(() => voting.addPerson(name), t('voting.people.added'))}
          onColorChange={(personId, color) => void voting.recolorPerson(personId, color)}
          onDelete={(personId) => void runAdminAction(() => voting.deletePerson(personId))}
          onDeleteAll={() => runAdminAction(voting.deleteAllPeople, t('voting.people.deletedAll'))}
          onDismissHint={(hint) => void voting.dismissDuplicateHint(hint)}
          onMerge={(targetId, sourceIds) =>
            runAdminAction(() => voting.mergePeople(targetId, sourceIds), t('voting.merge.success'))
          }
          onRename={(personId, name) => void voting.renamePerson(personId, name)}
          onUnmerge={(personId) => void runAdminAction(() => voting.unmergePerson(personId))}
        />
      )}

      <Card>
        <CardHeader>
          <h2 className="flex min-h-11 items-center gap-2">
            <Archive aria-hidden="true" className="size-5 text-primary" />
            <span className="type-action">{t('voting.archive.title')}</span>
          </h2>
        </CardHeader>
        <CardContent className="grid gap-3">
          {archivedRounds.length === 0 ? (
            <EmptyState>{t('voting.archive.none')}</EmptyState>
          ) : (
            archivedRounds.map((round) => (
              <VotingArchiveCard
                key={round.id}
                isAdmin={isAdmin}
                round={round}
                onDelete={(roundId) => void runAdminAction(() => voting.deleteArchivedRound(roundId))}
                onRename={(roundId, title) => void voting.renameArchivedRound(roundId, title)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <VotingEntryDialog
        key={entry.key}
        allPeople={allPeople}
        currentChoiceId={myChoice?.id ?? null}
        initialStep={entry.step === 'vote' && me ? 'vote' : 'identity'}
        me={me}
        open={entry.open && isOpen}
        people={people}
        roundTitle={activeRound.title}
        suggestedColor={pickNextColor(allPeople)}
        onOpenChange={(open) => setEntry((current) => ({ ...current, open }))}
        onRegister={register}
        onVote={castVote}
      />
    </AppPage>
  )
}
