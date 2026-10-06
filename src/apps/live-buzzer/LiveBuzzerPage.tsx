import { Bell, Check, Clock3, History, Lock, Radio, Settings2, Trophy, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { isLateBuzz } from '@/apps/live-buzzer/buzzerLogic'
import { useLiveBuzzer } from '@/apps/live-buzzer/hooks/useLiveBuzzer'
import type { BuzzerTeamId } from '@/apps/live-buzzer/types'
import { AppPage } from '@/apps/shared/components/AppPage'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { AppResetButton } from '@/apps/shared/components/AppResetButton'
import { PresenterLauncher } from '@/apps/shared/components/Presenter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DisclosureSummary } from '@/components/ui/disclosure'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { IftaInput } from '@/components/ui/ifta-field'
import { syncErrorMessageKey } from '@/lib/firebase/syncError'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type BuzzerApp = ReturnType<typeof useLiveBuzzer>

declare global {
  interface Window { webkitAudioContext?: typeof AudioContext }
}

function playBuzzSound() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
  if (!AudioContextClass) return
  const context = new AudioContextClass()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.frequency.value = 720
  gain.gain.setValueAtTime(0.15, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.2)
  oscillator.onended = () => { void context.close() }
}

function BuzzerResult({ app, large = false }: { app: BuzzerApp; large?: boolean }) {
  const { t } = useI18n()
  const { winner, winnerTeam, sessionState, buzzes } = app
  const early = buzzes.filter((buzz) => !isLateBuzz(sessionState, buzz))
  const late = buzzes.filter((buzz) => isLateBuzz(sessionState, buzz))
  const rows = [...early, ...late]
  const status = winner ? null : sessionState.isOpen ? 'liveBuzzer.waiting' : app.allClocksReady ? 'liveBuzzer.awaitRelease' : 'liveBuzzer.awaitSync'
  return <Card className={cn('gap-3 py-4', winner && winnerTeam?.className)}>
    <CardHeader className="px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><Trophy className="size-4" />{t('liveBuzzer.result')}</CardTitle>
        <Badge variant="outline">{t('common.round', { number: sessionState.roundNumber })}</Badge>
      </div>
    </CardHeader>
    <CardContent className="grid gap-3 px-4">
      <div role="status" aria-live="polite" aria-atomic="true" className="grid gap-1">
        <div className={cn('min-w-0 break-words [overflow-wrap:anywhere]', large ? 'text-[clamp(1.5rem,5vw,4rem)] font-bold' : 'type-section-title')}>
          {winner?.playerName ?? (status && t(status))}
        </div>
        {winner && <div className="type-caption flex items-center gap-2 text-muted-foreground">
          <span className={cn('size-2 rounded-full', winnerTeam?.dotClassName)} />
          {winnerTeam ? t(winnerTeam.nameKey) : t('common.noTeam')}
        </div>}
      </div>
      {rows.length > 0 && <ol aria-label={t('liveBuzzer.buzzOrder')} className="grid gap-1">
        {rows.map((buzz, index) => <li key={buzz.playerId} className={cn('min-w-0', index === early.length && late.length && 'mt-2 border-t-2 border-foreground/30 pt-2')}>
          {index === early.length && late.length > 0 && <div className="type-caption mb-1 text-muted-foreground">{t('liveBuzzer.afterLock')}</div>}
          <div className="type-ui flex items-start justify-between gap-2">
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{index + 1}. {buzz.playerName}
              {buzz.playerId === winner?.playerId && <span className="type-caption ml-2 font-bold text-primary">{t('liveBuzzer.winner')}</span>}
            </span>
            <span className="type-caption shrink-0 text-muted-foreground tabular-nums">
              {isLateBuzz(sessionState, buzz) ? t('liveBuzzer.late') : `+${Math.max(0, Math.round(buzz.pressedAtMs - (early[0]?.pressedAtMs ?? buzz.pressedAtMs)))} ms`}
            </span>
          </div>
        </li>)}
      </ol>}
    </CardContent>
  </Card>
}

function Teams({ app }: { app: BuzzerApp }) {
  const { t } = useI18n()
  const unassigned = app.players.filter((player) => !player.teamId)
  return <div className="grid gap-2">
    <div className="grid grid-cols-3 items-start gap-2" aria-label={t('liveBuzzer.teams')}>
      {app.buzzerTeams.map((team) => {
        const members = app.players.filter((player) => player.teamId === team.id)
        return <div key={team.id} className={cn('min-w-0 rounded-lg border px-2 py-2', team.className)}>
          <div className="type-caption flex flex-wrap items-center justify-between gap-1 font-bold">
            <span>{t(team.nameKey).replace(/^Team /, '')}</span><span>{members.length}</span>
          </div>
          <ul className="type-caption mt-1 grid gap-1">{members.map((player) =>
            <li key={player.id} className="min-w-0 break-words [overflow-wrap:anywhere]">{player.name}</li>)}</ul>
        </div>
      })}
    </div>
    {unassigned.length > 0 && <p className="type-caption break-words text-muted-foreground">
      {t('common.noTeam')}: {unassigned.map((player) => player.name).join(', ')}
    </p>}
  </div>
}

function TeamChoice({ app, value, onChange }: { app: BuzzerApp; value: BuzzerTeamId | null; onChange: (team: BuzzerTeamId | null) => void }) {
  const { t } = useI18n()
  return <div aria-label={t('liveBuzzer.teams')} className="grid grid-cols-3 gap-2">
    {app.buzzerTeams.map((team) => <Button key={team.id} variant={value === team.id ? 'secondary' : 'outline'}
      className={cn('px-2', value === team.id && team.className)} aria-pressed={value === team.id}
      onClick={() => onChange(value === team.id ? null : team.id)}>
      <span className={cn('size-2 shrink-0 rounded-full', team.dotClassName)} />{t(team.nameKey).replace(/^Team /, '')}
    </Button>)}
  </div>
}

export function LiveBuzzerPage() {
  const app = useLiveBuzzer()
  const { t } = useI18n()
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [asHost, setAsHost] = useState(false)
  const [name, setName] = useState('')
  const [team, setTeam] = useState<BuzzerTeamId | null>(null)
  const { selectedPlayer, sessionState, winner, canBuzz } = app
  const triggerBuzz = () => {
    if (!canBuzz) return
    const action = app.buzz()
    if (soundEnabled) playBuzzSound()
    void action.then((result) => {
      if (result === 'sync-error') toast.error(t('common.syncError'))
      else if (result === 'blocked') toast.error(t('liveBuzzer.buzz.locked'))
    })
  }
  const buttonLabel = app.isBuzzPending ? 'liveBuzzer.sending' : app.ownBuzz ? 'liveBuzzer.buzz.saved'
    : !sessionState.isOpen || !app.clockReady ? 'liveBuzzer.status.locked' : winner ? 'liveBuzzer.action.lateBuzz' : 'liveBuzzer.action.buzz'
  return <AppPage className="gap-3 py-4 lg:py-6">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <AppPageTitle Icon={Bell} title={t('app.liveBuzzer.title')} />
      <div className="flex items-center gap-1">
        <Badge variant="outline"><Radio className="size-3" />{t(app.isRealtime ? 'liveBuzzer.connected' : 'liveBuzzer.localOnly')}</Badge>
        <PresenterLauncher appTitle={t('app.liveBuzzer.title')} views={[{
          id: 'live', label: t('liveBuzzer.presenter.liveView'), Icon: Bell, render: () => <BuzzerResult app={app} large />,
        }]} />
      </div>
    </div>
    {app.error && <div role="alert" className="type-ui rounded-lg border border-destructive bg-card p-3 text-destructive">{t(syncErrorMessageKey(app.error))}</div>}
    {!app.isRealtime && <p role="status" className="type-caption rounded-lg border bg-muted p-2">{t('liveBuzzer.localMode')}</p>}
    {!selectedPlayer ? <Card className="mx-auto w-full max-w-md gap-4 py-4">
      <CardHeader className="px-4"><CardTitle>{t('liveBuzzer.joinTitle')}</CardTitle></CardHeader>
      <CardContent className="grid gap-3 px-4">
        <SegmentedControl
          aria-label={t('liveBuzzer.joinTitle')}
          value={asHost ? 'host' : 'player'}
          onValueChange={(value) => setAsHost(value === 'host')}
          options={[
            { value: 'player', label: t('liveBuzzer.play') },
            { value: 'host', label: t('liveBuzzer.host'), disabled: app.hostTaken },
          ]}
        />
        {app.hostTaken && <p className="type-caption text-muted-foreground">{t('liveBuzzer.hostTaken')}</p>}
        <IftaInput label={t('liveBuzzer.playerName')} value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
        {!asHost && <TeamChoice app={app} value={team} onChange={setTeam} />}
        {asHost && <p className="type-caption text-muted-foreground">{t('liveBuzzer.hostDevice')}</p>}
        <Button disabled={app.isLoading || app.isPending || !app.online || !name.trim() || asHost && app.hostTaken}
          onClick={async () => {
            const result = await app.join(name, team, asHost)
            if (!result.ok) toast.error(t('common.syncError'))
            else if (!result.value) toast.error(t('liveBuzzer.hostTaken'))
          }}>{t('liveBuzzer.join')}</Button>
      </CardContent>
    </Card> : <>
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <div className="grid min-w-0 gap-3">
          <BuzzerResult app={app} />
          <Teams app={app} />
        </div>
        <div className="grid min-w-0 gap-3">
          {app.isHost && <Card className="gap-3 py-4">
            <CardHeader className="px-4"><CardTitle className="flex items-center justify-between gap-2">
              {t('liveBuzzer.host')}<Badge variant="outline"><Lock className="size-3" />{t('liveBuzzer.hostProtected')}</Badge>
            </CardTitle></CardHeader>
            <CardContent className="grid gap-2 px-4">
              <Button variant="outline" disabled={app.isPending || !app.online || !app.players.length} onClick={() => { void app.startClockSync() }}>
                <Clock3 className="size-4" />{t('liveBuzzer.startSync')}
              </Button>
              <div role="status" className="type-caption text-muted-foreground">{t('liveBuzzer.syncProgress', { ready: app.syncReadyCount, total: app.players.length })}</div>
              <Button disabled={!app.canOpenRound} onClick={() => { void app.openRound() }}>{t('liveBuzzer.nextRound')}</Button>
              {sessionState.isOpen && !winner && !sessionState.firstReceivedAtMs && <Button variant="ghost" onClick={() => { void app.closeRound() }}>
                <Lock className="size-4" />{t('liveBuzzer.action.lock')}
              </Button>}
              <Button variant="ghost" size="sm" role="switch" aria-checked={selectedPlayer.isActive} onClick={() => { void app.toggleHostPlaying() }}>
                {selectedPlayer.isActive && <Check className="size-4" />}{t('liveBuzzer.hostPlays')}
              </Button>
            </CardContent>
          </Card>}
          {selectedPlayer.isActive && <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="type-ui flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{selectedPlayer.name}</span>
                <Badge variant={canBuzz && !winner ? 'default' : 'secondary'}>{t(winner ? 'liveBuzzer.status.locked' : canBuzz ? 'liveBuzzer.ready' : 'liveBuzzer.status.locked')}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 px-4">
              <Button className="h-36 w-full touch-none flex-col gap-2 rounded-lg text-[clamp(1.2rem,5vw,2.5rem)] font-bold whitespace-normal leading-tight sm:h-44"
                disabled={!canBuzz} variant={winner ? 'secondary' : 'default'}
                onPointerDown={(event) => { if (event.button === 0) { event.preventDefault(); triggerBuzz() } }}
                onKeyDown={(event) => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); triggerBuzz() } }}
                onClick={(event) => { if (event.detail === 0) triggerBuzz() }}>
                {app.ownBuzz ? <Check className="size-10!" /> : app.isBuzzPending ? <Radio className="size-10!" /> : canBuzz ? <Bell className="size-10!" /> : <Lock className="size-10!" />}
                {t(buttonLabel)}
              </Button>
              <div className="type-caption flex flex-wrap items-center justify-between gap-1 text-muted-foreground">
                <span role="status">{t(!app.online ? 'liveBuzzer.offline' : !app.eligibleForSync ? 'liveBuzzer.awaitSync'
                  : !app.clockReady ? 'liveBuzzer.clockSync' : winner && !app.ownBuzz ? 'liveBuzzer.lateNotice' : 'liveBuzzer.clockAccuracy',
                  { ms: Math.ceil(app.clock?.uncertaintyMs ?? 0) })}</span>
                <Button variant="ghost" size="sm" role="switch" aria-checked={soundEnabled} onClick={() => setSoundEnabled((current) => !current)}>
                  {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}{t('liveBuzzer.sound')}
                </Button>
              </div>
            </CardContent>
          </Card>}
          <Dialog>
            <DialogTrigger asChild><Button variant="ghost" size="sm" className="justify-self-end"><Settings2 className="size-4" />{t('liveBuzzer.profile')}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('liveBuzzer.profile')}</DialogTitle><DialogDescription>{t(app.isHost ? 'liveBuzzer.hostDevice' : 'liveBuzzer.play')}</DialogDescription></DialogHeader>
              <IftaInput label={t('liveBuzzer.playerName')} defaultValue={selectedPlayer.name} maxLength={40} onBlur={(event) => { void app.updatePlayerName(event.target.value) }} />
              <TeamChoice app={app} value={selectedPlayer.teamId} onChange={(value) => { void app.updatePlayerTeam(value) }} />
              {!app.isHost && !app.hostTaken && <Button variant="outline" disabled={app.isPending || !app.online} onClick={async () => {
                const result = await app.join(selectedPlayer.name, selectedPlayer.teamId, true)
                if (!result.ok) toast.error(t('common.syncError'))
                else if (!result.value) toast.error(t('liveBuzzer.hostTaken'))
              }}><Lock className="size-4" />{t('liveBuzzer.host')}</Button>}
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {app.isHost && <details className="type-ui group rounded-lg border bg-card p-3">
        <DisclosureSummary><span className="flex items-center gap-2"><History className="size-4" />{t('liveBuzzer.history')}</span></DisclosureSummary>
        <div className="mt-3 grid gap-2">
          {sessionState.history.map((round) => <div key={round.id} className="break-words">{t('liveBuzzer.winnerLine', { round: round.roundNumber, name: round.winnerPlayerName })}</div>)}
          {!sessionState.history.length && <p className="text-muted-foreground">{t('liveBuzzer.emptyWinners')}</p>}
          <AppResetButton title={t('liveBuzzer.history.resetTitle')} description={t('liveBuzzer.history.resetDescription')} onConfirm={app.clearHistory} />
        </div>
      </details>}
    </>}
  </AppPage>
}
