import { createContext, useContext, type ReactNode } from 'react'

const canvasViewBox = '0 0 360 160'
const IllustrationViewBox = createContext(canvasViewBox)

// Nur Design-Tokens, damit die Motive dem dunklen Farbschema vollständig folgen.
const primary = 'var(--brand-primary)'
const secondary = 'var(--brand-secondary)'
const accent = 'var(--brand-accent)'
const surface = 'var(--brand-surface)'
const ink = 'var(--brand-ink)'
const card = 'var(--card)'

// Konturstil: kräftige Umrisslinie, feine Innenzeichnung.
const outline = { stroke: primary, strokeWidth: 3.5 }
const fineLine = { stroke: primary, strokeWidth: 2, fill: 'none' }

const sparkle = 'M0-6L1.5-1.5L6 0L1.5 1.5L0 6L-1.5 1.5L-6 0L-1.5-1.5Z'

const illustrationFontFamily = 'Manrope Variable, Manrope, ui-sans-serif, system-ui'
const illustrationFontWeight = '750'

// Frames only the drawn motif on the right of the 360 x 160 canvas.
const framedIllustrationViewBox = '146 -2 214 164'

function SvgShell({ children }: { children: ReactNode }) {
  const viewBox = useContext(IllustrationViewBox)
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      focusable="false"
      fontFamily={illustrationFontFamily}
      fontWeight={illustrationFontWeight}
      textAnchor="middle"
      dominantBaseline="central"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox={viewBox}
    >
      <g transform="translate(148 -8) scale(1.1)">{children}</g>
    </svg>
  )
}

/** Punkt auf einem Kreis; 0 Grad liegt oben, positive Winkel laufen im Uhrzeigersinn. */
function polar(cx: number, cy: number, r: number, degrees: number) {
  const angle = (degrees * Math.PI) / 180
  const round = (value: number) => Math.round(value * 100) / 100
  return [round(cx + r * Math.sin(angle)), round(cy - r * Math.cos(angle))] as const
}

// Piktogramme für Schwimmen, Rad und Laufen; Farbe über `color` der umgebenden Gruppe.
function Swimmer() {
  return (
    <>
      <circle cx="7" cy="-10" r="4" fill="currentColor" />
      <path d="M-17 1-6-9 5-5 14 1" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M-20 9q5-5 10 0t10 0t10 0t10 0" stroke="currentColor" strokeWidth="3" fill="none" />
    </>
  )
}

function Bike() {
  return (
    <>
      <circle cx="-14" cy="6" r="10" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="15" cy="6" r="10" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M-14 6-5-10 6 6h-20M-5-10H8l7 16M6 6l-11-16M5-17h7M-9-13h8" stroke="currentColor" strokeWidth="3" fill="none" />
    </>
  )
}

function Runner() {
  return (
    <>
      <circle cx="7" cy="-17" r="4" fill="currentColor" />
      <path d="M-10-5 0-11 7-7 16-6M0-11-4 4l-12 10M-4 4 8 8l3 12" stroke="currentColor" strokeWidth="3.2" fill="none" />
    </>
  )
}

function WheelIllustration() {
  const [cx, cy] = [100, 80]
  const faceRadius = 43
  const sectorFills = [accent, null, secondary, null, surface, null, secondary, null]
  const spokes = [0, 1, 2, 3]
    .map((k) => `M${polar(cx, cy, faceRadius, 45 * k - 22.5).join(' ')}L${polar(cx, cy, faceRadius, 45 * k + 157.5).join(' ')}`)
    .join('')

  return (
    <SvgShell>
      <circle cx="106" cy="86" r="52" fill={secondary} />
      <path d="M80 150L94 84H106L120 150Z" fill={card} {...outline} />
      <path d="M68 150H132" fill="none" {...outline} />
      <circle cx={cx} cy={cy} r="52" fill={card} />
      {sectorFills.map((fill, k) =>
        fill ? (
          <path
            key={k}
            d={`M${cx} ${cy}L${polar(cx, cy, faceRadius, 45 * k - 22.5).join(' ')}A${faceRadius} ${faceRadius} 0 0 1 ${polar(cx, cy, faceRadius, 45 * k + 22.5).join(' ')}Z`}
            fill={fill}
          />
        ) : null,
      )}
      <path d={spokes} stroke={primary} strokeWidth="2.5" fill="none" />
      <circle cx={cx} cy={cy} r={faceRadius} {...fineLine} />
      <circle cx={cx} cy={cy} r="52" fill="none" {...outline} />
      {sectorFills.map((_, k) => {
        const [x, y] = polar(cx, cy, 47.5, 45 * k)
        return <circle key={k} cx={x} cy={y} r="2.3" fill={primary} />
      })}
      <circle cx={cx} cy={cy} r="10" fill={card} {...outline} />
      <circle cx={cx} cy={cy} r="3.6" fill={accent} />
      <path d="M90 8H110L100 30Z" fill={primary} stroke={card} strokeWidth="2.5" />
      <path d="M166 46A74 74 0 0 1 174 90M174 90L164 82M174 90L180 78" fill="none" {...outline} />
    </SvgShell>
  )
}

function CoinflipIllustration() {
  return (
    <SvgShell>
      <path d="M34 118Q20 94 34 78M34 78L24 83M34 78L37 89" stroke={primary} strokeWidth="3" fill="none" />
      <g transform="rotate(-18 72 52)">
        <ellipse cx="72" cy="57.5" rx="35" ry="14" fill={secondary} {...outline} />
        <ellipse cx="72" cy="52" rx="35" ry="14" fill={card} {...outline} />
        <ellipse cx="72" cy="52" rx="26.5" ry="9.5" {...fineLine} />
        <g transform="translate(72 52.5) scale(1 .4)">
          <text fontSize="30" fill={primary}>K</text>
        </g>
      </g>
      <circle cx="124" cy="100" r="43" fill={secondary} {...outline} />
      <circle cx="124" cy="94" r="43" fill={card} {...outline} />
      <circle cx="124" cy="94" r="32" fill={accent} />
      <circle cx="124" cy="94" r="37.5" fill="none" stroke={primary} strokeWidth="2.2" strokeDasharray="0.1 5.79" />
      <text x="124" y="95.5" fontSize="36" fill={card}>Z</text>
      <path d="M162 36V22M172 46L182 36M176 60H189" fill="none" {...outline} />
    </SvgShell>
  )
}

function ProgressIllustration() {
  return (
    <SvgShell>
      <path d="M26 50H176M26 78H176M26 106H176" stroke={secondary} strokeWidth="1.5" strokeDasharray="2 5" fill="none" />
      <path d="M26 120H58V100H92V76H126V50H166V134H26Z" fill={secondary} />
      <path d="M26 126H74V114H110V96H146V82H166V134H26Z" fill={surface} />
      <path d="M26 126H74V114H110V96H146V82H166" fill="none" {...outline} />
      <path d="M26 120H58V100H92V76H126V50H166" stroke={accent} strokeWidth="4.5" fill="none" />
      <path
        d="M26 18V134H182M20 26L26 18L32 26M174 128L182 134L174 140M64 134v6M102 134v6M140 134v6"
        fill="none"
        {...outline}
      />
      <g fill={card} stroke={primary} strokeWidth="2">
        <circle cx="74" cy="114" r="2.8" />
        <circle cx="110" cy="96" r="2.8" />
        <circle cx="146" cy="82" r="2.8" />
      </g>
      <g fill={card} stroke={accent} strokeWidth="2.5">
        <circle cx="58" cy="100" r="3.2" />
        <circle cx="92" cy="76" r="3.2" />
        <circle cx="126" cy="50" r="3.2" />
      </g>
      <circle cx="166" cy="82" r="7" fill={card} {...outline} />
      <circle cx="166" cy="50" r="8" fill={card} stroke={accent} strokeWidth="4.5" />
      <path d="M161 38L166 44L171 38Z" fill={accent} />
      <rect x="147" y="20" width="38" height="19" rx="9.5" fill={accent} />
      <text x="166" y="30" fontSize="12" fill={card}>8</text>
      <path d="M161 98L166 92L171 98Z" fill={primary} />
      <rect x="147" y="97" width="38" height="19" rx="9.5" fill={primary} />
      <text x="166" y="107" fontSize="12" fill={card}>5</text>
    </SvgShell>
  )
}

function TriathlonIllustration() {
  return (
    <SvgShell>
      <path d="M34 118L86 90L138 62L170 46" stroke={primary} strokeWidth="3" fill="none" strokeDasharray="2 8" />
      <path d="M170 52V19" fill="none" {...outline} />
      <path d="M170 19H190V35H170Z" fill={card} stroke={primary} strokeWidth="2.5" />
      <path d="M170 19h10v8h-10ZM180 27h10v8h-10Z" fill={primary} />
      <circle cx="39" cy="123" r="23" fill={secondary} />
      <circle cx="91" cy="95" r="23" fill={secondary} />
      <circle cx="143" cy="67" r="23" fill={secondary} />
      <circle cx="34" cy="118" r="23" fill={card} {...outline} />
      <circle cx="86" cy="90" r="23" fill={card} {...outline} />
      <circle cx="138" cy="62" r="23" fill={card} {...outline} />
      {/* Fortschritt je Disziplin: 75, 55 und 25 Prozent. */}
      <g stroke={accent} strokeWidth="5.5" fill="none">
        <path d="M34 95A23 23 0 1 1 11 118" />
        <path d="M86 67A23 23 0 1 1 78.89 111.87" />
        <path d="M138 39A23 23 0 0 1 161 62" />
      </g>
      <g color={primary} transform="translate(34 120) scale(.68)">
        <Swimmer />
      </g>
      <g color={primary} transform="translate(86 90) scale(.6)">
        <Bike />
      </g>
      <g color={primary} transform="translate(136 64) scale(.64)">
        <Runner />
      </g>
    </SvgShell>
  )
}

function ScoreboardIllustration() {
  const rows = [
    { y: 22, width: 96, fill: accent, line: 'M106 36H142', score: '12', scoreX: 169, place: '1' },
    { y: 66, width: 78, fill: card, line: 'M106 80H130', score: '9', scoreX: 152, place: '2' },
    { y: 110, width: 60, fill: card, line: 'M106 124H116', score: '6', scoreX: 134, place: '3' },
  ]
  return (
    <SvgShell>
      {rows.map(({ y, width }) => (
        <rect key={`shadow-${y}`} x="95" y={y + 5} width={width} height="28" rx="14" fill={secondary} />
      ))}
      {rows.map(({ y, width, fill, line, score, scoreX, place }, index) => {
        const isFirst = index === 0
        return (
          <g key={y}>
            <rect x="90" y={y} width={width} height="28" rx="14" fill={fill} {...outline} />
            <path
              d={line}
              stroke={isFirst ? card : secondary}
              strokeOpacity={isFirst ? 0.75 : undefined}
              strokeWidth="4"
              fill="none"
            />
            <text x={scoreX} y={y + 15} fontSize="14" fill={isFirst ? card : primary}>
              {score}
            </text>
            <circle cx="64" cy={y + 14} r="15" fill={fill} {...outline} />
            <text x="64" y={y + 15} fontSize="17" fill={isFirst ? card : primary}>
              {place}
            </text>
          </g>
        )
      })}
      <path
        d="M-10 5L-12-6L-5-1L0-9L5-1L12-6L10 5Z"
        transform="translate(66 16.5) rotate(8) scale(.8)"
        fill={surface}
        stroke={primary}
        strokeWidth="3"
      />
      <path d="M183 74L189.5 86H176.5Z" fill={accent} />
      <path d="M165 130L171.5 118H158.5Z" fill="none" stroke={primary} strokeWidth="2.5" />
    </SvgShell>
  )
}

function BuzzerIllustration() {
  return (
    <SvgShell>
      <g transform="translate(32 13) scale(.86)">
        <ellipse cx="103" cy="131" rx="68" ry="19" fill={secondary} />
        <path d="M28 114V126A68 19 0 0 0 164 126V114" fill={card} {...outline} />
        <path d="M96 135.5V142.5M60 132.5V139.5M132 132.5V139.5" {...fineLine} />
        <ellipse cx="96" cy="114" rx="68" ry="19" fill={card} {...outline} />
        <ellipse cx="96" cy="114" rx="55" ry="14.5" {...fineLine} />
        <path d="M54 110C54 50 138 50 138 110A42 11 0 0 1 54 110Z" fill={accent} {...outline} />
        <path
          d="M54.4 104C56 100 57 97 58 95C74 106 118 106 134 95C135 97 136 100 137.6 104L138 110A42 11 0 0 1 54 110Z"
          fill={primary}
          fillOpacity=".22"
        />
        <path d="M68 86Q75 70 91 64.5" stroke={card} strokeWidth="4.5" fill="none" />
        <circle cx="99.5" cy="62.5" r="2.4" fill={card} />
        <path d="M96 34V16M70 40L63 24M122 40L129 24" fill="none" {...outline} />
        <path
          d="M42 60A30 30 0 0 0 42 98M28 52A44 44 0 0 0 28 106M150 60A30 30 0 0 1 150 98M164 52A44 44 0 0 1 164 106"
          stroke={primary}
          strokeWidth="3"
          fill="none"
        />
        <path d={sparkle} transform="translate(152 24) scale(1.5)" fill={accent} />
        <path d={sparkle} transform="translate(40 30) scale(1.1)" fill={accent} />
      </g>
    </SvgShell>
  )
}

function CostumeContestIllustration() {
  return (
    <SvgShell>
      <circle cx="114" cy="96" r="56" fill={secondary} />
      <ellipse cx="68" cy="112" rx="10" ry="7" transform="rotate(-35 68 112)" fill={card} {...outline} />
      <ellipse cx="144" cy="112" rx="10" ry="7" transform="rotate(35 144 112)" fill={card} {...outline} />
      <path d="M70 140V84a36 36 0 0 1 72 0V140l-12-10-12 10-12-10-12 10-12-10Z" fill={card} {...outline} />
      <circle cx="86" cy="100" r="5" fill={accent} fillOpacity=".35" />
      <circle cx="126" cy="100" r="5" fill={accent} fillOpacity=".35" />
      <ellipse cx="94" cy="86" rx="5" ry="7.5" fill={primary} />
      <ellipse cx="118" cy="86" rx="5" ry="7.5" fill={primary} />
      <circle cx="95.8" cy="83" r="1.7" fill={card} />
      <circle cx="119.8" cy="83" r="1.7" fill={card} />
      <path d="M99 103Q106 110 113 103" stroke={primary} strokeWidth="3" fill="none" />
      {/* Hexenhut */}
      <path d="M84 54Q100 30 116 10Q128 30 134 48Z" fill={primary} {...outline} />
      <path d="M90 45Q110 39 131 40" stroke={accent} strokeWidth="6" fill="none" />
      <path d="M62 60Q104 38 150 50Q108 64 62 60Z" fill={primary} {...outline} />
      {/* Siegerrosette */}
      <path d="M149 128L146 150L154 144L159 134Z" fill={accent} {...outline} />
      <path d="M169 128L172 150L164 144L159 134Z" fill={accent} {...outline} />
      <circle cx="159" cy="118" r="16" fill={accent} {...outline} />
      <circle cx="159" cy="118" r="10.5" fill="none" stroke={card} strokeWidth="1.6" />
      <text x="159" y="119" fontSize="13" fill={card}>1</text>
      <path d={sparkle} transform="translate(174 38) scale(1.6)" fill={accent} />
      <path d={sparkle} transform="translate(184 72) scale(1.1)" fill={primary} />
    </SvgShell>
  )
}

function MakiRoll({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <path d={`M${cx - 20} ${cy}V${cy + 20}A20 9 0 0 0 ${cx + 20} ${cy + 20}V${cy}Z`} fill={primary} {...outline} />
      <path d={`M${cx - 14} ${cy + 9}V${cy + 22}`} stroke={card} strokeWidth="2" strokeOpacity=".45" fill="none" />
      <ellipse cx={cx} cy={cy} rx="20" ry="9" fill={card} {...outline} />
      <ellipse cx={cx} cy={cy} rx="13.5" ry="5.8" fill="none" stroke={secondary} strokeWidth="2" />
      <ellipse cx={cx} cy={cy} rx="8" ry="3.5" fill={accent} />
    </>
  )
}

function SushiMapIllustration() {
  const map = 'M16 40L66 26L122 40L176 26V122L122 136L66 122L16 136Z'
  return (
    <SvgShell>
      <path d="M22 46L72 32L128 46L182 32V128L128 142L72 128L22 142Z" fill={secondary} />
      <path d={map} fill={card} />
      <path d="M66 26L122 40V136L66 122Z" fill={secondary} fillOpacity=".4" />
      <path d="M26 58Q34 46 46 52T56 70Q50 80 38 76T26 58Z" fill={secondary} />
      <path d="M134 102Q146 94 158 100T166 114Q156 124 142 119T134 102Z" fill={secondary} />
      <path d="M66 26V122M122 40V136" stroke={primary} strokeWidth="3" fill="none" />
      <path d={map} fill="none" {...outline} />
      <path d="M48 74Q78 98 104 86T138 88" stroke={primary} strokeWidth="3" fill="none" strokeDasharray="1 8" />
      <g transform="translate(44 72) scale(.6)">
        <path d="M0 0C-10-16-20-24-20-38a20 20 0 0 1 40 0C20-24 10-16 0 0Z" fill={primary} stroke={card} strokeWidth="3.5" />
        <circle cx="0" cy="-38" r="7.5" fill={card} />
      </g>
      <ellipse cx="140" cy="89" rx="10" ry="3.5" fill={primary} fillOpacity=".25" />
      <path d="M140 88C130 72 120 64 120 50a20 20 0 0 1 40 0C160 64 150 72 140 88Z" fill={accent} {...outline} />
      <circle cx="140" cy="50" r="7" fill={card} stroke={primary} strokeWidth="3" />
      <path d="M104 147L186 102M114 150L190 112" fill="none" {...outline} />
      <MakiRoll cx={40} cy={100} />
      <MakiRoll cx={78} cy={118} />
    </SvgShell>
  )
}

function RandomizerIllustration() {
  return (
    <SvgShell>
      <text x="123" y="18" fontSize="21" fill={secondary}>41</text>
      <text x="123" y="122" fontSize="21" fill={secondary}>43</text>
      <rect x="70" y="40" width="118" height="66" rx="15" fill={secondary} />
      <rect x="64" y="34" width="118" height="66" rx="15" fill={card} {...outline} />
      <path d="M123 36V98" stroke={secondary} strokeWidth="2" fill="none" />
      <text x="94" y="68.5" fontSize="47" fill={primary}>4</text>
      <text x="152" y="68.5" fontSize="47" fill={primary}>2</text>
      <path d="M46 67L57 60V74Z" fill={accent} />
      <path d={sparkle} transform="translate(172 18) scale(1.4)" fill={accent} />
    </SvgShell>
  )
}

function Pawn({ cx, fill }: { cx: number; fill: string }) {
  return (
    <>
      <g fill={fill} {...outline}>
        <circle cx={cx} cy="86" r="12" />
        <path d={`M${cx - 6} 104H${cx + 6}L${cx + 12} 124H${cx - 12}Z`} />
        <rect x={cx - 12} y="97" width="24" height="7" rx="3.5" />
        <rect x={cx - 18} y="122" width="36" height="14" rx="5" />
      </g>
      <path d={`M${cx - 7} 83a8 8 0 0 1 6-5.5`} stroke={card} strokeWidth="2" fill="none" />
    </>
  )
}

function SwissTournamentIllustration() {
  const crown = 'M78 38L84 45L90 38L96 45L102 38L108 45L114 38L108 60H84Z'
  const kingBody = 'M82 68H110L120 122H72Z'
  return (
    <SvgShell>
      <path d="M6 138H190V150H6Z" fill={card} stroke={primary} strokeWidth="2.5" />
      <path d="M6 138h23v12h-23ZM52 138h23v12h-23ZM98 138h23v12h-23ZM144 138h23v12h-23Z" fill={primary} />
      <Pawn cx={34} fill={secondary} />
      <Pawn cx={158} fill={accent} />
      <g fill={secondary} transform="translate(6 6)">
        <path d={crown} />
        <path d={kingBody} />
        <rect x="60" y="120" width="72" height="16" rx="6" />
      </g>
      <path d="M96 12V34M86 22H106" stroke={primary} strokeWidth="4.5" fill="none" />
      <g fill={card} {...outline}>
        <path d={crown} />
        <path d={kingBody} />
        <rect x="74" y="59" width="44" height="9" rx="4.5" />
        <rect x="60" y="120" width="72" height="16" rx="6" />
      </g>
      <path d="M81.5 50H110.5M91 76L86 114M66 128H126" {...fineLine} />
    </SvgShell>
  )
}

function NextQuestionIllustration() {
  const questionCard = { x: 20, y: 22, width: 94, height: 108, rx: 12 }
  return (
    <SvgShell>
      <g transform="translate(36 4) scale(.86)">
        <g transform="rotate(14 67 140)">
          <rect {...questionCard} fill={secondary} {...outline} />
        </g>
        <g transform="rotate(7 67 140)">
          <rect {...questionCard} fill={card} {...outline} />
        </g>
        <rect {...questionCard} fill={card} {...outline} />
        <rect x="32" y="33" width="28" height="8" rx="4" fill={secondary} />
        <text x="67" y="70" fontSize="56" fill={primary}>?</text>
        <path d="M34 114H100" stroke={secondary} strokeWidth="5" fill="none" />
        <path d="M34 114H60" stroke={accent} strokeWidth="5" fill="none" />
        <circle cx="150" cy="100" r="22" fill={accent} {...outline} />
        <circle cx="150" cy="100" r="17" fill="none" stroke={card} strokeWidth="1.5" strokeOpacity=".55" />
        <path d="M140 100H160M152 91.5L160.5 100L152 108.5" stroke={card} strokeWidth="4.5" fill="none" />
      </g>
    </SvgShell>
  )
}

function EveningScoreIllustration() {
  // Abendstand zweier Personen als Ring aus einzelnen Punkten (5 zu 3) mit Mond in der Mitte.
  return (
    <SvgShell>
      <circle cx="97" cy="91" r="52" fill="none" stroke={secondary} strokeWidth="14" />
      <path
        d="M82.97 34.79A52 52 0 1 0 103.7 136.67"
        stroke={primary}
        strokeWidth="14"
        strokeLinecap="butt"
        strokeDasharray="30 4"
        fill="none"
      />
      <path
        d="M101.03 34.79A52 52 0 0 1 137.91 110.41"
        stroke={accent}
        strokeWidth="14"
        strokeLinecap="butt"
        strokeDasharray="30 4"
        fill="none"
      />
      <path d="M92 66A20 20 0 1 0 112 86A15 15 0 0 1 92 66Z" fill={surface} {...outline} />
      <g fill="none" stroke={primary} strokeWidth="1.6">
        <circle cx="86" cy="91" r="3" />
        <circle cx="95" cy="99" r="2" />
        <circle cx="80" cy="81" r="1.6" />
      </g>
      <path d={sparkle} transform="translate(166 30) scale(1.7)" fill={accent} />
      <path d={sparkle} transform="translate(176 62) scale(1.1)" fill={primary} />
      <circle cx="26" cy="130" r="13" fill={primary} />
      <text x="26" y="131" fontSize="15" fill={card}>5</text>
      <circle cx="166" cy="126" r="13" fill={accent} />
      <text x="166" y="127" fontSize="15" fill={card}>3</text>
    </SvgShell>
  )
}

function CodenamesIllustration() {
  // Agent mit Hut und Sonnenbrille, daneben die Schlüsselkarte des Geheimdienstchefs.
  const keyCard = [
    [primary, accent, secondary],
    [secondary, ink, primary],
    [accent, primary, secondary],
  ]
  return (
    <SvgShell>
      <g transform="rotate(-10 27 104)">
        <rect x="14" y="95" width="26" height="18" rx="4" fill={primary} />
      </g>
      <g transform="rotate(7 31 130)">
        <rect x="18" y="121" width="26" height="18" rx="4" fill={card} stroke={primary} strokeWidth="2.5" />
      </g>
      <circle cx="100" cy="90" r="58" fill={secondary} />
      <path d="M36 152C38 132 54 122 76 118L96 136L116 118C138 122 154 132 156 152Z" fill={card} {...outline} />
      <path d="M76 118L88 150M116 118L104 150" stroke={primary} strokeWidth="3" fill="none" />
      <path d="M96 137L91 151H101Z" fill={accent} stroke={primary} strokeWidth="2.5" />
      <path d="M70 70V94a26 26 0 0 0 52 0V70Z" fill={card} {...outline} />
      <path d="M90 108H102" stroke={primary} strokeWidth="2.5" fill="none" />
      <rect x="70" y="80" width="23" height="15" rx="6" fill={primary} />
      <rect x="99" y="80" width="23" height="15" rx="6" fill={primary} />
      <path d="M92 86H100" fill="none" {...outline} />
      <path d="M75.5 84l4 7M104.5 84l4 7" stroke={card} strokeWidth="2" fill="none" />
      <path d="M64 64L70 28Q96 18 122 28L128 64Z" fill={card} {...outline} />
      <path d="M84 27.5Q96 38 108 27.5" {...fineLine} />
      <path d="M66.3 50H125.7L128 64H64Z" fill={accent} {...outline} />
      <ellipse cx="96" cy="66" rx="62" ry="8" fill={card} {...outline} />
      <g transform="rotate(10 161 104)">
        <rect x="139" y="82" width="44" height="44" rx="7" fill={card} {...outline} />
        {keyCard.map((row, rowIndex) =>
          row.map((fill, columnIndex) => (
            <rect
              key={`${rowIndex}-${columnIndex}`}
              x={146 + columnIndex * 10.5}
              y={89 + rowIndex * 10.5}
              width="9"
              height="9"
              rx="2"
              fill={fill}
            />
          )),
        )}
      </g>
    </SvgShell>
  )
}

export function DashboardIllustration({
  appId,
  framed = false,
}: {
  appId: string
  framed?: boolean
}) {
  return (
    <IllustrationViewBox.Provider
      value={framed ? framedIllustrationViewBox : canvasViewBox}
    >
      <IllustrationForApp appId={appId} />
    </IllustrationViewBox.Provider>
  )
}

function IllustrationForApp({ appId }: { appId: string }) {
  switch (appId) {
    case 'decision-wheel':
      return <WheelIllustration />
    case 'coinflip':
      return <CoinflipIllustration />
    case 'progress-dashboard':
      return <ProgressIllustration />
    case 'triathlon-tracker':
      return <TriathlonIllustration />
    case 'scoreboard':
      return <ScoreboardIllustration />
    case 'live-buzzer':
      return <BuzzerIllustration />
    case 'voting':
      return <CostumeContestIllustration />
    case 'territory-map':
      return <SushiMapIllustration />
    case 'randomizer':
      return <RandomizerIllustration />
    case 'swiss-tournaments':
      return <SwissTournamentIllustration />
    case 'next-question':
      return <NextQuestionIllustration />
    case 'schlag-den-raab':
      return <EveningScoreIllustration />
    case 'codenames':
      return <CodenamesIllustration />
    default:
      return <ProgressIllustration />
  }
}
