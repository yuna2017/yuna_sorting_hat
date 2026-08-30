import { useEffect, useRef, useState } from 'react'
import { DeptCard } from '../components/DeptCard'
import { SortingHat } from '../components/SortingHat'
import { DEPARTMENTS } from '../data/departments'
import { prefersReducedMotion } from '../lib/motion'
import magicCircle from '../assets/auxillary/magic_circle.webp'
import type { Verdict } from '../lib/scoring'

interface RevealScreenProps {
  verdict: Verdict
  /** 仪式结束（或被跳过）后进入结果页。 */
  onDone: () => void
}

/** 黑屏停顿 → 思考 → 宣判 → 部门出现。 */
type RevealStage = 'silence' | 'thinking' | 'decided' | 'department'

/** 各阶段距进入仪式的累计时间（毫秒）。 */
const BEATS = {
  thinking: 650,
  decided: 2500,
  department: 3450,
  done: 5000,
} as const

/** 减少动态效果时保留一次短暂的结果亮相。 */
const REDUCED_DONE = 450

/**
 * 分院仪式只负责延迟揭晓，不参与判定。
 * verdict 已在 App 中计算完成，仪式结束后直接进入同一个结果页。
 */
export function RevealScreen({ verdict, onDone }: RevealScreenProps) {
  const reduced = prefersReducedMotion()
  const [stage, setStage] = useState<RevealStage>('silence')
  const doneRef = useRef(false)
  const dept = DEPARTMENTS[verdict.winner]

  useEffect(() => {
    function finish() {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }

    if (reduced) {
      setStage('department')
      const timer = window.setTimeout(finish, REDUCED_DONE)
      return () => window.clearTimeout(timer)
    }

    const timers = [
      window.setTimeout(() => setStage('thinking'), BEATS.thinking),
      window.setTimeout(() => setStage('decided'), BEATS.decided),
      window.setTimeout(() => setStage('department'), BEATS.department),
      window.setTimeout(finish, BEATS.done),
    ]

    return () => timers.forEach(window.clearTimeout)
  }, [onDone, reduced])

  function skip() {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }

  return (
    <main className="screen-enter starfield-deep reveal-screen flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex w-full max-w-sm flex-col items-center">
        <p className="font-display text-[0.62rem] tracking-[0.36em] text-parchment-dim/55">
          YUNA SORTING HAT
        </p>

        {/* 固定高度让阶段替换时不发生页面跳动；初始阶段只留下黑暗和星空。 */}
        <div className="reveal-stage-shell mt-10 flex min-h-[25rem] w-full flex-col items-center justify-center">
          {(stage === 'thinking' || stage === 'decided') && (
            <img
              aria-hidden="true"
              src={magicCircle}
              width={2048}
              height={2048}
              className="reveal-magic-circle"
              style={{ opacity: stage === 'decided' ? 0.3 : 0.2 }}
              alt=""
            />
          )}

          {stage === 'silence' && <div aria-hidden="true" className="h-32 w-32" />}

          {stage === 'thinking' && (
            <div className="reveal-stage rise-in flex flex-col items-center">
              <SortingHat state="thinking" className="reveal-hat w-32 sm:w-36" />
              <p
                aria-live="polite"
                className="mt-8 font-display text-[0.85rem] tracking-[0.16em] text-gold-soft"
              >
                The hat is thinking...
              </p>
            </div>
          )}

          {stage === 'decided' && (
            <div className="reveal-stage rise-in flex flex-col items-center">
              <SortingHat state="decided" className="reveal-hat w-32 sm:w-36" glow />
              <p
                aria-live="polite"
                className="mt-8 font-display text-[0.72rem] tracking-[0.34em] text-gold-soft"
              >
                THE HAT HAS DECIDED
              </p>
            </div>
          )}

          {stage === 'department' && (
            <div className="reveal-stage rise-in flex w-full flex-col items-center">
              <p className="font-display text-[0.68rem] tracking-[0.3em] text-gold-soft">
                THE HAT HAS DECIDED
              </p>
              <div data-dept={dept.id} className="mt-5 w-44 sm:w-48">
                <DeptCard dept={dept} />
              </div>
              <p
                aria-live="polite"
                className="mt-4 font-display text-2xl font-semibold sm:text-3xl"
                style={{ color: 'var(--dept-accent)' }}
              >
                {dept.name}
              </p>
              <p className="font-display mt-1 text-[0.62rem] tracking-[0.28em] text-parchment-dim/80 uppercase">
                {dept.latinName}
              </p>
            </div>
          )}

          {/* 让读屏知道仪式正在进行，但不重复播报每个视觉阶段。 */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {stage === 'silence' && '分院帽正在思考。'}
            {stage === 'thinking' && '分院帽正在思考。'}
            {stage === 'decided' && '分院帽已经做出决定。'}
            {stage === 'department' && `你被分到${dept.name}。`}
          </p>
        </div>

        <button
          type="button"
          onClick={skip}
          className="min-h-[2.75rem] px-4 text-[0.72rem] tracking-[0.22em] text-parchment-dim/55 transition-colors hover:text-gold-soft"
        >
          跳过 →
        </button>
      </div>
    </main>
  )
}