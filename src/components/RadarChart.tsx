import { useEffect, useRef, useState } from 'react'
import type { DeptId, NormalizedScores } from '../data/constants'
import { DEPT_ORDER } from '../data/constants'
import { DEPARTMENTS } from '../data/departments'

interface RadarChartProps {
  normalized: NormalizedScores
  winner: DeptId
  className?: string
}

const CX = 150
const CY = 112
const MAX_R = 72
const LABEL_R = 90
export const RADAR_REFERENCE_MAX = 0.5
const RINGS = [0.125, 0.25, 0.375, 0.5]

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

function useInView<T extends Element>() {
  const ref = useRef<T | null>(null)
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

  return { ref, visible, playCount }
}

export function RadarChart({ normalized, winner, className = '' }: RadarChartProps) {
  const { ref, visible, playCount } = useInView<SVGSVGElement>()
  const shape = DEPT_ORDER.map((dept) => {
    const value = Math.min(Math.max(normalized[dept], 0.02), RADAR_REFERENCE_MAX)
    return pointAt(dept, MAX_R * (value / RADAR_REFERENCE_MAX)).join(',')
  }).join(' ')

  return (
    <svg
      ref={ref}
      viewBox="0 0 300 236"
      className={`chart-reveal w-full ${visible ? 'is-visible' : ''} ${playCount > 1 ? 'is-repeat' : ''} ${className}`}
      role="img"
      aria-label={
        '四部门契合度雷达图：' +
        DEPT_ORDER.map(
          (d) => `${DEPARTMENTS[d].name} ${Math.round(normalized[d] * 100)}%`,
        ).join('，')
      }
    >
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

      <polygon
        points={shape}
        className="radar-shape"
        fill="var(--dept-accent)"
        fillOpacity="0.22"
        stroke="var(--dept-accent)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        filter="drop-shadow(0 0 8px color-mix(in srgb, var(--dept-accent) 75%, transparent)) drop-shadow(0 0 18px color-mix(in srgb, var(--dept-accent) 55%, transparent))"
      />

      {DEPT_ORDER.map((dept) => {
        const value = Math.min(Math.max(normalized[dept], 0.02), RADAR_REFERENCE_MAX)
        const [x, y] = pointAt(dept, MAX_R * (value / RADAR_REFERENCE_MAX))
        const isWinner = dept === winner
        return (
          <circle
            key={dept}
            className={`radar-point radar-point-${dept}`}
            cx={x}
            cy={y}
            r={isWinner ? 4.5 : 3}
            fill="var(--dept-accent)"
            stroke="var(--color-night-800)"
            strokeWidth="2"
          />
        )
      })}

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
