import { CirclePlus, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";

import type { PlayerStatus, Tournament } from "@/apps/swiss-tournaments/types";
import {
  statusLabelKeys,
  statusVariant,
} from "@/apps/swiss-tournaments/components/tournamentUiPresentation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IftaInput, IftaSelectTrigger } from "@/components/ui/ifta-field";
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
  onRemovePlayer: (playerId: string) => unknown | Promise<unknown>;
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
            className="rounded-md border border-dashed bg-background p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void onAddPlayer();
            }}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2 md:grid-cols-[1fr_10rem_auto] md:gap-3">
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
                className="col-span-2 h-9 w-full md:col-span-1 md:h-11 md:w-auto"
                size="ifta"
                type="submit"
                variant="outline"
                disabled={newPlayerName.trim().length === 0}
              >
                <CirclePlus className="size-4" />
                {t("swiss.addPlayer")}
              </Button>
            </div>
          </form>

          <div className="grid gap-2 md:hidden">
            <div className="type-field-label grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2 px-2 text-muted-foreground">
              <span>{t("common.name")}</span>
              <span>{t("common.rating")}</span>
            </div>
            {tournament.players.map((player, index) => {
              const canRemove = canRemovePlayer(player.id);

              return (
                <div
                  key={player.id}
                  className="grid gap-3 rounded-md border bg-card p-2.5 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="type-caption flex h-6 min-w-7 items-center justify-center rounded-md border bg-secondary px-2 tabular-nums">
                        #{index + 1}
                      </span>
                      <Badge
                        className="h-6"
                        variant={statusVariant(player.status)}
                      >
                        {t(statusLabelKeys[player.status])}
                      </Badge>
                    </div>
                    <span className="type-caption text-muted-foreground tabular-nums">
                      {t("swiss.playerFromRound", {
                        number: player.addedInRound,
                      })}
                    </span>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
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
                    <Input
                      aria-label={t("swiss.playerRatingAria", {
                        name: player.name,
                      })}
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
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
                    <Select
                      value={player.status}
                      onValueChange={(value) =>
                        void onChangePlayerStatus(
                          player.id,
                          value as PlayerStatus,
                        )
                      }
                    >
                      <IftaSelectTrigger label={t("common.status")}>
                        <SelectValue />
                      </IftaSelectTrigger>
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
                    <Button
                      aria-label={t("swiss.playerRemoveAria", {
                        name: player.name,
                      })}
                      className="h-11 w-9 px-0"
                      size="ifta"
                      disabled={!canRemove}
                      title={
                        canRemove
                          ? t("swiss.playerRemoveAria", { name: player.name })
                          : t("swiss.playerAlreadyUsed")
                      }
                      variant="delete"
                      onClick={async () => {
                        if (!canRemove) {
                          return;
                        }

                        await onRemovePlayer(player.id);
                        toast.success(
                          t("swiss.playerRemoved", { name: player.name }),
                        );
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Table className="min-w-[52rem]" containerClassName="hidden md:block">
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
                        <Button
                          aria-label={t("swiss.playerRemoveAria", {
                            name: player.name,
                          })}
                          className="h-9"
                          disabled={!canRemove}
                          size="sm"
                          title={
                            canRemove
                              ? t("swiss.playerRemoveAria", {
                                  name: player.name,
                                })
                              : t("swiss.playerAlreadyUsed")
                          }
                          variant="delete"
                          onClick={async () => {
                            if (!canRemove) {
                              return;
                            }

                            await onRemovePlayer(player.id);
                            toast.success(
                              t("swiss.playerRemoved", { name: player.name }),
                            );
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
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
