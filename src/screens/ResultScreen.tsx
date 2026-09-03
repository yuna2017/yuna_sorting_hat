import { useEffect, useRef, useState } from 'react'
import { DeptCard } from '../components/DeptCard'
import { RadarChart } from '../components/RadarChart'
import { ScoreBars } from '../components/ScoreBars'
import { ShareBar } from '../components/ShareBar'
import { TraitBars } from '../components/TraitBars'
import { DEPARTMENTS } from '../data/departments'
import { TRAITS } from '../data/traits'
import { CAMPAIGN } from '../data/campaign'
import type { QuestionBank } from '../data/questions'
import { explainVerdict, verdictStrength } from '../lib/explain'
import { deriveBehaviorIdentity } from '../lib/identity'
import type { AnswerMap, Verdict } from '../lib/scoring'
import { buildShareMessage, buildShareText, buildShareUrl } from '../lib/shareCode'
import { deriveProfile } from '../lib/traits'
import resultBackground from '../assets/auxillary/result_background.webp'

interface ResultScreenProps {
  /**
   * 这一场实际答的题。必须由 App 传入，不能自己去 import 题池 ——
   * 满分、证据、身份判定都按「这 12 道题」算，拿池子里全部题目当分母会全线偏低。
   */
  bank: QuestionBank
  /** 抽题种子。分享链接必须带上它，别人才能重建出同一组题。 */
  drawSeed: number
  verdict: Verdict
  /** 当前答案。用于生成分享链接与「为什么是这个部门」的证据。 */
  answers: AnswerMap
  /** 海报上的昵称。只本地渲染，不进分享码。 */
  nickname: string
  onNicknameChange: (value: string) => void
  onRestart: () => void
}

/**
 * 用分部帽的口吻解释结果，不把内部计分过程直接暴露给用户。
 * 证据仍来自用户刚才选过的选项，但呈现为性格倾向和瞬间回忆，
 * 而不是“答了几题、命中了多少次”的测评报告。
 */
const REASON_COPY = {
  dev: {
    decisive: '你总是愿意先动手，把一个想法推到真的能用。',
    clear: '遇到问题时，你更倾向于自己试着拆开、修好，再把它做出来。',
    narrow: '你一边想把事情做成，一边也在意它能不能稳稳地跑下去。',
  },
  sec: {
    decisive: '你很少满足于“能用”，总想再往下追一层，弄清它为什么成立。',
    clear: '你会被没想明白的问题勾住，愿意把线索一点点追到底。',
    narrow: '你在求真和动手之间来回权衡，帽子花了点时间才听清你的方向。',
  },
  ops: {
    decisive: '你会自然地接住那些不能出错的事，并把它们安稳地守下去。',
    clear: '比起一时的漂亮结果，你更在意事情能不能一直可靠地运转。',
    narrow: '你既有解决问题的冲劲，也有把细节收好的耐心。',
  },
  pr: {
    decisive: '你总能先看到人群、节奏和那句该被听见的话。',
    clear: '你习惯把人和事组织起来，让一个想法真正抵达别人。',
    narrow: '你既在意事情本身，也在意它如何被看见、被记住。',
  },
} as const

function shareUrlOf(bank: QuestionBank, drawSeed: number, answers: AnswerMap): string {
  if (typeof window === 'undefined') return ''
  return buildShareUrl(bank, drawSeed, answers, window.location.origin, window.location.pathname)
}

export function ResultScreen({
  bank,
  drawSeed,
  verdict,
  answers,
  nickname,
  onNicknameChange,
  onRestart,
}: ResultScreenProps) {
  const pagesRef = useRef<HTMLDivElement>(null)
  const wheelLockRef = useRef(false)
  const touchStartRef = useRef<number | null>(null)
  const [activePage, setActivePage] = useState(0)
  const dept = DEPARTMENTS[verdict.winner]
  const hesitated = verdict.tiedWith.length > 0
  const explanation = explainVerdict(bank, answers, verdict)
  const strength = verdictStrength(bank, explanation)
  const identity = deriveBehaviorIdentity(bank, answers, verdict, explanation)
  const profile = deriveProfile(bank, answers)

  const shareUrl = shareUrlOf(bank, drawSeed, answers)
  const actions = [...dept.actions].sort((a, b) => {
    const order = ['join', 'more', 'works'] as const
    return order.indexOf(a.kind) - order.indexOf(b.kind)
  })
  const pageCount = shareUrl === '' ? 6 : 7

  useEffect(() => {
    const pages = pagesRef.current
    if (pages === null) return

    const onScroll = () => {
      const page = Math.round(pages.scrollTop / pages.clientHeight)
      setActivePage(Math.max(0, Math.min(page, pageCount - 1)))
    }
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 8 || wheelLockRef.current) return
      event.preventDefault()
      wheelLockRef.current = true
      const direction = event.deltaY > 0 ? 1 : -1
      const nextPage = Math.max(0, Math.min(activePage + direction, pageCount - 1))
      pages.children[nextPage]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.setTimeout(() => {
        wheelLockRef.current = false
      }, 650)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('button, a, input, textarea, select')) return
      const pageKeys: Record<string, number> = {
        ArrowDown: 1,
        PageDown: 1,
        ArrowUp: -1,
        PageUp: -1,
        Home: -activePage,
        End: pageCount - 1 - activePage,
      }
      if (pageKeys[event.key] === undefined) return
      event.preventDefault()
      const offset = pageKeys[event.key]
      if (offset === undefined) return
      const nextPage = Math.max(0, Math.min(activePage + offset, pageCount - 1))
      pages.children[nextPage]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    const onTouchStart = (event: TouchEvent) => {
      touchStartRef.current = event.touches[0]?.clientY ?? null
    }
    const onTouchEnd = (event: TouchEvent) => {
      const startY = touchStartRef.current
      const endY = event.changedTouches[0]?.clientY
      touchStartRef.current = null
      if (startY === null || endY === undefined || Math.abs(endY - startY) < 48) return
      const direction = endY < startY ? 1 : -1
      const nextPage = Math.max(0, Math.min(activePage + direction, pageCount - 1))
      pages.children[nextPage]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    pages.addEventListener('scroll', onScroll, { passive: true })
    pages.addEventListener('wheel', onWheel, { passive: false })
    pages.addEventListener('keydown', onKeyDown)
    pages.addEventListener('touchstart', onTouchStart, { passive: true })
    pages.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      pages.removeEventListener('scroll', onScroll)
      pages.removeEventListener('wheel', onWheel)
      pages.removeEventListener('keydown', onKeyDown)
      pages.removeEventListener('touchstart', onTouchStart)
      pages.removeEventListener('touchend', onTouchEnd)
    }
  }, [activePage])

  const goToPage = (page: number) => {
    const pages = pagesRef.current
    if (pages === null) return
    const nextPage = Math.max(0, Math.min(page, pageCount - 1))
    pages.children[nextPage]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    // data-dept 一翻，雷达多边形／量条／辉光／边框整体换肤，零 JS 配色逻辑
    <div data-dept={verdict.winner} className="screen-enter result-screen starfield relative min-h-dvh overflow-hidden px-5 py-10 sm:px-6">
      <img
        aria-hidden="true"
        src={resultBackground}
        width={1080}
        height={1920}
        className="result-background"
        alt=""
      />
      <div className="result-pages relative z-10 mx-auto max-w-lg">
        <div className="result-page-progress" aria-live="polite">
          <span>{activePage + 1}</span> / {pageCount}
        </div>
        <div
          ref={pagesRef}
          tabIndex={0}
          aria-label="结果页纸叠"
          data-active-page={activePage}
          className="result-content flex flex-col items-center outline-none"
        >
        {/* ── 第一层：结果 ── */}
        <section className="paper-page result-page--result flex flex-col items-center justify-center px-2 py-12" aria-labelledby="result-title">
        <p className="font-display text-[0.62rem] tracking-[0.36em] text-parchment-dim/70">
          THE HAT HAS DECIDED
        </p>

        <div className="mt-6 w-44 sm:w-52">
          <DeptCard dept={dept} />
        </div>

        <h1 id="result-title"
          className="mt-5 font-display text-3xl font-semibold sm:text-4xl"
          style={{ color: 'var(--dept-accent)' }}
        >
          {dept.name}
        </h1>
        <p className="font-display mt-1.5 text-[0.68rem] tracking-[0.3em] text-parchment-dim/80 uppercase">
          {dept.latinName}
        </p>

        <div className="rule-gold mt-5 w-28" />

        <p className="mt-5 max-w-sm text-center text-[1.02rem] leading-relaxed text-parchment">
          {dept.slogan}
        </p>

        {dept.tagline !== null && (
          <p className="mt-2 max-w-sm text-center text-[0.85rem] leading-relaxed text-parchment-dim">
            {dept.tagline}
          </p>
        )}
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {dept.keywords.map((kw) => (
            <li key={kw} className="rounded-full border px-3 py-1 text-xs text-parchment/90" style={{ borderColor: 'rgb(var(--dept-glow) / 0.4)' }}>
              {kw}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-parchment-dim/70">
          若在霍格沃兹，这里是 <span className="mx-1 text-gold-soft">{dept.house}</span>
          <span className="font-display tracking-wider">({dept.houseLatin})</span>
        </p>
        </section>

        {/* ── 第二层：解释 ──
            此前结果页从部门名直接跳到雷达图，用户拿不到「为什么是我」。
            证据全部来自刚才自己的选择，不引入新判定。 */}
        <section className="paper-page result-page--reason flex min-h-dvh flex-col justify-center px-2 py-12" aria-labelledby="explanation-title">
        <div className="page-panel w-full">
          <h2 id="explanation-title" className="text-sm tracking-[0.16em] text-parchment-dim">帽子在你身上看见了什么？</h2>

          <p className="mt-2.5 text-sm leading-relaxed text-parchment/90">
            {REASON_COPY[dept.id][strength]}
          </p>

          <div className="mt-4 rounded-xl border border-gold/25 bg-gold/5 px-3.5 py-3">
            <p className="text-[0.72rem] tracking-[0.12em] text-gold-soft/80">你的行为身份</p>
            <p className="mt-1 text-base font-medium text-gold-soft">{identity.name}</p>
            <p className="mt-1 text-[0.8rem] leading-relaxed text-parchment-dim">{identity.desc}</p>
          </div>

          {explanation.evidence.length > 0 && (
            <>
              <p className="mt-4 text-[0.78rem] leading-relaxed text-parchment-dim/80">
                帽子记住了这些瞬间：
              </p>
              <ul className="mt-2.5 flex flex-col gap-2.5">
                {explanation.evidence.map((e) => (
                <li
                  key={e.questionId}
                  className="border-l-2 pl-3"
                  style={{ borderColor: 'rgb(var(--dept-glow) / 0.45)' }}
                >
                  <p className="text-[0.72rem] tracking-[0.08em] text-parchment-dim/70">
                    {e.questionTitle}
                  </p>
                  {/* break-words：选项是整句中文，窄屏必须允许在任意字符处断行 */}
                  <p className="text-[0.82rem] leading-relaxed break-words text-parchment/90">
                    {e.choice}
                  </p>
                </li>
                ))}
              </ul>
            </>
          )}

          {hesitated ? (
            // 同低语：中文不用 italic（伪斜会把笔画拉歪、更显细），
            // 且这行本来就小，字色提到 /85 保住可读性。
            // 措辞是「争过」而非「并列」—— 胜者已经过决胜，结果是确定的。
            <p className="mt-3.5 text-[0.8rem] leading-relaxed text-parchment-dim/85">
              「帽子在你头上停顿了很久……
              {verdict.tiedWith.map((d) => DEPARTMENTS[d].name).join('、')}
              也一直在争你。」
            </p>
          ) : (
            explanation.gap > 0 && (
              <p className="mt-3.5 text-[0.8rem] leading-relaxed text-parchment-dim/85">
                不过，{DEPARTMENTS[explanation.runnerUp].name}也曾让帽子犹豫了一会儿。
              </p>
            )
          )}
        </div>
        </section>

        {/* ── 第三层：部门契合度 ── */}
        <section className="paper-page result-page--data flex min-h-dvh flex-col justify-center px-2 py-12" aria-labelledby="scores-title">
        <div className="page-panel w-full">
          <h2 id="scores-title" className="text-center text-sm tracking-[0.16em] text-parchment-dim">
            四部门契合度
          </h2>

          <div className="mt-3">
            <RadarChart normalized={verdict.normalized} winner={verdict.winner} />
          </div>

          <div className="mt-4">
            <ScoreBars
              normalized={verdict.normalized}
              scores={verdict.scores}
              maxScore={verdict.maxScore}
              winner={verdict.winner}
            />
          </div>

          <p className="mt-4 text-center text-[0.7rem] leading-relaxed text-parchment-dim/60">
            百分比 = 该部门得分 ÷ 单部门满分 {verdict.maxScore}
          </p>
        </div>
        </section>

        {/* ── 第四层：行为倾向 ── */}
        <section className="paper-page result-page--traits flex min-h-dvh flex-col justify-center px-2 py-12" aria-labelledby="traits-title">
        <div className="page-panel w-full">
          <h2 id="traits-title" className="text-center text-sm tracking-[0.16em] text-parchment-dim">你的五个倾向</h2>

          <p className="mt-3 text-center text-[0.82rem] leading-relaxed text-parchment/90">
            其中
            <span className="mx-1 text-gold-soft">{TRAITS[profile.dominant].name}</span>
            最突出
            {profile.tiedWith.length > 0 && (
              <>
                ，不过
                {profile.tiedWith.map((trait) => TRAITS[trait].name).join('、')}
                和它分得很近
              </>
            )}
            。
          </p>

          <div className="mt-4">
            <TraitBars profile={profile} />
          </div>

          <p className="mt-4 text-center text-[0.7rem] leading-relaxed text-parchment-dim/60">
            百分比 = 该倾向实得 ÷ 这套题里它的理论上限。这里只描述你更倾向怎么做，不评价能力高低。
          </p>
        </div>
        </section>

        {/* ── 第五层：关于部门与协会 ── */}
        <section className="paper-page result-page--about flex min-h-dvh flex-col justify-center px-2 py-12" aria-labelledby="about-title">
          <div className="page-flow-content flex flex-col justify-center px-2 py-8">
          <div className="page-panel w-full">
            <h2 id="about-title" className="text-sm tracking-[0.16em] text-parchment-dim">关于{dept.name}</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-parchment/90">{dept.intro}</p>

            {dept.doing.length > 0 && (
              <>
                <h3 className="mt-4 text-[0.78rem] tracking-[0.1em] text-parchment-dim">
                  你进来会做什么
                </h3>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {dept.doing.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-[0.85rem] leading-relaxed text-parchment/90"
                    >
                      <span aria-hidden="true" className="shrink-0 text-gold-soft/70">
                        ·
                      </span>
                      <span className="break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {dept.suitedFor !== null && (
              <p className="mt-4 text-[0.85rem] leading-relaxed text-parchment-dim">
                <span className="text-parchment-dim/70">适合：</span>
                {dept.suitedFor}
              </p>
            )}

            {/* 占位稿要自己承认是占位稿，但只在开发期说 ——
                招新页上挂一句「草稿」比内容本身更劝退。 */}
            {dept.contentDraft && import.meta.env.DEV && (
              <p className="mt-4 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-[0.72rem] leading-relaxed text-gold-soft/85">
                开发提示：本部门介绍仍是占位草稿，上线前请社团核对，并把 contentDraft 改为
                false。
              </p>
            )}
          </div>
          <div className="mt-5 page-association text-center">
            <p className="text-xs tracking-[0.16em] text-gold-soft/80">YUNA 网络与信息协会</p>
            <p className="mt-2 text-sm leading-relaxed text-parchment-dim">在技术、创意与协作之间，找到一起做事的人。</p>
          </div>
          {actions.length > 0 && (
            <ul className="mt-5 flex w-full flex-col gap-2">
              {actions.map((action) => (
                <li key={action.label}>
                  {action.href !== null && action.status !== 'closed' ? (
                    <a href={action.href} target="_blank" rel="noopener noreferrer" className="flex min-h-[2.65rem] items-center justify-center rounded-lg border border-gold/40 px-4 text-sm text-gold-soft transition-colors hover:bg-gold/10">
                      {action.label}
                    </a>
                  ) : (
                    <span className="flex min-h-[2.65rem] items-center justify-center rounded-lg border border-dashed border-night-500/60 px-4 text-sm text-parchment-dim/70">
                      {action.label}（入口待公布）
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        </section>

        {/* ── 第六页：传播 ── */}
        {shareUrl !== '' && (
          <section className="paper-page result-page--share flex min-h-dvh flex-col items-center justify-center px-2 py-12" aria-labelledby="share-title">
          <h2 id="share-title" className="mb-5 text-sm tracking-[0.16em] text-parchment-dim">分享这次分院结果</h2>
          <ShareBar
            url={shareUrl}
            text={buildShareText(dept.name, identity.name, shareUrl)}
            message={buildShareMessage(dept.name, identity.name)}
            bank={bank}
            drawSeed={drawSeed}
            verdict={verdict}
            answers={answers}
            nickname={nickname}
            onNicknameChange={onNicknameChange}
          />
          </section>
        )}
        {/* ── 第七页：鸣谢与重新体验 ── */}
        <section className="paper-page result-page--final flex min-h-dvh flex-col items-center justify-center px-2 py-12" aria-labelledby="restart-title">
        <h2 id="restart-title" className="sr-only">重新体验</h2>
        <button
          type="button"
          onClick={onRestart}
          className="mt-8 min-h-[2.75rem] rounded-full border border-gold/45 px-8 text-sm tracking-[0.16em] text-gold-soft/90 transition-all duration-300 hover:border-gold hover:bg-gold/12 active:scale-[0.98]"
        >
          再测一次
        </button>

        {/* 免责一句：雷达图 + 百分比很容易被读成心理测评，
            这里明确它只是娱乐，压掉「伪科学感」。 */}
        <p className="mt-6 max-w-xs text-center text-[0.72rem] leading-relaxed text-parchment-dim/55">
          分部帽看见的是你此刻流露出的倾向。它可以给出一个方向，但真正想去哪里，仍由你自己决定。
        </p>

        <p className="font-display mt-6 text-[0.6rem] tracking-[0.3em] text-parchment-dim/45">
          YUNA 社团 · {CAMPAIGN.label}
        </p>
        <div className="page-flow-content flex flex-col items-center justify-center px-2 py-8 text-center">
          <p className="font-display text-[0.62rem] tracking-[0.36em] text-parchment-dim/70">WITH GRATITUDE</p>
          <h2 id="thanks-title" className="mt-5 font-display text-3xl text-gold-soft">鸣谢</h2>
          <div className="rule-gold mt-5 w-24" />
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-parchment-dim">
            感谢每一个认真回答问题、愿意了解 YUNA 的你。
          </p>
          <p className="mt-3 text-xs tracking-[0.12em] text-parchment-dim/60">成员名单与制作信息待补充</p>
          <p className="font-display mt-8 text-[0.6rem] tracking-[0.3em] text-parchment-dim/45">YUNA · {CAMPAIGN.label}</p>
          <a
            href="https://game.yuna.team/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 text-xs text-gold-soft/80 underline decoration-gold/35 underline-offset-4 transition-colors hover:text-gold-soft"
          >
            燕山大学人生模拟器 · 你的燕大四年，会走向哪里？
          </a>
        </div>
        </section>

        </div>
        <div className="result-page-controls" aria-label="纸叠页面导航">
          <button type="button" onClick={() => goToPage(activePage - 1)} disabled={activePage === 0} aria-label="上一页">↑</button>
          <button type="button" onClick={() => goToPage(activePage + 1)} disabled={activePage === pageCount - 1} aria-label="下一页">↓</button>
        </div>
        <nav className="result-page-dots" aria-label="结果页快速导航">
          {Array.from({ length: pageCount }, (_, page) => (
            <button
              key={page}
              type="button"
              className={page === activePage ? 'is-active' : ''}
              onClick={() => goToPage(page)}
              aria-label={`第 ${page + 1} 页`}
              aria-current={page === activePage ? 'step' : undefined}
            />
          ))}
        </nav>
      </div>
    </div>
  )
}
