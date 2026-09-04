import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { DeptId, NormalizedScores, Scores } from '../data/constants'
import { DEPT_ORDER } from '../data/constants'
import { DEPARTMENTS } from '../data/departments'
import { toPercent } from '../lib/scoring'

interface ScoreBarsProps {
  normalized: NormalizedScores
  scores: Scores
  maxScore: number
  winner: DeptId
}

export function ScoreBars({ normalized, scores, maxScore, winner }: ScoreBarsProps) {
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
    <ul ref={ref} className={`score-bars chart-reveal flex flex-col gap-2.5 ${visible ? 'is-visible' : ''} ${playCount > 1 ? 'is-repeat' : ''}`}>
      {DEPT_ORDER.map((dept) => {
        const isWinner = dept === winner
        const pct = toPercent(normalized[dept])

        return (
          <li key={dept} className="flex items-center gap-2.5 sm:gap-3">
            <span
              aria-hidden="true"
              className={`size-2 shrink-0 rounded-full ${isWinner ? 'winner-glow' : ''}`}
              style={{
                backgroundColor: isWinner ? 'var(--dept-accent)' : '#b9aa8b',
                opacity: isWinner ? 1 : 0.55,
              }}
            />
            <span
              className={`w-14 shrink-0 text-[0.8rem] sm:text-sm ${
                isWinner ? 'text-parchment' : 'text-parchment-dim'
              }`}
            >
              {DEPARTMENTS[dept].name}
            </span>
            <span className="relative h-2 min-w-0 flex-1 rounded-full bg-night-600/70">
              <span
                className={`score-bar-fill absolute inset-y-0 left-0 rounded-full transition-[width] duration-[900ms] ease-out ${
                  isWinner ? 'winner-glow' : ''
                }`}
                style={{
                  width: `${Math.max(pct, 1.5)}%`,
                  '--bar-width': `${Math.max(pct, 1.5)}%`,
                  backgroundColor: isWinner ? 'var(--dept-accent)' : '#b9aa8b',
                  opacity: isWinner ? 1 : 0.4,
                } as CSSProperties}
              />
            </span>
            <span
              className={`w-[4.6rem] shrink-0 text-right text-[0.8rem] tabular-nums sm:text-sm ${
                isWinner ? 'text-parchment' : 'text-parchment-dim'
              }`}
            >
              {pct}%
              <span className="ml-1 text-[0.7rem] opacity-55">
                {scores[dept]}/{maxScore}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
