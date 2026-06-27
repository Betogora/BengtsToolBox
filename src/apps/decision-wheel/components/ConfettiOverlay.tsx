import type { CSSProperties } from 'react'
import { useMemo } from 'react'

const confettiParticleCount = 84
const confettiColors = ['#063852', '#F0810F', '#E6DF44', '#47BFFF', '#FFFFFF']

type ConfettiParticle = {
  id: number
  color: string
  left: number
  size: number
  delay: number
  duration: number
  drift: number
  rotation: number
}

type ConfettiOverlayProps = {
  trigger: number
}

function createConfettiParticles(): ConfettiParticle[] {
  return Array.from({ length: confettiParticleCount }, (_, index) => ({
    id: index,
    color: confettiColors[index % confettiColors.length],
    left: Math.random() * 100,
    size: 6 + Math.random() * 8,
    delay: Math.random() * 420,
    duration: 2600 + Math.random() * 1800,
    drift: -42 + Math.random() * 84,
    rotation: Math.random() * 720,
  }))
}

export function ConfettiOverlay({ trigger }: ConfettiOverlayProps) {
  const particles = useMemo(
    () => (trigger > 0 ? createConfettiParticles() : []),
    [trigger],
  )

  if (trigger <= 0) {
    return null
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      aria-hidden="true"
    >
      <style>
        {`
          @keyframes decision-wheel-confetti-fall {
            0% {
              opacity: 0;
              transform: translate3d(0, -12vh, 0) rotate(0deg);
            }
            10% {
              opacity: 1;
            }
            100% {
              opacity: 0;
              transform: translate3d(var(--confetti-drift), 112vh, 0) rotate(var(--confetti-rotation));
            }
          }
        `}
      </style>
      {particles.map((particle) => (
        <span
          key={`${trigger}-${particle.id}`}
          className="absolute top-0 rounded-[2px]"
          style={
            {
              '--confetti-drift': `${particle.drift}vw`,
              '--confetti-rotation': `${particle.rotation}deg`,
              animation: `decision-wheel-confetti-fall ${particle.duration}ms ease-out ${particle.delay}ms forwards`,
              backgroundColor: particle.color,
              height: `${particle.size * 1.45}px`,
              left: `${particle.left}%`,
              width: `${particle.size}px`,
            } as CSSProperties & Record<string, string>
          }
        />
      ))}
    </div>
  )
}
