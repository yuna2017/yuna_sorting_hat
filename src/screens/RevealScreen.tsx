import { useEffect, useRef, useState } from 'react'
import { SortingHat } from '../components/SortingHat'
import { DEPT_ORDER } from '../data/constants'
import type { DeptId } from '../data/constants'
import { DEPARTMENTS } from '../data/departments'
import { prefersReducedMotion } from '../lib/motion'
import type { Verdict } from '../lib/scoring'

interface RevealScreenProps {
  verdict: Verdict
  /** 仪式结束（或被跳过）后进入结果页。 */
  onDone: () => void
}

/**
 * 仪式的五个节拍。数值是**距开场的累计毫秒**，不是间隔 ——
 * 相邻节拍的间隔在调整时最容易算错，累计值一眼就能看出总时长。
 */
const BEATS = {
  hat: 0,
  murmur: 700,
  candidates: 2000,
  hesitate: 3300,
  decided: 4500,
  done: 5400,
} as const

/** 减少动态偏好下的总时长：只留一次「宣判」的停顿，不干等五秒。 */
const REDUCED_DONE = 600

type Beat = keyof typeof BEATS

/**
 * 候选部门。并列时用真实的并列集合，否则取分数第二名 ——
 * 让帽子「在两个之间掂量」，而不是凭空演一场。
 *
 * 顺序一律按 DEPT_ORDER 输出，**不把冠军排在第一个** ——
 * 否则候选一出现就等于提前宣布了结果，仪式失去意义。
 */
function candidatesOf(verdict: Verdict): DeptId[] {
  if (verdict.tiedWith.length > 0) {
    const set = new Set<DeptId>([verdict.winner, ...verdict.tiedWith])
    return DEPT_ORDER.filter((d) => set.has(d))
  }

  const others = DEPT_ORDER.filter((d) => d !== verdict.winner)
  const runnerScore = Math.max(...others.map((d) => verdict.scores[d]))
  const runnerUp = others.find((d) => verdict.scores[d] === runnerScore)
  const set = new Set<DeptId>([verdict.winner])
  if (runnerUp !== undefined) set.add(runnerUp)
  return DEPT_ORDER.filter((d) => set.has(d))
}

/**
 * 分院仪式。答完最后一题后的过场，唯一职责是**延迟揭晓**并制造停顿。
 *
 * 它不参与判定：verdict 早在 App 里由 resolveWinner 算好，这里只是不说出来。
 * 因此跳过仪式、reduced-motion 缩短、分享链接直达都不会改变结果。
 */
export function RevealScreen({ verdict, onDone }: RevealScreenProps) {
  const reduced = prefersReducedMotion()
  const [beat, setBeat] = useState<Beat>('hat')
  const doneRef = useRef(false)

  const candidates = candidatesOf(verdict)
  const hesitated = verdict.tiedWith.length > 0

  useEffect(() => {
    /* onDone 必须只触发一次：跳过按钮和到点的定时器可能撞上，
       两次 setPhase('result') 虽不致命，但会让「已离开仪式」的判断失真。 */
    function finish() {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }

    if (reduced) {
      setBeat('decided')
      const t = window.setTimeout(finish, REDUCED_DONE)
      return () => window.clearTimeout(t)
    }

    const timers = (Object.keys(BEATS) as Beat[])
      .filter((key) => key !== 'hat' && !(key === 'hesitate' && !hesitated))
      .map((key) =>
        window.setTimeout(() => {
          if (key === 'done') finish()
          else setBeat(key)
        }, BEATS[key]),
      )

    return () => timers.forEach(window.clearTimeout)
  }, [reduced, hesitated, onDone])

  const reached = (key: Beat) => BEATS[key] <= BEATS[beat]

  return (
    <div
      className="starfield-deep flex min-h-dvh flex-col items-center justify-center gap-7 px-6 py-10 text-center"
      /* 整屏可点即跳过：仪式期间没有别的可操作元素，
         比只给一个小按钮更符合「我不想等了」的直觉 */
      onClick={onDone}
    >
      <SortingHat className="reveal-hat w-28 sm:w-32" glow={reached('decided')} />

      {/* 逐条出现的判定过程。整块交给读屏 polite 播报，不逐字念。 */}
      <div
        aria-live="polite"
        className="flex min-h-[9.5rem] w-full max-w-xs flex-col items-center gap-3 sm:min-h-[10.5rem]"
      >
        {reached('murmur') && (
          <p className="rise-in text-[1.05rem] leading-relaxed text-parchment">「嗯……」</p>
        )}

        {reached('candidates') && (
          <ul className="rise-in flex flex-wrap justify-center gap-2">
            {candidates.map((dept) => (
              <li
                key={dept}
                className="rounded-full border border-parchment-dim/30 px-3 py-1 text-[0.8rem] text-parchment-dim"
              >
                {DEPARTMENTS[dept].name}
              </li>
            ))}
          </ul>
        )}

        {hesitated && reached('hesitate') && (
          <p className="rise-in text-[0.85rem] leading-relaxed text-parchment-dim/85">
            「难办……这几个都想要你。」
          </p>
        )}

        {reached('decided') && (
          <p className="rise-in font-display text-[0.68rem] tracking-[0.34em] text-gold-soft">
            THE HAT HAS DECIDED
          </p>
        )}
      </div>

      {/* 视觉上是提示而非主按钮 —— 仪式只有五秒，不该抢走注意力。
          但它是真 button：整屏点击对键盘用户不可达。 */}
      <button
        type="button"
        onClick={onDone}
        className="min-h-[2.75rem] px-4 text-[0.72rem] tracking-[0.22em] text-parchment-dim/55 transition-colors hover:text-gold-soft"
      >
        跳过 →
      </button>
    </div>
  )
}
