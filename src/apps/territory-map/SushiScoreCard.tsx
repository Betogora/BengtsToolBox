import {
  Check,
  CirclePlus,
  ListOrdered,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'

import { CollapsibleCardHeader } from '@/apps/territory-map/components'
import type { SushiScore } from '@/apps/territory-map/sushiScores'
import type { TerritoryPlayer } from '@/apps/territory-map/types'
import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ColorPicker } from '@/components/ui/ColorPicker'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n } from '@/lib/i18n'

export function SushiScoreCard({
  isDatasetReady,
  isOpen,
  onAdd,
  onColorChange,
  onNameChange,
  onRemove,
  onToggle,
  players,
  scores,
}: {
  isDatasetReady: boolean
  isOpen: boolean
  onAdd: () => Promise<void>
  onColorChange: (playerId: string, color: string) => unknown
  onNameChange: (playerId: string, name: string) => Promise<unknown> | void
  onRemove: (playerId: string) => unknown
  onToggle: () => void
  players: TerritoryPlayer[]
  scores: SushiScore[]
}) {
  const { t } = useI18n()
  const [isEditRequested, setIsEditRequested] = useState(false)
  // Ohne synchronisierten Datensatz bleibt die Tabelle schreibgeschützt.
  const isEditing = isEditRequested && isDatasetReady
  // Die drei Stammspieler bleiben immer erhalten.
  const removableIds = new Set(players.slice(3).map((player) => player.id))

  return (
    <Card className="min-w-0">
      <CollapsibleCardHeader
        icon={<ListOrdered className="size-5" />}
        isOpen={isOpen}
        title={t('territory.score')}
        onToggle={onToggle}
      />
      {isOpen && (
        <CardContent className="grid gap-3 p-4 pt-0 sm:p-6 sm:pt-0">
          <Table className="table-fixed">
            <colgroup>
              <col />
              <col className="w-10 min-[360px]:w-12 md:w-24" />
              <col className="w-10 min-[360px]:w-12 md:w-32" />
              <col className="w-[3.25rem] min-[360px]:w-14 md:w-24" />
              {isEditing && <col className="w-9 md:w-12" />}
            </colgroup>
            <TableHeader>
              <TableHead className="px-2 py-2 md:px-3">{t('territory.player')}</TableHead>
              <TableHead className="px-1 py-2 text-right md:px-3">
                {t('territory.world')}
              </TableHead>
              <TableHead className="px-1 py-2 text-right md:px-3">
                <span className="md:hidden">DE</span>
                <span className="hidden md:inline">{t('territory.map.germany')}</span>
              </TableHead>
              <TableHead className="py-2 pr-2 pl-1 text-right md:px-3">
                {t('territory.total')}
              </TableHead>
              {isEditing && (
                <TableHead className="px-0 py-2">
                  <span className="sr-only">{t('common.delete')}</span>
                </TableHead>
              )}
            </TableHeader>
            <TableBody>
              {scores.map(({ player, world, germany, total }) => (
                <TableRow key={player.id} className={isEditing ? 'relative' : undefined}>
                  <TableCell
                    className={[
                      'type-label min-w-0 md:px-3',
                      isEditing ? 'py-1.5 pr-1 pl-1.5' : 'px-2 py-2',
                    ].join(' ')}
                  >
                    {isEditing ? (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <ColorPicker
                          ariaLabel={t('territory.touristColorAria', { name: player.name })}
                          className="size-6 shrink-0 cursor-pointer p-px md:size-8 md:p-0.5"
                          value={player.color}
                          onValueCommit={(color) => onColorChange(player.id, color)}
                        />
                        {/* Beim Umbenennen überdeckt das Eingabefeld die ganze Zeile. */}
                        <span className="min-w-0 flex-1 has-[input]:absolute has-[input]:inset-0 has-[input]:z-10 has-[input]:flex has-[input]:items-center has-[input]:bg-card has-[input]:px-1.5">
                          <InlineTextEdit
                            ariaLabel={t('territory.touristNameAria', { name: player.name })}
                            className="w-full px-1 underline decoration-dotted decoration-subtle-foreground underline-offset-4"
                            fallback={`Sushi-Tourist ${player.position}`}
                            triggerMode="label"
                            value={player.name}
                            onSave={(value) => onNameChange(player.id, value)}
                          />
                        </span>
                      </span>
                    ) : (
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: player.color }}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 truncate">{player.name}</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-1 py-2 text-right tabular-nums md:px-3">
                    {world}
                  </TableCell>
                  <TableCell className="px-1 py-2 text-right tabular-nums md:px-3">
                    {germany}
                  </TableCell>
                  <TableCell className="type-action py-2 pr-2 pl-1 text-right tabular-nums md:px-3">
                    {total}
                  </TableCell>
                  {isEditing && (
                    <TableCell className="px-0 py-1.5 pr-1 text-right md:pr-2">
                      {removableIds.has(player.id) && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="size-7 md:size-8"
                          aria-label={t('shared.playerCard.removeAria', { name: player.name })}
                          onClick={() => void onRemove(player.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {isEditing && (
                <TableRow>
                  <TableCell className="px-2 py-2 md:px-3" colSpan={5}>
                    <Button
                      className="h-9 w-full border-dashed"
                      variant="outline"
                      onClick={() => void onAdd()}
                    >
                      <CirclePlus className="size-4" />
                      {t('territory.addTourist')}
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant={isEditing ? 'default' : 'outline'}
              disabled={!isDatasetReady}
              onClick={() => setIsEditRequested(!isEditing)}
            >
              {isEditing ? <Check className="size-4" /> : <Pencil className="size-4" />}
              {t(isEditing ? 'territory.editTouristsDone' : 'territory.editTourists')}
            </Button>
          </div>
          {!isDatasetReady && (
            <p className="type-ui text-muted-foreground">{t('common.syncing')}</p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
