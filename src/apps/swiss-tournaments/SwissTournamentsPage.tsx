import { Beer, ChessKing, LayoutDashboard, Swords, Trophy, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSwissTournaments } from '@/apps/swiss-tournaments/hooks/useSwissTournaments';
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle';
import { AppPage } from '@/apps/shared/components/AppPage';
import { PresenterLauncher } from '@/apps/shared/components/Presenter';
import type { Tournament } from '@/apps/swiss-tournaments/types';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/lib/i18n';
import { syncErrorMessageKey } from '@/lib/firebase/syncError';
import { cn } from '@/lib/utils';
import { StandingsTable } from '@/apps/swiss-tournaments/components/TournamentTables'
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

function AppTitleHeader({ isMarioKart = false }: { isMarioKart?: boolean }) {
  return (
    <AppPageTitle
      Icon={isMarioKart ? Beer : ChessKing}
      title={isMarioKart ? marioKartAppTitle : appTitle}
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
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerRating, setNewPlayerRating] = useState('')
  const [printTournament, setPrintTournament] = useState<Tournament | null>(null)
  const currentRound = inspection?.latestRound ?? null
  const archivedTournamentSummaries = useMemo(
    () =>
      archivedTournaments.map((entry) => {
        const archivedInspection = inspectTournament(entry)

        return {
          category: t(tournamentFormatLabelKey(entry.format)),
          completedRounds: archivedInspection.progress.completedUnitCount,
          standings: archivedInspection.standings,
          tournament: archivedInspection.tournament,
        }
      }),
    [archivedTournaments, inspectTournament, t],
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
        <Card>
          <CardHeader>
            <CardTitle>{t('swiss.loadingTitle')}</CardTitle>
            <CardDescription>{t('swiss.loadingDescription')}</CardDescription>
          </CardHeader>
        </Card>
      </AppPage>
    )
  }

  if (!tournament) {
    return (
      <AppPage className="swiss-tournaments-page">
        <AppTitleHeader />
        {app.error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>{t('common.syncError')}</CardTitle>
              <CardDescription>{t(syncErrorMessageKey(app.error))}</CardDescription>
            </CardHeader>
          </Card>
        )}
        <Card>
          <CardHeader className="gap-4">
            <div className="grid gap-1">
              <CardTitle>{t('swiss.noActiveTitle')}</CardTitle>
              <CardDescription>
                {t('swiss.noActiveDescription')}
              </CardDescription>
            </div>
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

    await app.addPlayer(
      newPlayerName,
      newPlayerRating ? Number(newPlayerRating) : undefined,
    )
    setNewPlayerName('')
    setNewPlayerRating('')
    toast.success(t('swiss.addedPlayer'))
  }

  const canRemovePlayer = (playerId: string) =>
    inspection?.players.get(playerId)?.canRemove ?? false
  return (
    <AppPage
      className={cn(
        'swiss-tournaments-page',
        isMarioKartTournament && 'swiss-tournaments-page--mario-kart',
      )}
      width="wide"
    >
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <AppTitleHeader isMarioKart={isMarioKartTournament} />
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
      </section>

      {app.error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>{t('common.syncError')}</CardTitle>
            <CardDescription>{t(syncErrorMessageKey(app.error))}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <TabsList className="swiss-print-hidden grid h-auto w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview" className="min-w-0">
            <LayoutDashboard className="size-5 text-primary" />
            {t('swiss.overview')}
          </TabsTrigger>
          <TabsTrigger value="players" className="min-w-0">
            <UsersRound className="size-5 text-primary" />
            {t('swiss.players')}
          </TabsTrigger>
          <TabsTrigger value="pairings" className="min-w-0">
            <Swords className="size-5 text-primary" />
            {t('swiss.pairings')}
          </TabsTrigger>
          <TabsTrigger value="standings" className="min-w-0">
            <Trophy className="size-5 text-primary" />
            {t('swiss.ranking')}
          </TabsTrigger>
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
