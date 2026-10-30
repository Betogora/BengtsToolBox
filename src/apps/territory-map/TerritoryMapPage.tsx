import {
  BarChart3,
  MapPinned,
  Trophy,
  UtensilsCrossed,
} from 'lucide-react'
import {
  Activity,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { toast } from 'sonner'

import { getAchievements } from '@/apps/territory-map/achievements'
import {
  ClaimDialog,
  CollapsibleCardHeader,
  TerritoryEventTable,
} from '@/apps/territory-map/components'
import { SushiScoreCard } from '@/apps/territory-map/SushiScoreCard'
import { getSushiScores } from '@/apps/territory-map/sushiScores'
import { TerritoryMapCanvas } from '@/apps/territory-map/TerritoryMapCanvas'
import { TerritoryMapPresenter } from '@/apps/territory-map/TerritoryMapPresenter'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { AppPage } from '@/apps/shared/components/AppPage'
import { DisclosureIndicator } from '@/components/ui/disclosure'
import { PresenterLauncher } from '@/apps/shared/components/Presenter'
import { loadTerritories } from '@/apps/territory-map/data/territories'
import { useTerritoryMap } from '@/apps/territory-map/hooks/useTerritoryMap'
import { unclaimedValue } from '@/apps/territory-map/mapConfig'
import type {
  Territory,
  TerritoryMapId,
} from '@/apps/territory-map/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import { syncErrorMessageKey } from '@/lib/firebase/syncError'

const emptyTerritories: Territory[] = []

export function TerritoryMapPage() {
  const { t } = useI18n()
  const {
    activeDataset,
    addPlayer,
    claimTerritory,
    claimsByMap,
    currentClaims,
    deleteEvent,
    error,
    isDatasetReady,
    players,
    removePlayer,
    setAchievementsOpen,
    setActiveMap,
    setScoreOpen,
    state,
    unclaimTerritory,
    updateEvent,
    updatePlayerColor,
    updatePlayerName,
  } = useTerritoryMap()
  const [isDatasetOpen, setIsDatasetOpen] = useState(false)
  const isDatasetVisible = useDeferredValue(isDatasetOpen)
  const [isDatasetPrepared, setIsDatasetPrepared] = useState(false)
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null)
  const [territoriesByMap, setTerritoriesByMap] = useState<
    Partial<Record<TerritoryMapId, Territory[]>>
  >({})
  const territories = territoriesByMap[state.activeMap] ?? emptyTerritories
  const isMapLoading = territories.length === 0
  const selectedTerritory = useMemo(
    () =>
      territories.find((territory) => territory.id === selectedTerritoryId) ??
      null,
    [selectedTerritoryId, territories],
  )
  const selectedClaim = selectedTerritory
    ? currentClaims[selectedTerritory.id]
    : undefined
  const sushiScores = useMemo(
    () => getSushiScores(claimsByMap, players),
    [claimsByMap, players],
  )
  const achievements = useMemo(
    () => getAchievements(activeDataset.events),
    [activeDataset.events],
  )
  const appTitle = t('app.territoryMap.title')

  useEffect(() => {
    let isActive = true

    loadTerritories(state.activeMap).then((nextTerritories) => {
      if (!isActive) {
        return
      }

      setTerritoriesByMap((current) =>
        current[state.activeMap] === nextTerritories
          ? current
          : { ...current, [state.activeMap]: nextTerritories },
      )
    })

    return () => {
      isActive = false
    }
  }, [state.activeMap])

  useEffect(() => {
    const otherMap = state.activeMap === 'world' ? 'germany' : 'world'
    if (isMapLoading || territoriesByMap[otherMap]) {
      return
    }

    let isActive = true
    const timerId = window.setTimeout(() => {
      loadTerritories(otherMap).then((nextTerritories) => {
        if (isActive) {
          startTransition(() => {
            setTerritoriesByMap((current) => ({
              ...current,
              [otherMap]: nextTerritories,
            }))
          })
        }
      }).catch(() => {
        // Ein fehlgeschlagenes Vorladen wird beim Kartenwechsel erneut versucht.
      })
    }, 0)

    return () => {
      isActive = false
      window.clearTimeout(timerId)
    }
  }, [isMapLoading, state.activeMap, territoriesByMap])

  const handleMapChange = (nextMap: TerritoryMapId) => {
    setSelectedTerritoryId(null)
    void setActiveMap(nextMap)
  }

  const handleClaim = async (playerId: string) => {
    if (!isDatasetReady || !selectedTerritory) {
      return
    }

    if (playerId === unclaimedValue) {
      await unclaimTerritory(
        state.activeMap,
        selectedTerritory.id,
        selectedClaim,
      )
      setSelectedTerritoryId(null)
      return
    }

    await claimTerritory(
      state.activeMap,
      selectedTerritory.id,
      playerId,
    )
    setSelectedTerritoryId(null)
  }

  const handleAddEater = async () => {
    if (!isDatasetReady) {
      return
    }

    await addPlayer()
  }

  const handleTerritorySelect = useCallback(
    (territoryId: string) => {
      if (isDatasetReady) {
        setSelectedTerritoryId(territoryId)
      }
    },
    [isDatasetReady],
  )

  return (
    <AppPage className="gap-5 py-6 lg:py-6" width="wide">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <AppPageTitle Icon={UtensilsCrossed} title={appTitle} />
        </div>
        <PresenterLauncher
          appTitle={appTitle}
          views={[
            {
              id: 'map',
              label: t('territory.map'),
              Icon: MapPinned,
              render: () => (
                <TerritoryMapPresenter
                  activeMap={state.activeMap}
                  claims={currentClaims}
                  isMapLoading={isMapLoading}
                  players={players}
                  sushiScores={sushiScores}
                  territories={territories}
                />
              ),
            },
          ]}
        />
      </section>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>{t('common.firebaseError')}</CardTitle>
            <CardDescription>{t(syncErrorMessageKey(error))}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4">
        <TerritoryMapCanvas
          claims={currentClaims}
          isDisabled={!isDatasetReady}
          mapId={state.activeMap}
          onMapChange={handleMapChange}
          onSelect={handleTerritorySelect}
          players={players}
          selectedTerritoryId={selectedTerritoryId}
          territories={territories}
        />

        <SushiScoreCard
          isDatasetReady={isDatasetReady}
          isOpen={state.isScoreOpen}
          players={players}
          scores={sushiScores}
          onAdd={handleAddEater}
          onColorChange={updatePlayerColor}
          onNameChange={updatePlayerName}
          onRemove={removePlayer}
          onToggle={() => void setScoreOpen(!state.isScoreOpen)}
        />
      </section>

      <Card>
        <CollapsibleCardHeader
          icon={<Trophy className="size-5" />}
          isOpen={state.isAchievementsOpen}
          title={t('territory.achievements')}
          onToggle={() =>
            void setAchievementsOpen(!state.isAchievementsOpen)
          }
        />
        {state.isAchievementsOpen && (
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {achievements.map((achievement) => {
                const Icon = achievement.Icon
                const winnerLabel = achievement.winnerNames.join(', ')
                const isUnlocked = achievement.winnerNames.length > 0

                return (
                  <li key={achievement.id}>
                    <details
                      className={[
                        'group overflow-hidden rounded-md border bg-background transition-colors',
                        isUnlocked
                          ? 'text-foreground'
                          : 'text-muted-foreground grayscale',
                      ].join(' ')}
                    >
                      <summary className="type-ui grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_2rem_minmax(4.5rem,auto)_1rem] items-center gap-3 p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                        <span className="type-label min-w-0 truncate">
                          {t(achievement.title)}
                        </span>
                        <span className="flex size-8 items-center justify-center text-primary">
                          <Icon className="size-5" />
                        </span>
                        <span className="type-action min-w-0 truncate text-right">
                          {winnerLabel || '-'}
                        </span>
                        <DisclosureIndicator />
                      </summary>
                      <p className="type-caption border-t bg-secondary/70 px-3 py-2 text-secondary-foreground">
                        {t(achievement.rule)}
                      </p>
                    </details>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        )}
      </Card>

      <Card>
        <CollapsibleCardHeader
          icon={<BarChart3 className="size-5" />}
          isOpen={isDatasetOpen}
          title={t('territory.datasetTitle')}
          onToggle={() => {
            if (!isDatasetOpen) {
              startTransition(() => setIsDatasetPrepared(true))
            }
            setIsDatasetOpen((current) => !current)
          }}
        />
        {isDatasetOpen && (!isDatasetPrepared || !isDatasetVisible) && (
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="type-ui text-muted-foreground" role="status">
              {t('common.loading')}
            </p>
          </CardContent>
        )}
        {isDatasetPrepared && (
          <Activity mode={isDatasetOpen && isDatasetVisible ? 'visible' : 'hidden'}>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {!isDatasetReady ? (
                <p className="type-ui text-muted-foreground" role="status">
                  {t('common.syncing')}
                </p>
              ) : (
                <TerritoryEventTable
                  dataset={activeDataset}
                  disabled={false}
                  players={players}
                  onDeleteEvent={async (eventId) => {
                    const result = await deleteEvent(eventId)
                    if (result.ok) {
                      toast.success(t('territory.claimDeleted'))
                    }
                  }}
                  onUpdateEvent={(eventId, partialValue) =>
                    updateEvent(eventId, partialValue)
                  }
                />
              )}
            </CardContent>
          </Activity>
        )}
      </Card>

      <ClaimDialog
        key={selectedTerritory?.id ?? 'empty-territory'}
        claim={selectedClaim}
        isDisabled={!isDatasetReady}
        onClaim={handleClaim}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTerritoryId(null)
          }
        }}
        players={players}
        territory={selectedTerritory}
      />
    </AppPage>
  )
}
