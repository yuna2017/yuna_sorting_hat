import { TRAIT_LIST } from '../data/traits'
import { toPercent } from '../lib/scoring'
import type { TraitProfile } from '../lib/traits'

interface TraitBarsProps {
  profile: TraitProfile
}

/**
 * 五维倾向读数。
 *
 * 与 ScoreBars 视觉同构（同一套色点 + 量条 + tabular-nums 读数），
 * 但两者语义无关：部门契合度来自 p/s，倾向来自 traits，不允许互相推导。
 *
 * 每个倾向的分母是**自己的**理论上限（逐特质不同），所以读数列打的是
 * scores/ceilings 而不是一个全局满分 —— 用统一分母会让权重高的特质虚高。
 */
export function TraitBars({ profile }: TraitBarsProps) {
  return (
    <ul className="flex flex-col gap-3">
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

              <span className="relative h-2 flex-1 rounded-full bg-night-600/70">
                <span
                  className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-[900ms] ease-out ${
                    isDominant ? 'winner-glow' : ''
                  }`}
                  style={{
                    width: `${Math.max(pct, 1.5)}%`,
                    backgroundColor: isDominant ? 'var(--dept-accent)' : '#b9aa8b',
                    opacity: isDominant ? 1 : 0.4,
                  }}
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

            {/* 描述缩进对齐量条起点，让「名称 → 解释」形成一列而不是散在行首 */}
            <p className="pl-[1.4rem] text-[0.72rem] leading-relaxed text-parchment-dim/70">
              {trait.desc}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
