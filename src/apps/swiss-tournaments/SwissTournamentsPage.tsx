import { Beer, ChessKing, LayoutDashboard, Swords, Trophy, UsersRound } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useSwissTournaments } from '@/apps/swiss-tournaments/hooks/useSwissTournaments';
import { AppPageHeader } from '@/apps/shared/components/AppPageHeader';
import { AppPage } from '@/apps/shared/components/AppPage';
import { PresenterLauncher } from '@/apps/shared/components/Presenter';
import type { Tournament } from '@/apps/swiss-tournaments/types';
import { EmptyState } from '@/apps/shared/components/EmptyState';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/lib/i18n';
import { syncErrorMessageKey } from '@/lib/firebase/syncError';
import { StandingsTable } from '@/apps/swiss-tournaments/components/StandingsTable'
import { tournamentFormatLabelKey, tournamentWebsiteQrUrl } from '@/apps/swiss-tournaments/components/tournamentUiPresentation';
import { NewTournamentDialog } from '@/apps/swiss-tournaments/components/TournamentCreatorDialog';
import { SwissStandingsPresenter } from '@/apps/swiss-tournaments/components/TournamentOverview'
import { TournamentPlayersWorkflow } from '@/apps/swiss-tournaments/components/TournamentPlayersWorkflow';
import { TournamentPairingsWorkflow } from '@/apps/swiss-tournaments/components/TournamentPairingsWorkflow';
import { TournamentOverviewWorkflow } from '@/apps/swiss-tournaments/components/TournamentOverviewWorkflow';

const appTitle = 'SK Anderten Turnier-App'
const marioKartAppTitle = "Don't drink and drive"

function printablePdfTitle(tournamentName: string) {
  const safeName = tournamentName
    .trim()
    .split('')
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '')

  return `${safeName || 'Turnier'}.pdf`
}

function AppTitleHeader({ actions, isMarioKart = false }: { actions?: ReactNode; isMarioKart?: boolean }) {
  const { t } = useI18n()
  return (
    <AppPageHeader
      Icon={isMarioKart ? Beer : ChessKing}
      shortTitle={t(isMarioKart ? 'swiss.format.marioKart' : 'app.swissTournaments.shortTitle')}
      title={isMarioKart ? marioKartAppTitle : appTitle}
      actions={actions}
    />
  )
}

export function SwissTournamentsPage() {
  const { t } = useI18n()
  const app = useSwissTournaments()
  const tournament = app.activeTournament
  const inspection = app.inspection
  const archivedTournaments = app.archivedTournaments
  const inspectTournament = app.inspectTournament
  const summarizeTournament = app.summarizeTournament
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerRating, setNewPlayerRating] = useState('')
  const [printTournament, setPrintTournament] = useState<Tournament | null>(null)
  const currentRound = inspection?.latestRound ?? null
  const archivedTournamentSummaries = useMemo(
    () =>
      archivedTournaments.map((entry) => {
        const summary = summarizeTournament(entry)

        return {
          category: t(tournamentFormatLabelKey(entry.format)),
          completedRounds: summary.completedUnitCount,
          standings: summary.standings,
          tournament: summary.tournament,
        }
      }),
    [archivedTournaments, summarizeTournament, t],
  )
  const visibleStandingsTournament = printTournament ?? tournament
  const visibleInspection = useMemo(
    () =>
      visibleStandingsTournament
        ? visibleStandingsTournament.id === tournament?.id
          ? inspection
          : inspectTournament(visibleStandingsTournament)
        : null,
    [inspectTournament, inspection, tournament?.id, visibleStandingsTournament],
  )
  const visibleStandings = visibleInspection?.standings ?? []

  const [activeTab, setActiveTab] = useState('overview')
  const printPage = (targetTournament = tournament) => {
    if (!targetTournament) {
      return
    }

    const originalTitle = document.title
    const preloadQrCode = new Promise<void>((resolve) => {
      const image = new Image()

      image.onload = () => resolve()
      image.onerror = () => resolve()
      image.src = new URL(tournamentWebsiteQrUrl, window.location.origin).toString()
    })

    setPrintTournament(targetTournament)
    setActiveTab('standings')
    window.requestAnimationFrame(async () => {
      await preloadQrCode
      document.title = printablePdfTitle(targetTournament.name)
      window.addEventListener(
        'afterprint',
        () => {
          document.title = originalTitle
          setPrintTournament(null)
        },
        { once: true },
      )
      window.print()
    })
  }

  if (app.isLoading) {
    return (
      <AppPage>
        <AppTitleHeader />
        <EmptyState aria-busy="true" role="status">{t('swiss.loadingTitle')}</EmptyState>
      </AppPage>
    )
  }

  if (!tournament) {
    return (
      <AppPage className="swiss-tournaments-page">
        <AppTitleHeader />
        {app.error && (
          <Notice tone="danger" title={t('common.syncError')}>
            {t(syncErrorMessageKey(app.error))}
          </Notice>
        )}
        <Card>
          <CardHeader className="gap-4">
            <CardTitle>{t('swiss.noActiveTitle')}</CardTitle>
            <div>
              <NewTournamentDialog
                initialTournament={app.tournaments[0] ?? null}
                onCreate={app.createNewTournament}
                tournaments={app.tournaments}
              />
            </div>
          </CardHeader>
        </Card>
      </AppPage>
    )
  }

  const isMarioKartTournament = tournament.format === 'marioKart'

  const handleAddPlayer = async () => {
    if (newPlayerName.trim().length === 0) {
      return
    }

    const result = await app.addPlayer(
      newPlayerName,
      newPlayerRating ? Number(newPlayerRating) : undefined,
    )
    if (result?.status !== 'changed') return
    setNewPlayerName('')
    setNewPlayerRating('')
    toast.success(t('swiss.addedPlayer'))
  }

  const canRemovePlayer = (playerId: string) =>
    inspection?.players.get(playerId)?.canRemove ?? false
  return (
    <AppPage
      className="swiss-tournaments-page"
      width="wide"
    >
      <AppTitleHeader
        isMarioKart={isMarioKartTournament}
        actions={
          <PresenterLauncher
            appTitle={isMarioKartTournament ? marioKartAppTitle : appTitle}
            views={[
              {
                id: 'standings',
                label: t('swiss.ranking'),
                Icon: Trophy,
                render: () => (
                  <SwissStandingsPresenter
                    round={currentRound}
                    roundLabel={
                      currentRound
                        ? inspection?.rounds.get(currentRound.roundNumber)
                            ?.displayLabel ?? null
                        : null
                    }
                    standings={app.standings}
                    tournament={tournament}
                  />
                ),
              },
            ]}
          />
        }
      />

      {app.error && (
        <Notice tone="danger" title={t('common.syncError')}>
          {t(syncErrorMessageKey(app.error))}
        </Notice>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <TabsList variant="icon-tabs" className="swiss-print-hidden max-w-full w-full sm:w-fit" aria-label={t('app.swissTournaments.title')}>
          <TabsTrigger value="overview" icon={LayoutDashboard} label={t('swiss.overview')} />
          <TabsTrigger value="players" icon={UsersRound} label={t('swiss.players')} />
          <TabsTrigger value="pairings" icon={Swords} label={t('swiss.pairings')} />
          <TabsTrigger value="standings" icon={Trophy} label={t('swiss.ranking')} />
        </TabsList>

        <TournamentOverviewWorkflow
          archivedEntries={archivedTournamentSummaries}
          inspection={inspection}
          onCreateTournament={app.createNewTournament}
          onDeleteTournament={app.deleteTournament}
          onExportStandingsCsv={app.exportStandingsCsv}
          onPrint={printPage}
          onUpdateSettings={app.updateSettings}
          onUpdateTournamentMeta={app.updateTournamentMeta}
          tournament={tournament}
          tournaments={app.tournaments}
        />

        <TournamentPlayersWorkflow
          canRemovePlayer={canRemovePlayer}
          newPlayerName={newPlayerName}
          newPlayerRating={newPlayerRating}
          onAddPlayer={handleAddPlayer}
          onChangePlayerStatus={app.changePlayerStatus}
          onNewPlayerNameChange={setNewPlayerName}
          onNewPlayerRatingChange={setNewPlayerRating}
          onRemovePlayer={app.removePlayer}
          onUpdatePlayer={app.updatePlayer}
          tournament={tournament}
        />

        <TournamentPairingsWorkflow
          inspection={inspection}
          tournament={tournament}
          inspectTournament={app.inspectTournament}
          marioKartPlanningAvailability={app.marioKartPlanningAvailability}
          shouldConfirmResultCorrection={app.shouldConfirmResultCorrection}
          onAddManualHandBrainPairing={app.addManualHandBrainPairing}
          onAddManualPairing={app.addManualPairing}
          onCorrectMarioKartLobby={app.correctMarioKartLobby}
          onCorrectResult={app.correctResult}
          onDeleteLatestRound={app.deleteLatestRound}
          onGenerateRound={app.generateRound}
          onGoBackToPreviousRound={app.goBackToPreviousRound}
          onRegenerateRound={app.regenerateRound}
          onRemoveManualPairing={app.removeManualPairing}
          onSetMarioKartLobbyReservation={app.setMarioKartLobbyReservation}
          onSetMarioKartResult={app.setMarioKartResult}
          onSetResult={app.setResult}
        />

        <TabsContent value="standings">
          <StandingsTable
            inspection={visibleInspection}
            standings={visibleStandings}
            tournament={visibleStandingsTournament}
          />
        </TabsContent>

      </Tabs>
    </AppPage>
  )
}
