import { useCallback, useEffect, useMemo, useState } from 'react'
import { CoverScreen } from './screens/CoverScreen'
import { OpeningScreen } from './screens/OpeningScreen'
import { QuizScreen } from './screens/QuizScreen'
import { RevealScreen } from './screens/RevealScreen'
import { ResultScreen } from './screens/ResultScreen'
import { QUESTION_BANK, reportUnfilledOptionDetail } from './data/questions'
import type { OptionId } from './data/questions'
import { reportUnfilledCopy } from './data/departments'
import { assertBankInDev } from './lib/validateBank'
import { createSessionSeed } from './lib/seededShuffle'
import { isComplete, resolveWinner } from './lib/scoring'
import type { AnswerMap } from './lib/scoring'
import { readShareCodeFromUrl } from './lib/shareCode'

/** 'reveal' 是答完最后一题后的分院仪式，只延迟揭晓，不参与判定。 */
type Phase = 'cover' | 'opening' | 'quiz' | 'reveal' | 'result'

/* 开发期自检：题库不变量 + 还没填的事实文案，直接打在控制台。
   权威闸门是 vitest；这里是给「改了题但没跑测试」的人兜底。 */
assertBankInDev(QUESTION_BANK, [...reportUnfilledCopy(), ...reportUnfilledOptionDetail()])

export default function App() {
  const questions = QUESTION_BANK.questions

  /* 分享链接接缝：URL 带合法 ?a= 时直接落到结果页。
     不引路由 —— 四屏是线性流程，而 GH Pages 是纯静态无 rewrite，
     BrowserRouter 的深链/刷新会 404。 */
  const shared = useMemo(
    () =>
      typeof window === 'undefined'
        ? null
        : readShareCodeFromUrl(QUESTION_BANK, window.location.search),
    [],
  )
  const sharedComplete = shared !== null && isComplete(QUESTION_BANK, shared)

  const [phase, setPhase] = useState<Phase>(sharedComplete ? 'result' : 'cover')
  const [answers, setAnswers] = useState<AnswerMap>(() => (sharedComplete ? shared : {}))
  const [index, setIndex] = useState(0)
  /** 会话种子：整场答题只生成一次，决定选项显示顺序。不参与判定。 */
  const [sessionSeed, setSessionSeed] = useState(createSessionSeed)

  const verdict = useMemo(() => resolveWinner(QUESTION_BANK, answers), [answers])

  // 换屏/换题时回到页顶，否则移动端会停在上一屏的滚动位置
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [phase, index])

  const handleSelect = useCallback(
    (optionId: OptionId) => {
      const question = questions[index]
      if (question === undefined) return
      setAnswers((prev) => ({ ...prev, [question.id]: optionId }))
    },
    [index, questions],
  )

  const handleNext = useCallback(() => {
    // 不要把 setPhase 塞进 setIndex 的 updater 里 —— updater 必须是纯函数，
    // StrictMode 会二次调用它来检测副作用。
    // 最后一题不直接进结果页：先过一道分院仪式，把揭晓的停顿做出来。
    if (index >= questions.length - 1) setPhase('reveal')
    else setIndex(index + 1)
  }, [index, questions.length])

  const handleBack = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  const handleRevealDone = useCallback(() => {
    setPhase('result')
  }, [])

  const handleRestart = useCallback(() => {
    setAnswers({})
    setIndex(0)
    setSessionSeed(createSessionSeed())
    setPhase('cover')
    // 清掉分享参数，否则刷新会又跳回别人的结果
    if (typeof window !== 'undefined' && window.location.search !== '') {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  if (phase === 'cover') {
    return <CoverScreen onStart={() => setPhase('opening')} />
  }

  if (phase === 'opening') {
    return <OpeningScreen onContinue={() => setPhase('quiz')} />
  }

  if (phase === 'quiz') {
    const question = questions[index]
    if (question === undefined) return null
    return (
      <QuizScreen
        question={question}
        questionIndex={index}
        total={questions.length}
        sessionSeed={sessionSeed}
        selected={answers[question.id]}
        onSelect={handleSelect}
        onNext={handleNext}
        onBack={handleBack}
        canGoBack={index > 0}
        isLast={index === questions.length - 1}
      />
    )
  }

  if (phase === 'reveal') {
    // 分享链接直达结果时不会走到这里 —— 那条路径的初始 phase 就是 'result'，
    // 别人的结果不需要再演一次仪式。
    return <RevealScreen verdict={verdict} onDone={handleRevealDone} />
  }

  return <ResultScreen verdict={verdict} answers={answers} onRestart={handleRestart} />
}
