import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { CoverScreen } from './screens/CoverScreen'
import { OpeningScreen } from './screens/OpeningScreen'
import { QuizScreen } from './screens/QuizScreen'
import { RevealScreen } from './screens/RevealScreen'
import { ResultScreen } from './screens/ResultScreen'
import { QUESTION_POOL, reportUnfilledOptionDetail } from './data/questions'
import type { OptionId } from './data/questions'
import { reportUnfilledCopy } from './data/departments'
import { CAMPAIGN } from './data/campaign'
import { assertPoolInDev } from './lib/validateBank'
import { formatContentViolations, validateDepartmentContent } from './lib/validateContent'
import { createSessionSeed } from './lib/seededShuffle'
import { createDrawSeed, drawBank } from './lib/drawQuestions'
import { isComplete, resolveWinner } from './lib/scoring'
import type { AnswerMap } from './lib/scoring'
import { readSharePayloadFromUrl } from './lib/shareCode'
import hatHero from './assets/hat/hat_a_storybook.webp'
import hatIdle from './assets/hat/hat_idle.webp'
import hatThinking from './assets/hat/hat_thinking.webp'
import hatDecided from './assets/hat/hat_decide.webp'
import magicCircle from './assets/auxillary/magic_circle.webp'
import resultBackground from './assets/auxillary/result_background.webp'
import devImg from './assets/dept/dev.webp'
import secImg from './assets/dept/sec.webp'
import opsImg from './assets/dept/ops.webp'
import prImg from './assets/dept/pr.webp'

const PRELOAD_ASSETS = [
  hatHero,
  hatIdle,
  hatThinking,
  hatDecided,
  magicCircle,
  resultBackground,
  devImg,
  secImg,
  opsImg,
  prImg,
]

/** 'reveal' 是答完最后一题后的分院仪式，只延迟揭晓，不参与判定。 */
type Phase = 'cover' | 'opening' | 'quiz' | 'reveal' | 'result'
type ThemeMode = 'system' | 'light' | 'dark'

/** 昵称的 sessionStorage 键。只存这一项，且仅本会话有效。 */
const NICKNAME_KEY = 'yuna-sorting-hat:nickname'
const THEME_KEY = 'yuna-sorting-hat:theme'

function readThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const saved = window.localStorage.getItem(THEME_KEY)
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
}

function ThemeShell({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readThemeMode)

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'system') root.removeAttribute('data-theme')
    else root.dataset.theme = mode
    root.style.colorScheme = mode === 'system' ? '' : mode
    window.localStorage.setItem(THEME_KEY, mode)

    const systemTheme = window.matchMedia('(prefers-color-scheme: light)')
    const updateThemeColor = () => {
      const isLight = mode === 'light' || (mode === 'system' && systemTheme.matches)
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', isLight ? '#f7f8fb' : '#08061a')
    }
    updateThemeColor()
    if (mode === 'system') systemTheme.addEventListener('change', updateThemeColor)
    return () => systemTheme.removeEventListener('change', updateThemeColor)
  }, [mode])

  const nextMode: ThemeMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'
  const label = mode === 'system' ? '跟随系统' : mode === 'light' ? '浅色模式' : '深色模式'
  const icon = mode === 'system' ? '◐' : mode === 'light' ? '☼' : '☾'

  return (
    <>
      <button
        type="button"
        className="theme-toggle"
        aria-label={`${label}，点击切换为${nextMode === 'system' ? '跟随系统' : nextMode === 'light' ? '浅色模式' : '深色模式'}`}
        title={`${label} · 点击切换`}
        onClick={() => setMode(nextMode)}
      >
        <span aria-hidden="true" className={`theme-toggle-icon theme-toggle-icon-${mode}`}>
          {icon}
        </span>
      </button>
      {children}
    </>
  )
}

/* 开发期自检：题池不变量 + 还没填的事实文案，直接打在控制台。
   权威闸门是 vitest；这里是给「改了题但没跑测试」的人兜底。 */
assertPoolInDev(QUESTION_POOL, [...reportUnfilledCopy(), ...reportUnfilledOptionDetail()])

if (import.meta.env.DEV) {
  const contentViolations = validateDepartmentContent()
  if (contentViolations.length > 0) {
    console.error(`[分部帽] 部门内容结构校验失败：\n${formatContentViolations(contentViolations)}`)
  }
}

if (import.meta.env.DEV && CAMPAIGN.status === 'open' && CAMPAIGN.publicJoinUrl === null) {
  console.warn('[分部帽] 招新入口标记为 open，但 publicJoinUrl 为空。请更新 src/data/campaign.ts。')
}

export default function App() {
  /* 分享链接接缝：URL 带合法 ?v=3&s=<种子>&a=<答案码> 时直接落到结果页。
     不引路由 —— 五屏是线性流程，而 GH Pages 是纯静态无 rewrite，
     BrowserRouter 的深链/刷新会 404。
     种子必须先于题目读出来：题库是池子，不知道种子就不知道对方做的是哪 12 道题。 */
  const shared = useMemo(
    () =>
      typeof window === 'undefined' ? null : readSharePayloadFromUrl(window.location.search),
    [],
  )
  const sharedComplete = shared !== null && isComplete(shared.bank, shared.answers)

  const [phase, setPhase] = useState<Phase>(sharedComplete ? 'result' : 'cover')
  const [answers, setAnswers] = useState<AnswerMap>(() =>
    sharedComplete && shared !== null ? shared.answers : {},
  )
  const [index, setIndex] = useState(0)
  /** 会话种子：整场答题只生成一次，决定选项显示顺序。不参与判定。 */
  const [sessionSeed, setSessionSeed] = useState(createSessionSeed)
  /**
   * 抽题种子：决定这一场从题池里抽出哪 12 道题。**参与判定**，因此必须进分享链接。
   * 打开别人的结果时沿用对方的种子，否则解出来的答案会对错题。
   */
  const [drawSeed, setDrawSeed] = useState(() =>
    sharedComplete && shared !== null ? shared.seed : createDrawSeed(),
  )

  /** 这一场实际用到的题目，包装成题库形状交给下游 —— 满分与特质上限都按这 12 道题算。 */
  const bank = useMemo(() => drawBank(drawSeed), [drawSeed])
  const questions = bank.questions

  /* 昵称只用于本地合成分享图，不进分享码也不上传。用 sessionStorage 而不是
     localStorage：关掉标签页就应该忘掉，不在设备上留下跨会话的个人标识。
     分享链接直达时天然为空（不走封面页）—— 别人的结果不该带你的名字。 */
  const [nickname, setNickname] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.sessionStorage.getItem(NICKNAME_KEY) ?? ''
  })

  const handleNicknameChange = useCallback((value: string) => {
    setNickname(value)
    if (typeof window === 'undefined') return
    if (value.trim() === '') window.sessionStorage.removeItem(NICKNAME_KEY)
    else window.sessionStorage.setItem(NICKNAME_KEY, value)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const preloadImage = (src: string) => {
      const img = new window.Image()
      img.decoding = 'async'
      img.src = src
    }

    PRELOAD_ASSETS.forEach(preloadImage)
  }, [])

  const verdict = useMemo(() => resolveWinner(bank, answers), [bank, answers])

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
    // 重抽题：重来一次要换一批题，否则「随机题库」对同一个人只随机了一次
    setDrawSeed(createDrawSeed())
    setPhase('cover')
    // 清掉分享参数，否则刷新会又跳回别人的结果
    if (typeof window !== 'undefined' && window.location.search !== '') {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  if (phase === 'cover') {
    return (
      <ThemeShell>
        <CoverScreen
          onStart={() => setPhase('opening')}
          nickname={nickname}
          onNicknameChange={handleNicknameChange}
        />
      </ThemeShell>
    )
  }

  if (phase === 'opening') {
    return (
      <ThemeShell>
        <OpeningScreen onContinue={() => setPhase('quiz')} />
      </ThemeShell>
    )
  }

  if (phase === 'quiz') {
    const question = questions[index]
    if (question === undefined) return null
    return (
      <ThemeShell>
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
      </ThemeShell>
    )
  }

  if (phase === 'reveal') {
    // 分享链接直达结果时不会走到这里 —— 那条路径的初始 phase 就是 'result'，
    // 别人的结果不需要再演一次仪式。
    return (
      <ThemeShell>
        <RevealScreen verdict={verdict} onDone={handleRevealDone} />
      </ThemeShell>
    )
  }

  return (
    <ThemeShell>
      <ResultScreen
        bank={bank}
        drawSeed={drawSeed}
        verdict={verdict}
        answers={answers}
        nickname={nickname}
        onNicknameChange={handleNicknameChange}
        onRestart={handleRestart}
      />
    </ThemeShell>
  )
}
