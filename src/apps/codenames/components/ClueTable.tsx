import { COLOR_LABEL_KEY, DOT, TEAM_LABEL_KEY } from '@/apps/codenames/components/teamStyle'
import type { PublicView } from '@/apps/codenames/logic/view'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function ClueTable({ view }: { view: PublicView }) {
  const { t } = useI18n()
  if (!view.history.length) return <p className="type-ui text-muted-foreground">{t('codenames.noClues')}</p>

  return (
    <Table aria-label={t('codenames.allClues')}>
      <TableHeader>
        <TableHead>{t('codenames.table.team')}</TableHead>
        <TableHead>{t('codenames.table.clue')}</TableHead>
        <TableHead className="text-right">{t('codenames.table.number')}</TableHead>
        <TableHead>{t('codenames.table.meant')}</TableHead>
        <TableHead>{t('codenames.table.guessed')}</TableHead>
      </TableHeader>
      <TableBody>
        {view.history.map((clue, n) => (
          <TableRow key={`${clue.word}-${n}`}>
            <TableCell className="whitespace-nowrap">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className={cn('size-2 rounded-full', DOT[clue.team])} />
                {t(TEAM_LABEL_KEY[clue.team])}
              </span>
            </TableCell>
            <TableCell className="font-[650]">{clue.word}</TableCell>
            <TableCell className="text-right tabular-nums">{clue.number}</TableCell>
            <TableCell className="min-w-[8rem]">{clue.targets?.join(', ') || '–'}</TableCell>
            <TableCell className="min-w-[10rem]">
              {clue.results.length ? (
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  {clue.results.map((result) => (
                    <span key={result.word} className="inline-flex items-center gap-1.5">
                      <span
                        role="img"
                        aria-label={t(COLOR_LABEL_KEY[result.color])}
                        className={cn('size-2 shrink-0 rounded-full', DOT[result.color])}
                      />
                      {result.word}
                    </span>
                  ))}
                </span>
              ) : (
                t('codenames.nothingGuessed')
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
