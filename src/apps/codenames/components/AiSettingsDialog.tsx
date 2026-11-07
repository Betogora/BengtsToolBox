import { Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { DEFAULT_MODEL, isModelId, REASONING_LEVELS, type Reasoning } from '@/apps/codenames/logic/protocol'
import type { CodenamesAiSettings } from '@/apps/codenames/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IftaInput } from '@/components/ui/ifta-field'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useI18n, type TranslationKey } from '@/lib/i18n'

const REASONING_LABEL: Record<Reasoning, TranslationKey> = {
  none: 'codenames.reasoning.none',
  low: 'codenames.reasoning.low',
  medium: 'codenames.reasoning.medium',
  high: 'codenames.reasoning.high',
}

export function AiSettingsDialog({
  open,
  onOpenChange,
  settings,
  aiConfigured,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: CodenamesAiSettings
  aiConfigured: boolean | null
  onUpdate: (patch: Partial<CodenamesAiSettings>) => void
}) {
  const { t } = useI18n()
  const [model, setModel] = useState(settings.model)
  const [reasoning, setReasoning] = useState(settings.reasoning)
  const modelValid = isModelId(model.trim())

  const changeOpen = (next: boolean) => {
    if (next) {
      setModel(settings.model)
      setReasoning(settings.reasoning)
    }
    onOpenChange(next)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!modelValid) return
    onUpdate({ model: model.trim(), reasoning })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent>
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" aria-hidden="true" />
              {t('codenames.ai.title')}
            </DialogTitle>
            <DialogDescription>{t('codenames.ai.description')}</DialogDescription>
          </DialogHeader>

          <Badge variant={aiConfigured ? 'default' : 'secondary'} className="h-auto whitespace-normal py-1">
            {aiConfigured === null
              ? t('codenames.error.proxy')
              : aiConfigured ? t('codenames.ai.configured') : t('codenames.ai.missing')}
          </Badge>

          <IftaInput
            label={t('codenames.ai.model')}
            value={model}
            spellCheck={false}
            placeholder={DEFAULT_MODEL}
            aria-invalid={!modelValid || undefined}
            onChange={(event) => setModel(event.target.value)}
          />
          {!modelValid && <p className="type-caption text-destructive">{t('codenames.ai.invalidModel')}</p>}

          <div className="grid gap-2">
            <div className="type-field-label text-muted-foreground" id="codenames-reasoning">{t('codenames.ai.reasoning')}</div>
            <SegmentedControl
              aria-labelledby="codenames-reasoning"
              value={reasoning}
              options={REASONING_LEVELS.map((value) => ({ value, label: t(REASONING_LABEL[value]) }))}
              onValueChange={(value) => setReasoning(value as Reasoning)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => changeOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!modelValid}>{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
