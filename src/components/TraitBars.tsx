import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { TRAIT_LIST } from '../data/traits'
import { toPercent } from '../lib/scoring'
import type { TraitProfile } from '../lib/traits'

interface TraitBarsProps {
  profile: TraitProfile
}

export function TraitBars({ profile }: TraitBarsProps) {
  const ref = useRef<HTMLUListElement | null>(null)
  const [visible, setVisible] = useState(false)
  const [playCount, setPlayCount] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (element === null) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setPlayCount((count) => count + 1)
          setVisible(true)
        } else {
          setVisible(false)
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <ul ref={ref} className={`trait-bars chart-reveal flex flex-col gap-3 ${visible ? 'is-visible' : ''} ${playCount > 1 ? 'is-repeat' : ''}`}>
      {TRAIT_LIST.map((trait) => {
        const isDominant = trait.id === profile.dominant
        const pct = toPercent(profile.normalized[trait.id])

        return (
          <li key={trait.id} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span
                aria-hidden="true"
                className={`size-2 shrink-0 rounded-full ${isDominant ? 'winner-glow' : ''}`}
                style={{
                  backgroundColor: isDominant ? 'var(--dept-accent)' : '#b9aa8b',
                  opacity: isDominant ? 1 : 0.55,
                }}
              />
              <span
                className={`w-8 shrink-0 text-[0.8rem] sm:text-sm ${
                  isDominant ? 'text-parchment' : 'text-parchment-dim'
                }`}
              >
                {trait.name}
              </span>
              <span className="relative h-2 min-w-0 flex-1 rounded-full bg-night-600/70">
                <span
                  className={`score-bar-fill absolute inset-y-0 left-0 rounded-full transition-[width] duration-[900ms] ease-out ${
                    isDominant ? 'winner-glow' : ''
                  }`}
                  style={{
                    width: `${Math.max(pct, 1.5)}%`,
                    '--bar-width': `${Math.max(pct, 1.5)}%`,
                    backgroundColor: isDominant ? 'var(--dept-accent)' : '#b9aa8b',
                    opacity: isDominant ? 1 : 0.4,
                  } as CSSProperties}
                />
              </span>
              <span
                className={`w-[4.6rem] shrink-0 text-right text-[0.8rem] tabular-nums sm:text-sm ${
                  isDominant ? 'text-parchment' : 'text-parchment-dim'
                }`}
              >
                {pct}%
                <span className="ml-1 text-[0.7rem] opacity-55">
                  {profile.scores[trait.id]}/{profile.ceilings[trait.id]}
                </span>
              </span>
            </div>
            <p className="pl-[1.4rem] text-[0.72rem] leading-relaxed text-parchment-dim/70">
              {trait.desc}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
