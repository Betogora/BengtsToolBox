import './codenames.css'

import { Play, Sparkles, Trophy, VenetianMask } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { AiSettingsDialog } from '@/apps/codenames/components/AiSettingsDialog'
import { Board } from '@/apps/codenames/components/Board'
import { ClueBar } from '@/apps/codenames/components/ClueBar'
import { ClueTable } from '@/apps/codenames/components/ClueTable'
import { TeamCards } from '@/apps/codenames/components/TeamCards'
import { TEAM_LABEL_KEY } from '@/apps/codenames/components/teamStyle'
import { proxyErrorMessage, useCodenames } from '@/apps/codenames/hooks/useCodenames'
import type { RevealResponse } from '@/apps/codenames/logic/protocol'
import type { Team } from '@/apps/codenames/logic/types'
import { AppPage } from '@/apps/shared/components/AppPage'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { syncErrorMessageKey } from '@/lib/firebase/syncError'
import { useI18n } from '@/lib/i18n'

const UNDO_MS = 5000

export function CodenamesPage() {
  const { t } = useI18n()
  const game = useCodenames()
  const { view, busy, ai } = game
  const [keyOpen, setKeyOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
  const teamLabel = (team: Team) => t(TEAM_LABEL_KEY[team])

  const act = async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await action()
    } catch (error) {
      toast.error(proxyErrorMessage(error) ?? t('codenames.error.proxy'))
      return undefined
    }
  }

  const undo = () =>
    act(async () => {
      await game.undo()
      setEndOpen(false)
      toast(t('codenames.undone'), { duration: 2000 })
    })

  const undoAction = { label: t('codenames.undo'), onClick: () => void undo() }

  const showOutcome = ({ outcome, view: next }: RevealResponse) => {
    const base = {
      richtig: t('codenames.toast.correct', { word: outcome.word }),
      neutral: t('codenames.toast.neutral', { word: outcome.word }),
      gegner: t('codenames.toast.opponent', { word: outcome.word, team: outcome.color === 'rot' || outcome.color === 'blau' ? teamLabel(outcome.color) : '' }),
      attentaeter: t('codenames.toast.assassin', { word: outcome.word }),
    }[outcome.kind]
    const suffix = next.phase === 'ende'
      ? next.winner ? t('codenames.wins', { team: teamLabel(next.winner) }) : ''
      : next.phase === 'hinweis' ? t('codenames.toast.turnEnded') : ''
    const text = suffix ? `${base} – ${suffix}` : base
    const options = { action: undoAction, duration: UNDO_MS }
    if (outcome.kind === 'richtig') toast.success(text, options)
    else if (outcome.kind === 'attentaeter') toast.error(text, options)
    else toast(text, options)
  }

  const reveal = (index: number) =>
    act(async () => {
      const response = await game.reveal(index)
      showOutcome(response)
      if (response.view.phase === 'ende') setEndOpen(true)
    })

  const pass = () =>
    act(async () => {
      const team = view?.turn
      await game.pass()
      toast(t('codenames.passed', { team: team ? teamLabel(team) : '' }), { action: undoAction, duration: UNDO_MS })
    })

  const startGame = () =>
    act(async () => {
      await game.startGame()
      setEndOpen(false)
      setConfirmNew(false)
    })

  const running = !!view && view.phase !== 'ende'
  const winner = view?.winner ?? null

  return (
    <AppPage className="codenames-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <AppPageTitle Icon={VenetianMask} title={t('app.codenames.title')} />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setKeyOpen(true)}>
            <Sparkles />
            {t('codenames.ai.button')}
            {game.aiConfigured === false && <Badge variant="secondary">{t('codenames.placeholderBadge')}</Badge>}
          </Button>
          {view && (
            <Button variant="ghost" onClick={() => (running ? setConfirmNew(true) : void startGame())} disabled={busy}>
              {t('codenames.newGame')}
            </Button>
          )}
        </div>
      </header>

      {game.error && (
        <p className="type-ui text-destructive" role="alert">{t(syncErrorMessageKey(game.error))}</p>
      )}

      {!view ? (
        <Card className="mx-auto w-full max-w-xl">
          <CardHeader>
            <CardTitle>{t('codenames.setupTitle')}</CardTitle>
            <p className="type-ui text-muted-foreground">{t('codenames.setupInfo')}</p>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => void startGame()} disabled={busy || game.isLoading}>
              <Play />
              {t('codenames.start')}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start lg:gap-6">
          <div className="grid min-w-0 gap-3 sm:gap-4 lg:order-1">
            {view.phase === 'ende' ? (
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
                <p className="type-card-title">
                  {winner ? t('codenames.wins', { team: teamLabel(winner) }) : t('codenames.aborted')} – {t('codenames.resolution')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {view.canUndo && (
                    <Button variant="outline" onClick={() => void undo()} disabled={busy}>{t('codenames.undo')}</Button>
                  )}
                  <Button onClick={() => void startGame()} disabled={busy}>{t('codenames.newGame')}</Button>
                </div>
              </Card>
            ) : (
              <ClueBar
                view={view}
                hint={game.hint}
                busy={busy}
                onPass={() => void pass()}
                onRequestHint={() => void game.requestHint()}
              />
            )}
            <Board view={view} locked={busy || view.phase !== 'raten'} onReveal={(index) => void reveal(index)} />
            {view.phase === 'ende' && (
              <section className="grid gap-3">
                <h2 className="type-section-title">{t('codenames.allClues')}</h2>
                <ClueTable view={view} />
              </section>
            )}
          </div>
          <aside className="order-first lg:order-2">
            <TeamCards view={view} />
          </aside>
        </div>
      )}

      <AiSettingsDialog
        open={keyOpen}
        onOpenChange={setKeyOpen}
        settings={ai}
        aiConfigured={game.aiConfigured}
        onUpdate={game.updateAi}
      />

      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary-soft text-primary sm:mx-0">
              <Trophy className="size-6" aria-hidden="true" />
            </div>
            <DialogTitle>{winner ? t('codenames.wins', { team: teamLabel(winner) }) : t('codenames.aborted')}</DialogTitle>
            <DialogDescription>
              {winner && view
                ? t('codenames.endSummary', {
                    team: teamLabel(winner),
                    found: view.score[winner].total - view.score[winner].remaining,
                    total: view.score[winner].total,
                  })
                : t('codenames.resolution')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {view?.canUndo && (
              <Button variant="outline" onClick={() => void undo()} disabled={busy}>{t('codenames.undo')}</Button>
            )}
            <Button variant="outline" onClick={() => setEndOpen(false)}>{t('codenames.showBoard')}</Button>
            <Button onClick={() => void startGame()} disabled={busy}>{t('codenames.newGame')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmNew} onOpenChange={setConfirmNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('codenames.confirmNewTitle')}</DialogTitle>
            <DialogDescription>{t('codenames.confirmNewText')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmNew(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => void startGame()} disabled={busy}>{t('codenames.newGame')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPage>
  )
}
