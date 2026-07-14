import {
  Archive,
  Brain,
  ChevronDown,
  Download,
  Gamepad2,
  GitBranch,
  ListChecks,
  Plus,
  Printer,
  Settings,
  Swords,
} from "lucide-react";
import { useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { useSwissTournaments } from "@/apps/swiss-tournaments/hooks/useSwissTournaments";
import { EmptyState } from "@/apps/shared/components/EmptyState";
import type {
  ByePolicy,
  ByeScore,
  Round,
  Tournament,
  TournamentFormat,
} from "@/apps/swiss-tournaments/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IftaInput, IftaSelectTrigger } from "@/components/ui/ifta-field";
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
  byeScoreOptions,
  plannedUnitLabelKey,
  tournamentFormatLabelKey,
} from "@/apps/swiss-tournaments/components/tournamentUiPresentation";
import { NewTournamentDialog } from "@/apps/swiss-tournaments/components/TournamentCreatorDialog";
import { ArchivedTournamentsList } from "@/apps/swiss-tournaments/components/TournamentOverview";
import type { TournamentInspection } from "@/apps/swiss-tournaments/domain/tournamentDomain";

const byePolicyOptions: Array<{ value: ByePolicy; labelKey: TranslationKey }> =
  [
    {
      value: "protectLateEntrants",
      labelKey: "swiss.byePolicy.protectLateEntrants",
    },
    { value: "lowestScore", labelKey: "swiss.byePolicy.lowestScore" },
  ];

const singleLineSelectTriggerClass =
  "min-w-0 [&>span]:min-w-0 [&>span]:truncate [&>span]:whitespace-nowrap";

function shouldShowPairingCountBadge(format?: Tournament["format"]) {
  return format !== "marioKart";
}

function currentUnitLabelKey(format?: Tournament["format"]): TranslationKey {
  return format === "marioKart" ? "swiss.currentLobby" : "swiss.currentRound";
}

function currentProgressUnitLabelKey(
  format?: Tournament["format"],
): TranslationKey {
  return format === "marioKart"
    ? "swiss.currentMarioKartRace"
    : currentUnitLabelKey(format);
}

function emptyUnitLabelKey(format?: Tournament["format"]): TranslationKey {
  return format === "marioKart"
    ? "swiss.noLobbyCreated"
    : "swiss.noRoundCreated";
}

function renderTournamentFormatIcon(format?: Tournament["format"]) {
  if (format === "roundRobin") {
    return <GitBranch className="size-5 shrink-0" />;
  }

  if (format === "handAndBrain") {
    return <Brain className="size-5 shrink-0" />;
  }

  if (format === "marioKart") {
    return <Gamepad2 className="size-5 shrink-0" />;
  }

  return <Swords className="size-5 shrink-0" />;
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

function RoundProgress({
  currentRound,
  isMarioKart = false,
  numberOfRounds,
}: {
  currentRound: number;
  isMarioKart?: boolean;
  numberOfRounds: number;
}) {
  const { t } = useI18n();
  const totalRounds = Math.max(1, numberOfRounds);
  const visibleCurrentRound = Math.min(Math.max(currentRound, 1), totalRounds);

  return (
    <div
      aria-label={t(
        isMarioKart
          ? "swiss.marioKartRaceProgressAria"
          : "swiss.roundProgressAria",
        {
          current: visibleCurrentRound,
          total: totalRounds,
        },
      )}
      className="grid grid-cols-[repeat(var(--round-count),minmax(0,1fr))] gap-1.5 md:gap-1"
      style={{ "--round-count": totalRounds } as CSSProperties}
    >
      {Array.from({ length: totalRounds }, (_, index) => {
        const roundNumber = index + 1;

        return (
          <span
            key={roundNumber}
            className={cn(
              "h-2.5 rounded-full bg-muted md:h-2",
              roundNumber < visibleCurrentRound && "bg-primary",
              roundNumber === visibleCurrentRound && "bg-yellow-400",
            )}
          />
        );
      })}
    </div>
  );
}

function TournamentFormatCard({ format }: { format: TournamentFormat }) {
  const { t } = useI18n();
  const label = t(tournamentFormatLabelKey(format));

  return (
    <Card>
      <CardHeader className="grid grid-cols-1 items-center gap-3 p-4">
        <CardDescription className="sr-only">
          {t("swiss.format.label")}
        </CardDescription>
        <div className="flex min-h-10 min-w-0 items-center gap-2 rounded-md border border-primary bg-primary/10 px-3 py-2 text-primary">
          {renderTournamentFormatIcon(format)}
          <CardTitle className="min-w-0 truncate text-lg sm:text-xl">
            {label}
          </CardTitle>
        </div>
      </CardHeader>
    </Card>
  );
}

type TournamentOverviewWorkflowProps = {
  archivedEntries: Array<{
    category: string;
    completedRounds: number;
    standings: TournamentInspection["standings"];
    tournament: Tournament;
  }>;
  inspection: TournamentInspection | null;
  onCreateTournament: ReturnType<
    typeof useSwissTournaments
  >["createNewTournament"];
  onDeleteTournament: ReturnType<
    typeof useSwissTournaments
  >["deleteTournament"];
  onExportStandingsCsv: ReturnType<
    typeof useSwissTournaments
  >["exportStandingsCsv"];
  onPrint: (tournament?: Tournament) => void;
  onUpdateSettings: ReturnType<typeof useSwissTournaments>["updateSettings"];
  onUpdateTournamentMeta: ReturnType<
    typeof useSwissTournaments
  >["updateTournamentMeta"];
  tournament: Tournament;
  tournaments: Tournament[];
};

export function TournamentOverviewWorkflow({
  archivedEntries,
  inspection,
  onCreateTournament,
  onDeleteTournament,
  onExportStandingsCsv,
  onPrint,
  onUpdateSettings,
  onUpdateTournamentMeta,
  tournament,
  tournaments,
}: TournamentOverviewWorkflowProps) {
  const { language, t } = useI18n();
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const currentRound = inspection?.latestRound ?? null;
  const currentUnitProgress = inspection?.progress.currentUnitCount ?? 0;
  const isMarioKartTournament = tournament.format === "marioKart";

  return (
    <TabsContent value="overview" className="grid gap-4">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="gap-3 p-4 md:gap-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
              <CardDescription>
                {t(currentProgressUnitLabelKey(tournament.format))}
              </CardDescription>
              <CardTitle className="type-section-title">
                {currentUnitProgress}/{tournament.numberOfRounds}
              </CardTitle>
            </div>
            <RoundProgress
              currentRound={currentUnitProgress}
              isMarioKart={isMarioKartTournament}
              numberOfRounds={tournament.numberOfRounds}
            />
          </CardHeader>
        </Card>
        <TournamentFormatCard format={tournament.format ?? "swiss"} />
        <NewTournamentDialog
          initialTournament={tournament}
          onCreate={onCreateTournament}
          tournaments={tournaments}
          trigger={
            <Button className="h-full min-h-0 w-full rounded-lg px-4 text-base shadow-sm">
              <Plus className="size-5" />
              <span className="min-w-0 truncate">
                {t("swiss.newTournament")}
              </span>
            </Button>
          }
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="size-5 text-primary" />
            {t(currentUnitLabelKey(tournament.format))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentRound ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {isMarioKartTournament
                    ? inspection?.rounds.get(currentRound.roundNumber)
                        ?.displayLabel
                    : t("common.round", { number: currentRound.roundNumber })}
                </Badge>
                <RoundStatusBadge status={currentRound.status} />
                {shouldShowPairingCountBadge(tournament.format) && (
                  <Badge variant="secondary">
                    {t("swiss.boardCount", {
                      count: currentRound.pairings.length,
                    })}
                  </Badge>
                )}
              </div>
              <PairingsTable
                inspection={inspection}
                tournament={tournament}
                pairings={currentRound.pairings}
              />
            </div>
          ) : (
            <EmptyState className="text-left">
              {t(emptyUnitLabelKey(tournament.format))}
            </EmptyState>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5 text-primary" />
            {t("swiss.settingsExport")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div
              className={cn(
                "grid gap-3",
                isMarioKartTournament && "md:col-span-2 md:grid-cols-2",
              )}
            >
              <IftaInput
                label={t("swiss.tournamentName")}
                value={tournament.name}
                onChange={(event) =>
                  void onUpdateTournamentMeta({
                    name: event.currentTarget.value,
                  })
                }
              />
              {(tournament.format ?? "swiss") !== "roundRobin" && (
                <IftaInput
                  label={t(plannedUnitLabelKey(tournament.format))}
                  min={Math.max(
                    1,
                    inspection?.progress.minimumSavableUnitCount ?? 1,
                  )}
                  type="number"
                  value={tournament.numberOfRounds}
                  onChange={(event) =>
                    void onUpdateTournamentMeta({
                      numberOfRounds: Number(event.currentTarget.value),
                    })
                  }
                />
              )}
            </div>
            {!isMarioKartTournament && (
              <div className="grid gap-3">
                <Select
                  value={String(tournament.settings.byeScore)}
                  onValueChange={(value) =>
                    void onUpdateSettings({
                      byeScore: Number(value) as ByeScore,
                    })
                  }
                >
                  <IftaSelectTrigger
                    className={singleLineSelectTriggerClass}
                    label={t("swiss.pointsPerBye")}
                  >
                    <SelectValue />
                  </IftaSelectTrigger>
                  <SelectContent>
                    {byeScoreOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={String(option.value)}
                      >
                        {language === "en" ? option.labelEn : option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={tournament.settings.byePolicy}
                  onValueChange={(value) =>
                    void onUpdateSettings({
                      byePolicy: value as ByePolicy,
                    })
                  }
                >
                  <IftaSelectTrigger
                    className={singleLineSelectTriggerClass}
                    label={t("swiss.byePolicy")}
                  >
                    <SelectValue />
                  </IftaSelectTrigger>
                  <SelectContent>
                    {byePolicyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => onPrint()}
            >
              <Printer className="size-4" />
              PDF
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => onExportStandingsCsv()}
            >
              <Download className="size-4" />
              CSV
            </Button>
          </div>

          <div className="grid gap-3 border-t pt-4">
            <button
              aria-expanded={isArchiveOpen}
              className="flex w-full items-center justify-between gap-3 rounded-md px-0 py-1 text-left"
              type="button"
              onClick={() => setIsArchiveOpen((current) => !current)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Archive className="size-5 shrink-0 text-primary" />
                <span className="type-action truncate">
                  {t("common.oldDatasets")}
                </span>
                <Badge variant="secondary">{archivedEntries.length}</Badge>
              </span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  isArchiveOpen && "rotate-180",
                )}
              />
            </button>
            {isArchiveOpen && (
              <ArchivedTournamentsList
                entries={archivedEntries}
                onDelete={async (archivedTournament) => {
                  await onDeleteTournament(archivedTournament.id);
                  toast.success(t("swiss.tournamentDeleted"));
                }}
                onExportCsv={onExportStandingsCsv}
                onPrint={onPrint}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
