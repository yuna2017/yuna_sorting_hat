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

/**
 * 四部门契合度读数 —— 雷达图的「表格孪生体」。
 *
 * 雷达负责形状，这里负责**精确数字**，两者不重复标注。
 * 采用 emphasis 形式：冠军用部门强调色，其余三项淡化为文本弱色
 * （淡化色对夜底仍有 7.6:1 以上对比度，淡化 ≠ 读不清）。
 */
export function ScoreBars({ normalized, scores, maxScore, winner }: ScoreBarsProps) {
  return (
    <ul className="flex flex-col gap-2.5">
      {DEPT_ORDER.map((dept) => {
        const isWinner = dept === winner
        const pct = toPercent(normalized[dept])

        return (
          <li key={dept} className="flex items-center gap-2.5 sm:gap-3">
            {/* 色点：身份由它承担，所以文字可以保持文本色 */}
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
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

            {/* 量条：末端 4px 圆角，锚在基线上 */}
            <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-night-600/70">
              <span
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-[900ms] ease-out"
                style={{
                  width: `${Math.max(pct, 1.5)}%`,
                  backgroundColor: isWinner ? 'var(--dept-accent)' : '#b9aa8b',
                  opacity: isWinner ? 1 : 0.4,
                }}
              />
            </span>

            {/* 数字用文本色，不用数据色；成列对齐所以用 tabular-nums */}
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
