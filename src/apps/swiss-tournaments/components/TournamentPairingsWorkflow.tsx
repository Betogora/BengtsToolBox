import {
  Brain,
  ChessKing,
  CheckCircle2,
  Gamepad2,
  Hand,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  Save,
  Swords,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useSwissTournaments } from "@/apps/swiss-tournaments/hooks/useSwissTournaments";
import { ConfirmButton } from "@/apps/shared/components/ConfirmButton";
import type {
  MarioKartRacer,
  Pairing,
  Round,
  Tournament,
} from "@/apps/swiss-tournaments/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IftaSelectTrigger } from "@/components/ui/ifta-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PairingsTable } from "@/apps/swiss-tournaments/components/TournamentTables";
import {
  completedUnitLabelKey,
  fixedPairingHintClassName,
  statusLabelKeys,
} from "@/apps/swiss-tournaments/components/tournamentUiPresentation";
import type { TournamentInspection } from "@/apps/swiss-tournaments/domain/tournamentDomain";

function pairingPlayerIds(pairing: Pairing) {
  return [
    pairing.whitePlayerId,
    pairing.blackPlayerId,
    pairing.byePlayerId,
    pairing.handBrainSides?.white.brainPlayerId,
    pairing.handBrainSides?.white.handPlayerId,
    pairing.handBrainSides?.black.brainPlayerId,
    pairing.handBrainSides?.black.handPlayerId,
    ...(pairing.marioKartRacers?.map((racer) => racer.playerId) ?? []),
  ].filter((playerId): playerId is string => typeof playerId === "string");
}

function pairingScoringPlayerIds(pairing: Pairing) {
  if (pairing.isBye) {
    return pairing.byePlayerId ? [pairing.byePlayerId] : [];
  }

  if (pairing.kind === "marioKart") {
    return (
      pairing.marioKartRacers
        ?.filter((racer) => racer.scoringCycleNumber !== null)
        .map((racer) => racer.playerId) ?? []
    );
  }

  return pairingPlayerIds(pairing);
}

type MarioKartCorrectionDraft = {
  tournamentId: string;
  roundNumber: number;
  racers: MarioKartRacer[];
};

const emptyPlayerSlotValue = "__empty-player-slot__";

const singleLineSelectTriggerClass =
  "min-w-0 [&>span]:min-w-0 [&>span]:truncate [&>span]:whitespace-nowrap";

function roleLabel(icon: ReactNode, label: string) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      {icon}
      <span className="truncate">{label}</span>
    </span>
  );
}

function shouldShowPairingCountBadge(format?: Tournament["format"]) {
  return format !== "marioKart";
}

function newUnitLabelKey(format?: Tournament["format"]): TranslationKey {
  return format === "marioKart" ? "swiss.newLobby" : "swiss.newRound";
}

function firstUnitHintLabelKey(format?: Tournament["format"]): TranslationKey {
  return format === "marioKart"
    ? "swiss.firstLobbyHint"
    : "swiss.firstRoundHint";
}

function RoundStatusBadge({ status }: { status: Round["status"] }) {
  const { t } = useI18n();

  return (
    <Badge variant={status === "draft" ? "default" : "secondary"}>
      {t(
        status === "draft"
          ? "swiss.unitStatus.active"
          : "swiss.unitStatus.closed",
      )}
    </Badge>
  );
}

function TournamentCompleteBanner({
  completedRounds,
  label,
  numberOfRounds,
  unitLabel,
}: {
  completedRounds: number;
  label: string;
  numberOfRounds: number;
  unitLabel: string;
}) {
  return (
    <div className="type-action flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-100 px-4 py-3 text-emerald-950">
      <CheckCircle2 className="size-5 shrink-0" />
      <span>{label}</span>
      <Badge
        className="border-emerald-300 bg-emerald-50 text-emerald-950"
        variant="outline"
      >
        {completedRounds}/{numberOfRounds} {unitLabel}
      </Badge>
    </div>
  );
}

function MarioKartPlanningBanner({ label }: { label: string }) {
  return (
    <div className="type-action flex items-center gap-2 rounded-md border border-amber-300 bg-amber-100 px-4 py-3 text-amber-950">
      <TriangleAlert className="size-5 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

type TournamentPairingsWorkflowProps = {
  inspection: TournamentInspection | null;
  tournament: Tournament;
  inspectTournament: ReturnType<
    typeof useSwissTournaments
  >["inspectTournament"];
  marioKartPlanningAvailability: ReturnType<
    typeof useSwissTournaments
  >["marioKartPlanningAvailability"];
  shouldConfirmResultCorrection: ReturnType<
    typeof useSwissTournaments
  >["shouldConfirmResultCorrection"];
  onAddManualHandBrainPairing: ReturnType<
    typeof useSwissTournaments
  >["addManualHandBrainPairing"];
  onAddManualPairing: ReturnType<
    typeof useSwissTournaments
  >["addManualPairing"];
  onCorrectMarioKartLobby: ReturnType<
    typeof useSwissTournaments
  >["correctMarioKartLobby"];
  onCorrectResult: ReturnType<typeof useSwissTournaments>["correctResult"];
  onDeleteLatestRound: ReturnType<
    typeof useSwissTournaments
  >["deleteLatestRound"];
  onGenerateRound: ReturnType<typeof useSwissTournaments>["generateRound"];
  onGoBackToPreviousRound: ReturnType<
    typeof useSwissTournaments
  >["goBackToPreviousRound"];
  onRegenerateRound: ReturnType<typeof useSwissTournaments>["regenerateRound"];
  onRemoveManualPairing: ReturnType<
    typeof useSwissTournaments
  >["removeManualPairing"];
  onSetMarioKartLobbyReservation: ReturnType<
    typeof useSwissTournaments
  >["setMarioKartLobbyReservation"];
  onSetMarioKartResult: ReturnType<
    typeof useSwissTournaments
  >["setMarioKartResult"];
  onSetResult: ReturnType<typeof useSwissTournaments>["setResult"];
};

export function TournamentPairingsWorkflow({
  inspection,
  tournament,
  inspectTournament,
  marioKartPlanningAvailability,
  shouldConfirmResultCorrection,
  onAddManualHandBrainPairing,
  onAddManualPairing,
  onCorrectMarioKartLobby,
  onCorrectResult,
  onDeleteLatestRound,
  onGenerateRound,
  onGoBackToPreviousRound,
  onRegenerateRound,
  onRemoveManualPairing,
  onSetMarioKartLobbyReservation,
  onSetMarioKartResult,
  onSetResult,
}: TournamentPairingsWorkflowProps) {
  const { t } = useI18n();
  const [manualWhite, setManualWhite] = useState("");
  const [manualBlack, setManualBlack] = useState("");
  const [manualWhiteBrain, setManualWhiteBrain] = useState("");
  const [manualWhiteHand, setManualWhiteHand] = useState("");
  const [manualBlackBrain, setManualBlackBrain] = useState("");
  const [manualBlackHand, setManualBlackHand] = useState("");
  const [marioKartReservationDraft, setMarioKartReservationDraft] = useState([
    "",
    "",
    "",
    "",
  ]);
  const [isEditingMarioKartReservation, setIsEditingMarioKartReservation] =
    useState(false);
  const [marioKartCorrection, setMarioKartCorrection] =
    useState<MarioKartCorrectionDraft | null>(null);
  const currentRound = inspection?.latestRound ?? null;
  const draftRound = inspection?.currentDraftRound ?? null;
  const canGenerateRound = inspection?.canPlanNextRound ?? false;
  const canRegenerateRound = inspection?.canRegenerateLatestRound ?? false;
  const displayedRounds = useMemo(
    () =>
      inspection
        ? [...inspection.tournament.rounds].sort(
            (left, right) => right.roundNumber - left.roundNumber,
          )
        : [],
    [inspection],
  );
  const tournamentProgress = inspection?.progress ?? null;
  const completedRounds = tournamentProgress?.completedUnitCount ?? 0;
  const completionBannerBeforeRoundNumber =
    tournamentProgress?.completionRoundNumber ?? null;
  const isMarioKartTournament = tournament.format === "marioKart";
  const manuallyUsedPlayerIds = new Set(
    (draftRound?.pairings ?? [])
      .filter((pairing) => pairing.isManual)
      .flatMap(pairingScoringPlayerIds),
  );
  const manualHandBrainIds = [
    manualWhiteBrain,
    manualWhiteHand,
    manualBlackBrain,
    manualBlackHand,
  ];
  const manualWhiteOptions = tournament.players.filter(
    (player) =>
      !manuallyUsedPlayerIds.has(player.id) && player.id !== manualBlack,
  );
  const manualBlackOptions = tournament.players.filter(
    (player) =>
      !manuallyUsedPlayerIds.has(player.id) && player.id !== manualWhite,
  );
  const canAddManualPairing =
    Boolean(manualWhite) &&
    Boolean(manualBlack) &&
    manualWhite !== manualBlack &&
    !manuallyUsedPlayerIds.has(manualWhite) &&
    !manuallyUsedPlayerIds.has(manualBlack);
  const handBrainOptionFor = (currentPlayerId: string) =>
    tournament.players.filter(
      (player) =>
        !manuallyUsedPlayerIds.has(player.id) &&
        (player.id === currentPlayerId ||
          !manualHandBrainIds.some((playerId) => playerId === player.id)),
    );
  const canAddManualHandBrainPairing =
    tournament.format === "handAndBrain" &&
    manualHandBrainIds.every(Boolean) &&
    new Set(manualHandBrainIds).size === 4 &&
    manualHandBrainIds.every(
      (playerId) => !manuallyUsedPlayerIds.has(playerId),
    );
  const selectedMarioKartReservationIds =
    marioKartReservationDraft.filter(Boolean);
  const canSaveMarioKartReservation =
    selectedMarioKartReservationIds.length >= 2 &&
    selectedMarioKartReservationIds.length <= 4 &&
    new Set(selectedMarioKartReservationIds).size ===
      selectedMarioKartReservationIds.length;
  const marioKartReservationOptionFor = (slotIndex: number) =>
    tournament.players.filter(
      (player) =>
        player.id === marioKartReservationDraft[slotIndex] ||
        !selectedMarioKartReservationIds.includes(player.id),
    );

  return (
    <TabsContent value="pairings" className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Swords className="size-5 text-primary" />
              {t("swiss.pairings")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {isMarioKartTournament && (
            <div className="grid gap-3 rounded-md border border-dashed bg-background p-3">
              {tournament.marioKartLobbyReservation &&
              !isEditingMarioKartReservation ? (
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                  <div className="grid gap-3">
                    <div className="type-action flex items-center gap-2">
                      <Pin className="size-4 text-primary" />
                      {t("swiss.marioKartFixLobby")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tournament.marioKartLobbyReservation.playerIds.map(
                        (playerId) => {
                          const player = tournament.players.find(
                            (entry) => entry.id === playerId,
                          );

                          return (
                            <span
                              key={playerId}
                              className={fixedPairingHintClassName}
                            >
                              <span className="px-2 py-0.5">
                                {player?.name ?? playerId} · {t("swiss.fixed")}
                              </span>
                            </span>
                          );
                        },
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 md:items-end">
                    <Badge className="w-fit" variant="secondary">
                      {t("swiss.marioKartFixLobbyWaiting")}
                    </Badge>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <Button
                        className="w-full md:w-auto"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMarioKartReservationDraft(
                            [
                              ...tournament.marioKartLobbyReservation!
                                .playerIds,
                              "",
                              "",
                              "",
                              "",
                            ].slice(0, 4),
                          );
                          setIsEditingMarioKartReservation(true);
                        }}
                      >
                        <Pencil className="size-4" />
                        {t("common.edit")}
                      </Button>
                      <Button
                        className="w-full md:w-auto"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await onSetMarioKartLobbyReservation(null);
                          setMarioKartReservationDraft(["", "", "", ""]);
                        }}
                      >
                        <X className="size-4" />
                        {t("swiss.marioKartFixLobbyRemove")}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="type-action flex items-center gap-2">
                    <Pin className="size-4 text-primary" />
                    {t("swiss.marioKartFixLobby")}
                  </div>
                  <div className="grid gap-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_9rem]">
                    {marioKartReservationDraft.map((playerId, slotIndex) => (
                      <Select
                        key={slotIndex}
                        value={playerId || emptyPlayerSlotValue}
                        onValueChange={(value) =>
                          setMarioKartReservationDraft((current) =>
                            current.map((entry, index) =>
                              index === slotIndex
                                ? value === emptyPlayerSlotValue
                                  ? ""
                                  : value
                                : entry,
                            ),
                          )
                        }
                      >
                        <IftaSelectTrigger
                          aria-label={t("swiss.marioKartFixedPlayerAria", {
                            number: slotIndex + 1,
                          })}
                          className={singleLineSelectTriggerClass}
                          label={roleLabel(
                            <Gamepad2 className="size-3 shrink-0 text-primary" />,
                            t("swiss.marioKartFixedPlayer", {
                              number: slotIndex + 1,
                            }),
                          )}
                        >
                          <SelectValue placeholder={t("swiss.result.open")} />
                        </IftaSelectTrigger>
                        <SelectContent>
                          <SelectItem value={emptyPlayerSlotValue}>
                            {t("swiss.result.open")}
                          </SelectItem>
                          {marioKartReservationOptionFor(slotIndex).map(
                            (player) => (
                              <SelectItem key={player.id} value={player.id}>
                                {player.name} ·{" "}
                                {t(statusLabelKeys[player.status])}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    ))}
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      <Button
                        className="h-9 w-full lg:h-11"
                        disabled={!canSaveMarioKartReservation}
                        size="ifta"
                        onClick={async () => {
                          await onSetMarioKartLobbyReservation(
                            selectedMarioKartReservationIds,
                          );
                          setMarioKartReservationDraft(["", "", "", ""]);
                          setIsEditingMarioKartReservation(false);
                          toast.success(t("swiss.marioKartFixLobbySaved"));
                        }}
                      >
                        <Pin className="size-4" />
                        {t("swiss.marioKartFixLobbyAction")}
                      </Button>
                      {isEditingMarioKartReservation && (
                        <Button
                          className="w-full"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setMarioKartReservationDraft(["", "", "", ""]);
                            setIsEditingMarioKartReservation(false);
                          }}
                        >
                          {t("common.cancel")}
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          {displayedRounds.length > 0 ? (
            displayedRounds.map((round, index) => {
              const isCurrentRound = index === 0;
              const isMarioKartLobby = tournament.format === "marioKart";
              const isEditable = isMarioKartLobby
                ? round.status === "draft"
                : isCurrentRound && round.status === "draft";
              const roundInspection = inspection?.rounds.get(round.roundNumber);
              const roundLabel =
                roundInspection?.displayLabel ?? `Runde ${round.roundNumber}`;
              const canCreateNextRound =
                isCurrentRound &&
                (isMarioKartLobby
                  ? Boolean(marioKartPlanningAvailability?.canCreate)
                  : Boolean(roundInspection?.isComplete));
              const marioKartPlanningBlockMessage =
                isMarioKartLobby && !canCreateNextRound
                  ? t(
                      marioKartPlanningAvailability?.blockedReason ===
                        "fixed-lobby-waiting"
                        ? "swiss.marioKartFixLobbyBlocked"
                        : "swiss.marioKartPlanningBlocked",
                    )
                  : null;
              const marioKartPairing = isMarioKartLobby
                ? round.pairings.find((pairing) => pairing.kind === "marioKart")
                : undefined;
              const correctionDraft =
                marioKartCorrection?.tournamentId === tournament.id &&
                marioKartCorrection.roundNumber === round.roundNumber
                  ? marioKartCorrection
                  : null;
              const shownPairings = correctionDraft
                ? round.pairings.map((pairing) =>
                    pairing.id === marioKartPairing?.id
                      ? { ...pairing, marioKartRacers: correctionDraft.racers }
                      : pairing,
                  )
                : round.pairings;
              const correctionInspection =
                correctionDraft && marioKartPairing
                  ? inspectTournament({
                      ...tournament,
                      rounds: tournament.rounds.map((entry) =>
                        entry.roundNumber === round.roundNumber
                          ? {
                              ...entry,
                              pairings: entry.pairings.map((pairing) =>
                                pairing.id === marioKartPairing.id
                                  ? {
                                      ...pairing,
                                      marioKartRacers: correctionDraft.racers,
                                    }
                                  : pairing,
                              ),
                            }
                          : entry,
                      ),
                    })
                  : inspection;
              const correctionIsValid =
                !correctionDraft ||
                !marioKartPairing ||
                correctionInspection?.pairings.get(marioKartPairing.id)
                  ?.marioKartPlacementErrors.size === 0;
              const canMutateMarioKartLineup =
                isMarioKartLobby &&
                Boolean(roundInspection?.isLatestEmptyMarioKartLobby);
              const canGoBackToRound =
                index === 1 &&
                round.status === "completed" &&
                currentRound?.roundNumber === round.roundNumber + 1;

              return (
                <Fragment key={round.id}>
                  {isCurrentRound && marioKartPlanningBlockMessage && (
                    <MarioKartPlanningBanner
                      label={marioKartPlanningBlockMessage}
                    />
                  )}
                  {round.roundNumber === completionBannerBeforeRoundNumber && (
                    <TournamentCompleteBanner
                      completedRounds={completedRounds}
                      label={t("swiss.tournamentComplete")}
                      numberOfRounds={tournament.numberOfRounds}
                      unitLabel={t(completedUnitLabelKey(tournament.format))}
                    />
                  )}
                  <Card
                    className={cn(
                      "overflow-hidden",
                      round.status === "draft"
                        ? "border-l-4 border-l-primary bg-primary/5"
                        : "bg-card/80 opacity-85",
                    )}
                  >
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <CardTitle>{roundLabel}</CardTitle>
                          <RoundStatusBadge status={round.status} />
                          {shouldShowPairingCountBadge(tournament.format) && (
                            <Badge variant="outline">
                              {t("swiss.boardCount", {
                                count: round.pairings.length,
                              })}
                            </Badge>
                          )}
                        </div>
                        <div className="flex w-full min-w-0 flex-col justify-end gap-2 md:w-auto md:flex-row">
                          {!isMarioKartLobby &&
                            canGoBackToRound &&
                            currentRound && (
                              <ConfirmButton
                                title={t("swiss.backToRoundTitle", {
                                  number: round.roundNumber,
                                })}
                                description={t("swiss.backToRoundDescription", {
                                  current: currentRound.roundNumber,
                                  target: round.roundNumber,
                                })}
                                confirmLabel={t("swiss.backToRound")}
                                onConfirm={async () => {
                                  await onGoBackToPreviousRound();
                                  toast.success(
                                    t("swiss.backToRoundSuccess", {
                                      number: round.roundNumber,
                                    }),
                                  );
                                }}
                                trigger={
                                  <Button
                                    aria-label={t("swiss.backToRoundAria")}
                                    className="h-8 w-full shrink-0 p-0 md:w-10"
                                    title={t("swiss.backToRoundAria")}
                                    variant="outline"
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                }
                              />
                            )}
                          {isCurrentRound && (
                            <Button
                              className="h-8 w-full md:w-auto"
                              disabled={!canCreateNextRound}
                              title={marioKartPlanningBlockMessage ?? undefined}
                              onClick={() => void onGenerateRound()}
                            >
                              <Plus className="size-4" />
                              {t(newUnitLabelKey(tournament.format))}
                            </Button>
                          )}
                          {isMarioKartLobby ? (
                            <>
                              {round.status === "completed" &&
                                !correctionDraft && (
                                  <Button
                                    aria-label={t("swiss.marioKartEditLobby")}
                                    className="h-8 w-full p-0 md:w-10"
                                    size="sm"
                                    title={t("swiss.marioKartEditLobby")}
                                    variant="outline"
                                    onClick={() =>
                                      setMarioKartCorrection({
                                        tournamentId: tournament.id,
                                        roundNumber: round.roundNumber,
                                        racers: [
                                          ...(inspection?.pairings.get(
                                            marioKartPairing!.id,
                                          )?.marioKartRacers ?? []),
                                        ].map((racer) => ({ ...racer })),
                                      })
                                    }
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                )}
                              {correctionDraft && (
                                <>
                                  <Button
                                    aria-label={t("common.cancel")}
                                    className="h-8 w-full p-0 md:w-10"
                                    size="sm"
                                    title={t("common.cancel")}
                                    variant="outline"
                                    onClick={() => setMarioKartCorrection(null)}
                                  >
                                    <X className="size-4" />
                                  </Button>
                                  <Button
                                    aria-label={t(
                                      "swiss.marioKartSaveCorrection",
                                    )}
                                    className="h-8 w-full p-0 md:w-10"
                                    disabled={!correctionIsValid}
                                    size="sm"
                                    title={t("swiss.marioKartSaveCorrection")}
                                    onClick={async () => {
                                      await onCorrectMarioKartLobby(
                                        round.roundNumber,
                                        correctionDraft.racers,
                                      );
                                      setMarioKartCorrection(null);
                                    }}
                                  >
                                    <Save className="size-4" />
                                  </Button>
                                </>
                              )}
                              {canMutateMarioKartLineup && (
                                <>
                                  <Button
                                    className="h-8 w-full md:w-auto"
                                    variant="outline"
                                    onClick={() => void onRegenerateRound()}
                                  >
                                    <RefreshCw className="size-4" />
                                    {t("swiss.regenerate")}
                                  </Button>
                                  <Button
                                    aria-label={t("swiss.deleteRound")}
                                    className="h-8 w-full p-0 md:w-10"
                                    size="sm"
                                    title={t("swiss.deleteRound")}
                                    variant="delete"
                                    onClick={() => void onDeleteLatestRound()}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </>
                              )}
                            </>
                          ) : isCurrentRound ? (
                            <>
                              {isEditable && (
                                <Button
                                  className="h-8 w-full md:w-auto"
                                  disabled={!canRegenerateRound}
                                  variant="outline"
                                  onClick={() => void onRegenerateRound()}
                                >
                                  <RefreshCw className="size-4" />
                                  {t("swiss.regenerate")}
                                </Button>
                              )}
                              <ConfirmButton
                                title={t("swiss.deleteRoundTitle", {
                                  round: roundLabel,
                                })}
                                description={
                                  index + 1 < displayedRounds.length
                                    ? t(
                                        "swiss.deleteRoundDescriptionWithPrevious",
                                      )
                                    : t("swiss.deleteRoundDescription")
                                }
                                confirmLabel={t("common.delete")}
                                onConfirm={async () => {
                                  await onDeleteLatestRound();
                                  toast.success(
                                    index + 1 < displayedRounds.length
                                      ? t(
                                          "swiss.deleteRoundSuccessWithPrevious",
                                          {
                                            round: roundLabel,
                                          },
                                        )
                                      : t("swiss.deleteRoundSuccess", {
                                          round: roundLabel,
                                        }),
                                  );
                                }}
                                trigger={
                                  <Button
                                    aria-label={t("swiss.deleteRound")}
                                    className="h-8 w-full p-0 md:w-10"
                                    size="sm"
                                    title={t("swiss.deleteRound")}
                                    variant="delete"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                }
                              />
                            </>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 p-4 pt-0 sm:p-6 sm:pt-0">
                      <PairingsTable
                        editable={isEditable || Boolean(correctionDraft)}
                        inspection={correctionInspection ?? inspection}
                        pairings={shownPairings}
                        resultCorrectionEnabled={
                          !isEditable && round.status === "completed"
                        }
                        showWarnings
                        tournament={tournament}
                        onManualPairingRemove={(pairingId) =>
                          void onRemoveManualPairing(
                            round.roundNumber,
                            pairingId,
                          )
                        }
                        onMarioKartResultChange={(
                          pairingId,
                          playerId,
                          partial,
                        ) => {
                          if (correctionDraft) {
                            setMarioKartCorrection((current) =>
                              current
                                ? {
                                    ...current,
                                    racers: current.racers.map((racer) =>
                                      racer.playerId === playerId
                                        ? { ...racer, ...partial }
                                        : racer,
                                    ),
                                  }
                                : current,
                            );
                            return;
                          }

                          void onSetMarioKartResult(
                            round.roundNumber,
                            pairingId,
                            playerId,
                            partial,
                          );
                        }}
                        onResultCorrection={(pairingId, result) =>
                          onCorrectResult(round.roundNumber, pairingId, result)
                        }
                        shouldConfirmResultCorrection={(pairingId, result) =>
                          shouldConfirmResultCorrection(
                            round.roundNumber,
                            pairingId,
                            result,
                          )
                        }
                        onResultChange={(pairingId, result) =>
                          void onSetResult(round.roundNumber, pairingId, result)
                        }
                      />
                      {isEditable &&
                        draftRound &&
                        tournament.format !== "marioKart" && (
                          <div className="grid gap-3 rounded-md border border-dashed bg-background p-3">
                            {tournament.format === "handAndBrain" && (
                              <div className="grid gap-2">
                                <div className="type-action flex items-center gap-2">
                                  <Brain className="size-4 text-primary" />
                                  {t("swiss.handAndBrainFixBoard")}
                                </div>
                                <div className="grid gap-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_8.5rem]">
                                  <div className="grid gap-2 sm:grid-cols-2 lg:contents">
                                    <Select
                                      value={manualWhiteBrain}
                                      onValueChange={setManualWhiteBrain}
                                    >
                                      <IftaSelectTrigger
                                        aria-label={t("swiss.whiteBrain")}
                                        className={singleLineSelectTriggerClass}
                                        label={roleLabel(
                                          <Brain className="size-3 shrink-0 text-primary" />,
                                          t("swiss.whiteBrain"),
                                        )}
                                      >
                                        <SelectValue
                                          placeholder={t("swiss.result.open")}
                                        />
                                      </IftaSelectTrigger>
                                      <SelectContent>
                                        {handBrainOptionFor(
                                          manualWhiteBrain,
                                        ).map((player) => (
                                          <SelectItem
                                            key={player.id}
                                            value={player.id}
                                          >
                                            {player.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select
                                      value={manualWhiteHand}
                                      onValueChange={setManualWhiteHand}
                                    >
                                      <IftaSelectTrigger
                                        aria-label={t("swiss.whiteHand")}
                                        className={singleLineSelectTriggerClass}
                                        label={roleLabel(
                                          <Hand className="size-3 shrink-0 text-primary" />,
                                          t("swiss.whiteHand"),
                                        )}
                                      >
                                        <SelectValue
                                          placeholder={t("swiss.result.open")}
                                        />
                                      </IftaSelectTrigger>
                                      <SelectContent>
                                        {handBrainOptionFor(
                                          manualWhiteHand,
                                        ).map((player) => (
                                          <SelectItem
                                            key={player.id}
                                            value={player.id}
                                          >
                                            {player.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-2 lg:contents">
                                    <Select
                                      value={manualBlackBrain}
                                      onValueChange={setManualBlackBrain}
                                    >
                                      <IftaSelectTrigger
                                        aria-label={t("swiss.blackBrain")}
                                        className={singleLineSelectTriggerClass}
                                        label={roleLabel(
                                          <Brain className="size-3 shrink-0 text-primary" />,
                                          t("swiss.blackBrain"),
                                        )}
                                      >
                                        <SelectValue
                                          placeholder={t("swiss.result.open")}
                                        />
                                      </IftaSelectTrigger>
                                      <SelectContent>
                                        {handBrainOptionFor(
                                          manualBlackBrain,
                                        ).map((player) => (
                                          <SelectItem
                                            key={player.id}
                                            value={player.id}
                                          >
                                            {player.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select
                                      value={manualBlackHand}
                                      onValueChange={setManualBlackHand}
                                    >
                                      <IftaSelectTrigger
                                        aria-label={t("swiss.blackHand")}
                                        className={singleLineSelectTriggerClass}
                                        label={roleLabel(
                                          <Hand className="size-3 shrink-0 text-primary" />,
                                          t("swiss.blackHand"),
                                        )}
                                      >
                                        <SelectValue
                                          placeholder={t("swiss.result.open")}
                                        />
                                      </IftaSelectTrigger>
                                      <SelectContent>
                                        {handBrainOptionFor(
                                          manualBlackHand,
                                        ).map((player) => (
                                          <SelectItem
                                            key={player.id}
                                            value={player.id}
                                          >
                                            {player.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button
                                    className="h-9 w-full lg:h-11"
                                    size="ifta"
                                    disabled={!canAddManualHandBrainPairing}
                                    onClick={async () => {
                                      if (!canAddManualHandBrainPairing) {
                                        return;
                                      }

                                      await onAddManualHandBrainPairing(
                                        draftRound.roundNumber,
                                        {
                                          white: {
                                            brainPlayerId: manualWhiteBrain,
                                            handPlayerId: manualWhiteHand,
                                          },
                                          black: {
                                            brainPlayerId: manualBlackBrain,
                                            handPlayerId: manualBlackHand,
                                          },
                                        },
                                      );
                                      setManualWhiteBrain("");
                                      setManualWhiteHand("");
                                      setManualBlackBrain("");
                                      setManualBlackHand("");
                                      toast.success(
                                        t("swiss.handAndBrainFixed"),
                                      );
                                    }}
                                  >
                                    <Pin className="size-4" />
                                    {t("swiss.handAndBrainFix")}
                                  </Button>
                                </div>
                              </div>
                            )}
                            <div className="grid gap-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_8.5rem]">
                              <Select
                                value={manualWhite}
                                onValueChange={setManualWhite}
                              >
                                <IftaSelectTrigger
                                  aria-label={t("swiss.white")}
                                  className={singleLineSelectTriggerClass}
                                  containerClassName="lg:col-span-2"
                                  label={roleLabel(
                                    <ChessKing className="size-3 shrink-0 text-primary" />,
                                    t("swiss.white"),
                                  )}
                                >
                                  <SelectValue
                                    placeholder={t("swiss.result.open")}
                                  />
                                </IftaSelectTrigger>
                                <SelectContent>
                                  {manualWhiteOptions.map((player) => (
                                    <SelectItem
                                      key={player.id}
                                      value={player.id}
                                    >
                                      {player.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={manualBlack}
                                onValueChange={setManualBlack}
                              >
                                <IftaSelectTrigger
                                  aria-label={t("swiss.black")}
                                  className={singleLineSelectTriggerClass}
                                  containerClassName="lg:col-span-2"
                                  label={roleLabel(
                                    <ChessKing className="size-3 shrink-0 text-primary" />,
                                    t("swiss.black"),
                                  )}
                                >
                                  <SelectValue
                                    placeholder={t("swiss.result.open")}
                                  />
                                </IftaSelectTrigger>
                                <SelectContent>
                                  {manualBlackOptions.map((player) => (
                                    <SelectItem
                                      key={player.id}
                                      value={player.id}
                                    >
                                      {player.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                className="h-9 w-full lg:h-11"
                                size="ifta"
                                disabled={!canAddManualPairing}
                                onClick={async () => {
                                  if (!canAddManualPairing) {
                                    return;
                                  }

                                  await onAddManualPairing(
                                    draftRound.roundNumber,
                                    manualWhite,
                                    manualBlack,
                                  );
                                  setManualWhite("");
                                  setManualBlack("");
                                  toast.success(t("swiss.manualPairingFixed"));
                                }}
                              >
                                <Pin className="size-4" />
                                {tournament.format === "handAndBrain"
                                  ? t("swiss.singleGameFix")
                                  : t("swiss.fix")}
                              </Button>
                            </div>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                </Fragment>
              );
            })
          ) : (
            <>
              {tournament.format === "marioKart" && !canGenerateRound && (
                <MarioKartPlanningBanner
                  label={t(
                    marioKartPlanningAvailability?.blockedReason ===
                      "fixed-lobby-waiting"
                      ? "swiss.marioKartFixLobbyBlocked"
                      : "swiss.marioKartPlanningBlocked",
                  )}
                />
              )}
              <div className="type-ui flex flex-col gap-3 rounded-md border border-dashed p-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>{t(firstUnitHintLabelKey(tournament.format))}</span>
                <Button
                  className="w-full sm:w-auto"
                  disabled={!canGenerateRound}
                  title={
                    tournament.format === "marioKart" && !canGenerateRound
                      ? t(
                          marioKartPlanningAvailability?.blockedReason ===
                            "fixed-lobby-waiting"
                            ? "swiss.marioKartFixLobbyBlocked"
                            : "swiss.marioKartPlanningBlocked",
                        )
                      : undefined
                  }
                  onClick={() => void onGenerateRound()}
                >
                  <Plus className="size-4" />
                  {t(newUnitLabelKey(tournament.format))}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
