import { useState } from 'react'

import type {
  ProgressDrinkIcon,
  ProgressPlayer,
} from '@/apps/progress-dashboard/types'
import { formatNumber } from '@/apps/progress-dashboard/format'
import { PersonOption } from '@/apps/shared/components/PersonOption'
import { eventIconComponents } from '@/apps/progress-dashboard/eventIcons'
import {
  defaultProgressDrinkIcon,
  getDrinkIconEventDelta,
} from '@/apps/progress-dashboard/logic'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useI18n } from '@/lib/i18n'

const entryAmountPresets = [0.25, 0.5, 1, 2, 3]

// Ein Dialog für alle Eintragungen: wer, was, wie viel.
export function ProgressEntryDialog({
  drinkIcons,
  onOpenChange,
  onSave,
  open,
  players,
}: {
  drinkIcons: { id: ProgressDrinkIcon; label: string }[]
  onOpenChange: (open: boolean) => void
  onSave: (player: ProgressPlayer, icon: ProgressDrinkIcon, amount: number) => void
  open: boolean
  players: ProgressPlayer[]
}) {
  const { t } = useI18n()
  // Bewusst ohne Vorauswahl, damit kein Eintrag beim falschen Spieler landet.
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [icon, setIcon] = useState<ProgressDrinkIcon>(defaultProgressDrinkIcon)
  const [amount, setAmount] = useState(getDrinkIconEventDelta(defaultProgressDrinkIcon))
  const player = players.find((entry) => entry.id === playerId)
  const drinkLabel = drinkIcons.find((entry) => entry.id === icon)?.label ?? ''
  const selectPlayer = (next: ProgressPlayer) => {
    setPlayerId(next.id)
    const nextIcon = next.defaultEventIcon ?? defaultProgressDrinkIcon
    setIcon(nextIcon)
    setAmount(getDrinkIconEventDelta(nextIcon))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-5 overflow-y-auto p-4 sm:max-w-lg sm:p-6">
        <DialogHeader>
          <DialogTitle>{t('progress.entry.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('progress.entry.description')}
          </DialogDescription>
        </DialogHeader>

        <fieldset className="grid min-w-0 gap-2">
          <legend className="type-label mb-2 text-muted-foreground">{t('progress.entry.player')}</legend>
          <div role="radiogroup" aria-label={t('progress.entry.player')} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {players.map((entry) => (
              <PersonOption
                key={entry.id}
                checked={entry.id === playerId}
                color={entry.color}
                name={entry.name}
                onSelect={() => selectPlayer(entry)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="grid min-w-0 gap-2">
          <legend className="type-label mb-2 text-muted-foreground">{t('progress.entry.drink')}</legend>
          <SegmentedControl
            aria-label={t('progress.entry.drink')}
            style={{ width: '100%' }}
            variant="icon-tabs"
            value={icon}
            options={drinkIcons.map((entry) => ({
              value: entry.id,
              label: entry.label,
              icon: eventIconComponents[entry.id],
            }))}
            onValueChange={(value) => {
              const nextIcon = value as ProgressDrinkIcon
              setIcon(nextIcon)
              setAmount(getDrinkIconEventDelta(nextIcon))
            }}
          />
        </fieldset>

        <fieldset className="grid min-w-0 gap-2">
          <legend className="type-label mb-2 text-muted-foreground">{t('progress.entry.amount')}</legend>
          <SegmentedControl
            aria-label={t('progress.entry.amount')}
            style={{ width: '100%' }}
            value={String(amount)}
            options={entryAmountPresets.map((preset) => ({
              value: String(preset),
              label: preset === 0.25 ? '¼' : preset === 0.5 ? '½' : String(preset),
            }))}
            onValueChange={(value) => setAmount(Number(value))}
          />
        </fieldset>

        <Button
          className="h-11 w-full"
          disabled={!player}
          onClick={() => {
            if (!player) return
            onSave(player, icon, amount)
            onOpenChange(false)
          }}
        >
          {player ? (
            <>
              <span
                className="size-2.5 shrink-0 rounded-full ring-2 ring-primary-foreground/80"
                style={{ backgroundColor: player.color }}
              />
              <span className="min-w-0 truncate">
                {t('progress.entry.save', {
                  amount: formatNumber(amount),
                  drink: drinkLabel,
                  name: player.name,
                })}
              </span>
            </>
          ) : (
            t('progress.entry.choosePlayer')
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
