import { useEffect, useMemo, useRef, useState } from 'react'
import { OptionButton } from '../components/OptionButton'
import { ProgressBar } from '../components/ProgressBar'
import { useTypewriter } from '../hooks/useTypewriter'
import type { OptionId, Question } from '../data/questions'
import { seedForQuestion, seededShuffle } from '../lib/seededShuffle'

/** 低语打完后停顿多久自动进入下一题。 */
const AUTO_ADVANCE_PAUSE = 1100

interface QuizScreenProps {
  question: Question
  questionIndex: number
  total: number
  sessionSeed: number
  selected: OptionId | undefined
  onSelect: (optionId: OptionId) => void
  onNext: () => void
  onBack: () => void
  canGoBack: boolean
  isLast: boolean
}

export function QuizScreen({
  question,
  questionIndex,
  total,
  sessionSeed,
  selected,
  onSelect,
  onNext,
  onBack,
  canGoBack,
  isLast,
}: QuizScreenProps) {
  /** 本次访问中刚作答（而非回看已答题目）。决定要不要播打字动画与自动前进。 */
  const [justAnswered, setJustAnswered] = useState(false)
  const advanceTimer = useRef<number | undefined>(undefined)

  // 换题时重置
  useEffect(() => {
    setJustAnswered(false)
  }, [question.id])

  /* 选项按固定种子打乱：既防「答案永远在 A」，又保证同一场答题里
     顺序不随重渲染跳动。洗牌只影响显示，答案记的是规范 option id。 */
  const shuffled = useMemo(
    () => seededShuffle(question.options, seedForQuestion(sessionSeed, questionIndex)),
    [question, sessionSeed, questionIndex],
  )

  const selectedOption = question.options.find((o) => o.id === selected)
  const whisperText = selectedOption?.whisper ?? ''

  const { shown: whisperShown, done: whisperDone } = useTypewriter(whisperText, {
    speed: 52,
    enabled: justAnswered,
    startDelay: 260,
  })

  // 低语打完 → 短停顿 → 自动进入下一题
  useEffect(() => {
    if (advanceTimer.current !== undefined) window.clearTimeout(advanceTimer.current)
    if (!justAnswered || !whisperDone || selected === undefined) return

    advanceTimer.current = window.setTimeout(onNext, AUTO_ADVANCE_PAUSE)
    return () => {
      if (advanceTimer.current !== undefined) window.clearTimeout(advanceTimer.current)
    }
  }, [justAnswered, whisperDone, selected, onNext])

  function handleSelect(optionId: OptionId) {
    if (advanceTimer.current !== undefined) window.clearTimeout(advanceTimer.current)
    setJustAnswered(true)
    onSelect(optionId)
  }

  return (
    <div className="starfield flex min-h-dvh flex-col">
      {/* 进度常驻：滚动时也知道自己走到哪 */}
      <header className="sticky top-0 z-10 border-b border-night-600/60 bg-night-900/85 px-5 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-lg items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            className="-ml-1 shrink-0 px-1 text-lg text-parchment-dim transition-colors enabled:hover:text-gold-soft disabled:opacity-25"
            aria-label="上一题"
          >
            ←
          </button>
          <ProgressBar current={questionIndex + 1} total={total} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-6 sm:px-6 sm:py-8">
        <div key={question.id} className="rise-in flex flex-1 flex-col">
          {/* 视觉层级刻意做成「标题 → 选项」为主，场景描述为辅：
              场景是氛围铺垫，不是要读者细品的正文。它此前带一条金色左边线，
              而深底上的金色 = 「重点框」信号，注意力会被吸在描述上、
              反而不看选项 —— 所以这里不给它任何强调装饰。
              弱化靠的是字号与字重的对比，而不是继续调暗：
              调暗会伤对比度，正文仍需 parchment-dim 这一档（约 8.7:1）。 */}
          <h2 className="text-[1.28rem] leading-snug font-semibold text-gold-soft sm:text-[1.4rem]">
            {question.title}
          </h2>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-parchment-dim sm:text-[0.9rem]">
            {question.scene}
          </p>

          <ul className="mt-7 flex flex-col gap-2.5">
            {shuffled.map((option, i) => (
              <li key={option.id}>
                <OptionButton
                  index={i}
                  text={option.text}
                  selected={selected === option.id}
                  dimmed={selected !== undefined && selected !== option.id}
                  disabled={false}
                  onSelect={() => handleSelect(option.id)}
                />
              </li>
            ))}
          </ul>

          {/* 帽子低语 + 下一步。预留固定高度，避免选完后版面跳动。 */}
          <div className="mt-6 flex min-h-[5.5rem] flex-col items-center justify-start gap-4">
            {selectedOption !== undefined && (
              <>
                {/* 不用 italic：中文没有真正的斜体，浏览器只能伪斜（合成倾斜），
                    笔画会被拉歪、更显细。低语的语气交给「」与金色承担。 */}
                <p className="text-center text-[0.925rem] leading-relaxed text-gold-soft/90">
                  <span aria-hidden="true" className={whisperDone ? '' : 'caret'}>
                    {whisperShown}
                  </span>
                  <span className="sr-only">{whisperText}</span>
                </p>

                {whisperDone && (
                  <button
                    type="button"
                    onClick={onNext}
                    className="rise-in min-h-[2.75rem] rounded-full border border-gold/50 px-7 text-sm tracking-[0.16em] text-gold-soft transition-all duration-300 hover:border-gold hover:bg-gold/12 active:scale-[0.98]"
                  >
                    {isLast ? '揭晓结果' : '下一题 →'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
