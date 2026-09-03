import type { DeptId, NormalizedScores } from '../data/constants'
import { DEPT_ORDER } from '../data/constants'
import { DEPARTMENTS } from '../data/departments'

interface RadarChartProps {
  normalized: NormalizedScores
  winner: DeptId
  className?: string
}

/* 几何：四轴指向 上/右/下/左。
   viewBox 特意做宽（300×236）—— 左右两个中文轴标签需要横向余量，
   否则窄屏上会被裁掉（这是 4 轴雷达最常见的翻车点）。 */
const CX = 150
const CY = 112
const MAX_R = 72
const LABEL_R = 90
export const RADAR_REFERENCE_MAX = 0.5
const RINGS = [0.125, 0.25, 0.375, 0.5]

/** 轴角度：dev 上、sec 右、ops 下、pr 左。 */
const ANGLES: Record<DeptId, number> = {
  dev: -Math.PI / 2,
  sec: 0,
  ops: Math.PI / 2,
  pr: Math.PI,
}

function pointAt(dept: DeptId, radius: number): [number, number] {
  const angle = ANGLES[dept]
  return [CX + Math.cos(angle) * radius, CY + Math.sin(angle) * radius]
}

function ringPolygon(scale: number): string {
  return DEPT_ORDER.map((dept) => pointAt(dept, MAX_R * scale).join(',')).join(' ')
}

/**
 * 四轴雷达图 —— 「人格形状」。
 *
 * 设计取舍（依 dataviz 方法）：
 *  · 只有一组数据，所以不需要图例，标题即命名；
 *  · 图内**不标任何数字** —— 精确读数交给下方的 ScoreBars，
 *    避免「每个点都挂个数」的噪音；
 *  · 网格与轴用**实线** hairline（虚线会被误读成阈值/预测）；
 *  · 多边形只用冠军部门的强调色（emphasis 形式：一个是主角，其余是背景）。
 */
export function RadarChart({ normalized, winner, className = '' }: RadarChartProps) {
  const shape = DEPT_ORDER.map((dept) => {
    const value = Math.min(Math.max(normalized[dept], 0.02), RADAR_REFERENCE_MAX)
    return pointAt(dept, MAX_R * (value / RADAR_REFERENCE_MAX)).join(',')
  }).join(' ')

  return (
    <svg
      viewBox="0 0 300 236"
      className={`w-full ${className}`}
      role="img"
      aria-label={
        '四部门契合度雷达图：' +
        DEPT_ORDER.map(
          (d) => `${DEPARTMENTS[d].name} ${Math.round(normalized[d] * 100)}%`,
        ).join('，')
      }
    >
      {/* 网格环：实线 hairline，压得很低不抢戏 */}
      {RINGS.map((scale) => (
        <polygon
          key={scale}
          points={ringPolygon(scale)}
          fill="none"
          stroke="var(--color-parchment)"
          strokeWidth="1"
          opacity={scale === RADAR_REFERENCE_MAX ? 0.26 : 0.12}
        />
      ))}

      {/* 轴辐 */}
      {DEPT_ORDER.map((dept) => {
        const [x, y] = pointAt(dept, MAX_R)
        return (
          <line
            key={dept}
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

      {/* 顶点标记 */}
      {DEPT_ORDER.map((dept) => {
        const value = Math.min(Math.max(normalized[dept], 0.02), RADAR_REFERENCE_MAX)
        const [x, y] = pointAt(dept, MAX_R * (value / RADAR_REFERENCE_MAX))
        const isWinner = dept === winner
        return (
          <circle
            key={dept}
            cx={x}
            cy={y}
            r={isWinner ? 4.5 : 3}
            fill="var(--dept-accent)"
            stroke="var(--color-night-800)"
            strokeWidth="2"
          />
        )
      })}

      {/* 轴标签：文字用文本色，绝不用数据色 —— 身份由位置与下方的色点承担 */}
      {DEPT_ORDER.map((dept) => {
        const [x, y] = pointAt(dept, LABEL_R)
        const anchor =
          dept === 'sec' ? 'start' : dept === 'pr' ? 'end' : ('middle' as const)
        const dy = dept === 'dev' ? -2 : dept === 'ops' ? 12 : 4
        return (
          <text
            key={dept}
            x={x}
            y={y + dy}
            textAnchor={anchor}
            className="font-body"
            fontSize="12.5"
            fill="var(--color-parchment)"
            opacity={dept === winner ? 0.95 : 0.6}
          >
            {DEPARTMENTS[dept].name}
          </text>
        )
      })}
    </svg>
  )
}
