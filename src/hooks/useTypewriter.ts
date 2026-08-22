import { useCallback, useEffect, useRef, useState } from 'react'

export interface TypewriterOptions {
  /** 每字间隔毫秒。 */
  speed?: number
  /** false 时直接显示全文（用于回看已答题目等场景）。 */
  enabled?: boolean
  /** 开始打字前的延迟毫秒。 */
  startDelay?: number
}

export interface TypewriterState {
  /** 当前已显示的文本片段。 */
  shown: string
  /** 是否已打完。 */
  done: boolean
  /** 立即打完剩余部分。 */
  skip: () => void
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 逐字打字机。开场独白（多段，用 \n\n 拼成单串 + whitespace-pre-line 渲染）
 * 与一行帽子低语共用这一个 hook —— 不做两套。
 *
 * 无障碍注意：打字中的节点应设 aria-hidden，另给读屏一份完整文本，
 * 否则逐字过程会被念成乱码。用法见 Typewriter 组件。
 */
export function useTypewriter(
  text: string,
  { speed = 45, enabled = true, startDelay = 0 }: TypewriterOptions = {},
): TypewriterState {
  const skipMotion = prefersReducedMotion()
  const instant = !enabled || skipMotion

  const [count, setCount] = useState(() => (instant ? text.length : 0))
  const timerRef = useRef<number | undefined>(undefined)

  // 文本或开关变化时重置
  useEffect(() => {
    setCount(instant ? text.length : 0)
  }, [text, instant])

  useEffect(() => {
    if (instant) return
    if (count >= text.length) return

    const delay = count === 0 ? startDelay + speed : speed
    timerRef.current = window.setTimeout(() => {
      setCount((c) => Math.min(c + 1, text.length))
    }, delay)

    return () => {
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    }
  }, [count, text.length, speed, startDelay, instant])

  const skip = useCallback(() => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    setCount(text.length)
  }, [text.length])

  return {
    shown: text.slice(0, count),
    done: count >= text.length,
    skip,
  }
}
