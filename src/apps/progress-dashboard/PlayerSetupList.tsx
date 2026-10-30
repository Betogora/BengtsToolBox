import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'

import type { PlayerScore } from '@/apps/progress-dashboard/types'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
import { Button } from '@/components/ui/button'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { useI18n } from '@/lib/i18n'

// Spieler verwalten: Name, Farbe, Löschen, Hinzufügen und Einheit.
export function PlayerSetupList({
  onAdd,
  onColorChange,
  onNameChange,
  onRemove,
  playerScores,
  unitInput,
}: {
  onAdd: () => void
  onColorChange: (playerId: string, color: string) => void
  onNameChange: (playerId: string, name: string) => void
  onRemove: (playerId: string) => void
  playerScores: PlayerScore[]
  unitInput: ReactNode
}) {
  const { t } = useI18n()

  return (
    <div className="grid gap-3">
      <ul className="grid gap-2 md:grid-cols-2">
        {playerScores.map(({ player }) => (
          <li
            key={player.id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border p-2 pl-3"
            style={{ backgroundColor: `color-mix(in srgb, ${player.color} 10%, var(--card))` }}
          >
            <ColorPicker
              ariaLabel={t('progress.chooseColorAria', { name: player.name })}
              value={player.color}
              onValueCommit={(color) => onColorChange(player.id, color)}
            />
            <InlineTextEdit
              ariaLabel={t('progress.playerNameAria', { name: player.name })}
              className="type-action py-1"
              fallback={`Person ${player.position}`}
              inputClassName="type-action h-11"
              value={player.name}
              onSave={(value) => onNameChange(player.id, value)}
            />
            <ConfirmButton
              mode="popover"
              title={t('progress.playerDeleteTitle')}
              description={t('progress.playerDeleteDescription', { name: player.name })}
              onConfirm={() => onRemove(player.id)}
              trigger={
                <DeleteButton
                  tone="quiet"
                  className="size-11 sm:size-9"
                  aria-label={t('shared.playerCard.removeAria', { name: player.name })}
                />
              }
            />
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,18rem)] sm:items-center sm:justify-between">
        <Button variant="outline" className="h-11" onClick={onAdd}>
          <Plus />
          {t('progress.addPlayer')}
        </Button>
        {unitInput}
      </div>
    </div>
  )
}
