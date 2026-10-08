/* eslint-disable react-refresh/only-export-components -- This entry point mounts previews into a static HTML document. */
import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { toast } from 'sonner'
import {
  Activity,
  Archive,
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Beer,
  Bell,
  Bike,
  Brain,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  CheckIcon,
  ChessKing,
  ChevronDown,
  ChevronDownIcon,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleDot,
  CircleIcon,
  CirclePlus,
  CircleQuestionMark,
  Clock3,
  Coins,
  Compass,
  Copy,
  CornerDownLeft,
  Dice5,
  Download,
  Eye,
  EyeOff,
  Footprints,
  Funnel,
  Gamepad2,
  GitBranch,
  Globe2,
  Hand,
  History,
  Home,
  KeyRound,
  Landmark,
  Layers3,
  LayoutDashboard,
  List,
  ListChecks,
  ListFilter,
  ListOrdered,
  LoaderCircle,
  Lock,
  LockKeyhole,
  MapPinned,
  Martini,
  Menu,
  Minus,
  Monitor,
  Mountain,
  NotebookPen,
  Pencil,
  Pin,
  Plus,
  Printer,
  Radio,
  RadioTower,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Settings2,
  ShieldCheck,
  ShipWheel,
  Shuffle,
  Snowflake,
  StepForward,
  Swords,
  Target,
  Trash2,
  TriangleAlert,
  Trophy,
  Undo2,
  Users,
  UsersRound,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  Waves,
  Wine,
  X,
  XIcon,
  type LucideIcon,
} from 'lucide-react'

import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
import { PlayerCard } from '@/apps/shared/components/PlayerCard'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { AppResetButton } from '@/apps/shared/components/AppResetButton'
import type { TeamId } from '@/apps/shared/teams'
import { dashboardApps } from '@/apps/registry'
import { DashboardIllustration } from '@/components/layout/DashboardIllustrations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Toaster } from '@/components/ui/sonner'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { DatePicker } from '@/components/ui/DatePicker'
import { DisclosureIndicator, DisclosureSummary } from '@/components/ui/disclosure'
import { TimePicker } from '@/components/ui/TimePicker'
import { Input } from '@/components/ui/input'
import { IftaInput, IftaSelectTrigger } from '@/components/ui/ifta-field'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { LanguageProvider } from '@/lib/i18n/LanguageProvider'
import { useI18n } from '@/lib/i18n'
import '@/styles/globals.css'

const options = [
  { value: 'overview', label: 'Übersicht', icon: List },
  { value: 'calendar', label: 'Kalender', icon: CalendarDays },
  { value: 'stats', label: 'Langfristige Auswertung', icon: ChartNoAxesCombined },
]

const skAndertenLogoUrl = new URL('../public/sk-anderten-watermark.png', import.meta.url).href

function SelectionDemo({ tabs = false }: { tabs?: boolean }) {
  const [value, setValue] = useState('overview')
  const [period, setPeriod] = useState('week')
  return (
    <div className="grid grid-cols-1 gap-5">
      {tabs ? <>
        <Tabs defaultValue="first">
          <TabsList aria-label="Standard-Tabs">
            <TabsTrigger value="first">Spieler</TabsTrigger>
            <TabsTrigger value="second">Ergebnisse</TabsTrigger>
          </TabsList>
          <TabsContent value="first">Paul · Kim · Alex</TabsContent>
          <TabsContent value="second">12 · 8 · 5 Punkte</TabsContent>
        </Tabs>
        <Tabs value={value} onValueChange={setValue}>
          <TabsList variant="icon-tabs" aria-label="Icon-Tabs">
            {options.map(({ value, label, icon }) => <TabsTrigger key={value} value={value} label={label} icon={icon} />)}
          </TabsList>
          {options.map(({ value, label }) => <TabsContent key={value} value={value}>{label}</TabsContent>)}
        </Tabs>
      </> : <>
        <SegmentedControl aria-label="Zeitraum" value={period} onValueChange={setPeriod} options={[
          { value: 'week', label: 'Woche' }, { value: 'month', label: 'Monat' },
        ]} />
        <SegmentedControl aria-label="Ansicht" variant="icon-tabs" value={value} onValueChange={setValue} options={options} />
      </>}
    </div>
  )
}

function SelectDemo({ ifta = false }: { ifta?: boolean }) {
  const [value, setValue] = useState('1')
  const content = <SelectValue />
  return <Select value={value} onValueChange={setValue}>
    {ifta ? <IftaSelectTrigger label="Punktwert">{content}</IftaSelectTrigger> : <SelectTrigger aria-label="Punktwert">{content}</SelectTrigger>}
    <SelectContent>
      <SelectItem value="0.5">½ Punkt</SelectItem>
      <SelectItem value="1">1 Punkt</SelectItem>
      <SelectItem value="2">2 Punkte</SelectItem>
    </SelectContent>
  </Select>
}

function FieldDemo({ kind }: { kind: string }) {
  const [value, setValue] = useState(kind === 'DatePicker' ? '2026-10-05' : kind === 'TimePicker' ? '08:30' : kind === 'ColorPicker' ? '#236492' : 'Paul')
  if (kind === 'DatePicker') return <DatePicker label="Datum" value={value} onValueChange={setValue} />
  if (kind === 'TimePicker') return <TimePicker label="Uhrzeit" value={value} onValueChange={setValue} />
  if (kind === 'ColorPicker') return <div className="flex flex-wrap items-center gap-4">
    <ColorPicker ariaLabel="Kompakte Farbe" value={value} onValueCommit={setValue} />
    <ColorPicker ariaLabel="Teamfarbe" label="Teamfarbe" variant="field" value={value} onValueCommit={setValue} />
  </div>
  if (kind === 'InlineTextEdit') return <div className="grid gap-4">
    <InlineTextEdit ariaLabel="Spielername" value={value} fallback="Spieler" onSave={setValue} />
    <InlineTextEdit ariaLabel="Titel" triggerMode="label" value={value} fallback="Titel" onSave={setValue} />
  </div>
  if (kind === 'Ifta-Felder') return <div className="grid gap-3">
    <IftaInput label="Spielername" value={value} onChange={event => setValue(event.target.value)} />
    <SelectDemo ifta />
  </div>
  return <div className="grid gap-3">
    <Input aria-label="Spielername" value={value} onChange={event => setValue(event.target.value)} />
    <div className="grid gap-1.5">
      <Label htmlFor="catalog-invalid-name">Name</Label>
      <Input id="catalog-invalid-name" aria-invalid="true" aria-describedby="catalog-name-error" placeholder="z. B. Paul" defaultValue="" />
      <p id="catalog-name-error" className="type-caption text-destructive">Bitte einen Namen eingeben.</p>
    </div>
    <Input aria-label="Deaktiviertes Feld" value="Deaktiviert" disabled />
  </div>
}

function LabelDemo() {
  const [value, setValue] = useState('Sommerturnier')
  return <div className="grid gap-1.5">
    <div className="flex items-center justify-between gap-3"><Label htmlFor="catalog-tournament-name">Turniername</Label><span className="type-caption text-subtle-foreground tabular-nums">{value.length}/40</span></div>
    <Input id="catalog-tournament-name" maxLength={40} value={value} onChange={event => setValue(event.target.value)} />
  </div>
}

function TableDemo() {
  return <Table aria-label="Beispielrangliste">
    <TableHeader><TableHead>#</TableHead><TableHead>Spieler</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Punkte</TableHead></TableHeader>
    <TableBody>{['Paul', 'Kim'].map((name, index) => <TableRow key={name}>
      <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell><TableCell className="font-semibold">{name}</TableCell>
      <TableCell>{index ? <Badge variant="outline">Bereit</Badge> : <Badge variant="success" dot>Aktiv</Badge>}</TableCell>
      <TableCell className="text-right font-semibold tabular-nums">{index ? 9 : 12}</TableCell>
    </TableRow>)}</TableBody>
  </Table>
}

function ToastDemo() {
  return <div className="flex flex-wrap gap-3">
    <Button onClick={() => toast.success('Änderung gespeichert', { toasterId: 'catalog' })}>Erfolg anzeigen</Button>
    <Button variant="outline" onClick={() => toast.error('Speichern fehlgeschlagen', { toasterId: 'catalog' })}>Fehler anzeigen</Button>
    <Toaster id="catalog" closeButton />
  </div>
}

function FeedbackDemo() {
  const [name, setName] = useState('Sommerabend')
  const [saved, setSaved] = useState(false)
  const [longName, setLongName] = useState('Sommerabend mit Freunden aus Hannover und Umgebung')
  return <div className="grid w-full gap-5 sm:grid-cols-2">
    <div className="grid content-start gap-2">
      <Label htmlFor="catalog-pending-name">Speichern</Label>
      <Input id="catalog-pending-name" value="Sommerabend" disabled />
      <Button disabled><LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />Speichert …</Button>
    </div>
    <div className="grid content-start gap-2">
      <Label htmlFor="catalog-retry-name">{saved ? 'Gespeichert' : 'Fehlgeschlagen'}</Label>
      <Input id="catalog-retry-name" aria-label="Name nach fehlgeschlagenem Speichern" aria-describedby="catalog-save-status" aria-invalid={!saved} value={name} onChange={event => { setName(event.target.value); setSaved(false) }} />
      <p id="catalog-save-status" role="status" className={`type-caption flex items-start gap-2 rounded-md px-3 py-2.5 ${saved ? 'bg-success-soft text-success' : 'bg-destructive-soft text-destructive'}`}>
        {saved ? <CheckCircle2 aria-hidden="true" className="mt-px size-4 shrink-0" /> : <TriangleAlert aria-hidden="true" className="mt-px size-4 shrink-0" />}
        <span>{saved ? 'Name gespeichert.' : <>Nicht gespeichert. Dein Entwurf bleibt erhalten. <button type="button" className="font-semibold underline underline-offset-2" onClick={() => setSaved(true)}>Erneut versuchen</button></>}</span>
      </p>
    </div>
    <div className="grid content-start gap-2">
      <IftaInput label="Langer Name" value={longName} onChange={event => setLongName(event.target.value)} className="truncate" />
      <p className="type-ui break-words text-muted-foreground">{longName}</p>
    </div>
    <div className="grid content-start gap-2">
      <p className="type-ui flex items-center gap-1.5 font-medium text-success"><CheckCircle2 aria-hidden="true" className="size-4" />Gespeichert</p>
      <EmptyState>Noch keine Einträge</EmptyState>
    </div>
  </div>
}

function InteractionDemo() {
  const [active, setActive] = useState(false)
  const states: [string, ReactNode][] = [
    ['Ruhe', <Button>Bereit</Button>],
    ['Hover', <Button className="bg-primary/90">Bereit</Button>],
    ['Gedrückt', <Button className="translate-y-px bg-primary/90">Bereit</Button>],
    ['Fokus', <Button variant="outline" className="ring-2 ring-ring ring-offset-2">Tastaturfokus</Button>],
    ['Aktiv', <Button variant={active ? 'secondary' : 'outline'} aria-pressed={active} className={active ? 'bg-primary-soft text-primary hover:bg-primary-soft' : undefined} onClick={() => setActive(!active)}>{active && <Check />}Auswahl</Button>],
    ['Disabled', <Button disabled>Gesperrt</Button>],
    ['Destruktiv', <Button variant="destructive"><Trash2 />Löschen</Button>],
  ]
  return <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
    {states.map(([label, control]) => <div key={label} className="grid justify-items-center gap-2">{control}<span className="type-caption text-subtle-foreground">{label}</span></div>)}
  </div>
}

function PlayerDemo() {
  const [name, setName] = useState('Paul')
  const [teamId, setTeamId] = useState<TeamId | null>(null)
  const [score, setScore] = useState(12)
  const [removed, setRemoved] = useState(false)
  if (removed) return <Button variant="outline" onClick={() => setRemoved(false)}>Spieler wieder hinzufügen</Button>
  return <PlayerCard player={{ id: 'demo', name, position: 1, teamId }} score={score}
    onNameChange={setName} onTeamChange={setTeamId} onRemove={() => setRemoved(true)}
    onIncrement={() => setScore(score + 1)} onDecrement={() => setScore(Math.max(0, score - 1))}
    onIncrementLarge={() => setScore(score + 5)} />
}

function MenuDemo() {
  const [action, setAction] = useState('')
  return <div className="grid justify-items-start gap-3">
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline"><Settings />Aktionen</Button></DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => setAction('Kopie erstellt')}>Duplizieren</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setAction('Name kann bearbeitet werden')}>Umbenennen</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setAction('Beispieleintrag gelöscht')}><Trash2 />Löschen</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <span role="status">{action}</span>
  </div>
}

function ConfirmationDemo({ reset = false }: { reset?: boolean }) {
  const [count, setCount] = useState(0)
  return <div className="grid justify-items-start gap-3">
    {reset ? <AppResetButton title="Beispiel zurücksetzen?" description="Nur dieser Beispielzähler wird zurückgesetzt." onConfirm={() => setCount(count + 1)} /> :
      <div className="flex flex-wrap items-center gap-3">
        <ConfirmButton title="Beispiel löschen?" description="Hier werden nur Beispieldaten verwendet." onConfirm={() => setCount(count + 1)} trigger={<Button variant="destructive"><Trash2 />Löschen</Button>} />
        <ConfirmButton mode="popover" title="Zeile löschen?" description="Icon-Auslöser bestätigen im Popover." onConfirm={() => setCount(count + 1)} trigger={<Button variant="destructive" size="icon" aria-label="Zeile löschen"><Trash2 /></Button>} />
      </div>}
    <span role="status">{count > 0 && `${count}× bestätigt`}</span>
  </div>
}

function DashboardArtworkDemo() {
  const { t } = useI18n()
  return <div className="artwork-gallery">
    {dashboardApps.map(app => <figure key={app.id} data-app-artwork={app.id} className="artwork-sample">
      <div className="artwork-image">
        {app.id === 'swiss-tournaments'
          ? <img src={skAndertenLogoUrl} alt="" className="artwork-logo" />
          : <DashboardIllustration appId={app.id} />}
      </div>
      <figcaption>{t(app.titleKey)}</figcaption>
    </figure>)}
  </div>
}

const demos: Record<string, ReactNode> = {
  'Card-Familie': <Card className="w-full max-w-sm"><CardHeader><div className="flex items-center justify-between gap-3"><Badge>Runde 5</Badge><span className="type-caption text-subtle-foreground">vor 2 Min.</span></div><CardTitle className="mt-1.5">Aktuelle Runde</CardTitle><CardDescription>Drei Paarungen sind bereit.</CardDescription></CardHeader><CardFooter><Button variant="outline" size="sm">Runde ansehen</Button></CardFooter></Card>,
  Label: <LabelDemo />,
  Separator: <div className="grid gap-3.5">
    <span className="type-action">Spieler</span><Separator /><span className="type-action">Ergebnisse</span>
    <div className="flex items-center gap-3"><Separator className="flex-1" /><span className="type-caption text-subtle-foreground">Runde 6</span><Separator className="flex-1" /></div>
    <div className="flex h-4 items-center gap-3 type-ui"><span>Paul</span><Separator orientation="vertical" /><span>Kim</span><Separator orientation="vertical" /><span>Alex</span></div>
  </div>,
  'Toaster / Sonner': <ToastDemo />,
  'Table-Familie': <TableDemo />,
  'Responsive Tabelle': <TableDemo />,
  'HTML-Formular': <form className="flex flex-wrap items-end gap-3" onSubmit={event => event.preventDefault()}><IftaInput label="Eingabe" defaultValue="Eingabe" /><Button type="submit">Aktion</Button></form>,
  'Laufzeit- und Rückmeldungszustände': <FeedbackDemo />,
  'Interaktionszustände als visuelle Reihe': <InteractionDemo />,
  Badge: <div className="flex flex-wrap gap-2"><Badge variant="success" dot>Aktiv</Badge><Badge>Team A</Badge><Badge variant="outline">Runde 5</Badge><Badge variant="destructive"><TriangleAlert aria-hidden="true" />Fehler</Badge><Badge variant="secondary">Entwurf</Badge><Badge variant="outline" className="tabular-nums">12</Badge></div>,
  Button: <div className="flex flex-wrap justify-center gap-3"><Button><Plus />Primär</Button><Button variant="outline">Outline</Button><Button variant="secondary">Sekundär</Button><Button variant="ghost">Ghost</Button><Button variant="destructive"><Trash2 />Löschen</Button><Button size="icon" aria-label="Hinzufügen"><Plus /></Button><Button disabled>Disabled</Button></div>,
  'Dialog-Familie': <Dialog><DialogTrigger asChild><Button>Dialog öffnen</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Beispieldialog</DialogTitle><DialogDescription>Ein Name für die nächste Runde.</DialogDescription></DialogHeader><div className="grid gap-1.5"><Label htmlFor="catalog-round-name">Rundenname</Label><Input id="catalog-round-name" defaultValue="Runde 5" /></div><DialogFooter><DialogClose asChild><Button variant="outline">Abbrechen</Button></DialogClose><DialogClose asChild><Button>Speichern</Button></DialogClose></DialogFooter></DialogContent></Dialog>,
  'DropdownMenu-Familie': <MenuDemo />,
  Input: <FieldDemo kind="Input" />,
  'Ifta-Felder': <FieldDemo kind="Ifta-Felder" />,
  'Popover-Familie': <Popover><PopoverTrigger asChild><Button variant="outline">Popover öffnen</Button></PopoverTrigger><PopoverContent className="grid max-w-[calc(100vw-2rem)] gap-3"><div className="grid gap-1.5"><Label htmlFor="catalog-short-note">Kurznotiz</Label><Input id="catalog-short-note" defaultValue="Nächste Runde" /></div><div className="flex justify-end gap-1.5"><Button variant="ghost" size="sm">Leeren</Button><Button size="sm">Übernehmen</Button></div></PopoverContent></Popover>,
  'Select-Familie': <SelectDemo />,
  'Tabs-Familie': <SelectionDemo tabs />,
  SegmentedControl: <SelectionDemo />,
  DatePicker: <FieldDemo kind="DatePicker" />,
  TimePicker: <FieldDemo kind="TimePicker" />,
  ColorPicker: <FieldDemo kind="ColorPicker" />,
  InlineTextEdit: <FieldDemo kind="InlineTextEdit" />,
  'Shared PlayerCard': <PlayerDemo />,
  EmptyState: <EmptyState icon={Trophy} action={<Button variant="outline" size="sm"><Plus />Erste Runde starten</Button>}>Noch keine Ergebnisse</EmptyState>,
  ConfirmButton: <ConfirmationDemo />,
  AppResetButton: <ConfirmationDemo reset />,
  Aufklappen: <div className="w-full max-w-sm divide-y rounded-lg border bg-card">
    <details open className="group px-3.5"><DisclosureSummary>Zusatzangaben</DisclosureSummary><div className="pb-3.5"><IftaInput label="Notiz" defaultValue="Nächste Runde" /></div></details>
    <details className="group px-3.5"><DisclosureSummary>Intervalle <span className="type-caption font-medium text-subtle-foreground">· 3</span></DisclosureSummary><p className="type-ui pb-3.5 text-muted-foreground">6 × 400 m · 90″ Pause</p></details>
  </div>,
  DisclosureIndicator: <DisclosureIndicator />,
  'Dashboard-Illustrationen': <DashboardArtworkDemo />,
}

const previews: ReactNode[] = []

for (const slot of document.querySelectorAll<HTMLElement>('[data-demo]')) {
  const demo = demos[slot.dataset.demo!]
  if (demo) previews.push(createPortal(demo, slot, `demo-${previews.length}`))
}

const inventoryIcons: Record<string, LucideIcon> = {
  Activity,
  Archive,
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Beer,
  Bell,
  Bike,
  Brain,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  CheckIcon,
  ChessKing,
  ChevronDown,
  ChevronDownIcon,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleDot,
  CircleIcon,
  CirclePlus,
  CircleQuestionMark,
  Clock3,
  Coins,
  Compass,
  Copy,
  CornerDownLeft,
  Dice5,
  Download,
  Eye,
  EyeOff,
  Footprints,
  Funnel,
  Gamepad2,
  GitBranch,
  Globe2,
  Hand,
  History,
  Home,
  KeyRound,
  Landmark,
  Layers3,
  LayoutDashboard,
  ListChecks,
  ListFilter,
  ListOrdered,
  LoaderCircle,
  Lock,
  LockKeyhole,
  MapPinned,
  Martini,
  Menu,
  Minus,
  Monitor,
  Mountain,
  NotebookPen,
  Pencil,
  Pin,
  Plus,
  Printer,
  Radio,
  RadioTower,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Settings2,
  ShieldCheck,
  ShipWheel,
  Shuffle,
  Snowflake,
  StepForward,
  Swords,
  Target,
  Trash2,
  TriangleAlert,
  Trophy,
  Undo2,
  Users,
  UsersRound,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  Waves,
  Wine,
  X,
  XIcon,
}

for (const item of document.querySelectorAll<HTMLElement>('[data-icon-name]')) {
  const Icon = inventoryIcons[item.dataset.iconName!]
  const slot = item.querySelector('[data-icon-preview]')
  if (Icon && slot) previews.push(createPortal(<Icon aria-hidden="true" className="size-5" />, slot, `icon-${item.dataset.iconName}`))
}

createRoot(document.getElementById('catalog-root')!).render(<LanguageProvider>{previews}</LanguageProvider>)
