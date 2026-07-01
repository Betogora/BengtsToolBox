import type { ReactNode } from 'react'

const palette = {
  navy: '#06344f',
  teal: '#0d8e90',
  mint: '#a9dfda',
  coral: '#fd7261',
  apricot: '#fac889',
  fog: '#d7ddde',
  paleMint: '#e8f7f4',
}

const illustrationFontFamily = 'Manrope Variable, Manrope, ui-sans-serif, system-ui'
const illustrationFontWeight = '750'

function SvgShell({
  children,
  viewBox = '0 0 360 160',
}: {
  children: ReactNode
  viewBox?: string
}) {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      focusable="false"
      viewBox={viewBox}
    >
      {children}
    </svg>
  )
}

function WheelIllustration() {
  return (
    <SvgShell>
      <g opacity="0.85">
        <circle cx="236" cy="80" r="72" fill="#ffffff" />
        <path d="M236 80 236 8 A72 72 0 0 1 298.4 44Z" fill={palette.apricot} />
        <path d="M236 80 298.4 44 A72 72 0 0 1 298.4 116Z" fill="#ffc6ba" />
        <path d="M236 80 298.4 116 A72 72 0 0 1 236 152Z" fill={palette.coral} />
        <path d="M236 80 236 152 A72 72 0 0 1 173.6 116Z" fill="#dff4f1" />
        <path d="M236 80 173.6 116 A72 72 0 0 1 173.6 44Z" fill="#f7fbfa" />
        <path d="M236 80 173.6 44 A72 72 0 0 1 236 8Z" fill={palette.teal} />
        <circle
          cx="236"
          cy="80"
          r="75"
          fill="none"
          stroke={palette.mint}
          strokeOpacity="0.45"
          strokeWidth="10"
        />
        <circle cx="236" cy="80" r="24" fill="#ffffff" opacity="0.92" />
        <circle cx="236" cy="80" r="13" fill={palette.mint} />
        <path
          d="M218 2h36l-13 38a8 8 0 0 1-10 0Z"
          fill={palette.coral}
          stroke="#ffffff"
          strokeLinejoin="round"
          strokeWidth="6"
        />
      </g>
      <g opacity="0.65">
        <circle cx="102" cy="44" r="4" fill={palette.mint} />
        <circle cx="126" cy="92" r="4" fill={palette.coral} />
        <circle cx="150" cy="32" r="5" fill={palette.apricot} opacity="0.7" />
        <circle cx="326" cy="44" r="4" fill={palette.fog} />
        <circle cx="318" cy="118" r="3" fill={palette.mint} />
        <path d="m128 58 5 4-5 4-4-4Z" fill={palette.apricot} />
      </g>
    </SvgShell>
  )
}

function CoinflipIllustration() {
  return (
    <SvgShell>
      <g opacity="0.9">
        <ellipse
          cx="244"
          cy="132"
          fill={palette.navy}
          opacity="0.12"
          rx="88"
          ry="12"
        />
        <circle
          cx="230"
          cy="80"
          r="54"
          fill="#ffffff"
          stroke={palette.apricot}
          strokeWidth="10"
        />
        <circle
          cx="230"
          cy="80"
          r="34"
          fill={palette.apricot}
          opacity="0.42"
        />
        <text
          fill={palette.teal}
          fontFamily={illustrationFontFamily}
          fontSize="42"
          fontWeight={illustrationFontWeight}
          textAnchor="middle"
          x="230"
          y="95"
        >
          K
        </text>
        <circle
          cx="298"
          cy="58"
          r="34"
          fill="#ffffff"
          stroke={palette.teal}
          strokeWidth="8"
          transform="rotate(18 298 58)"
        />
        <text
          fill={palette.coral}
          fontFamily={illustrationFontFamily}
          fontSize="29"
          fontWeight={illustrationFontWeight}
          textAnchor="middle"
          transform="rotate(18 298 58)"
          x="298"
          y="68"
        >
          Z
        </text>
        <path
          d="M154 42c18-22 51-30 83-17M318 98c-18 22-51 30-83 17"
          fill="none"
          stroke={palette.mint}
          strokeLinecap="round"
          strokeWidth="5"
        />
        <circle cx="150" cy="96" r="5" fill={palette.coral} opacity="0.7" />
        <circle cx="338" cy="32" r="4" fill={palette.mint} />
      </g>
    </SvgShell>
  )
}

function ProgressIllustration() {
  const bars = [
    { x: 184, h: 34, opacity: 0.16 },
    { x: 218, h: 42, opacity: 0.2 },
    { x: 252, h: 58, opacity: 0.28 },
    { x: 286, h: 76, opacity: 0.42 },
    { x: 320, h: 96, opacity: 0.72 },
  ]

  return (
    <SvgShell>
      <g opacity="0.38" stroke={palette.mint} strokeDasharray="6 10">
        <path d="M150 34h184" />
        <path d="M150 70h184" />
        <path d="M150 106h184" />
      </g>
      <g>
        {bars.map((bar) => (
          <rect
            key={bar.x}
            fill={palette.teal}
            height={bar.h}
            opacity={bar.opacity}
            rx="8"
            width="26"
            x={bar.x}
            y={132 - bar.h}
          />
        ))}
      </g>
      <path
        d="M152 110c24-30 41-6 66-36 22-26 39-6 64-31 19-19 35-7 52-24"
        fill="none"
        stroke={palette.teal}
        strokeLinecap="round"
        strokeWidth="5"
      />
      <circle cx="338" cy="17" r="9" fill={palette.coral} />
    </SvgShell>
  )
}

function ScoreboardIllustration() {
  return (
    <SvgShell>
      <ellipse cx="236" cy="130" fill={palette.fog} opacity="0.38" rx="106" ry="14" />
      <g>
        <rect
          fill="#ffffff"
          height="96"
          rx="8"
          stroke={palette.mint}
          strokeOpacity="0.42"
          width="96"
          x="142"
          y="34"
        />
        <path d="M142 42a8 8 0 0 1 8-8h80a8 8 0 0 1 8 8v28h-96Z" fill={palette.mint} opacity="0.42" />
        <text
          fill={palette.teal}
          fontFamily={illustrationFontFamily}
          fontSize="14"
          fontWeight={illustrationFontWeight}
          textAnchor="middle"
          x="190"
          y="58"
        >
          TEAM A
        </text>
        <text
          fill={palette.teal}
          fontFamily={illustrationFontFamily}
          fontSize="54"
          fontWeight={illustrationFontWeight}
          textAnchor="middle"
          x="190"
          y="112"
        >
          12
        </text>
      </g>
      <g>
        <rect
          fill="#ffffff"
          height="96"
          rx="8"
          stroke={palette.coral}
          strokeOpacity="0.22"
          width="96"
          x="254"
          y="34"
        />
        <path d="M254 42a8 8 0 0 1 8-8h80a8 8 0 0 1 8 8v28h-96Z" fill={palette.coral} opacity="0.2" />
        <text
          fill={palette.coral}
          fontFamily={illustrationFontFamily}
          fontSize="14"
          fontWeight={illustrationFontWeight}
          textAnchor="middle"
          x="302"
          y="58"
        >
          TEAM B
        </text>
        <text
          fill={palette.coral}
          fontFamily={illustrationFontFamily}
          fontSize="54"
          fontWeight={illustrationFontWeight}
          textAnchor="middle"
          x="302"
          y="112"
        >
          09
        </text>
      </g>
    </SvgShell>
  )
}

function BuzzerIllustration() {
  return (
    <SvgShell>
      <g fill="none" stroke={palette.mint} strokeLinecap="round" strokeWidth="4">
        <path d="M136 38c-26 42-26 82 0 124" opacity="0.45" />
        <path d="M170 52c-20 32-20 64 0 96" opacity="0.6" />
        <path d="M338 38c26 42 26 82 0 124" opacity="0.45" />
        <path d="M304 52c20 32 20 64 0 96" opacity="0.6" />
      </g>
      <circle cx="237" cy="102" r="58" fill="#ffffff" stroke={palette.fog} strokeWidth="4" />
      <circle cx="237" cy="102" r="48" fill={palette.fog} opacity="0.45" />
      <circle cx="237" cy="102" r="42" fill={palette.coral} />
      <path d="M206 78c17-21 46-22 64-2" fill="none" stroke="#ff9b8d" strokeLinecap="round" strokeWidth="8" />
      <ellipse cx="237" cy="151" fill={palette.navy} opacity="0.16" rx="55" ry="9" />
    </SvgShell>
  )
}

function SushiMapIllustration() {
  return (
    <SvgShell>
      <g opacity="0.9">
        <path d="M92 30 346 2l-38 148H58Z" fill={palette.paleMint} />
        <path
          d="M112 24 82 150M170 16 138 150M234 10 200 150M298 6 266 150M72 54h258M66 88h248M58 122h238"
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M132 84c42-28 73 28 114-6 28-23 45-5 70-34"
          fill="none"
          stroke={palette.teal}
          strokeDasharray="7 10"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <g>
          <circle cx="150" cy="82" r="21" fill="#ffffff" opacity="0.92" />
          <ellipse cx="150" cy="82" fill={palette.fog} opacity="0.42" rx="18" ry="8" />
          <rect fill={palette.coral} height="14" rx="4" width="26" x="137" y="73" />
          <path d="M139 76c7 5 15 5 22 0" fill="none" stroke="#ffffff" strokeWidth="3" />
        </g>
        <g>
          <circle cx="236" cy="104" r="23" fill="#ffffff" opacity="0.94" />
          <rect fill={palette.apricot} height="24" rx="6" width="28" x="222" y="92" />
          <rect fill="#ffffff" height="10" rx="3" width="16" x="228" y="99" />
          <path d="M225 95h22M225 113h22" stroke="#f49b43" strokeWidth="3" />
        </g>
        <g>
          <circle cx="316" cy="52" r="22" fill="#ffffff" opacity="0.94" />
          <path d="m302 45 14-7 15 7-15 8Z" fill={palette.navy} opacity="0.78" />
          <path d="m302 45 14 8v14l-14-8Z" fill={palette.fog} />
          <path d="m331 45-15 8v14l15-8Z" fill={palette.teal} opacity="0.75" />
        </g>
        <path d="M348 98c0 19-17 22-17 35 0-13-17-16-17-35a17 17 0 0 1 34 0Z" fill={palette.teal} opacity="0.62" />
        <circle cx="331" cy="98" r="6" fill="#ffffff" />
        <path d="M78 86c-19 5-25 21-20 42m10-25c19-6 31 4 35 22m-19-61c9 14 4 28-10 41" fill="none" stroke={palette.teal} strokeLinecap="round" strokeWidth="3" opacity="0.38" />
        <path d="M72 58c-4-16 30-18 34-2 11-4 25 1 26 13H80c-9 0-14-5-8-11Z" fill={palette.mint} opacity="0.6" />
      </g>
    </SvgShell>
  )
}

function RandomizerIllustration() {
  const tiles = [
    { value: '3', x: 162, y: 24, color: '#65717a' },
    { value: '8', x: 262, y: 24, color: palette.coral },
    { value: '1', x: 162, y: 94, color: '#65717a' },
    { value: '6', x: 262, y: 94, color: palette.teal },
  ]

  return (
    <SvgShell>
      <g opacity="0.72">
        <rect fill={palette.mint} height="8" rx="2" transform="rotate(-38 134 36)" width="8" x="130" y="32" />
        <rect fill={palette.coral} height="8" rx="2" transform="rotate(-38 340 38)" width="8" x="336" y="34" />
        <rect fill={palette.coral} height="8" rx="2" transform="rotate(-38 130 116)" width="8" x="126" y="112" />
        <rect fill={palette.mint} height="8" rx="2" transform="rotate(-38 348 128)" width="8" x="344" y="124" />
      </g>
      {tiles.map((tile) => (
        <g key={tile.value + tile.x}>
          <rect
            fill="#ffffff"
            height="56"
            rx="8"
            stroke={tile.color}
            strokeOpacity="0.14"
            width="82"
            x={tile.x}
            y={tile.y}
          />
          <text
            fill={tile.color}
            fontFamily={illustrationFontFamily}
            fontSize="38"
            fontWeight={illustrationFontWeight}
            textAnchor="middle"
            x={tile.x + 41}
            y={tile.y + 41}
          >
            {tile.value}
          </text>
        </g>
      ))}
    </SvgShell>
  )
}

function NextQuestionIllustration() {
  return (
    <SvgShell>
      <ellipse cx="240" cy="134" fill={palette.navy} opacity="0.12" rx="108" ry="12" />
      <g opacity="0.86">
        <rect
          fill={palette.paleMint}
          height="94"
          rx="12"
          stroke={palette.mint}
          strokeOpacity="0.38"
          transform="rotate(10 252 78)"
          width="170"
          x="168"
          y="31"
        />
        <rect
          fill="#f7fbfa"
          height="98"
          rx="12"
          stroke={palette.mint}
          strokeOpacity="0.46"
          transform="rotate(5 238 78)"
          width="184"
          x="140"
          y="29"
        />
        <rect
          fill="#ffffff"
          height="104"
          rx="12"
          stroke={palette.fog}
          strokeWidth="2"
          width="198"
          x="108"
          y="28"
        />
        <text
          fill={palette.navy}
          fontFamily={illustrationFontFamily}
          fontSize="58"
          fontWeight={illustrationFontWeight}
          opacity="0.62"
          textAnchor="middle"
          x="207"
          y="98"
        >
          ?
        </text>
        <g opacity="0.72">
          <circle cx="148" cy="116" r="4" fill={palette.mint} />
          <circle cx="164" cy="116" r="4" fill={palette.fog} />
          <circle cx="180" cy="116" r="4" fill={palette.fog} />
        </g>
      </g>
    </SvgShell>
  )
}

function SwissTournamentIllustration() {
  return (
    <div className="grid h-full place-items-center">
      <img
        alt=""
        className="h-[72%] w-[82%] object-contain opacity-72 drop-shadow-sm"
        src="/sk-anderten-watermark.png"
      />
    </div>
  )
}

export function DashboardIllustration({ appId }: { appId: string }) {
  switch (appId) {
    case 'decision-wheel':
      return <WheelIllustration />
    case 'coinflip':
      return <CoinflipIllustration />
    case 'progress-dashboard':
      return <ProgressIllustration />
    case 'scoreboard':
      return <ScoreboardIllustration />
    case 'live-buzzer':
      return <BuzzerIllustration />
    case 'territory-map':
      return <SushiMapIllustration />
    case 'randomizer':
      return <RandomizerIllustration />
    case 'swiss-tournaments':
      return <SwissTournamentIllustration />
    case 'next-question':
      return <NextQuestionIllustration />
    default:
      return <ProgressIllustration />
  }
}
