import { TRAIT_ORDER } from '../data/constants'
import { TRAITS } from '../data/traits'
import type { TraitProfile } from '../lib/traits'

interface TraitRadarProps {
  profile: TraitProfile
  className?: string
}

/* 几何：五轴均分一周，首轴「探索」朝上。
   viewBox 留足上下与左右余量，避免中文轴标签在窄屏被裁。
   半径尽量往画布外扩（MAX_R 约占半径的 63%），让多边形撑得开、好读。 */
const CX = 140
const CY = 114
const MAX_R = 76
const LABEL_R = 90
const RINGS = [0.25, 0.5, 0.75, 1]
const REFERENCE = 0.5

const STEP = (Math.PI * 2) / TRAIT_ORDER.length
const ANGLE0 = -Math.PI / 2

function angle(i: number): number {
  return ANGLE0 + i * STEP
}
function pointAt(i: number, radius: number): [number, number] {
  const a = angle(i)
  return [CX + Math.cos(a) * radius, CY + Math.sin(a) * radius]
}
function ringPolygon(scale: number): string {
  return TRAIT_ORDER.map((_, i) => pointAt(i, MAX_R * scale).join(',')).join(' ')
}

/**
 * 五特质画像雷达（「人格形状」）。
 *
 * 与部门雷达是两套东西：部门雷达看 p/s 的部门契合度；这里看 deriveProfile 的
 * 特质画像（探索/洞察/创造/守护/连接）。两者解耦，画像不参与部门判定
 * （docs/特质体系.md §3）。
 *
 * 设计取舍：
 *  · 归一化直接映射到半径（不按 0.5 封顶），>50% 的特质仍能拉开差距；
 *  · 0.5 参考环加亮，方便读「这份画像在五轴上的位置」；
 *  · 主导特质顶点更大、标签更亮，颜色跟随部门强调色做整体换肤；
 *  · 每根轴标签带百分比（如「洞察 65%」），低值特质也一眼可读；
 *    精确趋势仍可对照下方 TraitBars。
 */
export function TraitRadar({ profile, className = '' }: TraitRadarProps) {
  const shape = TRAIT_ORDER.map((trait, i) => {
    const value = Math.min(Math.max(profile.normalized[trait], 0.02), 1)
    return pointAt(i, MAX_R * value).join(',')
  }).join(' ')

  return (
    <svg
      viewBox="0 0 300 246"
      className={`w-full ${className}`}
      role="img"
      aria-label={
        '分部帽画像雷达图：' +
        TRAIT_ORDER.map(
          (t) => `${TRAITS[t].name} ${Math.round(profile.normalized[t] * 100)}%`,
        ).join('，')
      }
    >
      {/* 网格环：实线 hairline，0.5 参考环加亮 */}
      {RINGS.map((scale) => (
        <polygon
          key={scale}
          points={ringPolygon(scale)}
          fill="none"
          stroke="var(--color-parchment)"
          strokeWidth="1"
          opacity={scale === REFERENCE ? 0.26 : 0.12}
        />
      ))}

      {/* 轴辐 */}
      {TRAIT_ORDER.map((_, i) => {
        const [x, y] = pointAt(i, MAX_R)
        return (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={x}
            y2={y}
            stroke="var(--color-parchment)"
            strokeWidth="1"
            opacity="0.14"
          />
        )
      })}

      {/* 数据多边形 */}
      <polygon
        points={shape}
        fill="var(--dept-accent)"
        fillOpacity="0.22"
        stroke="var(--dept-accent)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        filter="drop-shadow(0 0 8px color-mix(in srgb, var(--dept-accent) 75%, transparent)) drop-shadow(0 0 18px color-mix(in srgb, var(--dept-accent) 55%, transparent))"
      />

      {/* 顶点标记：主导特质更大 */}
      {TRAIT_ORDER.map((trait, i) => {
        const value = Math.min(Math.max(profile.normalized[trait], 0.02), 1)
        const [x, y] = pointAt(i, MAX_R * value)
        const isDominant = trait === profile.dominant
        return (
          <circle
            key={trait}
            cx={x}
            cy={y}
            r={isDominant ? 4.5 : 3}
            fill="var(--dept-accent)"
            stroke="var(--color-night-800)"
            strokeWidth="2"
          />
        )
      })}

      {/* 轴标签：文本色，不用数据色；带百分比，一眼可读每轴数值 */}
      {TRAIT_ORDER.map((trait, i) => {
        const [x, y] = pointAt(i, LABEL_R)
        const cos = Math.cos(angle(i))
        const sin = Math.sin(angle(i))
        const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : ('middle' as const)
        const dy = sin < -0.5 ? -4 : sin > 0.5 ? 12 : 4
        const pct = Math.round(profile.normalized[trait] * 100)
        return (
          <g key={trait}>
            <text
              x={x}
              y={y + dy}
              textAnchor={anchor}
              className="font-body"
              fontSize="12.5"
              fill="var(--color-parchment)"
              opacity={trait === profile.dominant ? 0.95 : 0.6}
            >
              {TRAITS[trait].name}
            </text>
            <text
              x={x}
              y={y + dy + 14}
              textAnchor={anchor}
              className="font-body tabular-nums"
              fontSize="10.5"
              fill="var(--color-parchment-dim)"
              opacity={trait === profile.dominant ? 0.9 : 0.55}
            >
              {pct}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}