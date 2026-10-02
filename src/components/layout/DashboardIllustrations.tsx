import type { ReactNode } from 'react'

const palette = {
  teal: '#0d8e90',
  mint: '#a9dfda',
  coral: '#fd7261',
  apricot: '#fac889',
  fog: '#d7e3e5',
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

function WheelIllustration() {
  return (
    <SvgShell>
      <circle cx="90" cy="82" r="70" fill={palette.paleMint} />
      <g transform="rotate(-22.5 90 82)">
        <path d="M90 82L90 18A64 64 0 0 1 135.255 36.745Z" stroke="#fff" strokeWidth="2" fill={palette.apricot} />
        <path d="M90 82L135.255 36.745A64 64 0 0 1 154 82Z" stroke="#fff" strokeWidth="2" fill={palette.coral} />
        <path d="M90 82L154 82A64 64 0 0 1 135.255 127.255Z" stroke="#fff" strokeWidth="2" fill="#ffc6ba" />
        <path d="M90 82L135.255 127.255A64 64 0 0 1 90 146Z" stroke="#fff" strokeWidth="2" fill={palette.mint} />
        <path d="M90 82L90 146A64 64 0 0 1 44.745 127.255Z" stroke="#fff" strokeWidth="2" fill={palette.teal} />
        <path d="M90 82L44.745 127.255A64 64 0 0 1 26 82Z" stroke="#fff" strokeWidth="2" fill={palette.paleMint} />
        <path d="M90 82L26 82A64 64 0 0 1 44.745 36.745Z" stroke="#fff" strokeWidth="2" fill="#8ecfca" />
        <path d="M90 82L44.745 36.745A64 64 0 0 1 90 18Z" stroke="#fff" strokeWidth="2" fill="#d9eee9" />
        <circle cx="90" cy="82" r="64" fill="none" stroke={palette.mint} strokeWidth="3" />
      </g>
      <path d="M80 10H100L90 34Z" stroke="#fff" strokeWidth="3" fill={palette.coral} />
      <circle cx="90" cy="82" r="18" fill="#fff" />
      <circle cx="90" cy="82" r="8" fill={palette.teal} />
    </SvgShell>
  )
}

function CoinflipIllustration() {
  return (
    <SvgShell>
      <ellipse cx="90" cy="137" rx="73" ry="8" fill={palette.paleMint} />
      <g transform="rotate(-9 73 102)">
        <rect x="24" y="97" width="98" height="10" rx="5" fill={palette.apricot} />
        <ellipse cx="73" cy="97" rx="49" ry="20" fill="#fff3e3" stroke={palette.apricot} strokeWidth="4" />
        <g transform="translate(0 40) scale(1 .59)">
          <text x="73" y="97" fontSize="29" fill="#a97b3d">K</text>
        </g>
      </g>
      <g transform="rotate(12 126 76)">
        <circle cx="126" cy="76" r="43" fill="#fff" stroke={palette.teal} strokeWidth="4" />
        <circle cx="126" cy="76" r="35" fill={palette.paleMint} />
        <circle cx="126" cy="76" r="38" fill="none" stroke={palette.teal} strokeWidth="1" />
        <text x="126" y="76" fontSize="36.55" fill={palette.teal}>Z</text>
      </g>
    </SvgShell>
  )
}

function ProgressIllustration() {
  return (
    <SvgShell>
      <path d="M34 42H163" stroke={palette.fog} strokeWidth="1" fill="none" strokeDasharray="3 5" />
      <path d="M34 76H163" stroke={palette.fog} strokeWidth="1" fill="none" strokeDasharray="3 5" />
      <path d="M34 110H163" stroke={palette.fog} strokeWidth="1" fill="none" strokeDasharray="3 5" />
      <path d="M34 31V126H164" stroke={palette.fog} strokeWidth="1.5" fill="none" />
      <text x="23" y="126" fontSize="8" fontWeight="600" fill="#78939b">0</text>
      <text x="23" y="84" fontSize="8" fontWeight="600" fill="#78939b">4</text>
      <text x="23" y="42" fontSize="8" fontWeight="600" fill="#78939b">8</text>
      <text x="39" y="139" fontSize="8" fontWeight="600" fill="#78939b">18:00</text>
      <text x="98" y="139" fontSize="8" fontWeight="600" fill="#78939b">19:00</text>
      <text x="157" y="139" fontSize="8" fontWeight="600" fill="#78939b">20:00</text>
      <path d="M39 116H63V94H94V73H126V42H157" stroke={palette.teal} strokeWidth="3" fill="none" />
      <path d="M39 120H79V106H111V85H144V66H157" stroke={palette.coral} strokeWidth="3" fill="none" />
      <path d="M39 123H57V116H101V101H127V86H157" stroke={palette.apricot} strokeWidth="3" fill="none" />
      <circle cx="157" cy="42" r="4" fill={palette.teal} />
      <circle cx="157" cy="66" r="4" fill={palette.coral} />
      <circle cx="157" cy="86" r="4" fill={palette.apricot} />
    </SvgShell>
  )
}

function TriathlonIllustration() {
  return (
    <SvgShell>
      <rect x="31" y="17" width="123" height="127" rx="9" fill="#fff" stroke={palette.mint} strokeWidth="1.5" />
      <path d="M45 17v127" stroke={palette.mint} strokeWidth="1.5" fill="none" />
      <path d="M66 24v-10M120 24v-10" stroke={palette.teal} strokeWidth="3" fill="none" />
      <g color={palette.teal} transform="translate(76 48) scale(0.7)">
        <circle cx="7" cy="-10" r="4" fill="currentColor" />
        <path d="M-17 1-6-9 5-5 14 1" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <path d="M-20 9q5-5 10 0t10 0t10 0t10 0" stroke="currentColor" strokeWidth="2.5" fill="none" />
      </g>
      <path d="M106 43h32M106 52h21" stroke={palette.mint} strokeWidth="2.5" fill="none" />
      <path d="M53 70H141" stroke={palette.fog} strokeWidth="1" fill="none" />
      <g color="#c3904f" transform="translate(75 87) scale(0.65)">
        <circle cx="-14" cy="6" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="15" cy="6" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M-14 6-5-10 6 6h-20M-5-10H8l7 16M6 6l-11-16M5-17h7M-9-13h8" stroke="currentColor" strokeWidth="2.5" fill="none" />
      </g>
      <path d="M106 82h32M106 91h21" stroke={palette.apricot} strokeWidth="2.5" fill="none" />
      <path d="M53 108H141" stroke={palette.fog} strokeWidth="1" fill="none" />
      <g color={palette.coral} transform="translate(76 126) scale(0.65)">
        <circle cx="7" cy="-17" r="4" fill="currentColor" />
        <path d="M-10-5 0-11 7-7 16-6M0-11-4 4l-12 10M-4 4 8 8l3 12" stroke="currentColor" strokeWidth="2.8" fill="none" />
      </g>
      <path d="M106 120h32M106 129h21" stroke="#ffc6ba" strokeWidth="2.5" fill="none" />
    </SvgShell>
  )
}

function ScoreboardIllustration() {
  return (
    <SvgShell>
      <rect x="16" y="93" width="45" height="42" rx="5" fill="#ffc6ba" />
      <rect x="67" y="62" width="46" height="73" rx="5" fill={palette.mint} />
      <rect x="119" y="107" width="45" height="28" rx="5" fill={palette.apricot} />
      <text x="38" y="78" fontSize="24" fill={palette.coral}>09</text>
      <text x="90" y="44" fontSize="28" fill={palette.teal}>12</text>
      <text x="141" y="94" fontSize="19" fill="#a97b3d">06</text>
      <text x="38" y="115" fontSize="16" fill="#fff">2</text>
      <text x="90" y="99" fontSize="22" fill={palette.teal}>1</text>
      <text x="141" y="122" fontSize="14" fill="#fff">3</text>
      <path d="M9 136H171" stroke={palette.fog} strokeWidth="1.5" fill="none" />
    </SvgShell>
  )
}

function BuzzerIllustration() {
  return (
    <SvgShell>
      <g transform="rotate(9 132 51)">
        <g transform="translate(132 51) scale(0.78)">
          <rect x="-22" y="-40" width="44" height="80" rx="7" fill="#fff" stroke={palette.mint} strokeWidth="1.5" />
          <path d="M-6-32H6" stroke={palette.fog} strokeWidth="2" fill="none" />
          <circle cx="0" cy="32" r="2" fill={palette.mint} />
          <g transform="translate(0 2) scale(0.34)">
            <ellipse cx="0" cy="28" rx="55" ry="16" fill={palette.fog} />
            <ellipse cx="0" cy="21" rx="53" ry="18" fill="#fff" stroke={palette.mint} strokeWidth="2" />
            <path d="M-39-3v16c0 23 78 23 78 0V-3" fill="#e55749" />
            <ellipse cx="0" cy="-3" rx="39" ry="26" fill={palette.coral} />
            <path d="M-25-13Q-8-24 17-18" stroke="#ffb4a9" strokeWidth="3.5" fill="none" />
          </g>
        </g>
      </g>
      <g transform="rotate(-10 47 53)">
        <g transform="translate(47 53) scale(0.67)">
          <rect x="-22" y="-40" width="44" height="80" rx="7" fill="#fff" stroke={palette.mint} strokeWidth="1.5" />
          <path d="M-6-32H6" stroke={palette.fog} strokeWidth="2" fill="none" />
          <circle cx="0" cy="32" r="2" fill={palette.mint} />
          <g transform="translate(0 2) scale(0.34)">
            <ellipse cx="0" cy="28" rx="55" ry="16" fill={palette.fog} />
            <ellipse cx="0" cy="21" rx="53" ry="18" fill="#fff" stroke={palette.mint} strokeWidth="2" />
            <path d="M-39-3v16c0 23 78 23 78 0V-3" fill="#e55749" />
            <ellipse cx="0" cy="-3" rx="39" ry="26" fill={palette.coral} />
            <path d="M-25-13Q-8-24 17-18" stroke="#ffb4a9" strokeWidth="3.5" fill="none" />
          </g>
        </g>
      </g>
      <path d="M52 87 76 105H124L136 88" stroke={palette.mint} strokeWidth="2.5" fill="none" strokeDasharray="3 6" />
      <g transform="translate(93 91) scale(1)">
        <ellipse cx="0" cy="28" rx="55" ry="16" fill={palette.fog} />
        <ellipse cx="0" cy="21" rx="53" ry="18" fill="#fff" stroke={palette.mint} strokeWidth="2" />
        <path d="M-39-3v16c0 23 78 23 78 0V-3" fill="#e55749" />
        <ellipse cx="0" cy="-3" rx="39" ry="26" fill={palette.coral} />
        <path d="M-25-13Q-8-24 17-18" stroke="#ffb4a9" strokeWidth="3.5" fill="none" />
      </g>
      <path d="M86 33v-9M113 36l5-9" stroke={palette.mint} strokeWidth="2.5" fill="none" />
    </SvgShell>
  )
}

function SushiMapIllustration() {
  return (
    <SvgShell>
      <circle cx="89" cy="77" r="63" fill={palette.paleMint} />
      <g transform="translate(4 3) scale(.95)">
        <path d="M22 41 38 32 58 36 69 49 58 61 49 62 43 74 30 63 27 52Z" fill={palette.mint} />
        <path d="M48 80 65 81 71 95 64 105 60 123 52 115 48 98Z" fill={palette.mint} />
        <path d="M88 43 105 33 124 38 129 31 154 43 161 58 148 68 136 62 128 72 116 64 106 68 102 57 90 57Z" fill={palette.mint} />
        <path d="M89 66 108 64 119 79 109 99 99 109 91 91 85 77Z" fill={palette.mint} />
        <path d="M137 102 154 97 164 110 155 119 138 116Z" fill={palette.mint} />
      </g>
      <g transform="translate(98 66)">
        <path d="M0 12C-5 4-12-1-12-10a12 12 0 0 1 24 0C12-1 5 4 0 12Z" stroke="#fff" strokeWidth="2" fill={palette.teal} />
        <circle cx="0" cy="-10" r="4" fill="#fff" />
      </g>
      <g transform="translate(135 87)">
        <path d="M0 12C-5 4-12-1-12-10a12 12 0 0 1 24 0C12-1 5 4 0 12Z" stroke="#fff" strokeWidth="2" fill={palette.coral} />
        <circle cx="0" cy="-10" r="4" fill="#fff" />
      </g>
      <g transform="translate(66 123) scale(1.05)">
        <rect x="-18" y="-8" width="36" height="23" rx="7" fill="#fff" stroke={palette.fog} strokeWidth="1.5" />
        <rect x="-19" y="-12" width="38" height="14" rx="6" fill={palette.coral} />
        <path d="M-10-8l-4 5M0-8l-4 5M10-8l-4 5" stroke="#ffc6ba" strokeWidth="2" fill="none" />
        <path d="M-11 9H11" stroke={palette.fog} strokeWidth="1.5" fill="none" />
      </g>
    </SvgShell>
  )
}

function RandomizerIllustration() {
  return (
    <SvgShell>
      <rect x="46" y="17" width="88" height="129" rx="15" fill={palette.paleMint} stroke={palette.mint} strokeWidth="1.5" />
      <text x="90" y="38" fontSize="24" fill="#93bcb8">41</text>
      <text x="90" y="126" fontSize="24" fill="#93bcb8">43</text>
      <rect x="36" y="55" width="108" height="55" rx="9" fill="#fff" stroke={palette.teal} strokeWidth="1.5" />
      <text x="90" y="83" fontSize="45" fill={palette.teal}>42</text>
      <path d="M149 77l-8 6 8 6" stroke={palette.coral} strokeWidth="3" fill="none" />
    </SvgShell>
  )
}

function NextQuestionIllustration() {
  return (
    <SvgShell>
      <g transform="rotate(-10 87 81)">
        <rect x="35" y="35" width="104" height="91" rx="9" fill={palette.paleMint} stroke={palette.mint} strokeWidth="1.5" />
      </g>
      <g transform="rotate(-4 89 76)">
        <rect x="37" y="30" width="104" height="91" rx="9" fill="#fff" stroke={palette.fog} strokeWidth="1.5" />
      </g>
      <g transform="rotate(6 95 72)">
        <rect x="43" y="27" width="104" height="91" rx="9" fill="#fff" stroke={palette.mint} strokeWidth="1.5" />
        <text x="95" y="71" fontSize="43" fill={palette.teal}>?</text>
        <circle cx="79" cy="102" r="2.5" fill={palette.teal} />
        <circle cx="94" cy="102" r="2.5" fill={palette.mint} />
        <circle cx="109" cy="102" r="2.5" fill={palette.mint} />
      </g>
    </SvgShell>
  )
}

function SwissTournamentIllustration() {
  return (
    <div className="flex h-full items-center justify-end">
      <img
        alt=""
        className="h-[72%] w-[82%] object-contain object-right opacity-72 drop-shadow-sm"
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
    case 'triathlon-tracker':
      return <TriathlonIllustration />
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
