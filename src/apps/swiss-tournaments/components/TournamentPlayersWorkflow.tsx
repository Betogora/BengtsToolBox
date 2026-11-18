import { CirclePlus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import type { TournamentDecision } from "@/apps/swiss-tournaments/domain/tournamentDomain";

import type { PlayerStatus, Tournament } from "@/apps/swiss-tournaments/types";
import {
  statusLabelKeys,
  statusVariant,
} from "@/apps/swiss-tournaments/components/tournamentUiPresentation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IftaInput } from "@/components/ui/ifta-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";

type PlayerChanges = { name: string; rating?: number };

type TournamentPlayersWorkflowProps = {
  canRemovePlayer: (playerId: string) => boolean;
  newPlayerName: string;
  newPlayerRating: string;
  onAddPlayer: () => unknown | Promise<unknown>;
  onChangePlayerStatus: (
    playerId: string,
    status: PlayerStatus,
  ) => unknown | Promise<unknown>;
  onNewPlayerNameChange: (value: string) => void;
  onNewPlayerRatingChange: (value: string) => void;
  onRemovePlayer: (playerId: string) => Promise<TournamentDecision | null>;
  onUpdatePlayer: (
    playerId: string,
    changes: PlayerChanges,
  ) => unknown | Promise<unknown>;
  tournament: Tournament;
};

export function TournamentPlayersWorkflow({
  canRemovePlayer,
  newPlayerName,
  newPlayerRating,
  onAddPlayer,
  onChangePlayerStatus,
  onNewPlayerNameChange,
  onNewPlayerRatingChange,
  onRemovePlayer,
  onUpdatePlayer,
  tournament,
}: TournamentPlayersWorkflowProps) {
  const { t } = useI18n();

  return (
    <TabsContent value="players" className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="size-5 text-primary" />
            {t("swiss.managePlayers")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form
            className="rounded-md bg-muted p-2 md:p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void onAddPlayer();
            }}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_4.75rem_2.75rem] gap-2 md:grid-cols-[1fr_10rem_auto] md:gap-3">
              <IftaInput
                label={t("common.name")}
                placeholder={t("swiss.newPlayer")}
                value={newPlayerName}
                onChange={(event) =>
                  onNewPlayerNameChange(event.currentTarget.value)
                }
              />
              <IftaInput
                label={t("common.rating")}
                placeholder="DWZ"
                type="number"
                value={newPlayerRating}
                onChange={(event) =>
                  onNewPlayerRatingChange(event.currentTarget.value)
                }
              />
              <Button
                aria-label={t("swiss.addPlayer")}
                className="h-11 w-full px-0 md:w-auto md:px-4"
                size="ifta"
                type="submit"
                variant="outline"
                disabled={newPlayerName.trim().length === 0}
              >
                <CirclePlus className="size-4" />
                <span className="sr-only md:not-sr-only">{t("swiss.addPlayer")}</span>
              </Button>
            </div>
          </form>

          {/* Mobil eine Tabellenzeile pro Spieler – Name, DWZ, Status und Löschen nebeneinander. */}
          <div className="divide-y overflow-hidden rounded-lg border bg-card md:hidden">
            <div className="type-field-label grid grid-cols-[1rem_minmax(0,1fr)_4rem_4.5rem_2rem] gap-1 bg-muted/50 px-2 py-1.5 text-muted-foreground max-[374px]:grid-cols-[1rem_minmax(0,1fr)_4rem]">
              <span>#</span>
              <span>{t("common.name")}</span>
              <span>{t("common.rating")}</span>
              <span className="max-[374px]:hidden">{t("common.status")}</span>
              <span className="max-[374px]:hidden" />
            </div>
            {tournament.players.map((player, index) => {
              const canRemove = canRemovePlayer(player.id);

              return (
                <div
                  key={player.id}
                  className="grid grid-cols-[1rem_minmax(0,1fr)_4rem_4.5rem_2rem] items-center gap-1 px-2 py-1.5 text-sm max-[374px]:grid-cols-[1rem_minmax(0,1fr)_4rem]"
                >
                  <span className="type-caption text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <Input
                    aria-label={t("swiss.playerNameAria", { name: player.name })}
                    className="h-9 px-2"
                    value={player.name}
                    onChange={(event) =>
                      void onUpdatePlayer(player.id, {
                        name: event.currentTarget.value,
                        rating: player.rating,
                      })
                    }
                  />
                  <Input
                    aria-label={t("swiss.playerRatingAria", { name: player.name })}
                    className="h-9 [appearance:textfield] px-1.5 tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
                    type="number"
                    value={player.rating ?? ""}
                    onChange={(event) =>
                      void onUpdatePlayer(player.id, {
                        name: player.name,
                        rating: event.currentTarget.value
                          ? Number(event.currentTarget.value)
                          : undefined,
                      })
                    }
                  />
                  {/* Unter 375 px rutschen Status und Löschen in eine zweite Zeile. */}
                  <div className="contents max-[374px]:col-span-2 max-[374px]:col-start-2 max-[374px]:grid max-[374px]:grid-cols-[minmax(0,1fr)_2rem] max-[374px]:gap-1">
                    <Select
                      value={player.status}
                      onValueChange={(value) =>
                        void onChangePlayerStatus(player.id, value as PlayerStatus)
                      }
                    >
                      <SelectTrigger
                        aria-label={t("common.status")}
                        className="h-9 gap-1 pl-2 pr-6 text-xs [&_svg]:right-1.5"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t("swiss.status.active")}</SelectItem>
                        <SelectItem value="inactive">{t("swiss.status.inactive")}</SelectItem>
                        <SelectItem value="withdrawn">{t("swiss.status.withdrawn")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <DeleteButton
                      aria-label={t("swiss.playerRemoveAria", { name: player.name })}
                      className="h-9 w-8"
                      disabled={!canRemove}
                      title={
                        canRemove
                          ? t("swiss.playerRemoveAria", { name: player.name })
                          : t("swiss.playerAlreadyUsed")
                      }
                      onClick={async () => {
                        if (!canRemove) return;
                        if ((await onRemovePlayer(player.id))?.status !== 'changed') return;
                        toast.success(t("swiss.playerRemoved", { name: player.name }));
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Table className="min-w-[52rem]" containerClassName="hidden rounded-lg border bg-card md:block">
            <TableHeader>
              <TableHead>#</TableHead>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.rating")}</TableHead>
              <TableHead>
                {t("swiss.status.fromRound", { number: "" }).trim()}
              </TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.action")}</TableHead>
            </TableHeader>
            <TableBody>
              {tournament.players.map((player, index) => {
                const canRemove = canRemovePlayer(player.id);

                return (
                  <TableRow key={player.id}>
                    <TableCell className="tabular-nums">{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        aria-label={t("swiss.playerNameAria", {
                          name: player.name,
                        })}
                        value={player.name}
                        onChange={(event) =>
                          void onUpdatePlayer(player.id, {
                            name: event.currentTarget.value,
                            rating: player.rating,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={t("swiss.playerRatingAria", {
                          name: player.name,
                        })}
                        className="w-28"
                        type="number"
                        value={player.rating ?? ""}
                        onChange={(event) =>
                          void onUpdatePlayer(player.id, {
                            name: player.name,
                            rating: event.currentTarget.value
                              ? Number(event.currentTarget.value)
                              : undefined,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {player.addedInRound}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(player.status)}>
                        {t(statusLabelKeys[player.status])}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={player.status}
                          onValueChange={(value) =>
                            void onChangePlayerStatus(
                              player.id,
                              value as PlayerStatus,
                            )
                          }
                        >
                          <SelectTrigger
                            aria-label={t("swiss.playerStatusAria", {
                              name: player.name,
                            })}
                            className="w-40"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">
                              {t("swiss.status.active")}
                            </SelectItem>
                            <SelectItem value="inactive">
                              {t("swiss.status.inactive")}
                            </SelectItem>
                            <SelectItem value="withdrawn">
                              {t("swiss.status.withdrawn")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <DeleteButton
                          aria-label={t("swiss.playerRemoveAria", {
                            name: player.name,
                          })}
                          disabled={!canRemove}
                          title={
                            canRemove
                              ? t("swiss.playerRemoveAria", {
                                  name: player.name,
                                })
                              : t("swiss.playerAlreadyUsed")
                          }
                          onClick={async () => {
                            if (!canRemove) {
                              return;
                            }

                            if ((await onRemovePlayer(player.id))?.status !== 'changed') return;
                            toast.success(
                              t("swiss.playerRemoved", { name: player.name }),
                            );
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
