import { useEffect, useMemo, useState } from 'react'
import { OptionButton } from '../components/OptionButton'
import { OptionDetailCard } from '../components/OptionDetailCard'
import { ProgressBar } from '../components/ProgressBar'
import type { OptionId, Question } from '../data/questions'
import { seedForQuestion, seededShuffle } from '../lib/seededShuffle'
import { hatMoodLine } from '../lib/hatVoice'

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
  /** 本次访问中刚作答（而非回看已答题目）。决定说明卡里的低语要不要播打字动画。 */
  const [justAnswered, setJustAnswered] = useState(false)

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

  function handleSelect(optionId: OptionId) {
    setJustAnswered(true)
    onSelect(optionId)
  }

  return (
    <div className="screen-enter starfield flex min-h-dvh flex-col">
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
          {/* 帽子旁白：随进度换话，让帽子有「角色感」；第一题留白 */}
          {hatMoodLine(questionIndex) !== null && (
            <p className="mb-3 text-center text-[0.8rem] leading-relaxed text-parchment-dim/80">
              {hatMoodLine(questionIndex)}
            </p>
          )}

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
            {shuffled.map((option, i) => {
              const isSelected = selected === option.id
              const detailId = `detail-${question.id}-${option.id}`
              return (
                <li key={option.id}>
                  <OptionButton
                    index={i}
                    text={option.text}
                    selected={isSelected}
                    dimmed={selected !== undefined && !isSelected}
                    disabled={false}
                    describedById={isSelected ? detailId : undefined}
                    onSelect={() => handleSelect(option.id)}
                  />
                  {/* 说明卡是按钮的**兄弟**而不是子节点 —— 交互元素不能相互嵌套。
                      key 绑 option.id：改选即重新挂载，低语的打字机自然重播，
                      不需要任何手动重置。 */}
                  {isSelected && (
                    <OptionDetailCard
                      id={detailId}
                      whisper={option.whisper}
                      detail={option.detail}
                      animate={justAnswered}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </main>

      {/* 推进按钮吸底常驻。
          用 sticky 而不是 fixed：sticky 元素仍占布局空间，滚到底时自然落位，
          永远不会盖住最后一个选项；fixed 则要给 main 补一个与本栏等高的
          padding-bottom，而那个高度随安全区变化，猜不准。
          放在 main **之后** —— DOM 顺序即 Tab 顺序：先选项，再推进。
          边框、底色、模糊与内边距全部照抄顶部 header，两者视觉上成对。 */}
      <footer className="sticky bottom-0 z-10 border-t border-night-600/60 bg-night-900/85 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-lg justify-center">
          {/* 未作答时是 disabled 而不是干脆不渲染：零布局跳动，
              且「按钮在那儿、只是还不能点」本身就是一句提示。
              与 header 里的返回按钮同一套处理。 */}
          <button
            type="button"
            onClick={onNext}
            disabled={selected === undefined}
            className="min-h-[2.75rem] w-full max-w-xs rounded-full border border-gold/50 px-7 text-sm tracking-[0.16em] text-gold-soft transition-all duration-300 enabled:hover:border-gold enabled:hover:bg-gold/12 enabled:active:scale-[0.98] disabled:opacity-30"
          >
            {isLast ? '揭晓结果' : '下一题 →'}
          </button>
        </div>
      </footer>
    </div>
  )
}
